import { CRM_STORAGE_KEY } from '../constants/crm';

export const loadCustomers = () => {
  try {
    const raw = localStorage.getItem(CRM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCustomers = (customers) => {
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(customers));
};
