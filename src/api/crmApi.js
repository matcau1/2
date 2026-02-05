const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = 'Ошибка сервера';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // noop
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
};

export const fetchCustomers = () => request('/customers');
export const fetchCustomerDetails = (customerId) => request(`/customers/${customerId}`);
export const createCustomer = (customer) =>
  request('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  });

export const updateCustomer = (id, customer) =>
  request(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  });

export const deleteCustomer = (id) =>
  request(`/customers/${id}`, {
    method: 'DELETE',
  });

export const saveCustomerLogo = (id, logo) =>
  request(`/customers/${id}/logo`, {
    method: 'PUT',
    body: JSON.stringify(logo),
  });

export const addCustomerFiles = (id, files) =>
  request(`/customers/${id}/files`, {
    method: 'POST',
    body: JSON.stringify({ files }),
  });

export const deleteCustomerFile = (customerId, fileId) =>
  request(`/customers/${customerId}/files/${fileId}`, {
    method: 'DELETE',
  });

export const createEmployee = (customerId, employee) =>
  request(`/customers/${customerId}/employees`, {
    method: 'POST',
    body: JSON.stringify(employee),
  });

export const updateEmployee = (customerId, employeeId, employee) =>
  request(`/customers/${customerId}/employees/${employeeId}`, {
    method: 'PUT',
    body: JSON.stringify(employee),
  });

export const deleteEmployee = (customerId, employeeId) =>
  request(`/customers/${customerId}/employees/${employeeId}`, {
    method: 'DELETE',
  });
