import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
const port = Number(process.env.PORT || 3001);

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
};

const pool = mysql.createPool(dbConfig);

const runInit = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Customers (
      id VARCHAR(40) NOT NULL PRIMARY KEY,
      companyName VARCHAR(255) NOT NULL,
      inn VARCHAR(32) NOT NULL,
      address VARCHAR(500) NULL,
      contact VARCHAR(255) NULL,
      status VARCHAR(100) NOT NULL,
      logoName VARCHAR(255) NULL,
      logoData LONGTEXT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS CustomerFiles (
      id VARCHAR(40) NOT NULL PRIMARY KEY,
      customerId VARCHAR(40) NOT NULL,
      name VARCHAR(255) NOT NULL,
      sizeKb INT NOT NULL,
      uploadedAt VARCHAR(64) NOT NULL,
      CONSTRAINT FK_CustomerFiles_Customers FOREIGN KEY (customerId) REFERENCES Customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS CustomerEmployees (
      id VARCHAR(40) NOT NULL PRIMARY KEY,
      customerId VARCHAR(40) NOT NULL,
      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      phone VARCHAR(64) NULL,
      email VARCHAR(255) NULL,
      CONSTRAINT FK_CustomerEmployees_Customers FOREIGN KEY (customerId) REFERENCES Customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
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
    const [rows] = await pool.query(
      `SELECT id, companyName, inn, address, contact, status FROM Customers ORDER BY createdAt DESC`,
    );
    res.json(rows.map(mapCustomer));
  } catch (error) {
    res.status(500).json({ message: 'Не удалось загрузить заказчиков.', error: error.message });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [customerRows] = await pool.query(
      `SELECT id, companyName, inn, address, contact, status, logoName, logoData FROM Customers WHERE id = ?`,
      [id],
    );

    if (!customerRows.length) {
      res.status(404).json({ message: 'Заказчик не найден.' });
      return;
    }

    const [fileRows] = await pool.query(
      `SELECT id, name, sizeKb, uploadedAt FROM CustomerFiles WHERE customerId = ? ORDER BY uploadedAt DESC`,
      [id],
    );

    const [employeeRows] = await pool.query(
      `SELECT id, firstName, lastName, phone, email FROM CustomerEmployees WHERE customerId = ? ORDER BY lastName ASC, firstName ASC`,
      [id],
    );

    const customer = customerRows[0];

    res.json({
      ...mapCustomer(customer),
      logo: customer.logoData ? { name: customer.logoName, data: customer.logoData } : null,
      files: fileRows,
      employees: employeeRows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Не удалось загрузить карточку заказчика.', error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { id, companyName, inn, address, contact, status } = req.body;

    await pool.query(
      `INSERT INTO Customers (id, companyName, inn, address, contact, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, companyName, inn, address || '', contact || '', status],
    );

    res.status(201).json({ id, companyName, inn, address: address || '', contact: contact || '', status });
  } catch (error) {
    res.status(500).json({ message: 'Не удалось создать заказчика.', error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, inn, address, contact, status } = req.body;

    await pool.query(
      `UPDATE Customers SET companyName = ?, inn = ?, address = ?, contact = ?, status = ? WHERE id = ?`,
      [companyName, inn, address || '', contact || '', status, id],
    );

    res.json({ id, companyName, inn, address: address || '', contact: contact || '', status });
  } catch (error) {
    res.status(500).json({ message: 'Не удалось обновить заказчика.', error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM Customers WHERE id = ?`, [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Не удалось удалить заказчика.', error: error.message });
  }
});

app.put('/api/customers/:id/logo', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, data } = req.body;

    await pool.query(`UPDATE Customers SET logoName = ?, logoData = ? WHERE id = ?`, [name, data, id]);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Не удалось загрузить логотип.', error: error.message });
  }
});

app.post('/api/customers/:id/files', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id: customerId } = req.params;
    const { files } = req.body;

    await connection.beginTransaction();

    for (const file of files) {
      await connection.query(
        `INSERT INTO CustomerFiles (id, customerId, name, sizeKb, uploadedAt) VALUES (?, ?, ?, ?, ?)`,
        [file.id, customerId, file.name, file.sizeKb, file.uploadedAt],
      );
    }

    await connection.commit();
    res.status(201).json(files);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Не удалось добавить файлы.', error: error.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/customers/:customerId/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    await pool.query(`DELETE FROM CustomerFiles WHERE id = ?`, [fileId]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Не удалось удалить файл.', error: error.message });
  }
});

app.post('/api/customers/:id/employees', async (req, res) => {
  try {
    const { id: customerId } = req.params;
    const employee = req.body;

    await pool.query(
      `INSERT INTO CustomerEmployees (id, customerId, firstName, lastName, phone, email) VALUES (?, ?, ?, ?, ?, ?)`,
      [employee.id, customerId, employee.firstName, employee.lastName, employee.phone || '', employee.email || ''],
    );

    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Не удалось добавить сотрудника.', error: error.message });
  }
});

app.put('/api/customers/:customerId/employees/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = req.body;

    await pool.query(
      `UPDATE CustomerEmployees SET firstName = ?, lastName = ?, phone = ?, email = ? WHERE id = ?`,
      [employee.firstName, employee.lastName, employee.phone || '', employee.email || '', employeeId],
    );

    res.json({ ...employee, id: employeeId });
  } catch (error) {
    res.status(500).json({ message: 'Не удалось обновить сотрудника.', error: error.message });
  }
});

app.delete('/api/customers/:customerId/employees/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    await pool.query(`DELETE FROM CustomerEmployees WHERE id = ?`, [employeeId]);
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
