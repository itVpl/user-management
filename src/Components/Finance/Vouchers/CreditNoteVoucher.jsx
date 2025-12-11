import React, { useEffect, useState, useCallback } from 'react';
import CreateLedgerModal from '../Ledger/CreateLedgerModal.jsx';
import axios from 'axios';
import { Search, PlusCircle, Edit, Trash2, Eye, Filter, FileText, Plus, X, Calendar } from 'lucide-react';
import API_CONFIG from '../../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

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
  const textSizeClass = compact ? 'text-sm' : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className={`w-full ${paddingClass} border ${borderClass} rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${disabled ? 'bg-gray-100' : ''}`}>
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
            className={`w-full bg-transparent outline-none ${compact ? 'text-sm' : ''} p-0 text-gray-900`}
          />
          <Search className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} absolute right-3 text-gray-400`} />
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

export default function CreditNoteVoucher({ selectedCompanyId = null, globalRange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showLedgerCreateModal, setShowLedgerCreateModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    creditNoteType: '',
    isPosted: ''
  });
  
  const getDefaultDateRange = () => {
    const currentYear = new Date().getFullYear();
    return {
      startDate: new Date(currentYear - 1, 0, 1),
      endDate: new Date(currentYear + 1, 0, 1),
      key: 'selection'
    };
  };
  
  const [range, setRange] = useState(getDefaultDateRange());
  useEffect(() => {
    if (globalRange && globalRange.startDate && globalRange.endDate) {
      setRange({ startDate: new Date(globalRange.startDate), endDate: new Date(globalRange.endDate), key: 'selection' });
    }
  }, [globalRange]);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [dateFilterApplied, setDateFilterApplied] = useState(true);
  const [companyId, setCompanyId] = useState(selectedCompanyId);
  const [companies, setCompanies] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    company: '',
    voucherDate: '',
    voucherNumber: '',
    customers: [{ account: '', amount: '', narration: '', billWise: 'On Account', billReference: '', originalInvoiceNumber: '', originalInvoiceDate: '' }],
    entries: [{ account: '', accountType: 'Sales', amount: '', narration: '', gst: { applicable: false, gstType: 'IGST', gstRate: '', gstAmount: '', outputGstAccount: '' }, tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' } }],
    narration: '',
    remarks: '',
    referenceNumber: '',
    creditNoteType: 'Sales Return'
  });

  // Fetch all companies
  const fetchAllCompanies = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/company/all?isActive=true&page=1&limit=100&sortBy=companyName&sortOrder=asc`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const companiesList = response.data?.companies || response.data?.data || [];
      setCompanies(companiesList);
      
      const defaultCompany = companiesList.find(c => c.isDefault) || companiesList[0];
      if (defaultCompany) {
        setCompanyId(defaultCompany._id || defaultCompany.id);
        return defaultCompany._id || defaultCompany.id;
      }
      return null;
    } catch (error) {
      console.error('Error fetching companies:', error);
      alertify.error(error.response?.data?.message || 'Failed to load companies');
      return null;
    }
  };

  // Fetch all ledgers for a company
  const fetchAllLedgers = async (companyIdParam) => {
    if (!companyIdParam) {
      setLedgers([]);
      return;
    }

    try {
      setLoadingLedgers(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/ledger/all?company=${companyIdParam}&page=1&limit=1000&sortBy=name&sortOrder=asc&isActive=true`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const ledgersList = response.data?.ledgers || response.data?.data || [];
      setLedgers(ledgersList);
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      alertify.error(error.response?.data?.message || 'Failed to load ledgers');
      setLedgers([]);
    } finally {
      setLoadingLedgers(false);
    }
  };

  // Credit Note API Functions
  const fetchCreditNoteData = async (filterParams = {}) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      let url = `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/credit-note/all`;
      
      const queryParams = new URLSearchParams();
      if (companyId) queryParams.append('company', companyId);
      if (filterParams.startDate) queryParams.append('startDate', filterParams.startDate);
      if (filterParams.endDate) queryParams.append('endDate', filterParams.endDate);
      if (filterParams.creditNoteType) queryParams.append('creditNoteType', filterParams.creditNoteType);
      if (filterParams.isPosted !== '') queryParams.append('isPosted', filterParams.isPosted === 'true');
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
      
      const response = await axios.get(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.vouchers || response.data?.data || [];
    } catch (error) {
      console.error('Error fetching credit note data:', error);
      throw error;
    }
  };

  const getCreditNoteById = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/credit-note/${voucherId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching credit note:', error);
      throw error;
    }
  };

  const createCreditNote = async (voucherData) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      const apiUrl = `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/credit-note/create`;
      console.log('=== CREATE CREDIT NOTE DEBUG ===');
      console.log('API URL:', apiUrl);
      console.log('Token exists:', !!token);
      console.log('Voucher Data:', JSON.stringify(voucherData, null, 2));
      
      const response = await axios.post(apiUrl, voucherData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      console.log('Response:', response);
      
      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to create credit note');
      }
      
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('=== CREATE CREDIT NOTE ERROR ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      console.error('Error request:', error.request);
      console.error('Error message:', error.message);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        const errorMsg = error.response.data?.message || error.response.data?.error || `Server error: ${error.response.status}`;
        throw new Error(errorMsg);
      } else if (error.request) {
        console.error('Request made but no response:', error.request);
        throw new Error('No response from server. Please check your internet connection.');
      } else {
        console.error('Error setting up request:', error.message);
        throw new Error(error.message || 'Failed to create credit note');
      }
    }
  };

  const updateCreditNote = async (voucherId, voucherData) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/credit-note/${voucherId}/update`, voucherData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating credit note:', error);
      throw error;
    }
  };

  const deleteCreditNote = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.delete(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/credit-note/${voucherId}/delete`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting credit note:', error);
      throw error;
    }
  };

  const postCreditNote = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/credit-note/${voucherId}/post`, {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error posting credit note:', error);
      throw error;
    }
  };

  const unpostCreditNote = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/credit-note/${voucherId}/unpost`, {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error unposting credit note:', error);
      throw error;
    }
  };

  // Fetch data based on filters
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchCreditNoteData(filters);
      setData(result);
      setFilteredData(result);
    } catch (error) {
      console.error('Error fetching credit note data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load credit note data';
      alertify.error(errorMessage);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [filters, companyId]);

  // Filter data based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredData(data);
    } else {
      const filtered = data.filter(item => {
        const searchableText = JSON.stringify(item).toLowerCase();
        return searchableText.includes(searchTerm.toLowerCase());
      });
      setFilteredData(filtered);
    }
  }, [searchTerm, data]);

  // Fetch companies on mount
  // Sync with parent selectedCompanyId
  useEffect(() => {
    if (selectedCompanyId && selectedCompanyId !== companyId) {
      setCompanyId(selectedCompanyId);
      setFormData(prev => ({ ...prev, company: selectedCompanyId }));
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    const loadCompanies = async () => {
      const defaultCompanyId = await fetchAllCompanies();
      if (defaultCompanyId && !selectedCompanyId) {
        setFormData(prev => ({ ...prev, company: defaultCompanyId }));
      } else if (selectedCompanyId) {
        setCompanyId(selectedCompanyId);
        setFormData(prev => ({ ...prev, company: selectedCompanyId }));
      }
    };
    loadCompanies();
  }, []);

  // Fetch ledgers when company changes
  useEffect(() => {
    if (companyId) {
      fetchAllLedgers(companyId);
    }
  }, [companyId]);

  // Fetch data when company changes
  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId, fetchData]);

  // Calculate total amounts
  const calculateTotals = () => {
    const customerTotal = formData.customers.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const entryTotal = formData.entries.reduce((sum, e) => {
      const baseAmount = parseFloat(e.amount) || 0;
      const gstAmount = e.gst.applicable ? (parseFloat(e.gst.gstAmount) || 0) : 0;
      const tdsAmount = e.tds.applicable ? (parseFloat(e.tds.amount) || 0) : 0;
      // For Credit Note: Subtract GST and TDS from base amount
      return sum + baseAmount - gstAmount - tdsAmount;
    }, 0);
    return { customerTotal, entryTotal };
  };

  // Add customer
  const addCustomer = () => {
    setFormData({
      ...formData,
      customers: [...formData.customers, { account: '', amount: '', narration: '', billWise: 'On Account', billReference: '', originalInvoiceNumber: '', originalInvoiceDate: '' }]
    });
  };

  // Remove customer
  const removeCustomer = (index) => {
    if (formData.customers.length > 1) {
      const newCustomers = formData.customers.filter((_, i) => i !== index);
      setFormData({ ...formData, customers: newCustomers });
    }
  };

  // Update customer
  const updateCustomer = (index, field, value) => {
    const newCustomers = [...formData.customers];
    newCustomers[index][field] = value;
    setFormData({ ...formData, customers: newCustomers });
  };

  // Add entry
  const addEntry = () => {
    setFormData({
      ...formData,
      entries: [...formData.entries, { account: '', accountType: 'Sales', amount: '', narration: '', gst: { applicable: false, gstType: 'IGST', gstRate: '', gstAmount: '', outputGstAccount: '' }, tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' } }]
    });
  };

  // Remove entry
  const removeEntry = (index) => {
    if (formData.entries.length > 1) {
      const newEntries = formData.entries.filter((_, i) => i !== index);
      setFormData({ ...formData, entries: newEntries });
    }
  };

  // Update entry
  const updateEntry = (index, field, value) => {
    const newEntries = [...formData.entries];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      newEntries[index][parent][child] = value;
      
      // Auto-calculate GST amount
      if (parent === 'gst' && child === 'gstRate' && newEntries[index].amount) {
        const amount = parseFloat(newEntries[index].amount) || 0;
        const rate = parseFloat(value) || 0;
        newEntries[index].gst.gstAmount = ((amount * rate) / 100).toFixed(2);
      }
      
      // Auto-calculate TDS amount
      if (parent === 'tds' && child === 'rate' && newEntries[index].amount) {
        const amount = parseFloat(newEntries[index].amount) || 0;
        const rate = parseFloat(value) || 0;
        newEntries[index].tds.amount = ((amount * rate) / 100).toFixed(2);
      }
    } else {
      newEntries[index][field] = value;
      
      // Recalculate GST if amount changes
      if (field === 'amount' && newEntries[index].gst.applicable && newEntries[index].gst.gstRate) {
        const amount = parseFloat(value) || 0;
        const rate = parseFloat(newEntries[index].gst.gstRate) || 0;
        newEntries[index].gst.gstAmount = ((amount * rate) / 100).toFixed(2);
      }
      
      // Recalculate TDS if amount changes
      if (field === 'amount' && newEntries[index].tds.applicable && newEntries[index].tds.rate) {
        const amount = parseFloat(value) || 0;
        const rate = parseFloat(newEntries[index].tds.rate) || 0;
        newEntries[index].tds.amount = ((amount * rate) / 100).toFixed(2);
      }
    }
    setFormData({ ...formData, entries: newEntries });
  };

  // Handle create credit note
  const handleCreateCreditNote = () => {
    const defaultCompanyId = selectedCompanyId || companyId || (companies.length > 0 ? (companies[0]._id || companies[0].id) : '');
    
    setFormData({
      company: defaultCompanyId,
      voucherDate: new Date().toISOString().split('T')[0],
      voucherNumber: '',
      customers: [{ account: '', amount: '', narration: '', billWise: 'On Account', billReference: '', originalInvoiceNumber: '', originalInvoiceDate: '' }],
      entries: [{ account: '', accountType: 'Sales', amount: '', narration: '', gst: { applicable: false, gstType: 'IGST', gstRate: '', gstAmount: '', outputGstAccount: '' }, tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' } }],
      narration: '',
      remarks: '',
      referenceNumber: '',
      creditNoteType: 'Sales Return'
    });
    setShowCreateModal(true);
    if (defaultCompanyId) {
      fetchAllLedgers(defaultCompanyId);
    }
  };

  // Handle edit credit note
  const handleEditCreditNote = async (voucher) => {
    try {
      setShowEditModal(true);
      setLoading(true);
      const voucherData = await getCreditNoteById(voucher._id || voucher.id);
      
      const editCompanyId = selectedCompanyId || voucherData.company?._id || voucherData.company || companyId || '';
      
      setFormData({
        company: editCompanyId,
        voucherDate: voucherData.voucherDate ? new Date(voucherData.voucherDate).toISOString().split('T')[0] : '',
        voucherNumber: voucherData.voucherNumber || '',
        customers: voucherData.customers?.map(c => ({
          account: c.account?._id || c.account || '',
          amount: c.amount || '',
          narration: c.narration || '',
          billWise: c.billWise || 'On Account',
          billReference: c.billReference || '',
          originalInvoiceNumber: c.originalInvoiceNumber || '',
          originalInvoiceDate: c.originalInvoiceDate ? new Date(c.originalInvoiceDate).toISOString().split('T')[0] : ''
        })) || [{ account: '', amount: '', narration: '', billWise: 'On Account', billReference: '', originalInvoiceNumber: '', originalInvoiceDate: '' }],
        entries: voucherData.entries?.map(e => ({
          account: e.account?._id || e.account || '',
          accountType: e.accountType || 'Sales',
          amount: e.amount || '',
          narration: e.narration || '',
          gst: {
            applicable: e.gst?.applicable || false,
            gstType: e.gst?.gstType || 'IGST',
            gstRate: e.gst?.gstRate || '',
            gstAmount: e.gst?.gstAmount || '',
            outputGstAccount: e.gst?.outputGstAccount?._id || e.gst?.outputGstAccount || ''
          },
          tds: {
            applicable: e.tds?.applicable || false,
            section: e.tds?.section || '',
            rate: e.tds?.rate || '',
            amount: e.tds?.amount || '',
            tdsAccount: e.tds?.tdsAccount?._id || e.tds?.tdsAccount || ''
          }
        })) || [{ account: '', accountType: 'Sales', amount: '', narration: '', gst: { applicable: false, gstType: 'IGST', gstRate: '', gstAmount: '', outputGstAccount: '' }, tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' } }],
        narration: voucherData.narration || '',
        remarks: voucherData.remarks || '',
        referenceNumber: voucherData.referenceNumber || '',
        creditNoteType: voucherData.creditNoteType || 'Sales Return'
      });
      
      if (editCompanyId) {
        fetchAllLedgers(editCompanyId);
      }
      
      setSelectedVoucher(voucher);
    } catch (err) {
      console.error('Error loading voucher:', err);
      alertify.error(err.response?.data?.message || err.message || 'Failed to load voucher details');
      setShowEditModal(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle view credit note
  const handleViewCreditNote = async (voucher) => {
    try {
      setLoading(true);
      const voucherData = await getCreditNoteById(voucher._id || voucher.id);
      setSelectedVoucher(voucherData);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error loading voucher:', err);
      alertify.error(err.response?.data?.message || err.message || 'Failed to load voucher details');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete credit note
  const handleDeleteCreditNote = async (voucher) => {
    if (window.confirm('Are you sure you want to delete this credit note?')) {
      try {
        setLoading(true);
        await deleteCreditNote(voucher._id || voucher.id);
        alertify.success('Credit note deleted successfully');
        fetchData();
      } catch (error) {
        alertify.error(error.response?.data?.message || error.message || 'Failed to delete credit note');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle post credit note
  const handlePostCreditNote = async (voucher) => {
    try {
      setLoading(true);
      await postCreditNote(voucher._id || voucher.id);
      alertify.success('Credit note posted successfully');
      fetchData();
    } catch (error) {
      alertify.error(error.response?.data?.message || error.message || 'Failed to post credit note');
    } finally {
      setLoading(false);
    }
  };

  // Handle unpost credit note
  const handleUnpostCreditNote = async (voucher) => {
    try {
      setLoading(true);
      await unpostCreditNote(voucher._id || voucher.id);
      alertify.success('Credit note unposted successfully');
      fetchData();
    } catch (error) {
      alertify.error(error.response?.data?.message || error.message || 'Failed to unpost credit note');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submit (create/update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('=== HANDLE SUBMIT CALLED ===');
    console.log('Form Data:', formData);
    console.log('Company ID:', companyId);
    console.log('Show Edit Modal:', showEditModal);
    console.log('Show Create Modal:', showCreateModal);
    
    const selectedCompany = formData.company || companyId;
    if (!selectedCompany || selectedCompany.trim() === '') {
      alertify.error('Please select a Company');
      return;
    }
    
    if (!formData.voucherDate || formData.voucherDate.trim() === '') {
      alertify.error('Please select a Voucher Date');
      return;
    }
    
    if (formData.customers.length === 0) {
      alertify.error('At least one customer entry is required');
      return;
    }
    
    if (formData.entries.length === 0) {
      alertify.error('At least one debit entry is required');
      return;
    }
    
    // Validate customers
    for (let i = 0; i < formData.customers.length; i++) {
      const customer = formData.customers[i];
      if (!customer.account || customer.account.trim() === '') {
        alertify.error(`Please select Customer Account for Customer ${i + 1}`);
        return;
      }
      const amount = parseFloat(customer.amount);
      if (isNaN(amount) || amount <= 0) {
        alertify.error(`Please enter a valid Amount for Customer ${i + 1}`);
        return;
      }
    }
    
    // Validate entries
    for (let i = 0; i < formData.entries.length; i++) {
      const entry = formData.entries[i];
      if (!entry.account || entry.account.trim() === '') {
        alertify.error(`Please select Account for Entry ${i + 1}`);
        return;
      }
      const amount = parseFloat(entry.amount);
      if (isNaN(amount) || amount <= 0) {
        alertify.error(`Please enter a valid Amount for Entry ${i + 1}`);
        return;
      }
    }
    
    // Validate balance
    const { customerTotal, entryTotal } = calculateTotals();
    if (Math.abs(customerTotal - entryTotal) > 0.01) {
      alertify.error(`Credit Note must balance: Customer Total (₹${customerTotal.toFixed(2)}) must equal Entry Total (₹${entryTotal.toFixed(2)})`);
      return;
    }
    
    try {
      setLoading(true);
      
      const voucherData = {
        company: selectedCompany,
        voucherDate: formData.voucherDate,
        customers: formData.customers.map(c => {
          const customerData = {
            account: c.account,
            amount: parseFloat(c.amount)
          };
          if (c.narration && c.narration.trim() !== '') customerData.narration = c.narration.trim();
          if (c.billWise && c.billWise !== 'On Account') customerData.billWise = c.billWise;
          if (c.billReference && c.billReference.trim() !== '') customerData.billReference = c.billReference.trim();
          if (c.originalInvoiceNumber && c.originalInvoiceNumber.trim() !== '') customerData.originalInvoiceNumber = c.originalInvoiceNumber.trim();
          if (c.originalInvoiceDate && c.originalInvoiceDate.trim() !== '') customerData.originalInvoiceDate = c.originalInvoiceDate;
          return customerData;
        }),
        entries: formData.entries.map(e => {
          const entryData = {
            account: e.account,
            accountType: e.accountType,
            amount: parseFloat(e.amount)
          };
          if (e.narration && e.narration.trim() !== '') entryData.narration = e.narration.trim();
          
          if (e.gst.applicable) {
            entryData.gst = {
              applicable: true,
              gstType: e.gst.gstType,
              gstRate: parseFloat(e.gst.gstRate),
              gstAmount: parseFloat(e.gst.gstAmount)
            };
            if (e.gst.outputGstAccount && e.gst.outputGstAccount.trim() !== '') {
              entryData.gst.outputGstAccount = e.gst.outputGstAccount;
            }
          }
          
          if (e.tds.applicable) {
            entryData.tds = {
              applicable: true,
              section: e.tds.section,
              rate: parseFloat(e.tds.rate),
              amount: parseFloat(e.tds.amount)
            };
            if (e.tds.tdsAccount && e.tds.tdsAccount.trim() !== '') {
              entryData.tds.tdsAccount = e.tds.tdsAccount;
            }
          }
          
          return entryData;
        }),
        creditNoteType: formData.creditNoteType
      };

      if (formData.voucherNumber && formData.voucherNumber.trim() !== '') {
        voucherData.voucherNumber = formData.voucherNumber.trim();
      }
      if (formData.narration && formData.narration.trim() !== '') {
        voucherData.narration = formData.narration.trim();
      }
      if (formData.remarks && formData.remarks.trim() !== '') {
        voucherData.remarks = formData.remarks.trim();
      }
      if (formData.referenceNumber && formData.referenceNumber.trim() !== '') {
        voucherData.referenceNumber = formData.referenceNumber.trim();
      }

      console.log('=== ABOUT TO CALL API ===');
      console.log('Is Edit Mode:', showEditModal && selectedVoucher);
      console.log('Final Voucher Data:', JSON.stringify(voucherData, null, 2));
      
      if (showEditModal && selectedVoucher) {
        console.log('Calling UPDATE API...');
        await updateCreditNote(selectedVoucher._id || selectedVoucher.id, voucherData);
        alertify.success('Credit note updated successfully');
        setShowEditModal(false);
        setSelectedVoucher(null);
      } else {
        console.log('Calling CREATE API...');
        await createCreditNote(voucherData);
        alertify.success('Credit note created successfully');
        setShowCreateModal(false);
      }
      
      await fetchData();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alertify.error(error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save credit note');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter apply
  const handleApplyFilters = () => {
    fetchData();
    setShowFilterModal(false);
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      creditNoteType: '',
      isPosted: ''
    });
    fetchData();
    setShowFilterModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Create Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Credit Notes</p>
                <p className="text-xl font-bold text-gray-800">{filteredData.length}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Company Selector - Now in TallyManagement Sidebar */}
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search credit notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Date Range Button */}
          <button
            onClick={() => setShowCustomRange(true)}
            className="flex items-center gap-2 px-4 py-2 border border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
          >
            <Calendar size={18} className="text-blue-600" />
            <span className="text-sm font-medium">
              {format(range.startDate, 'dd MMM yyyy')} - {format(range.endDate, 'dd MMM yyyy')}
            </span>
          </button>
          
          {/* Status Filter Button */}
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold shadow hover:bg-gray-50 transition"
          >
            <Filter size={20} /> Status Filter
          </button>
          
          {/* Create Credit Note Button */}
          <button
            onClick={handleCreateCreditNote}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition"
          >
            <PlusCircle size={20} /> Create Credit Note
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12">
            <div className="flex justify-center items-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading credit notes...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Voucher Number</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Customers</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Type</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Amount</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((item, index) => {
                    const voucherId = item._id || item.id || 'N/A';
                    const voucherNumber = item.voucherNumber || 'N/A';
                    const voucherDate = item.voucherDate || item.date || '';
                    const customers = item.customers || [];
                    const customerNames = customers.map(c => c.account?.name || c.account || 'N/A').join(', ');
                    const creditNoteType = item.creditNoteType || 'N/A';
                    const totalAmount = item.totalAmount || 0;
                    const isPosted = item.isPosted !== undefined ? item.isPosted : false;
                    
                    return (
                      <tr
                        key={voucherId}
                        className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700">{voucherNumber}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700">
                            {voucherDate ? new Date(voucherDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700 text-sm">{customerNames || 'N/A'}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {creditNoteType}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700">
                            ₹{Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isPosted
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {isPosted ? 'Posted' : 'Unposted'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewCreditNote(item)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEditCreditNote(item)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              Edit
                            </button>
                            {isPosted ? (
                              <button
                                onClick={() => handleUnpostCreditNote(item)}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Unpost
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePostCreditNote(item)}
                                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Post
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteCreditNote(item)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg">
                          {searchTerm
                            ? 'No credit notes found matching your search'
                            : 'No credit notes found'}
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          {searchTerm
                            ? 'Try adjusting your search terms'
                            : 'Create your first credit note to get started'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Credit Note Modal */}
      {(showCreateModal || showEditModal) && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-[9999] flex justify-center items-center p-4"
          onClick={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedVoucher(null);
          }}
        >
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    {showEditModal ? <Edit className="text-white" size={24} /> : <PlusCircle className="text-white" size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{showEditModal ? 'Edit Credit Note' : 'Create Credit Note'}</h2>
                    <p className="text-blue-100">{showEditModal ? 'Update credit note details' : 'Add a new credit note'}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedVoucher(null);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Company Section */}
              {companies.length > 0 && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-800 mb-4">Company Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <select
                        required
                        value={formData.company}
                        onChange={(e) => {
                          if (selectedCompanyId) return;
                          const value = e.target.value;
                          setFormData({ ...formData, company: value });
                          setCompanyId(value);
                          if (value) {
                            fetchAllLedgers(value);
                          } else {
                            setLedgers([]);
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!!selectedCompanyId}
                      >
                        <option value="">Select Company *</option>
                        {companies.map((company) => (
                          <option key={company._id || company.id} value={company._id || company.id}>
                            {company.companyName} {company.isDefault ? '(Default)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Basic Details Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Basic Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.voucherDate}
                      onChange={(e) => setFormData({ ...formData, voucherDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Number</label>
                    <input
                      type="text"
                      value={formData.voucherNumber}
                      onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                      placeholder="Auto-generated if empty"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div> */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Credit Note Type *</label>
                    <select
                      required
                      value={formData.creditNoteType}
                      onChange={(e) => setFormData({ ...formData, creditNoteType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Sales Return">Sales Return</option>
                      <option value="Price Reduction">Price Reduction</option>
                      <option value="Quality Issue">Quality Issue</option>
                      <option value="Additional Discount">Additional Discount</option>
                      <option value="Adjustment">Adjustment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                    <input
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="Reference number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Customers Section (Credit Side) */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-green-800">Customers (Credit Side)</h3>
                
                </div>
                {formData.customers.map((customer, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg mb-3 border border-green-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-700">Customer {index + 1}</h4>
                      {formData.customers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCustomer(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">Sales Account Name *</label>
                          <button
                            type="button"
                            onClick={() => setShowLedgerCreateModal(true)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                          >
                            + Create Ledger
                          </button>
                        </div>
                        <SearchableDropdown
                          value={customer.account}
                          onChange={(value) => updateCustomer(index, 'account', value)}
                          options={ledgers
                            .filter(l => l.accountType === 'Sales')
                            .map(ledger => ({
                              value: ledger._id || ledger.id,
                              label: `${ledger.name} (${ledger.accountType})`
                            }))}
                          placeholder="Select Customer *"
                          searchPlaceholder="Search customers..."
                          loading={loadingLedgers}
                          disabled={loadingLedgers}
                          compact={true}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                        <input
                          type="number"
                          required
                          step="0.01"
                          min="0.01"
                          value={customer.amount}
                          onChange={(e) => updateCustomer(index, 'amount', e.target.value)}
                          placeholder="Enter amount"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bill Wise</label>
                        <select
                          value={customer.billWise}
                          onChange={(e) => updateCustomer(index, 'billWise', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="On Account">On Account</option>
                          <option value="Against Ref">Against Ref</option>
                          <option value="New Ref">New Ref</option>
                          <option value="Advance">Advance</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bill Reference</label>
                        <input
                          type="text"
                          value={customer.billReference}
                          onChange={(e) => updateCustomer(index, 'billReference', e.target.value)}
                          placeholder="Bill reference"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Original Invoice Number</label>
                        <input
                          type="text"
                          value={customer.originalInvoiceNumber}
                          onChange={(e) => updateCustomer(index, 'originalInvoiceNumber', e.target.value)}
                          placeholder="Original invoice number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Original Invoice Date</label>
                        <input
                          type="date"
                          value={customer.originalInvoiceDate}
                          onChange={(e) => updateCustomer(index, 'originalInvoiceDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                        <input
                          type="text"
                          value={customer.narration}
                          onChange={(e) => updateCustomer(index, 'narration', e.target.value)}
                          placeholder="Description for this customer"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                  <button
                    type="button"
                    onClick={addCustomer}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
                  >
                    <Plus size={16} /> Add Customer
                  </button>
              </div>

              {/* Entries Section (Debit Side) */}
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-red-800">Debit Entries (Sales/Income)</h3>
                
                </div>
                {formData.entries.map((entry, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg mb-3 border border-red-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-700">Entry {index + 1}</h4>
                      {formData.entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">Sundry Debtor Account *</label>
                          <button
                            type="button"
                            onClick={() => setShowLedgerCreateModal(true)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                          >
                            + Create Ledger
                          </button>
                        </div>
                        <SearchableDropdown
                          value={entry.account}
                          onChange={(value) => updateEntry(index, 'account', value)}
                          options={ledgers
                            .filter(l => l.accountType === 'Sundry Debtor')
                            .map(ledger => ({
                              value: ledger._id || ledger.id,
                              label: `${ledger.name} (${ledger.accountType})`
                            }))}
                          placeholder="Select Account *"
                          searchPlaceholder="Search accounts..."
                          loading={loadingLedgers}
                          disabled={loadingLedgers}
                          compact={true}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Account Type *</label>
                        <select
                          required
                          value={entry.accountType}
                          onChange={(e) => updateEntry(index, 'accountType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="Sales">Sales</option>
                          <option value="Income">Income</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                        <input
                          type="number"
                          required
                          step="0.01"
                          min="0.01"
                          value={entry.amount}
                          onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                          placeholder="Enter amount"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                        <input
                          type="text"
                          value={entry.narration}
                          onChange={(e) => updateEntry(index, 'narration', e.target.value)}
                          placeholder="Description for this entry"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      
                      {/* GST Section */}
                      <div className="col-span-2 bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={entry.gst.applicable}
                            onChange={(e) => updateEntry(index, 'gst.applicable', e.target.checked)}
                            className="w-4 h-4"
                          />
                          <label className="text-sm font-medium text-gray-700">GST Applicable (Output GST Reversal)</label>
                        </div>
                        {entry.gst.applicable && (
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">GST Type</label>
                              <select
                                value={entry.gst.gstType}
                                onChange={(e) => updateEntry(index, 'gst.gstType', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="IGST">IGST</option>
                                <option value="CGST+SGST">CGST+SGST</option>
                                <option value="None">None</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">GST Rate (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={entry.gst.gstRate}
                                onChange={(e) => updateEntry(index, 'gst.gstRate', e.target.value)}
                                placeholder="Rate"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">GST Amount</label>
                              <input
                                type="number"
                                step="0.01"
                                value={entry.gst.gstAmount}
                                onChange={(e) => updateEntry(index, 'gst.gstAmount', e.target.value)}
                                placeholder="Amount"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Output GST Account</label>
                              <SearchableDropdown
                                value={entry.gst.outputGstAccount}
                                onChange={(value) => updateEntry(index, 'gst.outputGstAccount', value)}
                                options={ledgers.filter(l => l.accountType === 'Duties & Taxes').map(ledger => ({
                                  value: ledger._id || ledger.id,
                                  label: ledger.name
                                }))}
                                placeholder="GST Account"
                                loading={loadingLedgers}
                                disabled={loadingLedgers}
                                compact={true}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* TDS Section */}
                      <div className="col-span-2 bg-yellow-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={entry.tds.applicable}
                            onChange={(e) => updateEntry(index, 'tds.applicable', e.target.checked)}
                            className="w-4 h-4"
                          />
                          <label className="text-sm font-medium text-gray-700">TDS Applicable</label>
                        </div>
                        {entry.tds.applicable && (
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">TDS Section</label>
                              <input
                                type="text"
                                value={entry.tds.section}
                                onChange={(e) => updateEntry(index, 'tds.section', e.target.value)}
                                placeholder="e.g., 194C"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">TDS Rate (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={entry.tds.rate}
                                onChange={(e) => updateEntry(index, 'tds.rate', e.target.value)}
                                placeholder="Rate"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">TDS Amount</label>
                              <input
                                type="number"
                                step="0.01"
                                value={entry.tds.amount}
                                onChange={(e) => updateEntry(index, 'tds.amount', e.target.value)}
                                placeholder="Amount"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">TDS Account</label>
                              <SearchableDropdown
                                value={entry.tds.tdsAccount}
                                onChange={(value) => updateEntry(index, 'tds.tdsAccount', value)}
                                options={ledgers.filter(l => l.accountType === 'Duties & Taxes').map(ledger => ({
                                  value: ledger._id || ledger.id,
                                  label: ledger.name
                                }))}
                                placeholder="TDS Account"
                                loading={loadingLedgers}
                                disabled={loadingLedgers}
                                compact={true}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                  <button
                    type="button"
                    onClick={addEntry}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                  >
                    <Plus size={16} /> Add Entry
                  </button>
              </div>

              {/* Additional Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                    <textarea
                      value={formData.narration}
                      onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                      placeholder="Overall narration for the credit note"
                      rows="2"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div> */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="Additional remarks"
                      rows="2"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Balance Summary */}
              <div className="bg-gradient-to-r from-blue-100 to-green-100 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Balance Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Customer Total (Credit)</p>
                    <p className="text-xl font-bold text-green-600">
                      ₹{calculateTotals().customerTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Entry Total (Debit)</p>
                    <p className="text-xl font-bold text-red-600">
                      ₹{calculateTotals().entryTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Difference</p>
                    <p className={`text-xl font-bold ${Math.abs(calculateTotals().customerTotal - calculateTotals().entryTotal) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Math.abs(calculateTotals().customerTotal - calculateTotals().entryTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                {Math.abs(calculateTotals().customerTotal - calculateTotals().entryTotal) > 0.01 && (
                  <div className="mt-3 bg-red-100 border border-red-300 rounded-lg p-3">
                    <p className="text-sm text-red-800 font-medium">⚠️ Credit Note is not balanced. Customer Total must equal Entry Total.</p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-800 mb-1">Credit Note Information</h4>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• Customers are credited (Credit side) - typically Sundry Debtors</li>
                      <li>• Entries are debited (Debit side) - Sales/Income accounts</li>
                      <li>• Total Customer Amount must equal Total Entry Amount (including GST)</li>
                      <li>• GST reversal: Output GST is debited when goods are returned</li>
                      <li>• Used for sales returns, price reductions, quality issues, etc.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedVoucher(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : showEditModal ? 'Update Credit Note' : 'Create Credit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CreateLedgerModal
        isOpen={showLedgerCreateModal}
        onClose={() => setShowLedgerCreateModal(false)}
        selectedCompanyId={formData.company || companyId}
        onCreated={() => {
          const cid = formData.company || companyId;
          if (cid) fetchAllLedgers(cid);
        }}
      />

      {/* View Credit Note Modal */}
      {showViewModal && selectedVoucher && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => {
            setShowViewModal(false);
            setSelectedVoucher(null);
          }}
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
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Credit Note Details</h2>
                    <p className="text-blue-100">View credit note information</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedVoucher(null);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Voucher Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Voucher Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-white p-4 border border-green-200 rounded-2xl">
                  <div>
                    <p className="text-sm text-gray-600">Voucher Number</p>
                    <p className="text-base font-semibold text-gray-900">{selectedVoucher.voucherNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Voucher Date</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedVoucher.voucherDate ? new Date(selectedVoucher.voucherDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Company</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedVoucher.company?.companyName || selectedVoucher.company || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Credit Note Type</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {selectedVoucher.creditNoteType || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedVoucher.isPosted
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {selectedVoucher.isPosted ? 'Posted' : 'Unposted'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-xl font-bold text-blue-600">
                      ₹{Number(selectedVoucher.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customers */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Customers (Credit Side)</h3>
                {selectedVoucher.customers?.map((customer, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg mb-2 border border-blue-200 rounded-3xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{customer.account?.name || customer.account || 'N/A'}</p>
                        
                        {customer.originalInvoiceNumber && (
                          <p className="text-sm text-gray-900 mt-1">Original Invoice: {customer.originalInvoiceNumber}</p>
                        )}
                        {customer.narration && <p className="text-sm text-gray-600 mt-1">{customer.narration}</p>}
                      </div>
                      <p className="text-lg font-bold text-green-600">
                        ₹{Number(customer.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Entries */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800 mb-4">Debit Entries</h3>
                {selectedVoucher.entries?.map((entry, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg mb-2 border border-red-200 rounded-2xl">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{entry.account?.name || entry.account || 'N/A'}</p>
                        <p className="text-xs text-gray-500">Type: {entry.accountType || 'N/A'}</p>
                        {entry.narration && <p className="text-sm text-gray-600 mt-1">{entry.narration}</p>}
                        {entry.gst?.applicable && (
                          <div className="mt-2 text-xs text-blue-600">
                            GST: {entry.gst.gstType} @ {entry.gst.gstRate}% = ₹{Number(entry.gst.gstAmount || 0).toFixed(2)}
                          </div>
                        )}
                        {entry.tds?.applicable && (
                          <div className="mt-1 text-xs text-yellow-600">
                            TDS: Section {entry.tds.section} @ {entry.tds.rate}% = ₹{Number(entry.tds.amount || 0).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          ₹{Number(entry.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {entry.gst?.applicable && (
                          <p className="text-sm text-gray-600">
                            + GST: ₹{Number(entry.gst.gstAmount || 0).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Details */}
             {(selectedVoucher.narration || selectedVoucher.remarks || selectedVoucher.referenceNumber) && (
  <div className="bg-gray-50 p-4 rounded-lg">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Details</h3>

    <div className="grid grid-cols-3 md:grid-cols-3 gap-6 bg-white p-4 border border-gray-300 rounded-2xl">

      {selectedVoucher.referenceNumber && (
        <div>
          <p className="text-sm text-gray-600">Reference Number</p>
          <p className="text-base font-semibold text-gray-900">
            {selectedVoucher.referenceNumber}
          </p>
        </div>
      )}

      {selectedVoucher.narration && (
        <div>
          <p className="text-sm text-gray-600">Narration</p>
          <p className="text-base text-gray-900">
            {selectedVoucher.narration}
          </p>
        </div>
      )}

      {selectedVoucher.remarks && (
        <div>
          <p className="text-sm text-gray-600">Remarks</p>
          <p className="text-base text-gray-900">
            {selectedVoucher.remarks}
          </p>
        </div>
      )}

    </div>
  </div>
)}


              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedVoucher(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditCreditNote(selectedVoucher);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg text-white font-semibold shadow hover:from-green-600 hover:to-green-700 transition"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Modal */}
      {showCustomRange && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Date Range</h3>
            <DateRange
              ranges={[range]}
              onChange={(item) => setRange(item.selection)}
              moveRangeOnFirstSelection={false}
              months={2}
              direction="horizontal"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  setShowCustomRange(false);
                  setRange(getDefaultDateRange());
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowCustomRange(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter Modal */}
      {showFilterModal && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowFilterModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Filter className="text-white" size={24} />
                  <h2 className="text-xl font-bold">Filter Credit Notes</h2>
                </div>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Credit Note Type</label>
                <select
                  value={filters.creditNoteType}
                  onChange={(e) => setFilters({ ...filters, creditNoteType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="Sales Return">Sales Return</option>
                  <option value="Price Reduction">Price Reduction</option>
                  <option value="Quality Issue">Quality Issue</option>
                  <option value="Additional Discount">Additional Discount</option>
                  <option value="Adjustment">Adjustment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.isPosted}
                  onChange={(e) => setFilters({ ...filters, isPosted: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Posted</option>
                  <option value="false">Unposted</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
