export default function CustomerDetails({
  selectedCustomer,
  employeeForm,
  editingEmployeeId,
  setEmployeeForm,
  onUploadLogo,
  onAddFiles,
  onDeleteFile,
  onSaveEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onCancelEmployeeEdit,
}) {
  return (
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
            <input type="file" accept="image/*" onChange={onUploadLogo} />
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
              onChange={onAddFiles}
              title="Счета, договоры, акты, фото и любые документы"
            />
            <ul className="table-like">
              {selectedCustomer.files.map((file) => (
                <li key={file.id}>
                  <span>
                    {file.name} ({file.sizeKb} КБ) — {file.uploadedAt}
                  </span>
                  <button type="button" className="danger" onClick={() => onDeleteFile(file.id)}>
                    Удалить
                  </button>
                </li>
              ))}
              {!selectedCustomer.files.length && <li className="empty">Файлы пока не добавлены.</li>}
            </ul>
          </section>

          <section>
            <h3>Сотрудники заказчика</h3>
            <form className="form inline" onSubmit={onSaveEmployee}>
              <input
                placeholder="Имя"
                value={employeeForm.firstName}
                onChange={(event) => setEmployeeForm((state) => ({ ...state, firstName: event.target.value }))}
                required
              />
              <input
                placeholder="Фамилия"
                value={employeeForm.lastName}
                onChange={(event) => setEmployeeForm((state) => ({ ...state, lastName: event.target.value }))}
                required
              />
              <input
                placeholder="Телефон"
                value={employeeForm.phone}
                onChange={(event) => setEmployeeForm((state) => ({ ...state, phone: event.target.value }))}
              />
              <input
                placeholder="E-mail"
                type="email"
                value={employeeForm.email}
                onChange={(event) => setEmployeeForm((state) => ({ ...state, email: event.target.value }))}
              />
              <button type="submit">{editingEmployeeId ? 'Сохранить' : 'Добавить сотрудника'}</button>
              {editingEmployeeId && (
                <button type="button" className="secondary" onClick={onCancelEmployeeEdit}>
                  Отмена
                </button>
              )}
            </form>

            <ul className="table-like">
              {selectedCustomer.employees.map((employee) => (
                <li key={employee.id}>
                  <span>
                    {employee.firstName} {employee.lastName} | {employee.phone || '—'} | {employee.email || '—'}
                  </span>
                  <div className="card-actions">
                    <button type="button" onClick={() => onEditEmployee(employee)}>
                      Редактировать
                    </button>
                    <button type="button" className="danger" onClick={() => onDeleteEmployee(employee.id)}>
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
              {!selectedCustomer.employees.length && <li className="empty">Сотрудники не добавлены.</li>}
            </ul>
          </section>
        </>
      ) : (
        <p className="empty">Выберите заказчика из списка или создайте нового.</p>
      )}
    </main>
  );
}
