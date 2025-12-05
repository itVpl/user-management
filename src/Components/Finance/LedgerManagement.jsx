import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, PlusCircle, Edit, Trash2, Eye, CheckCircle, XCircle, Filter, Building, Wallet, CreditCard, DollarSign, FileText, Users, Calendar, ArrowUpDown } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

// Searchable Dropdown Component
const SearchableDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  className = "",
  searchPlaceholder = "Search...",
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find(option => option.value === value);
  
  // Compact mode styling to match DeliveryOrder inline filters
  const paddingClass = compact ? 'px-3 py-2' : 'px-4 py-3';
  const borderClass = 'border-gray-300';
  const textSizeClass = compact ? 'text-sm' : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full ${paddingClass} border ${borderClass} rounded-lg bg-white ${compact ? 'focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent' : 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent'} cursor-pointer ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
          }`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={`${selectedOption ? 'text-gray-900' : 'text-gray-500'} ${textSizeClass}`}>
            {loading ? 'Loading...' : selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500 text-sm text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const LedgerManagement = ({ selectedCompanyId }) => {
  // Account Types
  const ACCOUNT_TYPES = [
    'Cash', 'Bank', 'Sales', 'Purchase', 'Expense', 'Income', 'Asset', 
    'Liability', 'Capital', 'Sundry Debtor', 'Sundry Creditor', 'Investment', 'Loan', 'Duty & Tax', 'Other'
  ];

  // State Management
  const [loading, setLoading] = useState(false);
  const [ledgers, setLedgers] = useState([]);
  const [filteredLedgers, setFilteredLedgers] = useState([]);
  const [companies, setCompanies] = useState([]); // For modal dropdown
  const [searchTerm, setSearchTerm] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  
  // Stats for counts (will be fetched separately)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    alias: '',
    accountCode: '',
    accountType: 'Other',
    openingBalance: 0,
    openingBalanceType: 'Debit',
    isMSME: false,
    msmeRegistrationNumber: '',
    address: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    contact: {
      phone: '',
      mobile: '',
      email: '',
      website: ''
    },
    taxDetails: {
      gstin: '',
      pan: '',
      aadhar: ''
    },
    bankDetails: {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branch: ''
    },
    maintainBillWise: false,
    enableGST: false,
    enableTDS: false
  });

  const [errors, setErrors] = useState({});

  // Get Auth Token
  const getAuthToken = () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token") || 
           sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  };

  // Fetch Companies (for modal dropdown)
  const fetchCompanies = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/company/all?isActive=true&page=1&limit=100&sortBy=companyName&sortOrder=asc`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const companiesList = response.data?.companies || response.data?.data || [];
      setCompanies(companiesList);
    } catch (error) {
      console.error('Error fetching companies:', error);
      alertify.error(error.response?.data?.message || 'Failed to load companies');
    }
  };

  // Fetch Stats (all ledgers without filters for counts)
  const fetchStats = async () => {
    if (!selectedCompanyId) {
      setStats({ total: 0, active: 0, inactive: 0 });
      return;
    }

    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/ledger/all?company=${selectedCompanyId}&page=1&limit=1000`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const allLedgers = response.data?.ledgers || response.data?.data || [];
      const total = response.data?.pagination?.total || allLedgers.length;
      const active = allLedgers.filter(l => l.isActive !== false).length;
      const inactive = allLedgers.filter(l => l.isActive === false).length;

      setStats({ total, active, inactive });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({ total: 0, active: 0, inactive: 0 });
    }
  };

  // Fetch All Ledgers
  const fetchLedgers = async (page = 1) => {
    if (!selectedCompanyId) {
      setLedgers([]);
      setFilteredLedgers([]);
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        company: selectedCompanyId,
        page: page.toString(),
        limit: '10',
        sortBy: 'name',
        sortOrder: 'asc'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (isActiveFilter !== '') params.append('isActive', isActiveFilter);

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/ledger/all?${params}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const ledgersList = response.data?.ledgers || response.data?.data || [];
      setLedgers(ledgersList);
      setFilteredLedgers(ledgersList);
      
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      alertify.error(error.response?.data?.message || 'Failed to load ledgers');
      setLedgers([]);
      setFilteredLedgers([]);
    } finally {
      setLoading(false);
    }
  };

  // Create Ledger
  const createLedger = async () => {
    try {
      setSubmitting(true);
      const token = getAuthToken();
      
      // Validate required fields
      const newErrors = {};
      if (!formData.company) newErrors.company = 'Company is required';
      if (!formData.name?.trim()) newErrors.name = 'Name is required';
      if (!formData.accountType) newErrors.accountType = 'Account Type is required';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setSubmitting(false);
        return;
      }

      const payload = {
        company: formData.company,
        name: formData.name.trim(),
        accountType: formData.accountType,
        ...(formData.alias && { alias: formData.alias.trim() }),
        ...(formData.accountCode && { accountCode: formData.accountCode.trim() }),
        openingBalance: Number(formData.openingBalance) || 0,
        openingBalanceType: formData.openingBalanceType,
        isMSME: formData.isMSME,
        ...(formData.msmeRegistrationNumber && { msmeRegistrationNumber: formData.msmeRegistrationNumber.trim() }),
        maintainBillWise: formData.maintainBillWise,
        enableGST: formData.enableGST,
        enableTDS: formData.enableTDS
      };

      // Add address if any field is filled
      if (formData.address.addressLine1 || formData.address.city || formData.address.state) {
        payload.address = formData.address;
      }

      // Add contact if any field is filled
      if (formData.contact.phone || formData.contact.mobile || formData.contact.email) {
        payload.contact = formData.contact;
      }

      // Add tax details if any field is filled
      if (formData.taxDetails.gstin || formData.taxDetails.pan || formData.taxDetails.aadhar) {
        payload.taxDetails = formData.taxDetails;
      }

      // Add bank details if account type is Bank
      if (formData.accountType === 'Bank' && (formData.bankDetails.bankName || formData.bankDetails.accountNumber)) {
        payload.bankDetails = formData.bankDetails;
      }

      const response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/tally/ledger/create`, payload, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        alertify.success('Ledger account created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchLedgers(currentPage);
      } else {
        alertify.error(response.data?.message || 'Failed to create ledger');
      }
    } catch (error) {
      console.error('Error creating ledger:', error);
      alertify.error(error.response?.data?.message || 'Failed to create ledger account');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Ledger
  const updateLedger = async () => {
    if (!selectedLedger?._id) return;

    try {
      setSubmitting(true);
      const token = getAuthToken();
      
      const newErrors = {};
      if (!formData.name?.trim()) newErrors.name = 'Name is required';
      if (!formData.accountType) newErrors.accountType = 'Account Type is required';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setSubmitting(false);
        return;
      }

      const payload = {
        name: formData.name.trim(),
        accountType: formData.accountType,
        ...(formData.alias && { alias: formData.alias.trim() }),
        openingBalance: Number(formData.openingBalance) || 0,
        openingBalanceType: formData.openingBalanceType,
        isMSME: formData.isMSME,
        ...(formData.msmeRegistrationNumber && { msmeRegistrationNumber: formData.msmeRegistrationNumber.trim() }),
        maintainBillWise: formData.maintainBillWise,
        enableGST: formData.enableGST,
        enableTDS: formData.enableTDS
      };

      if (formData.address.addressLine1 || formData.address.city) {
        payload.address = formData.address;
      }
      if (formData.contact.phone || formData.contact.email) {
        payload.contact = formData.contact;
      }
      if (formData.taxDetails.gstin || formData.taxDetails.pan) {
        payload.taxDetails = formData.taxDetails;
      }
      if (formData.accountType === 'Bank' && formData.bankDetails.bankName) {
        payload.bankDetails = formData.bankDetails;
      }

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/ledger/${selectedLedger._id}/update`, payload, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        alertify.success('Ledger account updated successfully');
        setShowEditModal(false);
        setSelectedLedger(null);
        resetForm();
        fetchLedgers(currentPage);
      } else {
        alertify.error(response.data?.message || 'Failed to update ledger');
      }
    } catch (error) {
      console.error('Error updating ledger:', error);
      alertify.error(error.response?.data?.message || 'Failed to update ledger account');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Ledger
  const deleteLedger = async () => {
    if (!selectedLedger?._id) return;

    try {
      setSubmitting(true);
      const token = getAuthToken();

      const response = await axios.delete(`${API_CONFIG.BASE_URL}/api/v1/tally/ledger/${selectedLedger._id}/delete`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        alertify.success('Ledger account deleted successfully');
        setShowDeleteModal(false);
        setSelectedLedger(null);
        fetchLedgers(currentPage);
      } else {
        alertify.error(response.data?.message || 'Failed to delete ledger');
      }
    } catch (error) {
      console.error('Error deleting ledger:', error);
      alertify.error(error.response?.data?.message || 'Failed to delete ledger account');
    } finally {
      setSubmitting(false);
    }
  };

  // Activate Ledger
  const activateLedger = async (ledgerId) => {
    try {
      const token = getAuthToken();

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/ledger/${ledgerId}/activate`, {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        alertify.success('Ledger account activated successfully');
        fetchLedgers(currentPage);
      } else {
        alertify.error(response.data?.message || 'Failed to activate ledger');
      }
    } catch (error) {
      console.error('Error activating ledger:', error);
      alertify.error(error.response?.data?.message || 'Failed to activate ledger account');
    }
  };

  // Get Single Ledger
  const fetchLedgerById = async (ledgerId) => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/ledger/${ledgerId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data?.ledger || response.data?.data || null;
    } catch (error) {
      console.error('Error fetching ledger:', error);
      alertify.error(error.response?.data?.message || 'Failed to load ledger details');
      return null;
    }
  };

  // Reset Form
  const resetForm = () => {
    setFormData({
      company: selectedCompanyId || '',
      name: '',
      alias: '',
      accountCode: '',
      accountType: 'Other',
      openingBalance: 0,
      openingBalanceType: 'Debit',
      isMSME: false,
      msmeRegistrationNumber: '',
      address: {
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        country: 'India',
        pincode: ''
      },
      contact: {
        phone: '',
        mobile: '',
        email: '',
        website: ''
      },
      taxDetails: {
        gstin: '',
        pan: '',
        aadhar: ''
      },
      bankDetails: {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: ''
      },
      maintainBillWise: false,
      enableGST: false,
      enableTDS: false
    });
    setErrors({});
  };

  // Open Create Modal
  const openCreateModal = () => {
    resetForm();
    setFormData(prev => ({ ...prev, company: selectedCompanyId || '' }));
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const openEditModal = async (ledger) => {
    setSelectedLedger(ledger);
    const fullLedger = await fetchLedgerById(ledger._id);
    if (fullLedger) {
      setFormData({
        company: fullLedger.company?._id || fullLedger.company || '',
        name: fullLedger.name || '',
        alias: fullLedger.alias || '',
        accountCode: fullLedger.accountCode || '',
        accountType: fullLedger.accountType || 'Other',
        openingBalance: fullLedger.openingBalance || 0,
        openingBalanceType: fullLedger.openingBalanceType || 'Debit',
        isMSME: fullLedger.isMSME || false,
        msmeRegistrationNumber: fullLedger.msmeRegistrationNumber || '',
        address: {
          addressLine1: fullLedger.address?.addressLine1 || '',
          addressLine2: fullLedger.address?.addressLine2 || '',
          city: fullLedger.address?.city || '',
          state: fullLedger.address?.state || '',
          country: fullLedger.address?.country || 'India',
          pincode: fullLedger.address?.pincode || ''
        },
        contact: {
          phone: fullLedger.contact?.phone || '',
          mobile: fullLedger.contact?.mobile || '',
          email: fullLedger.contact?.email || '',
          website: fullLedger.contact?.website || ''
        },
        taxDetails: {
          gstin: fullLedger.taxDetails?.gstin || '',
          pan: fullLedger.taxDetails?.pan || '',
          aadhar: fullLedger.taxDetails?.aadhar || ''
        },
        bankDetails: {
          bankName: fullLedger.bankDetails?.bankName || '',
          accountNumber: fullLedger.bankDetails?.accountNumber || '',
          ifscCode: fullLedger.bankDetails?.ifscCode || '',
          branch: fullLedger.bankDetails?.branch || ''
        },
        maintainBillWise: fullLedger.maintainBillWise || false,
        enableGST: fullLedger.enableGST || false,
        enableTDS: fullLedger.enableTDS || false
      });
      setShowEditModal(true);
    }
  };

  // Open View Modal
  const openViewModal = async (ledger) => {
    setSelectedLedger(ledger);
    const fullLedger = await fetchLedgerById(ledger._id);
    if (fullLedger) {
      setSelectedLedger(fullLedger);
      setShowViewModal(true);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (ledger) => {
    setSelectedLedger(ledger);
    setShowDeleteModal(true);
  };

  // Handle Form Change
  const handleFormChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Effects
  useEffect(() => {
    fetchCompanies(); // Fetch companies for modal dropdown
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchStats(); // Fetch stats for counts
      fetchLedgers(currentPage);
    }
  }, [selectedCompanyId, currentPage, isActiveFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedCompanyId) {
        setCurrentPage(1);
        fetchLedgers(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Loading State
  if (loading && ledgers.length === 0) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading ledger accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  // Use stats from state (actual counts, not filtered)

  return (
    <>
      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;  /* Chrome, Safari and Opera */
        }
      `}</style>
      <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div 
            className={`bg-white rounded-2xl shadow-xl p-4 border-2 cursor-pointer transition-all hover:shadow-2xl ${
              isActiveFilter === '' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-100 hover:border-green-300'
            }`}
            onClick={() => {
              setIsActiveFilter('');
              setCurrentPage(1);
            }}
            title="Click to view all ledgers"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isActiveFilter === '' ? 'bg-green-200' : 'bg-green-100'
              }`}>
                <Wallet className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Ledgers</p>
                <p className="text-xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white rounded-2xl shadow-xl p-4 border-2 cursor-pointer transition-all hover:shadow-2xl ${
              isActiveFilter === 'true' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-100 hover:border-blue-300'
            }`}
            onClick={() => {
              if (isActiveFilter === 'true') {
                setIsActiveFilter(''); // Reset filter if already active
              } else {
                setIsActiveFilter('true');
                setCurrentPage(1);
              }
            }}
            title="Click to filter active ledgers"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isActiveFilter === 'true' ? 'bg-blue-200' : 'bg-blue-100'
              }`}>
                <CheckCircle className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-xl font-bold text-blue-600">{stats.active}</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white rounded-2xl shadow-xl p-4 border-2 cursor-pointer transition-all hover:shadow-2xl ${
              isActiveFilter === 'false' 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-100 hover:border-red-300'
            }`}
            onClick={() => {
              if (isActiveFilter === 'false') {
                setIsActiveFilter(''); // Reset filter if already active
              } else {
                setIsActiveFilter('false');
                setCurrentPage(1);
              }
            }}
            title="Click to filter inactive ledgers"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isActiveFilter === 'false' ? 'bg-red-200' : 'bg-red-100'
              }`}>
                <XCircle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-xl font-bold text-red-600">{stats.inactive}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search ledgers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Create Ledger Button */}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition"
          >
            <PlusCircle size={20} /> Create Ledger
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Account Name</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Account Code</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Account Type</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Opening Balance</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Balance Type</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">MSME</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-20 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-20 text-center">
                    <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Ledgers Found</h3>
                    <p className="text-gray-500">Create your first ledger account</p>
                  </td>
                </tr>
              ) : (
                filteredLedgers.map((ledger, index) => (
                  <tr key={ledger._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{ledger.name}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono text-base font-semibold text-gray-700">{ledger.accountCode || 'N/A'}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{ledger.accountType}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">₹{Number(ledger.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{ledger.openingBalanceType || 'N/A'}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ledger.isMSME ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                        {ledger.isMSME ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ledger.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {ledger.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openViewModal(ledger)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openEditModal(ledger)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                        {ledger.isActive === false ? (
                          <button
                            onClick={() => activateLedger(ledger._id)}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            onClick={() => openDeleteModal(ledger)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && !loading && filteredLedgers.length > 0 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-100">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-semibold ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              Previous
            </button>
            {[...Array(pagination.pages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-4 py-2 rounded-lg font-semibold ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
              disabled={currentPage === pagination.pages}
              className={`px-4 py-2 rounded-lg font-semibold ${currentPage === pagination.pages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <PlusCircle className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Create Ledger Account</h2>
                    <p className="text-blue-100">Add a new ledger account</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company <span className="text-red-500">*</span></label>
                    <SearchableDropdown
                      value={formData.company}
                      onChange={(value) => handleFormChange('company', value)}
                      options={companies.map(c => ({ 
                        value: c._id || c.id, 
                        label: c.companyName || c.name || 'Unknown' 
                      }))}
                      placeholder="Select Company"
                      searchPlaceholder="Search companies..."
                    />
                    {errors.company && <p className="text-red-600 text-xs mt-1">{errors.company}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="Enter account name"
                    />
                    {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alias</label>
                    <input
                      type="text"
                      value={formData.alias}
                      onChange={(e) => handleFormChange('alias', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter alias"
                    />
                  </div>

                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Code</label>
                    <input
                      type="text"
                      value={formData.accountCode}
                      onChange={(e) => handleFormChange('accountCode', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Auto-generated if empty"
                    />
                  </div> */}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Type <span className="text-red-500">*</span></label>
                    <SearchableDropdown
                      value={formData.accountType}
                      onChange={(value) => handleFormChange('accountType', value)}
                      options={ACCOUNT_TYPES.map(type => ({ value: type, label: type }))}
                      placeholder="Select Account Type"
                    />
                    {errors.accountType && <p className="text-red-600 text-xs mt-1">{errors.accountType}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Opening Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.openingBalance}
                      onChange={(e) => handleFormChange('openingBalance', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Balance Type</label>
                    <SearchableDropdown
                      value={formData.openingBalanceType}
                      onChange={(value) => handleFormChange('openingBalanceType', value)}
                      options={[
                        { value: 'Debit', label: 'Debit' },
                        { value: 'Credit', label: 'Credit' }
                      ]}
                      placeholder="Select Balance Type"
                    />
                  </div>
                </div>
              </div>

              {/* MSME Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">MSME Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isMSME}
                      onChange={(e) => handleFormChange('isMSME', e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm font-medium text-gray-700">Is MSME Supplier</label>
                  </div>

                  {formData.isMSME && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">MSME Registration Number</label>
                      <input
                        type="text"
                        value={formData.msmeRegistrationNumber}
                        onChange={(e) => handleFormChange('msmeRegistrationNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="UDYAM-XX-XX-XXXXXXX"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Address Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                    <input
                      type="text"
                      value={formData.address.addressLine1}
                      onChange={(e) => handleFormChange('address.addressLine1', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter address"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                    <input
                      type="text"
                      value={formData.address.addressLine2}
                      onChange={(e) => handleFormChange('address.addressLine2', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter address line 2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleFormChange('address.city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => handleFormChange('address.state', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                    <input
                      type="text"
                      value={formData.address.pincode}
                      onChange={(e) => handleFormChange('address.pincode', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter pincode"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) => handleFormChange('address.country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter country"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-800 mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="text"
                      value={formData.contact.phone}
                      onChange={(e) => handleFormChange('contact.phone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile</label>
                    <input
                      type="text"
                      value={formData.contact.mobile}
                      onChange={(e) => handleFormChange('contact.mobile', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter mobile number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.contact.email}
                      onChange={(e) => handleFormChange('contact.email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="text"
                      value={formData.contact.website}
                      onChange={(e) => handleFormChange('contact.website', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter website"
                    />
                  </div>
                </div>
              </div>

              {/* Tax Details */}
              <div className="bg-teal-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-teal-800 mb-4">Tax Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                    <input
                      type="text"
                      value={formData.taxDetails.gstin}
                      onChange={(e) => handleFormChange('taxDetails.gstin', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter GSTIN"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PAN</label>
                    <input
                      type="text"
                      value={formData.taxDetails.pan}
                      onChange={(e) => handleFormChange('taxDetails.pan', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter PAN"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar</label>
                    <input
                      type="text"
                      value={formData.taxDetails.aadhar}
                      onChange={(e) => handleFormChange('taxDetails.aadhar', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter Aadhar"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details (only for Bank account type) */}
              {formData.accountType === 'Bank' && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-indigo-800 mb-4">Bank Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                      <input
                        type="text"
                        value={formData.bankDetails.bankName}
                        onChange={(e) => handleFormChange('bankDetails.bankName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                      <input
                        type="text"
                        value={formData.bankDetails.accountNumber}
                        onChange={(e) => handleFormChange('bankDetails.accountNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter account number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                      <input
                        type="text"
                        value={formData.bankDetails.ifscCode}
                        onChange={(e) => handleFormChange('bankDetails.ifscCode', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter IFSC code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                      <input
                        type="text"
                        value={formData.bankDetails.branch}
                        onChange={(e) => handleFormChange('bankDetails.branch', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter branch"
                      />
                    </div>
                  </div>
                </div>
              )}

     
            

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createLedger}
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Ledger'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedLedger && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Edit className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Edit Ledger Account</h2>
                    <p className="text-blue-100">Update ledger account details</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedLedger(null);
                    resetForm();
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="Enter account name"
                    />
                    {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alias</label>
                    <input
                      type="text"
                      value={formData.alias}
                      onChange={(e) => handleFormChange('alias', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter alias"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Type <span className="text-red-500">*</span></label>
                    <SearchableDropdown
                      value={formData.accountType}
                      onChange={(value) => handleFormChange('accountType', value)}
                      options={ACCOUNT_TYPES.map(type => ({ value: type, label: type }))}
                      placeholder="Select Account Type"
                    />
                    {errors.accountType && <p className="text-red-600 text-xs mt-1">{errors.accountType}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Opening Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.openingBalance}
                      onChange={(e) => handleFormChange('openingBalance', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Balance Type</label>
                    <SearchableDropdown
                      value={formData.openingBalanceType}
                      onChange={(value) => handleFormChange('openingBalanceType', value)}
                      options={[
                        { value: 'Debit', label: 'Debit' },
                        { value: 'Credit', label: 'Credit' }
                      ]}
                      placeholder="Select Balance Type"
                    />
                  </div>
                </div>
              </div>

              {/* MSME Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">MSME Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isMSME}
                      onChange={(e) => handleFormChange('isMSME', e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm font-medium text-gray-700">Is MSME Supplier</label>
                  </div>

                  {formData.isMSME && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">MSME Registration Number</label>
                      <input
                        type="text"
                        value={formData.msmeRegistrationNumber}
                        onChange={(e) => handleFormChange('msmeRegistrationNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="UDYAM-XX-XX-XXXXXXX"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Address Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                    <input
                      type="text"
                      value={formData.address.addressLine1}
                      onChange={(e) => handleFormChange('address.addressLine1', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter address"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                    <input
                      type="text"
                      value={formData.address.addressLine2}
                      onChange={(e) => handleFormChange('address.addressLine2', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter address line 2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleFormChange('address.city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => handleFormChange('address.state', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                    <input
                      type="text"
                      value={formData.address.pincode}
                      onChange={(e) => handleFormChange('address.pincode', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter pincode"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) => handleFormChange('address.country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter country"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-800 mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="text"
                      value={formData.contact.phone}
                      onChange={(e) => handleFormChange('contact.phone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile</label>
                    <input
                      type="text"
                      value={formData.contact.mobile}
                      onChange={(e) => handleFormChange('contact.mobile', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter mobile number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.contact.email}
                      onChange={(e) => handleFormChange('contact.email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="text"
                      value={formData.contact.website}
                      onChange={(e) => handleFormChange('contact.website', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter website"
                    />
                  </div>
                </div>
              </div>

              {/* Tax Details */}
              <div className="bg-teal-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-teal-800 mb-4">Tax Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                    <input
                      type="text"
                      value={formData.taxDetails.gstin}
                      onChange={(e) => handleFormChange('taxDetails.gstin', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter GSTIN"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PAN</label>
                    <input
                      type="text"
                      value={formData.taxDetails.pan}
                      onChange={(e) => handleFormChange('taxDetails.pan', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter PAN"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar</label>
                    <input
                      type="text"
                      value={formData.taxDetails.aadhar}
                      onChange={(e) => handleFormChange('taxDetails.aadhar', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter Aadhar"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details (only for Bank account type) */}
              {formData.accountType === 'Bank' && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-indigo-800 mb-4">Bank Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                      <input
                        type="text"
                        value={formData.bankDetails.bankName}
                        onChange={(e) => handleFormChange('bankDetails.bankName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                      <input
                        type="text"
                        value={formData.bankDetails.accountNumber}
                        onChange={(e) => handleFormChange('bankDetails.accountNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter account number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                      <input
                        type="text"
                        value={formData.bankDetails.ifscCode}
                        onChange={(e) => handleFormChange('bankDetails.ifscCode', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter IFSC code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                      <input
                        type="text"
                        value={formData.bankDetails.branch}
                        onChange={(e) => handleFormChange('bankDetails.branch', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter branch"
                      />
                    </div>
                  </div>
                </div>
              )}


           
              {/* Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedLedger(null);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={updateLedger}
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Ledger'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedLedger && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowViewModal(false)}
        >
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Ledger Account Details</h2>
                    <p className="text-blue-100">View ledger account information</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedLedger(null);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-green-100 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Basic Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-white border border-blue-200 rounded-xl">
                  <div className="bg-white rounded-xl p-4 ">
                    <p className="text-sm text-gray-600 mb-1">Account Code</p>
                    <p className="font-semibold text-gray-800">{selectedLedger.accountCode || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Account Name</p>
                    <p className="font-semibold text-gray-800">{selectedLedger.name || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Alias</p>
                    <p className="font-semibold text-gray-800">{selectedLedger.alias || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Account Type</p>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {selectedLedger.accountType || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Opening Balance</p>
                    <p className="font-semibold text-gray-800">
                      ₹{Number(selectedLedger.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Balance Type</p>
                    <p className="font-semibold text-gray-800">{selectedLedger.openingBalanceType || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">MSME Status</p>
                    {selectedLedger.isMSME ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Yes</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">No</span>
                    )}
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    {selectedLedger.isActive !== false ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                        <CheckCircle size={12} />
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                        <XCircle size={12} />
                        Inactive
                      </span>
                    )}
                  </div>
                  {selectedLedger.msmeRegistrationNumber && (
                    <div className="bg-white rounded-xl p-4">
                      <p className="text-sm text-gray-600 mb-1">MSME Registration Number</p>
                      <p className="font-semibold text-gray-800">{selectedLedger.msmeRegistrationNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Information */}
              {selectedLedger.address && (selectedLedger.address.addressLine1 || selectedLedger.address.city) && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Building className="text-purple-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Address Information</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-purple-200">
                    <p className="text-sm text-gray-600 mb-2">Address</p>
                    <p className="font-semibold text-gray-800">
                      {selectedLedger.address.addressLine1 || ''}
                      {selectedLedger.address.addressLine2 && `, ${selectedLedger.address.addressLine2}`}
                      {selectedLedger.address.city && `, ${selectedLedger.address.city}`}
                      {selectedLedger.address.state && `, ${selectedLedger.address.state}`}
                      {selectedLedger.address.pincode && ` - ${selectedLedger.address.pincode}`}
                      {selectedLedger.address.country && `, ${selectedLedger.address.country}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {selectedLedger.contact && (selectedLedger.contact.phone || selectedLedger.contact.email) && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Contact Information</h3>
                  </div>
                  <div className="grid grid-cols-2 bg-white gap-4 border border-orange-200 rounded-xl">
                    {selectedLedger.contact.phone && (
                      <div className=" rounded-xl p-4 ">
                        <p className="text-sm text-gray-600 mb-1">Phone</p>
                        <p className="font-semibold text-gray-800">{selectedLedger.contact.phone}</p>
                      </div>
                    )}
                    {selectedLedger.contact.mobile && (
                      <div className="bg-white rounded-xl p-4 ">
                        <p className="text-sm text-gray-600 mb-1">Mobile</p>
                        <p className="font-semibold text-gray-800">{selectedLedger.contact.mobile}</p>
                      </div>
                    )}
                    {selectedLedger.contact.email && (
                      <div className="bg-white rounded-xl p-4 ">
                        <p className="text-sm text-gray-600 mb-1">Email</p>
                        <p className="font-semibold text-gray-800">{selectedLedger.contact.email}</p>
                      </div>
                    )}
                    {selectedLedger.contact.website && (
                      <div className="bg-white rounded-xl p-4 ">
                        <p className="text-sm text-gray-600 mb-1">Website</p>
                        <p className="font-semibold text-gray-800">{selectedLedger.contact.website}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tax Details */}
              {selectedLedger.taxDetails && (selectedLedger.taxDetails.gstin || selectedLedger.taxDetails.pan) && (
                <div className="bg-teal-100 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="text-teal-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Tax Details</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-white border border-teal-400 rounded-xl">
                    {selectedLedger.taxDetails.gstin && (
                      <div className="bg-white rounded-xl p-4 ">
                        <p className="text-sm text-gray-600 mb-1">GSTIN</p>
                        <p className="font-semibold text-gray-800">{selectedLedger.taxDetails.gstin}</p>
                      </div>
                    )}
                    {selectedLedger.taxDetails.pan && (
                      <div className="bg-white rounded-xl p-4 ">
                        <p className="text-sm text-gray-600 mb-1">PAN</p>
                        <p className="font-semibold text-gray-800">{selectedLedger.taxDetails.pan}</p>
                      </div>
                    )}
                    {selectedLedger.taxDetails.aadhar && (
                      <div className="bg-white rounded-xl p-4 ">
                        <p className="text-sm text-gray-600 mb-1">Aadhar</p>
                        <p className="font-semibold text-gray-800">{selectedLedger.taxDetails.aadhar}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bank Details */}
              {selectedLedger.bankDetails && selectedLedger.bankDetails.bankName && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Wallet className="text-indigo-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Bank Details</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLedger.bankDetails.bankName && (
                      <div className="bg-white rounded-xl p-4 border border-indigo-200">
                        <p className="text-sm text-gray-600 mb-1">Bank Name</p>
                        <p className="font-semibold text-gray-800">{selectedLedger.bankDetails.bankName}</p>
                      </div>
                    )}
                    {selectedLedger.bankDetails.accountNumber && (
                      <div className="bg-white rounded-xl p-4 border border-indigo-200">
                        <p className="text-sm text-gray-600 mb-1">Account Number</p>
                        <p className="font-semibold text-gray-800">{selectedLedger.bankDetails.accountNumber}</p>
                      </div>
                    )}
                    {selectedLedger.bankDetails.ifscCode && (
                      <div className="bg-white rounded-xl p-4 border border-indigo-200">
                        <p className="text-sm text-gray-600 mb-1">IFSC Code</p>
                        <p className="font-semibold text-gray-800">{selectedLedger.bankDetails.ifscCode}</p>
                      </div>
                    )}
                    {selectedLedger.bankDetails.branch && (
                      <div className="bg-white rounded-xl p-4 border border-indigo-200">
                        <p className="text-sm text-gray-600 mb-1">Branch</p>
                        <p className="font-semibold text-gray-800">{selectedLedger.bankDetails.branch}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}


          

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedLedger(null);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedLedger && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Trash2 className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Delete Ledger Account</h2>
                    <p className="text-blue-100">Confirm deletion</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedLedger(null);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete the ledger account <span className="font-semibold text-gray-900">"{selectedLedger.name}"</span>?
                </p>
                <p className="text-sm text-gray-500">
                  This action cannot be undone. The ledger account will be marked as inactive.
                </p>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedLedger(null);
                  }}
                  disabled={submitting}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deleteLedger}
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {submitting ? 'Deleting...' : 'Delete Ledger'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default LedgerManagement;


