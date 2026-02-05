import express from 'express';
import cors from 'cors';
import sql from 'mssql';

const app = express();
const port = Number(process.env.PORT || 3001);

const dbConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  port: Number(process.env.MSSQL_PORT || 1433),
  database: process.env.MSSQL_DATABASE,
  options: {
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
    encrypt: process.env.MSSQL_ENCRYPT !== 'false',
  },
};

const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

const runInit = async () => {
  await poolConnect;
  await pool.request().query(`
    IF OBJECT_ID('dbo.Customers', 'U') IS NULL
    CREATE TABLE dbo.Customers (
      id NVARCHAR(40) NOT NULL PRIMARY KEY,
      companyName NVARCHAR(255) NOT NULL,
      inn NVARCHAR(32) NOT NULL,
      address NVARCHAR(500) NULL,
      contact NVARCHAR(255) NULL,
      status NVARCHAR(100) NOT NULL,
      createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF OBJECT_ID('dbo.CustomerFiles', 'U') IS NULL
    CREATE TABLE dbo.CustomerFiles (
      id NVARCHAR(40) NOT NULL PRIMARY KEY,
      customerId NVARCHAR(40) NOT NULL,
      name NVARCHAR(255) NOT NULL,
      sizeKb INT NOT NULL,
      uploadedAt NVARCHAR(64) NOT NULL,
      CONSTRAINT FK_CustomerFiles_Customers FOREIGN KEY (customerId) REFERENCES dbo.Customers(id) ON DELETE CASCADE
    );

    IF OBJECT_ID('dbo.CustomerEmployees', 'U') IS NULL
    CREATE TABLE dbo.CustomerEmployees (
      id NVARCHAR(40) NOT NULL PRIMARY KEY,
      customerId NVARCHAR(40) NOT NULL,
      firstName NVARCHAR(100) NOT NULL,
      lastName NVARCHAR(100) NOT NULL,
      phone NVARCHAR(64) NULL,
      email NVARCHAR(255) NULL,
      CONSTRAINT FK_CustomerEmployees_Customers FOREIGN KEY (customerId) REFERENCES dbo.Customers(id) ON DELETE CASCADE
    );

    IF COL_LENGTH('dbo.Customers', 'logoName') IS NULL
      ALTER TABLE dbo.Customers ADD logoName NVARCHAR(255) NULL;

    IF COL_LENGTH('dbo.Customers', 'logoData') IS NULL
      ALTER TABLE dbo.Customers ADD logoData NVARCHAR(MAX) NULL;
  `);
};

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const mapCustomer = (row) => ({
  id: row.id,
  companyName: row.companyName,
  inn: row.inn,
  address: row.address || '',
  contact: row.contact || '',
  status: row.status,
});

app.get('/api/customers', async (_req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT id, companyName, inn, address, contact, status
      FROM dbo.Customers
      ORDER BY createdAt DESC
    `);
    res.json(result.recordset.map(mapCustomer));
  } catch (error) {
    res.status(500).json({ message: 'Не удалось загрузить заказчиков.', error: error.message });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;

    const customerResult = await pool.request().input('id', sql.NVarChar(40), id).query(`
      SELECT id, companyName, inn, address, contact, status, logoName, logoData
      FROM dbo.Customers
      WHERE id = @id
    `);

    if (!customerResult.recordset.length) {
      res.status(404).json({ message: 'Заказчик не найден.' });
      return;
    }

    const filesResult = await pool.request().input('customerId', sql.NVarChar(40), id).query(`
      SELECT id, name, sizeKb, uploadedAt
      FROM dbo.CustomerFiles
      WHERE customerId = @customerId
      ORDER BY uploadedAt DESC
    `);

    const employeesResult = await pool.request().input('customerId', sql.NVarChar(40), id).query(`
      SELECT id, firstName, lastName, phone, email
      FROM dbo.CustomerEmployees
      WHERE customerId = @customerId
      ORDER BY lastName ASC, firstName ASC
    `);

    const customer = customerResult.recordset[0];

    res.json({
      ...mapCustomer(customer),
      logo: customer.logoData ? { name: customer.logoName, data: customer.logoData } : null,
      files: filesResult.recordset,
      employees: employeesResult.recordset,
    });
  } catch (error) {
    res.status(500).json({ message: 'Не удалось загрузить карточку заказчика.', error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    await poolConnect;
    const { id, companyName, inn, address, contact, status } = req.body;

    await pool
      .request()
      .input('id', sql.NVarChar(40), id)
      .input('companyName', sql.NVarChar(255), companyName)
      .input('inn', sql.NVarChar(32), inn)
      .input('address', sql.NVarChar(500), address || '')
      .input('contact', sql.NVarChar(255), contact || '')
      .input('status', sql.NVarChar(100), status)
      .query(`
        INSERT INTO dbo.Customers (id, companyName, inn, address, contact, status)
        VALUES (@id, @companyName, @inn, @address, @contact, @status)
      `);

    res.status(201).json({ id, companyName, inn, address: address || '', contact: contact || '', status });
  } catch (error) {
    res.status(500).json({ message: 'Не удалось создать заказчика.', error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const { companyName, inn, address, contact, status } = req.body;

    await pool
      .request()
      .input('id', sql.NVarChar(40), id)
      .input('companyName', sql.NVarChar(255), companyName)
      .input('inn', sql.NVarChar(32), inn)
      .input('address', sql.NVarChar(500), address || '')
      .input('contact', sql.NVarChar(255), contact || '')
      .input('status', sql.NVarChar(100), status)
      .query(`
        UPDATE dbo.Customers
        SET companyName = @companyName, inn = @inn, address = @address, contact = @contact, status = @status
        WHERE id = @id
      `);

    res.json({ id, companyName, inn, address: address || '', contact: contact || '', status });
  } catch (error) {
    res.status(500).json({ message: 'Не удалось обновить заказчика.', error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;

    await pool.request().input('id', sql.NVarChar(40), id).query(`DELETE FROM dbo.Customers WHERE id = @id`);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Не удалось удалить заказчика.', error: error.message });
  }
});

app.put('/api/customers/:id/logo', async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const { name, data } = req.body;

    await pool
      .request()
      .input('id', sql.NVarChar(40), id)
      .input('logoName', sql.NVarChar(255), name)
      .input('logoData', sql.NVarChar(sql.MAX), data)
      .query(`UPDATE dbo.Customers SET logoName = @logoName, logoData = @logoData WHERE id = @id`);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Не удалось загрузить логотип.', error: error.message });
  }
});

app.post('/api/customers/:id/files', async (req, res) => {
  try {
    await poolConnect;
    const { id: customerId } = req.params;
    const { files } = req.body;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const file of files) {
        await new sql.Request(transaction)
          .input('id', sql.NVarChar(40), file.id)
          .input('customerId', sql.NVarChar(40), customerId)
          .input('name', sql.NVarChar(255), file.name)
          .input('sizeKb', sql.Int, file.sizeKb)
          .input('uploadedAt', sql.NVarChar(64), file.uploadedAt)
          .query(`
            INSERT INTO dbo.CustomerFiles (id, customerId, name, sizeKb, uploadedAt)
            VALUES (@id, @customerId, @name, @sizeKb, @uploadedAt)
          `);
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    res.status(201).json(files);
  } catch (error) {
    res.status(500).json({ message: 'Не удалось добавить файлы.', error: error.message });
  }
});

app.delete('/api/customers/:customerId/files/:fileId', async (req, res) => {
  try {
    await poolConnect;
    const { fileId } = req.params;
    await pool.request().input('fileId', sql.NVarChar(40), fileId).query(`DELETE FROM dbo.CustomerFiles WHERE id = @fileId`);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Не удалось удалить файл.', error: error.message });
  }
});

app.post('/api/customers/:id/employees', async (req, res) => {
  try {
    await poolConnect;
    const { id: customerId } = req.params;
    const employee = req.body;

    await pool
      .request()
      .input('id', sql.NVarChar(40), employee.id)
      .input('customerId', sql.NVarChar(40), customerId)
      .input('firstName', sql.NVarChar(100), employee.firstName)
      .input('lastName', sql.NVarChar(100), employee.lastName)
      .input('phone', sql.NVarChar(64), employee.phone || '')
      .input('email', sql.NVarChar(255), employee.email || '')
      .query(`
        INSERT INTO dbo.CustomerEmployees (id, customerId, firstName, lastName, phone, email)
        VALUES (@id, @customerId, @firstName, @lastName, @phone, @email)
      `);

    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Не удалось добавить сотрудника.', error: error.message });
  }
});

app.put('/api/customers/:customerId/employees/:employeeId', async (req, res) => {
  try {
    await poolConnect;
    const { employeeId } = req.params;
    const employee = req.body;

    await pool
      .request()
      .input('id', sql.NVarChar(40), employeeId)
      .input('firstName', sql.NVarChar(100), employee.firstName)
      .input('lastName', sql.NVarChar(100), employee.lastName)
      .input('phone', sql.NVarChar(64), employee.phone || '')
      .input('email', sql.NVarChar(255), employee.email || '')
      .query(`
        UPDATE dbo.CustomerEmployees
        SET firstName = @firstName, lastName = @lastName, phone = @phone, email = @email
        WHERE id = @id
      `);

    res.json({ ...employee, id: employeeId });
  } catch (error) {
    res.status(500).json({ message: 'Не удалось обновить сотрудника.', error: error.message });
  }
});

app.delete('/api/customers/:customerId/employees/:employeeId', async (req, res) => {
  try {
    await poolConnect;
    const { employeeId } = req.params;
    await pool
      .request()
      .input('employeeId', sql.NVarChar(40), employeeId)
      .query(`DELETE FROM dbo.CustomerEmployees WHERE id = @employeeId`);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Не удалось удалить сотрудника.', error: error.message });
  }
});

runInit()
  .then(() => {
    app.listen(port, () => {
      console.log(`API server started on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Database init failed', error);
    process.exit(1);
  });
