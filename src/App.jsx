import { useMemo, useState } from 'react';

const STATUSES = ['В работе', 'Ждет оплаты', 'На согласовании', 'Закрыт'];

const emptyCustomer = {
  companyName: '',
  inn: '',
  address: '',
  contact: '',
  status: STATUSES[0],
};

const emptyEmployee = { firstName: '', lastName: '', phone: '', email: '' };

const loadData = () => {
  try {
    const raw = localStorage.getItem('crm-customers');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function App() {
  const [customers, setCustomers] = useState(loadData);
  const [selectedId, setSelectedId] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [editingCustomerId, setEditingCustomerId] = useState(null);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedId) ?? null,
    [customers, selectedId]
  );

  const persist = (next) => {
    setCustomers(next);
    localStorage.setItem('crm-customers', JSON.stringify(next));
  };

  const onSubmitCustomer = (event) => {
    event.preventDefault();

    if (!customerForm.companyName.trim() || !customerForm.inn.trim()) return;

    if (editingCustomerId) {
      const next = customers.map((customer) =>
        customer.id === editingCustomerId ? { ...customer, ...customerForm } : customer
      );
      persist(next);
    } else {
      const customer = {
        id: makeId(),
        ...customerForm,
        logo: null,
        files: [],
        employees: [],
      };
      const next = [customer, ...customers];
      persist(next);
      setSelectedId(customer.id);
    }

    setCustomerForm(emptyCustomer);
    setEditingCustomerId(null);
  };

  const editCustomer = (customer) => {
    setCustomerForm({
      companyName: customer.companyName,
      inn: customer.inn,
      address: customer.address,
      contact: customer.contact,
      status: customer.status,
    });
    setEditingCustomerId(customer.id);
  };

  const removeCustomer = (id) => {
    const next = customers.filter((customer) => customer.id !== id);
    persist(next);
    if (selectedId === id) setSelectedId(null);
    if (editingCustomerId === id) {
      setEditingCustomerId(null);
      setCustomerForm(emptyCustomer);
    }
  };

  const updateSelected = (updater) => {
    if (!selectedCustomer) return;
    const next = customers.map((customer) =>
      customer.id === selectedCustomer.id ? updater(customer) : customer
    );
    persist(next);
  };

  const uploadLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateSelected((customer) => ({
        ...customer,
        logo: { name: file.name, data: reader.result },
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const addFiles = (event) => {
    const fileList = Array.from(event.target.files ?? []);
    if (!fileList.length) return;

    updateSelected((customer) => ({
      ...customer,
      files: [
        ...customer.files,
        ...fileList.map((file) => ({
          id: makeId(),
          name: file.name,
          sizeKb: Math.ceil(file.size / 1024),
          uploadedAt: new Date().toLocaleString('ru-RU'),
        })),
      ],
    }));

    event.target.value = '';
  };

  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  const saveEmployee = (event) => {
    event.preventDefault();
    if (!selectedCustomer) return;
    if (!employeeForm.firstName.trim() || !employeeForm.lastName.trim()) return;

    updateSelected((customer) => {
      const employees = editingEmployeeId
        ? customer.employees.map((employee) =>
            employee.id === editingEmployeeId ? { ...employee, ...employeeForm } : employee
          )
        : [...customer.employees, { id: makeId(), ...employeeForm }];

      return { ...customer, employees };
    });

    setEmployeeForm(emptyEmployee);
    setEditingEmployeeId(null);
  };

  const editEmployee = (employee) => {
    setEmployeeForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone,
      email: employee.email,
    });
    setEditingEmployeeId(employee.id);
  };

  const deleteEmployee = (employeeId) => {
    updateSelected((customer) => ({
      ...customer,
      employees: customer.employees.filter((employee) => employee.id !== employeeId),
    }));

    if (editingEmployeeId === employeeId) {
      setEmployeeForm(emptyEmployee);
      setEditingEmployeeId(null);
    }
  };

  const deleteFile = (fileId) => {
    updateSelected((customer) => ({
      ...customer,
      files: customer.files.filter((file) => file.id !== fileId),
    }));
  };

  return (
    <div className="layout">
      <aside className="panel">
        <h1>CRM: Промышленный холодильный сервис</h1>
        <form className="form" onSubmit={onSubmitCustomer}>
          <h2>{editingCustomerId ? 'Редактировать заказчика' : 'Новый заказчик'}</h2>
          <input
            placeholder="Название компании"
            value={customerForm.companyName}
            onChange={(event) =>
              setCustomerForm((state) => ({ ...state, companyName: event.target.value }))
            }
            required
          />
          <input
            placeholder="ИНН"
            value={customerForm.inn}
            onChange={(event) => setCustomerForm((state) => ({ ...state, inn: event.target.value }))}
            required
          />
          <input
            placeholder="Адрес"
            value={customerForm.address}
            onChange={(event) =>
              setCustomerForm((state) => ({ ...state, address: event.target.value }))
            }
          />
          <input
            placeholder="Контактные данные"
            value={customerForm.contact}
            onChange={(event) =>
              setCustomerForm((state) => ({ ...state, contact: event.target.value }))
            }
          />
          <select
            value={customerForm.status}
            onChange={(event) =>
              setCustomerForm((state) => ({ ...state, status: event.target.value }))
            }
          >
            {STATUSES.map((status) => (
              <option value={status} key={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="submit">{editingCustomerId ? 'Сохранить' : 'Создать заказчика'}</button>
          {editingCustomerId && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditingCustomerId(null);
                setCustomerForm(emptyCustomer);
              }}
            >
              Отмена
            </button>
          )}
        </form>

        <h2>Заказчики</h2>
        <div className="list">
          {customers.map((customer) => (
            <article
              key={customer.id}
              className={`customer-card ${customer.id === selectedId ? 'active' : ''}`}
            >
              <button type="button" className="customer-link" onClick={() => setSelectedId(customer.id)}>
                <strong>{customer.companyName}</strong>
                <span>ИНН: {customer.inn}</span>
                <span className="badge">{customer.status}</span>
              </button>
              <div className="card-actions">
                <button type="button" onClick={() => editCustomer(customer)}>
                  Редактировать
                </button>
                <button type="button" className="danger" onClick={() => removeCustomer(customer.id)}>
                  Удалить
                </button>
              </div>
            </article>
          ))}
          {!customers.length && <p className="empty">Нет заказчиков. Добавьте первого.</p>}
        </div>
      </aside>

      <main className="panel details">
        {selectedCustomer ? (
          <>
            <h2>{selectedCustomer.companyName}</h2>
            <p>ИНН: {selectedCustomer.inn}</p>
            <p>Адрес: {selectedCustomer.address || '—'}</p>
            <p>Контакты: {selectedCustomer.contact || '—'}</p>
            <p>
              Статус: <span className="badge">{selectedCustomer.status}</span>
            </p>

            <section>
              <h3>Логотип компании</h3>
              <input type="file" accept="image/*" onChange={uploadLogo} />
              {selectedCustomer.logo?.data ? (
                <img src={selectedCustomer.logo.data} alt={selectedCustomer.companyName} className="logo" />
              ) : (
                <p className="empty">Логотип не загружен.</p>
              )}
            </section>

            <section>
              <h3>Файлы заказчика</h3>
              <input
                type="file"
                multiple
                onChange={addFiles}
                title="Счета, договоры, акты, фото и любые документы"
              />
              <ul className="table-like">
                {selectedCustomer.files.map((file) => (
                  <li key={file.id}>
                    <span>
                      {file.name} ({file.sizeKb} КБ) — {file.uploadedAt}
                    </span>
                    <button type="button" className="danger" onClick={() => deleteFile(file.id)}>
                      Удалить
                    </button>
                  </li>
                ))}
                {!selectedCustomer.files.length && <li className="empty">Файлы пока не добавлены.</li>}
              </ul>
            </section>

            <section>
              <h3>Сотрудники заказчика</h3>
              <form className="form inline" onSubmit={saveEmployee}>
                <input
                  placeholder="Имя"
                  value={employeeForm.firstName}
                  onChange={(event) =>
                    setEmployeeForm((state) => ({ ...state, firstName: event.target.value }))
                  }
                  required
                />
                <input
                  placeholder="Фамилия"
                  value={employeeForm.lastName}
                  onChange={(event) =>
                    setEmployeeForm((state) => ({ ...state, lastName: event.target.value }))
                  }
                  required
                />
                <input
                  placeholder="Телефон"
                  value={employeeForm.phone}
                  onChange={(event) =>
                    setEmployeeForm((state) => ({ ...state, phone: event.target.value }))
                  }
                />
                <input
                  placeholder="E-mail"
                  type="email"
                  value={employeeForm.email}
                  onChange={(event) =>
                    setEmployeeForm((state) => ({ ...state, email: event.target.value }))
                  }
                />
                <button type="submit">{editingEmployeeId ? 'Сохранить' : 'Добавить сотрудника'}</button>
                {editingEmployeeId && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setEditingEmployeeId(null);
                      setEmployeeForm(emptyEmployee);
                    }}
                  >
                    Отмена
                  </button>
                )}
              </form>

              <ul className="table-like">
                {selectedCustomer.employees.map((employee) => (
                  <li key={employee.id}>
                    <span>
                      {employee.firstName} {employee.lastName} | {employee.phone || '—'} |{' '}
                      {employee.email || '—'}
                    </span>
                    <div className="card-actions">
                      <button type="button" onClick={() => editEmployee(employee)}>
                        Редактировать
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => deleteEmployee(employee.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </li>
                ))}
                {!selectedCustomer.employees.length && (
                  <li className="empty">Сотрудники не добавлены.</li>
                )}
              </ul>
            </section>
          </>
        ) : (
          <p className="empty">Выберите заказчика из списка или создайте нового.</p>
        )}
      </main>
    </div>
  );
}
