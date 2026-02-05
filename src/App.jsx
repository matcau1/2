import { useEffect, useMemo, useState } from 'react';
import CustomerDetails from './components/CustomerDetails';
import CustomerSidebar from './components/CustomerSidebar';
import { EMPTY_CUSTOMER_FORM, EMPTY_EMPLOYEE_FORM } from './constants/crm';
import { makeId } from './utils/id';
import {
  addCustomerFiles,
  createCustomer,
  createEmployee,
  deleteCustomer,
  deleteCustomerFile,
  deleteEmployee,
  fetchCustomerDetails,
  fetchCustomers,
  saveCustomerLogo,
  updateCustomer,
  updateEmployee,
} from './api/crmApi';

export default function App() {
  const customerIdFromUrl = new URLSearchParams(window.location.search).get('customerId');
  const isCustomerWindow = Boolean(customerIdFromUrl);

  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState(customerIdFromUrl);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER_FORM);
  const [editingCustomerId, setEditingCustomerId] = useState(null);

  const [employeeForm, setEmployeeForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  const activeCustomerId = useMemo(
    () => (isCustomerWindow ? customerIdFromUrl : selectedId),
    [customerIdFromUrl, isCustomerWindow, selectedId]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        setIsLoadingCustomers(true);
        const list = await fetchCustomers();
        setCustomers(list);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!activeCustomerId) {
      setSelectedCustomer(null);
      return;
    }

    const loadDetails = async () => {
      try {
        setError('');
        setIsLoadingDetails(true);
        const details = await fetchCustomerDetails(activeCustomerId);
        setSelectedCustomer(details);
      } catch (loadError) {
        setError(loadError.message);
        setSelectedCustomer(null);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadDetails();
  }, [activeCustomerId]);

  const resetCustomerForm = () => {
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setEditingCustomerId(null);
  };

  const resetEmployeeForm = () => {
    setEmployeeForm(EMPTY_EMPLOYEE_FORM);
    setEditingEmployeeId(null);
  };

  const onSubmitCustomer = async (event) => {
    event.preventDefault();
    if (!customerForm.companyName.trim() || !customerForm.inn.trim()) return;

    try {
      setError('');
      if (editingCustomerId) {
        const updated = await updateCustomer(editingCustomerId, customerForm);
        setCustomers((state) => state.map((customer) => (customer.id === editingCustomerId ? updated : customer)));
        if (selectedCustomer?.id === editingCustomerId) {
          setSelectedCustomer((state) => ({ ...state, ...updated }));
        }
      } else {
        const newCustomer = await createCustomer({ id: makeId(), ...customerForm });
        setCustomers((state) => [newCustomer, ...state]);
        setSelectedId(newCustomer.id);
      }

      resetCustomerForm();
    } catch (submitError) {
      setError(submitError.message);
    }
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

  const removeCustomer = async (id) => {
    try {
      setError('');
      await deleteCustomer(id);
      setCustomers((state) => state.filter((customer) => customer.id !== id));

      if (selectedId === id) setSelectedId(null);
      if (activeCustomerId === id) setSelectedCustomer(null);
      if (editingCustomerId === id) resetCustomerForm();
    } catch (removeError) {
      setError(removeError.message);
    }
  };

  const uploadLogo = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCustomer) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const logo = { name: file.name, data: reader.result };
        await saveCustomerLogo(selectedCustomer.id, logo);
        setSelectedCustomer((state) => ({ ...state, logo }));
      } catch (uploadError) {
        setError(uploadError.message);
      }
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const addFiles = async (event) => {
    const fileList = Array.from(event.target.files ?? []);
    if (!fileList.length || !selectedCustomer) return;

    const files = fileList.map((file) => ({
      id: makeId(),
      name: file.name,
      sizeKb: Math.ceil(file.size / 1024),
      uploadedAt: new Date().toLocaleString('ru-RU'),
    }));

    try {
      await addCustomerFiles(selectedCustomer.id, files);
      setSelectedCustomer((state) => ({ ...state, files: [...state.files, ...files] }));
    } catch (filesError) {
      setError(filesError.message);
    }

    event.target.value = '';
  };

  const deleteFile = async (fileId) => {
    if (!selectedCustomer) return;

    try {
      await deleteCustomerFile(selectedCustomer.id, fileId);
      setSelectedCustomer((state) => ({
        ...state,
        files: state.files.filter((file) => file.id !== fileId),
      }));
    } catch (fileDeleteError) {
      setError(fileDeleteError.message);
    }
  };

  const saveEmployeeHandler = async (event) => {
    event.preventDefault();
    if (!selectedCustomer) return;
    if (!employeeForm.firstName.trim() || !employeeForm.lastName.trim()) return;

    try {
      if (editingEmployeeId) {
        await updateEmployee(selectedCustomer.id, editingEmployeeId, employeeForm);
        setSelectedCustomer((state) => ({
          ...state,
          employees: state.employees.map((employee) =>
            employee.id === editingEmployeeId ? { ...employee, ...employeeForm } : employee
          ),
        }));
      } else {
        const employee = { id: makeId(), ...employeeForm };
        await createEmployee(selectedCustomer.id, employee);
        setSelectedCustomer((state) => ({
          ...state,
          employees: [...state.employees, employee],
        }));
      }
      resetEmployeeForm();
    } catch (employeeError) {
      setError(employeeError.message);
    }
  };

  const editEmployeeHandler = (employee) => {
    setEmployeeForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone,
      email: employee.email,
    });
    setEditingEmployeeId(employee.id);
  };

  const deleteEmployeeHandler = async (employeeId) => {
    if (!selectedCustomer) return;

    try {
      await deleteEmployee(selectedCustomer.id, employeeId);
      setSelectedCustomer((state) => ({
        ...state,
        employees: state.employees.filter((employee) => employee.id !== employeeId),
      }));

      if (editingEmployeeId === employeeId) resetEmployeeForm();
    } catch (employeeDeleteError) {
      setError(employeeDeleteError.message);
    }
  };

  const openCustomerWindow = (customerId) => {
    const url = `${window.location.origin}${window.location.pathname}?customerId=${customerId}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className={`layout ${isCustomerWindow ? 'layout-customer-window' : ''}`}>
      {!isCustomerWindow && (
        <CustomerSidebar
          customers={customers}
          selectedId={selectedId}
          customerForm={customerForm}
          editingCustomerId={editingCustomerId}
          setCustomerForm={setCustomerForm}
          setSelectedId={setSelectedId}
          onOpenCustomerWindow={openCustomerWindow}
          onSubmitCustomer={onSubmitCustomer}
          onEditCustomer={editCustomer}
          onRemoveCustomer={removeCustomer}
        />
      )}

      <CustomerDetails
        selectedCustomer={selectedCustomer}
        employeeForm={employeeForm}
        editingEmployeeId={editingEmployeeId}
        setEmployeeForm={setEmployeeForm}
        onUploadLogo={uploadLogo}
        onAddFiles={addFiles}
        onDeleteFile={deleteFile}
        onSaveEmployee={saveEmployeeHandler}
        onEditEmployee={editEmployeeHandler}
        onDeleteEmployee={deleteEmployeeHandler}
        onCancelEmployeeEdit={resetEmployeeForm}
        isLoading={isLoadingCustomers || isLoadingDetails}
        error={error}
      />
    </div>
  );
}
