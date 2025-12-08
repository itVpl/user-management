import React, { useEffect, useState } from 'react';
import axios from 'axios';
import alertify from 'alertifyjs';
import { PlusCircle, Search } from 'lucide-react';
import API_CONFIG from '../../../config/api.js';

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
  const [highlightIndex, setHighlightIndex] = useState(0);
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
    if (isOpen) setHighlightIndex(0);
  }, [isOpen]);

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
  const paddingClass = compact ? 'px-3 py-2' : 'px-3 py-2';
  const borderClass = 'border-gray-300';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className={`w-full ${paddingClass} border ${borderClass} rounded-lg bg-white ${compact ? 'focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent' : 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent'} ${disabled ? 'bg-gray-100' : ''}`}>
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchTerm !== '' ? searchTerm : (selectedOption ? selectedOption.label : '')}
            onChange={(e) => { setSearchTerm(e.target.value); if (!disabled && !loading) setIsOpen(true); }}
            onFocus={() => !disabled && !loading && setIsOpen(true)}
            onKeyDown={(e) => {
              if (!isOpen) return;
              if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(prev => Math.min(prev + 1, filteredOptions.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(prev => Math.max(prev - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); const opt = filteredOptions[highlightIndex]; if (opt) handleSelect(opt); }
              else if (e.key === 'Escape') { setIsOpen(false); setSearchTerm(''); }
            }}
            placeholder={loading ? 'Loading...' : placeholder}
            disabled={disabled || loading}
            className={`w-full bg-transparent outline-none p-0 text-gray-900`}
          />
          <Search className={`w-4 h-4 absolute right-3 text-gray-400`} />
        </div>
      </div>

      {isOpen && !disabled && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className={`px-4 py-2 cursor-pointer text-sm ${index === highlightIndex ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                  onMouseEnter={() => setHighlightIndex(index)}
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

const ACCOUNT_TYPES = [
  'Cash', 'Bank', 'Sales', 'Purchase', 'Expense', 'Income', 'Asset',
  'Liability', 'Capital', 'Sundry Debtor', 'Sundry Creditor', 'Investment', 'Loan', 'Duty & Tax', 'Other'
];

const getAuthToken = () => {
  return sessionStorage.getItem("token") || localStorage.getItem("token") ||
         sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
};

export default function CreateLedgerModal({ isOpen, onClose, selectedCompanyId, onCreated }) {
  const [companies, setCompanies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      setFormData(prev => ({ ...prev, company: selectedCompanyId || '' }));
    }
  }, [isOpen, selectedCompanyId]);

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

  const createLedger = async () => {
    try {
      setSubmitting(true);
      const token = getAuthToken();

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

      if (formData.address.addressLine1 || formData.address.city || formData.address.state) {
        payload.address = formData.address;
      }
      if (formData.contact.phone || formData.contact.mobile || formData.contact.email) {
        payload.contact = formData.contact;
      }
      if (formData.taxDetails.gstin || formData.taxDetails.pan || formData.taxDetails.aadhar) {
        payload.taxDetails = formData.taxDetails;
      }
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
        onClose?.();
        resetForm();
        onCreated?.();
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4"
      onClick={onClose}
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
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company <span className="text-red-500">*</span></label>
                <SearchableDropdown
                  value={formData.company}
                  onChange={(value) => handleFormChange('company', value)}
                  options={companies.map(c => ({ value: c._id || c.id, label: c.companyName || c.name || 'Unknown' }))}
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
                  options={[{ value: 'Debit', label: 'Debit' }, { value: 'Credit', label: 'Credit' }]}
                  placeholder="Select Balance Type"
                />
              </div>
            </div>
          </div>

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

          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => { onClose?.(); resetForm(); }}
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
  );
}
