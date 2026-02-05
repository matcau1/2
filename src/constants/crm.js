export const STATUSES = ['В работе', 'Ждет оплаты', 'На согласовании', 'Закрыт'];

export const EMPTY_CUSTOMER_FORM = {
  companyName: '',
  inn: '',
  address: '',
  contact: '',
  status: STATUSES[0],
};

export const EMPTY_EMPLOYEE_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
};

export const CRM_STORAGE_KEY = 'crm-customers';
