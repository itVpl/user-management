// src/pages/AddCustomer.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { User, Building2, FileText, PlusCircle, Eye, EyeOff, Search } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/* ---------------- Reusable components ---------------- */
const Input = React.memo(function Input({
  name, label, placeholder, type = 'text', icon = null, required = false,
  inputProps = {}, value, onChange, onBlur, error, rightNode = null, inputRef = null,
}) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={name}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input
          ref={inputRef}
          id={name}
          autoComplete="off"
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={!!error}
          className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${icon ? 'pl-10' : ''
            } ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''} ${rightNode ? 'pr-10' : ''
            }`}
          {...inputProps}
        />
        {rightNode && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{rightNode}</div>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});

const CustomerTable = React.memo(function CustomerTable({ customers, onAction }) {
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const totalPages = Math.max(1, Math.ceil(customers.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [customers.length, totalPages, page]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return customers.slice(start, start + pageSize);
  }, [customers, page]);

  return (
    <div className="bg-white shadow rounded-xl overflow-auto">
      <table className="min-w-full text-sm text-gray-700">
        <thead className="bg-gray-100 text-xs uppercase text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left">Company Name</th>
            <th className="px-4 py-3 text-left">MC/DOT</th>
            <th className="px-4 py-3 text-left">Country</th>
            <th className="px-4 py-3 text-left">State</th>
            <th className="px-4 py-3 text-left">City</th>
            <th className="px-4 py-3 text-left">Phone</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Added On</th>
            <th className="px-4 py-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {pageData.map((cust, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-all">
              <td className="px-4 py-3 border-b border-gray-100">{cust.compName}</td>
              <td className="px-4 py-3 border-b border-gray-100">{cust.mc_dot_no}</td>
              <td className="px-4 py-3 border-b border-gray-100">{cust.country}</td>
              <td className="px-4 py-3 border-b border-gray-100">{cust.state}</td>
              <td className="px-4 py-3 border-b border-gray-100">{cust.city}</td>
              <td className="px-4 py-3 border-b border-gray-100">{cust.phoneNo}</td>
              <td className="px-4 py-3 border-b border-gray-100">{cust.email}</td>
              <td className="px-4 py-3 border-b border-gray-100 capitalize">{cust.status}</td>
              <td className="px-4 py-3 border-b border-gray-100">
                {cust.addedAt ? new Date(cust.addedAt).toLocaleDateString() : 'N/A'}
              </td>
              <td className="px-4 py-3 border-b border-gray-100">
                <button
                  onClick={() => onAction?.(cust)}
                  className={`px-3 py-1 rounded text-sm font-medium
                    ${/blacklist/i.test(cust?.status)
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                >
                  {/blacklist/i.test(cust?.status) ? 'Remove From Blacklist' : 'Blacklist'}
                </button>
              </td>
            </tr>
          ))}
          {pageData.length === 0 && (
            <tr>
              <td className="px-4 py-4 text-center text-gray-500" colSpan="10">
                No customer data available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between p-3">
        <span className="text-xs text-gray-500">
          Showing {customers.length ? (page - 1) * pageSize + 1 : 0}–
          {Math.min(page * pageSize, customers.length)} of {customers.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded border ${page === 1 ? 'text-gray-400 border-gray-200' : 'border-gray-300 hover:bg-gray-50'
              }`}
          >
            Prev
          </button>
          <span className="text-sm">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`px-3 py-1 rounded border ${page === totalPages ? 'text-gray-400 border-gray-200' : 'border-gray-300 hover:bg-gray-50'
              }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
});

/* ---------------- Page ---------------- */
const initialForm = {
  compName: '',
  mc_dot_no: '',
  phoneNo: '',
  email: '',
  password: '',
  confirmPassword: '',
  compAdd: '',
  country: '',
  state: '',
  city: '',
  zipcode: '',
};

const getToken = () =>
  sessionStorage.getItem('token') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('authToken') ||
  localStorage.getItem('authToken') ||
  null;

// Regex rules
const emailRegex = /^[^\s@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const phoneRegex = /^[0-9]{10}$/;
const zipRegex = /^[A-Za-z0-9]{5,8}$/; // 5–8 alphanumeric
const passComboRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*(\d|\W)).{8,14}$/; // (kept for future use)

const AddCustomer = () => {
  const [customers, setCustomers] = useState([]);
  const [todayStats, setTodayStats] = useState({ totalAdded: 0 });
  const [totalStats, setTotalStats] = useState({ totalCustomers: 0, pendingCustomers: 0 });
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // field refs for focusing
  const fieldRefs = useRef({});

  // Password visible by default
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirm, setShowConfirm] = useState(true);

  // Search (debounced)
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchAllCustomers();
    fetchTodayStats();
  }, []);

  const fetchAllCustomers = async () => {
    try {
      const token = getToken();
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/customers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setCustomers(res.data.customers || []);
        setTotalStats(res.data.statistics || {});
      }
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const token = getToken();
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/today-count`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) setTodayStats(res.data.todayStats || {});
    } catch (error) {
      console.error("❌ Error fetching today's stats:", error);
    }
  };

  // Local fallback count
  const todaysCountLocal = useMemo(() => {
    const t = new Date();
    const y = t.getFullYear(), m = t.getMonth(), d = t.getDate();
    return customers.filter(c => {
      if (!c.addedAt) return false;
      const dt = new Date(c.addedAt);
      return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
    }).length;
  }, [customers]);
  const todaysCountDisplay = Math.max(todayStats.totalAdded || 0, todaysCountLocal);

  // Validators with exact messages
  const validators = {
    compName: v => (v.trim() ? '' : 'Please enter the company name.'),
    mc_dot_no: v => (v.trim() ? '' : 'Please enter the Dot Number.'),
    compAdd: v => (v.trim() ? '' : 'Please enter the company address.'),
    email: v => {
      if (!v.trim()) return 'Please enter the email id.';
      if (/\s/.test(v)) return 'Please enter the valid email id.';
      if (!emailRegex.test(v)) return 'Please enter the valid email id.';
      return '';
    },
    phoneNo: v => {
      if (!v.trim()) return 'Please enter the mobile number.';
      if (!/^[0-9]+$/.test(v)) return 'Please enter the valid mobile number.';
      if (!phoneRegex.test(v)) return 'Please enter the valid mobile number.';
      if (!/^[1-9]/.test(v)) return 'Please enter the valid mobile number.';
      return '';
    },
    password: v => {
      if (v.length < 8) return 'Please enter the minimum 8 characters.';
      if (v.length > 14) return 'Please enter the valid password.';
      return '';
    },
    confirmPassword: (v, data) =>
      v !== data.password ? 'Kindly ensure the  password and confirm password are the same' : '',
    country: v => (v.trim() ? '' : 'Please enter the country name.'),
    state: v => (v.trim() ? '' : 'Please enter the state name.'),
    city: v => (v.trim() ? '' : 'Please enter the city name.'),
    zipcode: v => {
      if (!v.trim()) return 'Please enter the Zip/Postal code.';
      if (!zipRegex.test(v)) return 'Please enter the Zip/Postal code.';
      return '';
    },
  };

  const validateAll = useCallback((data) => {
    const newErrors = {};
    Object.entries(validators).forEach(([k, fn]) => {
      const msg = fn(data[k], data);
      if (msg) newErrors[k] = msg;
    });
    // duplicate email (front-end)
    if (!newErrors.email && data.email) {
      const exists = customers.some(
        c => (c?.email || '').trim().toLowerCase() === data.email.trim().toLowerCase()
      );
      if (exists) newErrors.email = 'Already registered the customer with this email id.';
    }
    setErrors(newErrors);
    return newErrors;
  }, [customers]);

  const focusField = (fieldName) => {
    const el = fieldRefs.current?.[fieldName];
    if (el?.focus) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    if (!validators[name]) return;
    const msg = validators[name](value, formData);
    setErrors(prev => ({ ...prev, [name]: msg }));
  }, [formData]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'email') v = v.replace(/\s+/g, '');
    if (name === 'phoneNo') v = v.replace(/\D+/g, '').slice(0, 10);
    if (name === 'zipcode') v = v.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    setFormData(prev => ({ ...prev, [name]: v }));
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setFormData(initialForm);
    setErrors({});
    setShowPassword(true);
    setShowConfirm(true);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const token = getToken();
    if (!token) {
      toast.error('Token not found. Please login again.');
      return;
    }

    const newErrors = validateAll(formData);
    const keys = Object.keys(newErrors);
    if (keys.length > 0) {
      focusField(keys[0]);
      return;
    }

    const exists = customers.some(
      c => (c?.email || '').trim().toLowerCase() === formData.email.trim().toLowerCase()
    );
    if (exists) {
      setErrors(prev => ({ ...prev, email: 'Already registered the customer with this email id.' }));
      focusField('email');
      return;
    }

    try {
      setLoading(true);
      const cleanedData = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => {
          if (typeof v !== 'string') return [k, v];
          if (k === 'password' || k === 'confirmPassword') return [k, v]; // do NOT trim
          return [k, v.trim()];
        })
      );

      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/add-customer`,
        cleanedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.data?.success) {
        toast.success('Customer Created successfully!.');
        handleClose();
        await fetchAllCustomers();
        await fetchTodayStats();
      } else {
        toast.error('❌ Failed: ' + (res?.data?.message || 'Unknown error'));
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Unexpected error';

      if (
        error?.response?.status === 409 ||
        /already.*(registered|exists)/i.test(msg) ||
        /duplicate/i.test(msg)
      ) {
        setErrors(prev => ({ ...prev, email: 'Already registered the customer with this email id.' }));
        focusField('email');
      } else {
        toast.error('❌ Failed: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => (c?.compName || '').toLowerCase().includes(q));
  }, [customers, debouncedSearch]);

  /* ---------- BLACKLIST / REMOVE ACTION (Modal + API) ---------- */
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState(''); // 'blacklist' | 'ok'
  const [actionTarget, setActionTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionForm, setActionForm] = useState({ reason: '', remarks: '', attachment: null });
  const [actionErr, setActionErr] = useState({});

  const ALLOWED_ACTION_EXT = ['PNG','JPG','JPEG','WEBP','PDF','DOC','DOCX'];
  const fileOk = (f) => !f || (ALLOWED_ACTION_EXT.includes((f?.name?.split('.').pop()||'').toUpperCase()) && f.size <= 10*1024*1024);

  const openAction = (cust) => {
    const blacklisted = /blacklist/i.test(cust?.status);
    setActionTarget(cust);
    setActionType(blacklisted ? 'ok' : 'blacklist'); // ok = remove
    setActionForm({ reason: '', remarks: '', attachment: null });
    setActionErr({});
    setActionOpen(true);
  };

  const closeAction = () => {
    setActionOpen(false);
    setActionTarget(null);
  };

  const onActionInput = (e) => {
    const { name, value, files } = e.target;
    if (name === 'attachment') {
      const f = files?.[0] || null;
      if (!fileOk(f)) setActionErr(p => ({ ...p, attachment: 'Only image/PDF/DOC/DOCX up to 10MB' }));
      else {
        setActionErr(p => { const c={...p}; delete c.attachment; return c; });
        setActionForm(p => ({ ...p, attachment: f }));
      }
      return;
    }
    setActionForm(p => ({ ...p, [name]: value }));
  };

  const submitAction = async () => {
    const errs = {};
    if (!actionForm.reason.trim()) errs.reason = 'Required';
    if (!fileOk(actionForm.attachment)) errs.attachment = 'Invalid file';
    setActionErr(errs);
    if (Object.keys(errs).length) return;

    try {
      setActionLoading(true);
      const token = getToken();
      const axiosInstance = axios.create({
        baseURL: `${API_CONFIG.BASE_URL}`,
        headers: { Authorization: `Bearer ${token}` }
      });

      const userId = actionTarget?._id || actionTarget?.userId || actionTarget?.id;
      const fd = new FormData();

      if (actionType === 'blacklist') {
        fd.append('blacklistReason', actionForm.reason);
        if (actionForm.remarks) fd.append('blacklistRemarks', actionForm.remarks);
        if (actionForm.attachment) fd.append('attachments', actionForm.attachment);
        fd.append('userid', userId); // optional
        await axiosInstance.put(`/api/v1/shipper_driver/blacklist/${userId}`, fd);
        toast.success('User blacklisted successfully.');
      } else {
        fd.append('removalReason', actionForm.reason);
        if (actionForm.remarks) fd.append('removalRemarks', actionForm.remarks);
        if (actionForm.attachment) fd.append('attachments', actionForm.attachment);
        await axiosInstance.put(`/api/v1/shipper_driver/blacklist/${userId}/remove`, fd);
        toast.success('Removed from blacklist successfully.');
      }

      await fetchAllCustomers();
      closeAction();
    } catch (err) {
      console.error('action failed', err);
      toast.error('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };
  /* -------------------------------------------------------------- */

  return (
    <div className="p-6">
      {/* Stats + Search + Add */}
      <div className="flex gap-4 mb-6 flex-wrap items-center justify-between">
        <div className="flex gap-4 flex-wrap">
          <div className="bg-white w-[250px] shadow-md rounded-2xl px-4 py-3 flex items-center space-x-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-600">Total Customers</h2>
              <p className="text-xl font-bold text-green-600">{totalStats.totalCustomers || 0}</p>
            </div>
          </div>

          <div className="bg-white w-[250px] shadow-md rounded-2xl px-4 py-3 flex items-center space-x-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-600">Today's Customers</h2>
              <p className="text-xl font-bold text-blue-600">{Math.max(todaysCountDisplay, 0)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by company name"
              className="w-64 px-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <button
            onClick={handleOpen}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Table hidden while modal open */}
      {!open && <CustomerTable customers={filteredCustomers} onAction={openAction} />}

      {/* Add Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center backdrop-blur-sm bg-black/10 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 relative">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Add New Customer</h2>
                    <p className="text-blue-100">Enter customer information below</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form */}
            <form className="p-8" onSubmit={handleSubmit}>
              <div className="space-y-8">
                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                    <Building2 className="text-blue-600" size={20} />
                    Company Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      name="compName"
                      label="Company Name"
                      required
                      placeholder="Enter company name"
                      icon={<Building2 className="w-5 h-5" />}
                      value={formData.compName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.compName}
                      inputRef={el => (fieldRefs.current.compName = el)}
                    />

                    <Input
                      name="mc_dot_no"
                      label="MC/DOT Number"
                      required
                      placeholder="Enter MC/DOT number"
                      icon={<FileText className="w-5 h-5" />}
                      value={formData.mc_dot_no}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.mc_dot_no}
                      inputRef={el => (fieldRefs.current.mc_dot_no = el)}
                    />

                    <Input
                      name="compAdd"
                      label="Company Address"
                      required
                      placeholder="Enter company address"
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      }
                      value={formData.compAdd}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.compAdd}
                      inputRef={el => (fieldRefs.current.compAdd = el)}
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      name="email"
                      label="Email Address"
                      required
                      placeholder="e.g. abc@gmail.com"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.email}
                      inputProps={{ inputMode: 'email', autoCapitalize: 'none', autoCorrect: 'off' }}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      }
                      inputRef={el => (fieldRefs.current.email = el)}
                    />

                    <Input
                      name="phoneNo"
                      label="Mobile Number"
                      required
                      placeholder="10-digit mobile"
                      value={formData.phoneNo}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.phoneNo}
                      inputProps={{ inputMode: 'numeric', maxLength: 10, pattern: '[0-9]*' }}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      }
                      inputRef={el => (fieldRefs.current.phoneNo = el)}
                    />

                    <Input
                      name="password"
                      label="Password"
                      required
                      placeholder="8–14 chars, mix cases & num/symbol"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.password}
                      inputProps={{ autoCapitalize: 'none', autoCorrect: 'off' }}
                      type={showPassword ? 'text' : 'password'}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      }
                      rightNode={
                        <button
                          type="button"
                          onClick={() => setShowPassword(s => !s)}
                          className="p-1"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      }
                      inputRef={el => (fieldRefs.current.password = el)}
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Input
                      name="confirmPassword"
                      label="Confirm Password"
                      required
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.confirmPassword}
                      inputProps={{ autoCapitalize: 'none', autoCorrect: 'off' }}
                      type={showConfirm ? 'text' : 'password'}
                      rightNode={
                        <button
                          type="button"
                          onClick={() => setShowConfirm(s => !s)}
                          className="p-1"
                          aria-label="Toggle confirm password visibility"
                        >
                          {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      }
                      inputRef={el => (fieldRefs.current.confirmPassword = el)}
                    />
                  </div>
                </div>

                {/* Location Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      name="country"
                      label="Country"
                      required
                      placeholder="Enter country"
                      value={formData.country}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.country}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                      inputRef={el => (fieldRefs.current.country = el)}
                    />
                    <Input
                      name="state"
                      label="State"
                      required
                      placeholder="Enter state"
                      value={formData.state}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.state}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      }
                      inputRef={el => (fieldRefs.current.state = el)}
                    />
                    <Input
                      name="city"
                      label="City"
                      required
                      placeholder="Enter city"
                      value={formData.city}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.city}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      }
                      inputRef={el => (fieldRefs.current.city = el)}
                    />
                    <Input
                      name="zipcode"
                      label="Zip/Postal Code"
                      required
                      placeholder="5–8 letters/numbers"
                      value={formData.zipcode}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.zipcode}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      }
                      inputRef={el => (fieldRefs.current.zipcode = el)}
                    />
                  </div>
                </div>

                {/* Tip */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-800">Form Validation</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Required fields have (<span className="text-red-500">*</span>). Email without spaces. Mobile 10 digits starting 6–9.
                    Password must be 8–14 characters (any characters allowed).
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-3 rounded-xl font-semibold text-white transition-all flex items-center gap-2 ${!loading
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5" />
                      Create Customer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blacklist / Remove Modal */}
      {actionOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-black/20 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
            <div className="bg-gradient-to-r from-red-500 to-purple-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {actionType === 'blacklist' ? 'Blacklist Customer' : 'Remove From Blacklist'}
              </h3>
              <button onClick={closeAction} className="text-2xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4" onKeyDown={(e)=>{ if(e.key==='Enter') e.preventDefault(); }}>
              <div className="text-sm text-gray-600">
                <span className="font-semibold">{actionTarget?.compName}</span> — {actionTarget?.email}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  {actionType === 'blacklist' ? 'Blacklist Reason' : 'Removal Reason'} <span className="text-red-500">*</span>
                </label>
                <input
                  name="reason"
                  value={actionForm.reason}
                  onChange={onActionInput}
                  placeholder={actionType === 'blacklist' ? 'Payment Issues' : 'Payment Issues Resolved'}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg ${actionErr.reason ? 'border-red-400' : 'border-gray-300'}`}
                />
                {actionErr.reason && <p className="text-xs text-red-600 mt-1">Please enter the reason.</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Remarks</label>
                <textarea
                  name="remarks"
                  rows={3}
                  value={actionForm.remarks}
                  onChange={onActionInput}
                  placeholder={actionType === 'blacklist'
                    ? 'Customer has not paid for 3 consecutive loads'
                    : 'Customer has cleared all outstanding payments and provided bank statements'}
                  className="w-full mt-1 px-3 py-2 border rounded-lg border-gray-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Attachment (optional)</label>
                <input
                  type="file"
                  name="attachment"
                  onChange={onActionInput}
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
                  className={`w-full mt-1 px-3 py-2 border rounded-lg ${actionErr.attachment ? 'border-red-400' : 'border-gray-300'}`}
                />
                {actionErr.attachment && <p className="text-xs text-red-600 mt-1">{actionErr.attachment}</p>}
                <p className="text-xs text-gray-500 mt-1">Images/PDF/DOC/DOCX up to 10MB</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closeAction} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button
                  type="button"
                  onClick={submitAction}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-lg text-white ${actionLoading ? 'bg-gray-400' :
                    (actionType === 'blacklist' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700')}`}
                >
                  {actionLoading ? 'Submitting…' : (actionType === 'blacklist' ? 'Blacklist' : 'Remove')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default AddCustomer;
