import { STATUSES } from '../constants/crm';

export default function CustomerSidebar({
  customers,
  selectedId,
  customerForm,
  editingCustomerId,
  setCustomerForm,
  setSelectedId,
  onOpenCustomerWindow,
  onSubmitCustomer,
  onEditCustomer,
  onRemoveCustomer,
  onCancelCustomerEdit,
}) {
  return (
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
          onChange={(event) => setCustomerForm((state) => ({ ...state, address: event.target.value }))}
        />
        <input
          placeholder="Контактные данные"
          value={customerForm.contact}
          onChange={(event) => setCustomerForm((state) => ({ ...state, contact: event.target.value }))}
        />
        <select
          value={customerForm.status}
          onChange={(event) => setCustomerForm((state) => ({ ...state, status: event.target.value }))}
        >
          {STATUSES.map((status) => (
            <option value={status} key={status}>
              {status}
            </option>
          ))}
        </select>

        <button type="submit">{editingCustomerId ? 'Сохранить' : 'Создать заказчика'}</button>

        {editingCustomerId && (
          <button type="button" className="secondary" onClick={onCancelCustomerEdit}>
            Отмена
          </button>
        )}
      </form>

      <h2>Заказчики</h2>
      <div className="list">
        {customers.map((customer) => (
          <article key={customer.id} className={`customer-card ${customer.id === selectedId ? 'active' : ''}`}>
            <button
              type="button"
              className="customer-link"
              onClick={() => {
                setSelectedId(customer.id);
                onOpenCustomerWindow(customer.id);
              }}
            >
              <strong>{customer.companyName}</strong>
              <span>ИНН: {customer.inn}</span>
              <span className="badge">{customer.status}</span>
            </button>
            <div className="card-actions">
              <button type="button" onClick={() => onEditCustomer(customer)}>
                Редактировать
              </button>
              <button type="button" className="danger" onClick={() => onRemoveCustomer(customer.id)}>
                Удалить
              </button>
            </div>
          </article>
        ))}

        {!customers.length && <p className="empty">Нет заказчиков. Добавьте первого.</p>}
      </div>
    </aside>
  );
}
