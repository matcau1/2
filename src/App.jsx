import { useMemo, useState } from 'react';
import CustomerDetails from './components/CustomerDetails';
import CustomerSidebar from './components/CustomerSidebar';
import { EMPTY_CUSTOMER_FORM, EMPTY_EMPLOYEE_FORM } from './constants/crm';
import { makeId } from './utils/id';
import { loadCustomers, saveCustomers } from './utils/storage';

export default function App() {
  const [customers, setCustomers] = useState(loadCustomers);
  const [selectedId, setSelectedId] = useState(null);
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER_FORM);
  const [editingCustomerId, setEditingCustomerId] = useState(null);

  const [employeeForm, setEmployeeForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedId) ?? null,
    [customers, selectedId]
  );

  const persist = (next) => {
    setCustomers(next);
    saveCustomers(next);
  };

  const resetCustomerForm = () => {
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setEditingCustomerId(null);
  };

  const resetEmployeeForm = () => {
    setEmployeeForm(EMPTY_EMPLOYEE_FORM);
    setEditingEmployeeId(null);
  };

  const onSubmitCustomer = (event) => {
    event.preventDefault();

    if (!customerForm.companyName.trim() || !customerForm.inn.trim()) return;

    if (editingCustomerId) {
      persist(
        customers.map((customer) =>
          customer.id === editingCustomerId ? { ...customer, ...customerForm } : customer
        )
      );
    } else {
      const customer = {
        id: makeId(),
        ...customerForm,
        logo: null,
        files: [],
        employees: [],
      };

      persist([customer, ...customers]);
      setSelectedId(customer.id);
    }

    resetCustomerForm();
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
    persist(customers.filter((customer) => customer.id !== id));

    if (selectedId === id) setSelectedId(null);
    if (editingCustomerId === id) resetCustomerForm();
  };

  const updateSelectedCustomer = (updater) => {
    if (!selectedCustomer) return;

    persist(
      customers.map((customer) =>
        customer.id === selectedCustomer.id ? updater(customer) : customer
      )
    );
  };

  const uploadLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateSelectedCustomer((customer) => ({
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

    updateSelectedCustomer((customer) => ({
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

  const deleteFile = (fileId) => {
    updateSelectedCustomer((customer) => ({
      ...customer,
      files: customer.files.filter((file) => file.id !== fileId),
    }));
  };

  const saveEmployee = (event) => {
    event.preventDefault();
    if (!selectedCustomer) return;
    if (!employeeForm.firstName.trim() || !employeeForm.lastName.trim()) return;

    updateSelectedCustomer((customer) => {
      const employees = editingEmployeeId
        ? customer.employees.map((employee) =>
            employee.id === editingEmployeeId ? { ...employee, ...employeeForm } : employee
          )
        : [...customer.employees, { id: makeId(), ...employeeForm }];

      return { ...customer, employees };
    });

    resetEmployeeForm();
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
    updateSelectedCustomer((customer) => ({
      ...customer,
      employees: customer.employees.filter((employee) => employee.id !== employeeId),
    }));

    if (editingEmployeeId === employeeId) resetEmployeeForm();
  };

  return (
    <div className="layout">
      <CustomerSidebar
        customers={customers}
        selectedId={selectedId}
        customerForm={customerForm}
        editingCustomerId={editingCustomerId}
        setCustomerForm={setCustomerForm}
        setSelectedId={setSelectedId}
        onSubmitCustomer={onSubmitCustomer}
        onEditCustomer={editCustomer}
        onRemoveCustomer={removeCustomer}
        onCancelCustomerEdit={resetCustomerForm}
      />

      <CustomerDetails
        selectedCustomer={selectedCustomer}
        employeeForm={employeeForm}
        editingEmployeeId={editingEmployeeId}
        setEmployeeForm={setEmployeeForm}
        onUploadLogo={uploadLogo}
        onAddFiles={addFiles}
        onDeleteFile={deleteFile}
        onSaveEmployee={saveEmployee}
        onEditEmployee={editEmployee}
        onDeleteEmployee={deleteEmployee}
        onCancelEmployeeEdit={resetEmployeeForm}
      />
    </div>
  );
}
