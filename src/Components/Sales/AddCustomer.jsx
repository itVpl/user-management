// src/pages/AddCustomer.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { User, Building2, FileText, PlusCircle, Eye, EyeOff, Search, Mail, X, Calendar, MapPin, Phone, CreditCard, Clock, CheckCircle, XCircle, Building, MessageSquare } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Searchable Select Component
const SearchableSelect = React.memo(function SearchableSelect({
  name, label, placeholder, icon = null, required = false,
  value, onChange, onBlur, error, options = [], inputRef = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(option => {
      const optionText = typeof option === 'string' ? option : option.label;
      return optionText.toLowerCase().includes(term);
    });
  }, [options, searchTerm]);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const option = options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value);
    return typeof option === 'string' ? option : option?.label || '';
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    const syntheticEvent = {
      target: { name, value: optionValue }
    };
    onChange(syntheticEvent);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="w-full" ref={selectRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={name}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none">{icon}</div>}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-left ${icon ? 'pl-10' : ''} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'} ${!value ? 'text-gray-400' : 'text-gray-900'}`}
        >
          {value ? selectedLabel : (placeholder || 'Select an option')}
        </button>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            {/* Options List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const optionValue = typeof option === 'string' ? option : option.value;
                  const optionLabel = typeof option === 'string' ? option : option.label;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelect(optionValue)}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                        value === optionValue ? 'bg-blue-50 font-semibold' : ''
                      }`}
                    >
                      {optionLabel}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-gray-500 text-center text-sm">
                  No options found
                </div>
              )}
            </div>
          </div>
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

// Select/Dropdown Component
const Select = React.memo(function Select({
  name, label, placeholder, icon = null, required = false,
  value, onChange, onBlur, error, options = [], inputRef = null,
}) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={name}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none">{icon}</div>}
        <select
          ref={inputRef}
          id={name}
          name={name}
          value={value || ''}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={!!error}
          className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white cursor-pointer ${icon ? 'pl-10' : ''
            } ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
        >
          <option value="">{placeholder || 'Select an option'}</option>
          {options.map((option, index) => (
            <option key={index} value={typeof option === 'string' ? option : option.value}>
              {typeof option === 'string' ? option : option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
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
  const [viewModal, setViewModal] = useState({ open: false, customer: null, data: null, loading: false });
  const [followUpHistory, setFollowUpHistory] = useState({ data: null, loading: false });
  const [followUpModal, setFollowUpModal] = useState({ open: false, customer: null });
  const [followUpForm, setFollowUpForm] = useState({
    followUpMethod: 'call',
    followUpNotes: '',
    followUpDate: new Date().toISOString().slice(0, 16),
    nextFollowUpDate: ''
  });
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpErrors, setFollowUpErrors] = useState({});
  const [prospectForm, setProspectForm] = useState({
    remark: '',
    prospectStatus: 'Warm',
    attachment: null
  });
  const [prospectSubmitting, setProspectSubmitting] = useState(false);
  const [prospectErrors, setProspectErrors] = useState({});

  const totalPages = Math.max(1, Math.ceil(customers.length / pageSize));


  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [customers.length, totalPages, page]);


  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return customers.slice(start, start + pageSize);
  }, [customers, page]);

  const handleView = async (customer) => {
    // Prioritize userId (UUID) over _id
    const customerId = customer.userId || customer._id || customer.id;
    if (!customerId) {
      toast.error('Customer ID not found');
      return;
    }

    setViewModal({ open: true, customer, data: null, loading: true });
    setFollowUpHistory({ data: null, loading: true });
    
    try {
      const token = getToken();
      
      // Fetch customer details and follow-up history in parallel
      const [customerResponse, followUpResponse] = await Promise.all([
        axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${customerId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }
        ),
        axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${customerId}/follow-up-history`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }
        ).catch(err => {
          // If follow-up history fails, just log and continue
          console.warn('Failed to fetch follow-up history:', err);
          return { data: { success: false } };
        })
      ]);

      if (customerResponse.data && customerResponse.data.success) {
        const customerData = customerResponse.data.data;
        setViewModal({ open: true, customer, data: customerData, loading: false });
        
        // Initialize prospect form - if prospectDetails is array, use latest entry
        if (customerData.prospectDetails) {
          if (Array.isArray(customerData.prospectDetails) && customerData.prospectDetails.length > 0) {
            // Get latest entry (most recent createdAt or prospectDate)
            const latestProspect = customerData.prospectDetails.sort((a, b) => {
              const dateA = new Date(a.createdAt || a.prospectDate || 0);
              const dateB = new Date(b.createdAt || b.prospectDate || 0);
              return dateB - dateA;
            })[0];
            
            setProspectForm({
              remark: latestProspect.remark || '',
              prospectStatus: latestProspect.prospectStatus || 'Warm',
              attachment: null
            });
          } else if (customerData.prospectDetails.remark || customerData.prospectDetails.prospectStatus) {
            // Handle old format (object instead of array)
            setProspectForm({
              remark: customerData.prospectDetails.remark || '',
              prospectStatus: customerData.prospectDetails.prospectStatus || 'Warm',
              attachment: null
            });
          } else {
            setProspectForm({
              remark: '',
              prospectStatus: 'Warm',
              attachment: null
            });
          }
        } else {
          setProspectForm({
            remark: '',
            prospectStatus: 'Warm',
            attachment: null
          });
        }
      } else {
        toast.error('Failed to fetch customer details');
        setViewModal({ open: false, customer: null, data: null, loading: false });
        setFollowUpHistory({ data: null, loading: false });
      }

      if (followUpResponse.data && followUpResponse.data.success) {
        setFollowUpHistory({ data: followUpResponse.data.data, loading: false });
      } else {
        setFollowUpHistory({ data: null, loading: false });
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch customer details');
      setViewModal({ open: false, customer: null, data: null, loading: false });
      setFollowUpHistory({ data: null, loading: false });
    }
  };

  const closeViewModal = () => {
    setViewModal({ open: false, customer: null, data: null, loading: false });
    setFollowUpHistory({ data: null, loading: false });
    setProspectForm({
      remark: '',
      prospectStatus: 'Warm',
      attachment: null
    });
    setProspectErrors({});
  };

  const handleFollowUp = (customer) => {
    setFollowUpModal({ open: true, customer });
    setFollowUpForm({
      followUpMethod: 'call',
      followUpNotes: '',
      followUpDate: new Date().toISOString().slice(0, 16),
      nextFollowUpDate: ''
    });
    setFollowUpErrors({});
  };

  const closeFollowUpModal = () => {
    setFollowUpModal({ open: false, customer: null });
    setFollowUpForm({
      followUpMethod: 'call',
      followUpNotes: '',
      followUpDate: new Date().toISOString().slice(0, 16),
      nextFollowUpDate: ''
    });
    setFollowUpErrors({});
    setFollowUpSubmitting(false);
  };

  const handleFollowUpSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const errors = {};
    if (!followUpForm.followUpNotes.trim()) {
      errors.followUpNotes = 'Follow-up notes are required';
    }
    if (!followUpForm.followUpMethod) {
      errors.followUpMethod = 'Follow-up method is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setFollowUpErrors(errors);
      return;
    }

    // Prioritize userId (UUID) over _id
    const customerId = followUpModal.customer?.userId || followUpModal.customer?._id || followUpModal.customer?.id;
    if (!customerId) {
      toast.error('Customer ID not found');
      return;
    }

    setFollowUpSubmitting(true);
    setFollowUpErrors({});

    try {
      const token = getToken();
      const payload = {
        followUpMethod: followUpForm.followUpMethod,
        followUpNotes: followUpForm.followUpNotes.trim(),
        followUpDate: followUpForm.followUpDate ? new Date(followUpForm.followUpDate).toISOString() : new Date().toISOString(),
      };
      
      if (followUpForm.nextFollowUpDate) {
        payload.nextFollowUpDate = new Date(followUpForm.nextFollowUpDate).toISOString();
      }

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${customerId}/follow-up`,
        payload,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        toast.success('Follow-up added successfully!');
        closeFollowUpModal();
        
        // Refresh follow-up history if view modal is open for the same customer
        if (viewModal.open && viewModal.customer) {
          // Prioritize userId (UUID) over _id
          const currentCustomerId = viewModal.customer.userId || viewModal.customer._id || viewModal.customer.id;
          if (currentCustomerId === customerId) {
            try {
              const followUpResponse = await axios.get(
                `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${customerId}/follow-up-history`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                  withCredentials: true
                }
              );
              if (followUpResponse.data && followUpResponse.data.success) {
                setFollowUpHistory({ data: followUpResponse.data.data, loading: false });
              }
            } catch (err) {
              console.warn('Failed to refresh follow-up history:', err);
            }
          }
        }
      } else {
        toast.error(response.data?.message || 'Failed to add follow-up');
      }
    } catch (error) {
      console.error('Error adding follow-up:', error);
      toast.error(error.response?.data?.message || 'Failed to add follow-up. Please try again.');
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const handleProspectInput = (e) => {
    const { name, value, files } = e.target;
    if (name === 'attachment') {
      const file = files?.[0] || null;
      setProspectForm(prev => ({ ...prev, attachment: file }));
      if (file) {
        setProspectErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.attachment;
          return newErrors;
        });
      }
      return;
    }
    setProspectForm(prev => ({ ...prev, [name]: value }));
    if (value) {
      setProspectErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleProspectSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const errors = {};
    if (!prospectForm.remark.trim()) {
      errors.remark = 'Remark is required';
    }
    if (!prospectForm.prospectStatus) {
      errors.prospectStatus = 'Prospect status is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setProspectErrors(errors);
      return;
    }

    // Prioritize userId (UUID) from API data, fallback to customer object
    const customerId = viewModal.data?.userId || viewModal.customer?.userId || viewModal.data?._id || viewModal.customer?._id || viewModal.customer?.id;
    if (!customerId) {
      toast.error('Customer ID not found');
      return;
    }

    setProspectSubmitting(true);
    setProspectErrors({});

    try {
      const token = getToken();
      const formData = new FormData();
      
      // Add prospectDetails as JSON string
      const prospectDetails = {
        remark: prospectForm.remark.trim(),
        prospectStatus: prospectForm.prospectStatus
      };
      formData.append('prospectDetails', JSON.stringify(prospectDetails));
      
      // Add attachment if provided
      if (prospectForm.attachment) {
        formData.append('prospectAttachments', prospectForm.attachment);
      }

      const response = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/update/${customerId}`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        toast.success('Prospect information updated successfully!');
        
        // Refresh customer data using userId
        const refreshCustomerId = viewModal.data?.userId || customerId;
        try {
          const customerResponse = await axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${refreshCustomerId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            }
          );
          if (customerResponse.data && customerResponse.data.success) {
            setViewModal(prev => ({ ...prev, data: customerResponse.data.data }));
          }
        } catch (err) {
          console.warn('Failed to refresh customer data:', err);
        }
        
        // Reset form
        setProspectForm({
          remark: '',
          prospectStatus: 'Warm',
          attachment: null
        });
      } else {
        toast.error(response.data?.message || 'Failed to update prospect information');
      }
    } catch (error) {
      console.error('Error updating prospect information:', error);
      toast.error(error.response?.data?.message || 'Failed to update prospect information. Please try again.');
    } finally {
      setProspectSubmitting(false);
    }
  };


  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company Name</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">MC DOT</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Credit Limit</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Remaining Days</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Added On</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((cust, index) => (
              <tr key={index} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="py-2 px-4">
                  <span className="font-medium text-gray-700">{cust.compName}</span>
                </td>
                <td className="py-2 px-4">
                  <span className="font-medium text-gray-700">{cust.mc_dot_no || 'N/A'}</span>
                </td>
                <td className="py-2 px-4">
                  <span className="font-medium text-gray-700">{cust.email}</span>
                </td>
                <td className="py-2 px-4">
                  <span className="font-semibold text-blue-600">
                    ${cust.creditLimit ? parseFloat(cust.creditLimit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </span>
                </td>
                <td className="py-2 px-4">
                  {cust.type === 'final_customer' ? (
                    <span className={`font-semibold ${
                      cust.timeline?.daysRemaining !== undefined && cust.timeline.daysRemaining !== null
                        ? cust.timeline.daysRemaining <= 30
                          ? 'text-red-600'
                          : cust.timeline.daysRemaining <= 60
                          ? 'text-orange-600'
                          : 'text-green-600'
                        : 'text-gray-500'
                    }`}>
                      {cust.timeline?.daysRemaining !== undefined && cust.timeline.daysRemaining !== null
                        ? `${cust.timeline.daysRemaining} days`
                        : 'N/A'}
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-500">N/A</span>
                  )}
                </td>
                <td className="py-2 px-4">
                  <span className={`font-semibold ${
                    cust.type === 'final_customer'
                      ? 'text-green-600'
                      : 'text-gray-700'
                  }`}>
                    {cust.type === 'final_customer'
                      ? 'Active'
                      : (cust.type || 'N/A')}
                  </span>
                </td>
                <td className="py-2 px-4">
                  <span className="font-medium text-gray-700">
                    {cust.addedAt ? new Date(cust.addedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </td>
                <td className="py-2 px-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleView(cust)}
                      className="px-3 py-1 text-xs rounded-md transition-colors border border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleFollowUp(cust)}
                      className="px-3 py-1 text-xs rounded-md transition-colors border border-green-300 text-green-600 hover:bg-green-50 flex items-center gap-1"
                    >
                      <MessageSquare size={12} />
                      Follow Up
                    </button>
                    <button
                      onClick={() => onAction?.(cust)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors border ${
                        /blacklist/i.test(cust?.status)
                          ? 'text-green-600 border-green-300 hover:bg-green-50'
                          : 'text-red-600 border-red-300 hover:bg-red-50'
                      }`}
                    >
                      {/blacklist/i.test(cust?.status) ? 'Remove From Blacklist' : 'Blacklist'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td className="py-12 text-center text-gray-500" colSpan="8">
                  <div className="flex flex-col items-center">
                    <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No customer data available</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


      {/* Pagination */}
      {totalPages > 1 && customers.length > 0 && (
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {customers.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, customers.length)} of {customers.length} customers
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-2 border rounded-lg transition-colors ${
                  page === p
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* View Customer Modal */}
      {viewModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeViewModal}>
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Customer Details</h2>
                  <p className="text-blue-100 text-sm">{viewModal.customer?.compName || 'Loading...'}</p>
                </div>
              </div>
              <button
                onClick={closeViewModal}
                className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content */}
            {viewModal.loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading customer details...</p>
                </div>
              </div>
            ) : viewModal.data ? (
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Building className="text-blue-600" size={20} />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Company Name</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.compName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">MC/DOT Number</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.mc_dot_no || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">User Type</p>
                      <p className="font-semibold text-gray-800 capitalize">{viewModal.data.userType || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-800 flex items-center gap-1">
                        <Mail size={14} className="text-gray-400" />
                        {viewModal.data.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="font-semibold text-gray-800 flex items-center gap-1">
                        <Phone size={14} className="text-gray-400" />
                        {viewModal.data.phoneNo || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Credit Limit</p>
                      <p className="font-semibold text-blue-600 flex items-center gap-1">
                        <CreditCard size={14} />
                        ${viewModal.data.creditLimit ? parseFloat(viewModal.data.creditLimit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Onboard Company</p>
                          <p className="font-semibold text-gray-800">{viewModal.data.onboardCompany || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Type</p>
                          <p className="font-semibold text-gray-800 capitalize">{viewModal.data.type || viewModal.data.userType || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="text-green-600" size={20} />
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">Company Address</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.compAdd || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.country || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">State</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.state || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">City</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.city || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Zipcode</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.zipcode || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Prospect Information - Show for both prospect and final_customer */}
                {(viewModal.data.type === 'prospect' || viewModal.data.userType === 'prospect' || 
                  viewModal.data.type === 'final_customer' || viewModal.data.userType === 'final_customer') && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <FileText className="text-amber-600" size={20} />
                      Prospect Information
                    </h3>
                    
                    {/* Display existing prospect data if available - Handle as array */}
                    {viewModal.data.prospectDetails && Array.isArray(viewModal.data.prospectDetails) && viewModal.data.prospectDetails.length > 0 && (
                      <div className="mb-6 space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Prospect History ({viewModal.data.prospectDetails.length} entries)</h4>
                        {viewModal.data.prospectDetails.map((prospect, prospectIdx) => (
                          <div key={prospect._id || prospectIdx} className="bg-white rounded-lg p-4 border border-amber-200 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500">Entry #{prospectIdx + 1}</span>
                                {prospect.prospectStatus && (
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                    prospect.prospectStatus === 'Hot' ? 'bg-red-100 text-red-800' :
                                    prospect.prospectStatus === 'Warm' ? 'bg-orange-100 text-orange-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {prospect.prospectStatus}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {prospect.prospectDate ? new Date(prospect.prospectDate).toLocaleString() :
                                 prospect.createdAt ? new Date(prospect.createdAt).toLocaleString() : 'N/A'}
                              </div>
                            </div>
                            
                            {prospect.remark && (
                              <div className="mb-3">
                                <p className="text-xs text-gray-600 mb-1">Remark:</p>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{prospect.remark}</p>
                              </div>
                            )}
                            
                            {prospect.attachments && Array.isArray(prospect.attachments) && prospect.attachments.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-amber-100">
                                <p className="text-xs text-gray-600 mb-2">Attachments ({prospect.attachments.length}):</p>
                                <div className="space-y-2">
                                  {prospect.attachments.map((attachment, attachIdx) => {
                                    // Use filename to construct correct URL, fallback to path if filename not available
                                    const attachmentUrl = attachment.filename 
                                      ? `https://vpl-freight-images.s3.eu-north-1.amazonaws.com/${attachment.filename}`
                                      : attachment.path;
                                    
                                    return (
                                      <div key={attachment._id || attachIdx} className="flex items-center gap-2">
                                        <a 
                                          href={attachmentUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                          <FileText size={14} />
                                          {attachment.originalName || attachment.filename || 'View Attachment'}
                                        </a>
                                        {attachment.size && (
                                          <span className="text-xs text-gray-500">
                                            ({(attachment.size / 1024).toFixed(2)} KB)
                                          </span>
                                        )}
                                        {attachment.uploadedAt && (
                                          <span className="text-xs text-gray-400">
                                            • {new Date(attachment.uploadedAt).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Prospect Form - Disable if type is final_customer */}
                    {(() => {
                      const isFinalCustomer = viewModal.data.type === 'final_customer' || viewModal.data.userType === 'final_customer';
                      return (
                        <form onSubmit={handleProspectSubmit} className="space-y-4">
                          {/* Remark */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Remarks <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              name="remark"
                              value={prospectForm.remark}
                              onChange={handleProspectInput}
                              placeholder="Enter prospect remarks..."
                              rows={4}
                              disabled={isFinalCustomer}
                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none ${
                                prospectErrors.remark ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                              } ${isFinalCustomer ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                            />
                            {prospectErrors.remark && (
                              <p className="text-red-500 text-xs mt-1">{prospectErrors.remark}</p>
                            )}
                          </div>

                          {/* Prospect Status */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Prospect Status <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="prospectStatus"
                              value={prospectForm.prospectStatus}
                              onChange={handleProspectInput}
                              disabled={isFinalCustomer}
                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all appearance-none bg-white ${
                                prospectErrors.prospectStatus ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                              } ${isFinalCustomer ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                            >
                              <option value="Warm">Warm</option>
                              <option value="Hot">Hot</option>
                              <option value="Cold">Cold</option>
                            </select>
                            {prospectErrors.prospectStatus && (
                              <p className="text-red-500 text-xs mt-1">{prospectErrors.prospectStatus}</p>
                            )}
                          </div>

                          {/* Attachment */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Attachment (Optional)
                            </label>
                            <input
                              type="file"
                              name="attachment"
                              onChange={handleProspectInput}
                              accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
                              disabled={isFinalCustomer}
                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all ${
                                prospectErrors.attachment ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                              } ${isFinalCustomer ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                            />
                            {prospectForm.attachment && (
                              <p className="text-xs text-gray-600 mt-1">
                                Selected: {prospectForm.attachment.name}
                              </p>
                            )}
                            {prospectErrors.attachment && (
                              <p className="text-red-500 text-xs mt-1">{prospectErrors.attachment}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Images/PDF/DOC/DOCX up to 10MB</p>
                          </div>

                          {/* Submit Button */}
                          <div className="flex justify-end pt-4 border-t border-amber-200">
                            <button
                              type="submit"
                              disabled={prospectSubmitting || isFinalCustomer}
                              className={`px-6 py-3 rounded-xl font-semibold text-white transition-all flex items-center gap-2 ${
                                (prospectSubmitting || isFinalCustomer)
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl'
                              }`}
                            >
                              {prospectSubmitting ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <FileText size={18} />
                                  Update Prospect Information
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      );
                    })()}
                  </div>
                )}

                {/* Follow Up History */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <MessageSquare className="text-purple-600" size={20} />
                    Follow Up History
                    {followUpHistory.data && (
                      <span className="text-sm font-normal text-gray-600">
                        ({followUpHistory.data.totalFollowUps || 0} total)
                      </span>
                    )}
                  </h3>
                  
                  {followUpHistory.loading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  ) : followUpHistory.data && followUpHistory.data.followUpHistory && followUpHistory.data.followUpHistory.length > 0 ? (
                    <div className="space-y-4">
                      {followUpHistory.data.followUpHistory.map((followUp, idx) => (
                        <div key={followUp._id || idx} className="bg-white rounded-lg p-4 border border-purple-200 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                                followUp.followUpMethod === 'call' ? 'bg-blue-100 text-blue-800' :
                                followUp.followUpMethod === 'email' ? 'bg-green-100 text-green-800' :
                                followUp.followUpMethod === 'meeting' ? 'bg-purple-100 text-purple-800' :
                                followUp.followUpMethod === 'whatsapp' ? 'bg-emerald-100 text-emerald-800' :
                                followUp.followUpMethod === 'visit' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {followUp.followUpMethod || 'N/A'}
                              </span>
                              {followUp.nextFollowUpDate && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                  Next: {new Date(followUp.nextFollowUpDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {followUp.followUpDate ? new Date(followUp.followUpDate).toLocaleString() : 
                               followUp.createdAt ? new Date(followUp.createdAt).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          
                          <div className="mb-2">
                            <p className="text-sm text-gray-600 mb-1">Notes:</p>
                            <p className="text-gray-800 whitespace-pre-wrap">{followUp.followUpNotes || 'No notes'}</p>
                          </div>
                          
                          {followUp.performedBy && (
                            <div className="mt-3 pt-3 border-t border-purple-100">
                              <p className="text-xs text-gray-500">
                                Performed by: <span className="font-semibold text-gray-700">
                                  {followUp.performedBy.employeeName || 'N/A'} ({followUp.performedBy.empId || 'N/A'})
                                </span>
                                {followUp.performedBy.department && (
                                  <span className="text-gray-500"> - {followUp.performedBy.department}</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No follow-up history available</p>
                    </div>
                  )}
                </div>

                {/* Reassignment History */}
                {viewModal.data.reassignmentHistory && viewModal.data.reassignmentHistory.length > 0 && (
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <User className="text-teal-600" size={20} />
                      Reassignment History
                    </h3>
                    <div className="space-y-3">
                      {viewModal.data.reassignmentHistory.map((reassign, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-4 border border-teal-200">
                          <p className="text-sm text-gray-600">Reassignment #{idx + 1}</p>
                          <p className="font-semibold text-gray-800">{JSON.stringify(reassign, null, 2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p>No data available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Follow Up Modal */}
      {followUpModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeFollowUpModal}>
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-3xl flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Add Follow Up</h2>
                  <p className="text-green-100 text-sm">{followUpModal.customer?.compName || 'Customer'}</p>
                </div>
              </div>
              <button
                onClick={closeFollowUpModal}
                className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFollowUpSubmit} className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Company Name</p>
                    <p className="font-semibold text-gray-800">{followUpModal.customer?.compName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-semibold text-gray-800">{followUpModal.customer?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-800">{followUpModal.customer?.phoneNo || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">MC/DOT</p>
                    <p className="font-semibold text-gray-800">{followUpModal.customer?.mc_dot_no || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Follow Up Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow Up Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={followUpForm.followUpMethod}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, followUpMethod: e.target.value })}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all ${
                    followUpErrors.followUpMethod ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                  }`}
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="visit">Visit</option>
                  <option value="other">Other</option>
                </select>
                {followUpErrors.followUpMethod && (
                  <p className="text-red-500 text-xs mt-1">{followUpErrors.followUpMethod}</p>
                )}
              </div>

              {/* Follow Up Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow Up Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={followUpForm.followUpNotes}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, followUpNotes: e.target.value })}
                  placeholder="Enter follow-up notes..."
                  rows={5}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none ${
                    followUpErrors.followUpNotes ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                  }`}
                />
                {followUpErrors.followUpNotes && (
                  <p className="text-red-500 text-xs mt-1">{followUpErrors.followUpNotes}</p>
                )}
              </div>

              {/* Follow Up Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow Up Date
                </label>
                <input
                  type="datetime-local"
                  value={followUpForm.followUpDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, followUpDate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use current date/time</p>
              </div>

              {/* Next Follow Up Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Follow Up Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={followUpForm.nextFollowUpDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, nextFollowUpDate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Schedule the next follow-up date</p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeFollowUpModal}
                  disabled={followUpSubmitting}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={followUpSubmitting}
                  className={`px-6 py-3 rounded-xl font-semibold text-white transition-all flex items-center gap-2 ${
                    followUpSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {followUpSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <MessageSquare size={18} />
                      Add Follow Up
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});


const getToken = () =>
  sessionStorage.getItem('token') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('authToken') ||
  localStorage.getItem('authToken') ||
  null;


/* ---------------- Page ---------------- */
const initialForm = {
  compName: '',
  mc_dot_no: '',
  phoneNo: '',
  email: '',
  companyEmail: '', // Company email dropdown field
  onboardCompany: '', // Onboard company dropdown field
  password: '',
  confirmPassword: '',
  compAdd: '',
  country: '',
  state: '',
  city: '',
  zipcode: '',
};


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

  // Company Email Options - Based on the three companies in the system
  const companyEmailOptions = [
    // V Power Logistics emails
    'company@vpowerlogistics.com',
    'info@vpowerlogistics.com',
    'contact@vpower-logistics.com',
    'support@vpowerlogistics.com',
    'sales@vpowerlogistics.com',
    'operations@vpowerlogistics.com',
    'accounting@vpowerlogistics.com',
    'hr@vpowerlogistics.com',
    'admin@vpowerlogistics.com',
    // IDENTIFICA LLC emails
    'company@identifica.com',
    'info@identifica.com',
    'contact@identifica.com',
    'support@identifica.com',
    'sales@identifica.com',
    'operations@identifica.com',
    // MT. POCONO TRANSPORTATION INC emails
    'company@mtpocono.com',
    'info@mtpocono.com',
    'contact@mtpocono.com',
    'support@mtpocono.com',
    'sales@mtpocono.com',
    'operations@mtpocono.com',
    'dispatch@mtpocono.com'
  ];

  // Onboard Company Options - The three companies in the system
  const onboardCompanyOptions = [
    'V Power Logistics',
    'IDENTIFICA LLC',
    'MT. POCONO TRANSPORTATION INC'
  ];


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
  const [filterType, setFilterType] = useState('total'); // 'all' | 'total' | 'today'
 
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
        { 
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true // 🔥 CRITICAL: Required for Safari/iOS cross-site cookies
        }
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
        { 
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true // 🔥 CRITICAL: Required for Safari/iOS cross-site cookies
        }
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
          // onboardCompany - send exact value as selected from dropdown
          // Values: 'V Power Logistics', 'IDENTIFICA LLC', 'MT. POCONO TRANSPORTATION INC'
          if (k === 'onboardCompany') {
            return [k, v.trim() || '']; // Trim only whitespace, preserve exact company name
          }
          // Only include companyEmail if it has a value (optional field)
          if (k === 'companyEmail' && !v.trim()) return [k, '']; // Include empty string for optional field
          return [k, v.trim()];
        })
      );

      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/add-customer`,
        cleanedData,
        { 
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true // 🔥 CRITICAL: Required for Safari/iOS cross-site cookies
        }
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
    let filtered = customers;
   
    // Apply filter type (total/today)
    if (filterType === 'today') {
      const today = new Date();
      const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
      filtered = customers.filter(c => {
        if (!c.addedAt) return false;
        const dt = new Date(c.addedAt);
        return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
      });
    } else if (filterType === 'total') {
      filtered = customers; // Show all
    }
   
    // Apply search filter
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(c => (c?.compName || '').toLowerCase().includes(q));
    }
   
    return filtered;
  }, [customers, debouncedSearch, filterType]);


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
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true // 🔥 CRITICAL: Required for Safari/iOS cross-site cookies
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setFilterType(filterType === 'total' ? 'all' : 'total')}
            className={`bg-white rounded-2xl shadow-xl p-4 border transition-all cursor-pointer hover:shadow-2xl ${
              filterType === 'total' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <User className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-xl font-bold text-gray-800">{totalStats.totalCustomers || 0}</p>
              </div>
            </div>
          </button>


          <button
            onClick={() => setFilterType(filterType === 'today' ? 'all' : 'today')}
            className={`bg-white rounded-2xl shadow-xl p-4 border transition-all cursor-pointer hover:shadow-2xl ${
              filterType === 'today' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Building2 className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-xl font-bold text-purple-600">{Math.max(todaysCountDisplay, 0)}</p>
              </div>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by company name"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>


          <button
            onClick={handleOpen}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition"
          >
            <PlusCircle size={20} /> Add Customer
          </button>
        </div>
      </div>


      {/* Table hidden while modal open */}
      {!open && <CustomerTable customers={filteredCustomers} onAction={openAction} />}


      {/* Add Modal */}
      {open && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4"
        >
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Add New Customer</h2>
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
            <form className="p-6 space-y-6" onSubmit={handleSubmit}>
              {/* Company Information */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-800 mb-4">Company Information</h3>


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


              {/* Company Selection */}
              <div className="bg-teal-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-teal-800 mb-4">Company Selection</h3>

                <div className="w-full">
                  <SearchableSelect
                    name="onboardCompany"
                    label="Onboard Company"
                    placeholder="Select Onboard Company"
                    value={formData.onboardCompany}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.onboardCompany}
                    options={onboardCompanyOptions}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    }
                    inputRef={el => (fieldRefs.current.onboardCompany = el)}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Contact Information</h3>

                  {/* Row 1: Email and Phone - 2 fields per row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

                  {/* Password Fields - 2 fields per row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Location Details</h3>


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
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-black/20 p-4"
          onClick={closeAction}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
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



