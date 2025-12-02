import { useEffect, useState, useCallback } from 'react';
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
  const dropdownRef = useState(null);

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
  
  const paddingClass = compact ? 'px-3 py-2' : 'px-4 py-3';
  const borderClass = 'border-gray-300';
  const textSizeClass = compact ? 'text-sm' : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full ${paddingClass} border ${borderClass} rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
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

export default function DebitNoteVoucher({ selectedCompanyId = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    debitNoteType: '',
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
    suppliers: [{ account: '', amount: '', narration: '', billWise: 'On Account', billReference: '', originalInvoiceNumber: '', originalInvoiceDate: '' }],
    entries: [{ account: '', accountType: 'Purchase', amount: '', narration: '', gst: { applicable: false, gstType: 'IGST', gstRate: '', gstAmount: '', inputGstAccount: '' }, tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' } }],
    narration: '',
    remarks: '',
    referenceNumber: '',
    debitNoteType: 'Purchase Return'
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

  // Debit Note API Functions
  const fetchDebitNoteData = async (filterParams = {}) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      let url = `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/debit-note/all`;
      
      const queryParams = new URLSearchParams();
      if (companyId) queryParams.append('company', companyId);
      if (filterParams.startDate) queryParams.append('startDate', filterParams.startDate);
      if (filterParams.endDate) queryParams.append('endDate', filterParams.endDate);
      if (filterParams.debitNoteType) queryParams.append('debitNoteType', filterParams.debitNoteType);
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
      console.error('Error fetching debit note data:', error);
      throw error;
    }
  };

  const getDebitNoteById = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/debit-note/${voucherId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching debit note:', error);
      throw error;
    }
  };

  const createDebitNote = async (voucherData) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      const apiUrl = `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/debit-note/create`;
      console.log('Creating debit note with data:', JSON.stringify(voucherData, null, 2));
      
      const response = await axios.post(apiUrl, voucherData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to create debit note');
      }
      
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error creating debit note:', error);
      
      if (error.response) {
        const errorMsg = error.response.data?.message || error.response.data?.error || `Server error: ${error.response.status}`;
        throw new Error(errorMsg);
      } else if (error.request) {
        throw new Error('No response from server. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Failed to create debit note');
      }
    }
  };

  const updateDebitNote = async (voucherId, voucherData) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/debit-note/${voucherId}/update`, voucherData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating debit note:', error);
      throw error;
    }
  };

  const deleteDebitNote = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.delete(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/debit-note/${voucherId}/delete`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting debit note:', error);
      throw error;
    }
  };

  const postDebitNote = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/debit-note/${voucherId}/post`, {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error posting debit note:', error);
      throw error;
    }
  };

  const unpostDebitNote = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/debit-note/${voucherId}/unpost`, {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error unposting debit note:', error);
      throw error;
    }
  };

  // Fetch data based on filters
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchDebitNoteData(filters);
      setData(result);
      setFilteredData(result);
    } catch (error) {
      console.error('Error fetching debit note data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load debit note data';
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
    const supplierTotal = formData.suppliers.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    const entryTotal = formData.entries.reduce((sum, e) => {
      const baseAmount = parseFloat(e.amount) || 0;
      const gstAmount = e.gst.applicable ? (parseFloat(e.gst.gstAmount) || 0) : 0;
      return sum + baseAmount + gstAmount;
    }, 0);
    return { supplierTotal, entryTotal };
  };

  // Add supplier
  const addSupplier = () => {
    setFormData({
      ...formData,
      suppliers: [...formData.suppliers, { account: '', amount: '', narration: '', billWise: 'On Account', billReference: '', originalInvoiceNumber: '', originalInvoiceDate: '' }]
    });
  };

  // Remove supplier
  const removeSupplier = (index) => {
    if (formData.suppliers.length > 1) {
      const newSuppliers = formData.suppliers.filter((_, i) => i !== index);
      setFormData({ ...formData, suppliers: newSuppliers });
    }
  };

  // Update supplier
  const updateSupplier = (index, field, value) => {
    const newSuppliers = [...formData.suppliers];
    newSuppliers[index][field] = value;
    setFormData({ ...formData, suppliers: newSuppliers });
  };

  // Add entry
  const addEntry = () => {
    setFormData({
      ...formData,
      entries: [...formData.entries, { account: '', accountType: 'Purchase', amount: '', narration: '', gst: { applicable: false, gstType: 'IGST', gstRate: '', gstAmount: '', inputGstAccount: '' }, tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' } }]
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

  // Handle create debit note
  const handleCreateDebitNote = () => {
    const defaultCompanyId = companyId || (companies.length > 0 ? (companies[0]._id || companies[0].id) : '');
    
    setFormData({
      company: defaultCompanyId,
      voucherDate: new Date().toISOString().split('T')[0],
      voucherNumber: '',
      suppliers: [{ account: '', amount: '', narration: '', billWise: 'On Account', billReference: '', originalInvoiceNumber: '', originalInvoiceDate: '' }],
      entries: [{ account: '', accountType: 'Purchase', amount: '', narration: '', gst: { applicable: false, gstType: 'IGST', gstRate: '', gstAmount: '', inputGstAccount: '' }, tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' } }],
      narration: '',
      remarks: '',
      referenceNumber: '',
      debitNoteType: 'Purchase Return'
    });
    
    if (defaultCompanyId) {
      fetchAllLedgers(defaultCompanyId);
    }
    setShowCreateModal(true);
  };

  // Handle edit debit note
  const handleEditDebitNote = async (voucher) => {
    try {
      setLoading(true);
      const voucherData = await getDebitNoteById(voucher._id || voucher.id);
      
      const editCompanyId = voucherData.company?._id || voucherData.company || companyId || '';
      
      setFormData({
        company: editCompanyId,
        voucherDate: voucherData.voucherDate ? new Date(voucherData.voucherDate).toISOString().split('T')[0] : '',
        voucherNumber: voucherData.voucherNumber || '',
        suppliers: voucherData.suppliers?.map(s => ({
          account: s.account?._id || s.account || '',
          amount: s.amount || '',
          narration: s.narration || '',
          billWise: s.billWise || 'On Account',
          billReference: s.billReference || '',
          originalInvoiceNumber: s.originalInvoiceNumber || '',
          originalInvoiceDate: s.originalInvoiceDate ? new Date(s.originalInvoiceDate).toISOString().split('T')[0] : ''
        })) || [{ account: '', amount: '', narration: '', billWise: 'On Account', billReference: '', originalInvoiceNumber: '', originalInvoiceDate: '' }],
        entries: voucherData.entries?.map(e => ({
          account: e.account?._id || e.account || '',
          accountType: e.accountType || 'Purchase',
          amount: e.amount || '',
          narration: e.narration || '',
          gst: {
            applicable: e.gst?.applicable || false,
            gstType: e.gst?.gstType || 'IGST',
            gstRate: e.gst?.gstRate || '',
            gstAmount: e.gst?.gstAmount || '',
            inputGstAccount: e.gst?.inputGstAccount?._id || e.gst?.inputGstAccount || ''
          },
          tds: {
            applicable: e.tds?.applicable || false,
            section: e.tds?.section || '',
            rate: e.tds?.rate || '',
            amount: e.tds?.amount || '',
            tdsAccount: e.tds?.tdsAccount?._id || e.tds?.tdsAccount || ''
          }
        })) || [{ account: '', accountType: 'Purchase', amount: '', narration: '', gst: { applicable: false, gstType: 'IGST', gstRate: '', gstAmount: '', inputGstAccount: '' }, tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' } }],
        narration: voucherData.narration || '',
        remarks: voucherData.remarks || '',
        referenceNumber: voucherData.referenceNumber || '',
        debitNoteType: voucherData.debitNoteType || 'Purchase Return'
      });
      
      if (editCompanyId) {
        fetchAllLedgers(editCompanyId);
      }
      
      setSelectedVoucher(voucher);
      setShowEditModal(true);
    } catch (err) {
      console.error('Error loading voucher:', err);
      alertify.error(err.response?.data?.message || err.message || 'Failed to load voucher details');
    } finally {
      setLoading(false);
    }
  };

  // Handle view debit note
  const handleViewDebitNote = async (voucher) => {
    try {
      setLoading(true);
      const voucherData = await getDebitNoteById(voucher._id || voucher.id);
      setSelectedVoucher(voucherData);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error loading voucher:', err);
      alertify.error(err.response?.data?.message || err.message || 'Failed to load voucher details');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete debit note
  const handleDeleteDebitNote = async (voucher) => {
    if (window.confirm('Are you sure you want to delete this debit note?')) {
      try {
        setLoading(true);
        await deleteDebitNote(voucher._id || voucher.id);
        alertify.success('Debit note deleted successfully');
        fetchData();
      } catch (error) {
        alertify.error(error.response?.data?.message || error.message || 'Failed to delete debit note');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle post debit note
  const handlePostDebitNote = async (voucher) => {
    try {
      setLoading(true);
      await postDebitNote(voucher._id || voucher.id);
      alertify.success('Debit note posted successfully');
      fetchData();
    } catch (error) {
      alertify.error(error.response?.data?.message || error.message || 'Failed to post debit note');
    } finally {
      setLoading(false);
    }
  };

  // Handle unpost debit note
  const handleUnpostDebitNote = async (voucher) => {
    try {
      setLoading(true);
      await unpostDebitNote(voucher._id || voucher.id);
      alertify.success('Debit note unposted successfully');
      fetchData();
    } catch (error) {
      alertify.error(error.response?.data?.message || error.message || 'Failed to unpost debit note');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submit (create/update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const selectedCompany = formData.company || companyId;
    if (!selectedCompany || selectedCompany.trim() === '') {
      alertify.error('Please select a Company');
      return;
    }
    
    if (!formData.voucherDate || formData.voucherDate.trim() === '') {
      alertify.error('Please select a Voucher Date');
      return;
    }
    
    if (formData.suppliers.length === 0) {
      alertify.error('At least one supplier entry is required');
      return;
    }
    
    if (formData.entries.length === 0) {
      alertify.error('At least one credit entry is required');
      return;
    }
    
    // Validate suppliers
    for (let i = 0; i < formData.suppliers.length; i++) {
      const supplier = formData.suppliers[i];
      if (!supplier.account || supplier.account.trim() === '') {
        alertify.error(`Please select Supplier Account for Supplier ${i + 1}`);
        return;
      }
      const amount = parseFloat(supplier.amount);
      if (isNaN(amount) || amount <= 0) {
        alertify.error(`Please enter a valid Amount for Supplier ${i + 1}`);
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
    const { supplierTotal, entryTotal } = calculateTotals();
    if (Math.abs(supplierTotal - entryTotal) > 0.01) {
      alertify.error(`Debit Note must balance: Supplier Total (₹${supplierTotal.toFixed(2)}) must equal Entry Total (₹${entryTotal.toFixed(2)})`);
      return;
    }
    
    try {
      setLoading(true);
      
      const voucherData = {
        company: selectedCompany,
        voucherDate: formData.voucherDate,
        suppliers: formData.suppliers.map(s => {
          const supplierData = {
            account: s.account,
            amount: parseFloat(s.amount)
          };
          if (s.narration && s.narration.trim() !== '') supplierData.narration = s.narration.trim();
          if (s.billWise && s.billWise !== 'On Account') supplierData.billWise = s.billWise;
          if (s.billReference && s.billReference.trim() !== '') supplierData.billReference = s.billReference.trim();
          if (s.originalInvoiceNumber && s.originalInvoiceNumber.trim() !== '') supplierData.originalInvoiceNumber = s.originalInvoiceNumber.trim();
          if (s.originalInvoiceDate && s.originalInvoiceDate.trim() !== '') supplierData.originalInvoiceDate = s.originalInvoiceDate;
          return supplierData;
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
            if (e.gst.inputGstAccount && e.gst.inputGstAccount.trim() !== '') {
              entryData.gst.inputGstAccount = e.gst.inputGstAccount;
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
        debitNoteType: formData.debitNoteType
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

      if (showEditModal && selectedVoucher) {
        await updateDebitNote(selectedVoucher._id || selectedVoucher.id, voucherData);
        alertify.success('Debit note updated successfully');
        setShowEditModal(false);
        setSelectedVoucher(null);
      } else {
        await createDebitNote(voucherData);
        alertify.success('Debit note created successfully');
        setShowCreateModal(false);
      }
      
      await fetchData();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alertify.error(error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save debit note');
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
      debitNoteType: '',
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
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Debit Notes</p>
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
              placeholder="Search debit notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
          
          {/* Create Debit Note Button */}
          <button
            onClick={handleCreateDebitNote}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg text-white font-semibold shadow hover:from-purple-600 hover:to-purple-700 transition"
          >
            <PlusCircle size={20} /> Create Debit Note
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12">
            <div className="flex justify-center items-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading debit notes...</p>
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
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Suppliers</th>
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
                    const suppliers = item.suppliers || [];
                    const supplierNames = suppliers.map(s => s.account?.name || s.account || 'N/A').join(', ');
                    const debitNoteType = item.debitNoteType || 'N/A';
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
                          <span className="font-medium text-gray-700 text-sm">{supplierNames || 'N/A'}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {debitNoteType}
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
                              onClick={() => handleViewDebitNote(item)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEditDebitNote(item)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              Edit
                            </button>
                            {isPosted ? (
                              <button
                                onClick={() => handleUnpostDebitNote(item)}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Unpost
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePostDebitNote(item)}
                                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Post
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteDebitNote(item)}
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
                            ? 'No debit notes found matching your search'
                            : 'No debit notes found'}
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          {searchTerm
                            ? 'Try adjusting your search terms'
                            : 'Create your first debit note to get started'}
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

      {/* Create/Edit Debit Note Modal */}
      {(showCreateModal || showEditModal) && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
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
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-3xl sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    {showEditModal ? <Edit className="text-white" size={24} /> : <PlusCircle className="text-white" size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{showEditModal ? 'Edit Debit Note' : 'Create Debit Note'}</h2>
                    <p className="text-purple-100">{showEditModal ? 'Update debit note details' : 'Add a new debit note'}</p>
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
                          const selectedCompanyId = e.target.value;
                          setFormData({ ...formData, company: selectedCompanyId });
                          setCompanyId(selectedCompanyId);
                          if (selectedCompanyId) {
                            fetchAllLedgers(selectedCompanyId);
                          } else {
                            setLedgers([]);
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Basic Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.voucherDate}
                      onChange={(e) => setFormData({ ...formData, voucherDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Number</label>
                    <input
                      type="text"
                      value={formData.voucherNumber}
                      onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                      placeholder="Auto-generated if empty"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Debit Note Type *</label>
                    <select
                      required
                      value={formData.debitNoteType}
                      onChange={(e) => setFormData({ ...formData, debitNoteType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Purchase Return">Purchase Return</option>
                      <option value="Price Reduction">Price Reduction</option>
                      <option value="Quality Issue">Quality Issue</option>
                      <option value="Additional Charge">Additional Charge</option>
                      <option value="Adjustment">Adjustment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                    <input
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="Reference number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
              {/* Suppliers Section */}
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-red-800">Suppliers (Debit Side)</h3>
                  <button
                    type="button"
                    onClick={addSupplier}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                  >
                    <Plus size={16} /> Add Supplier
                  </button>
                </div>
                {formData.suppliers.map((supplier, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg mb-3 border border-red-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-700">Supplier {index + 1}</h4>
                      {formData.suppliers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSupplier(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Account *</label>
                        <SearchableDropdown
                          value={supplier.account}
                          onChange={(value) => updateSupplier(index, 'account', value)}
                          options={ledgers.map(ledger => ({
                            value: ledger._id || ledger.id,
                            label: `${ledger.name} [${ledger.accountCode || 'N/A'}] (${ledger.accountType})`
                          }))}
                          placeholder="Select Supplier *"
                          searchPlaceholder="Search suppliers..."
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
                          value={supplier.amount}
                          onChange={(e) => updateSupplier(index, 'amount', e.target.value)}
                          placeholder="Enter amount"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bill Wise</label>
                        <select
                          value={supplier.billWise}
                          onChange={(e) => updateSupplier(index, 'billWise', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
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
                          value={supplier.billReference}
                          onChange={(e) => updateSupplier(index, 'billReference', e.target.value)}
                          placeholder="Bill reference"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Original Invoice Number</label>
                        <input
                          type="text"
                          value={supplier.originalInvoiceNumber}
                          onChange={(e) => updateSupplier(index, 'originalInvoiceNumber', e.target.value)}
                          placeholder="Original invoice number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Original Invoice Date</label>
                        <input
                          type="date"
                          value={supplier.originalInvoiceDate}
                          onChange={(e) => updateSupplier(index, 'originalInvoiceDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                        <input
                          type="text"
                          value={supplier.narration}
                          onChange={(e) => updateSupplier(index, 'narration', e.target.value)}
                          placeholder="Description for this supplier"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Entries Section (Credit Side) */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-green-800">Credit Entries (Purchase/Expense/Asset)</h3>
                  <button
                    type="button"
                    onClick={addEntry}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
                  >
                    <Plus size={16} /> Add Entry
                  </button>
                </div>
                {formData.entries.map((entry, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg mb-3 border border-green-200">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Account *</label>
                        <SearchableDropdown
                          value={entry.account}
                          onChange={(value) => updateEntry(index, 'account', value)}
                          options={ledgers.map(ledger => ({
                            value: ledger._id || ledger.id,
                            label: `${ledger.name} [${ledger.accountCode || 'N/A'}] (${ledger.accountType})`
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        >
                          <option value="Purchase">Purchase</option>
                          <option value="Expense">Expense</option>
                          <option value="Asset">Asset</option>
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                        <input
                          type="text"
                          value={entry.narration}
                          onChange={(e) => updateEntry(index, 'narration', e.target.value)}
                          placeholder="Description for this entry"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
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
                          <label className="text-sm font-medium text-gray-700">GST Applicable</label>
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
                              <label className="block text-xs font-medium text-gray-700 mb-1">Input GST Account</label>
                              <SearchableDropdown
                                value={entry.gst.inputGstAccount}
                                onChange={(value) => updateEntry(index, 'gst.inputGstAccount', value)}
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
              </div>

              {/* Additional Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                    <textarea
                      value={formData.narration}
                      onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                      placeholder="Overall narration for the debit note"
                      rows="2"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="Additional remarks"
                      rows="2"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Balance Summary */}
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Balance Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Supplier Total (Debit)</p>
                    <p className="text-xl font-bold text-red-600">
                      ₹{calculateTotals().supplierTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Entry Total (Credit)</p>
                    <p className="text-xl font-bold text-green-600">
                      ₹{calculateTotals().entryTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Difference</p>
                    <p className={`text-xl font-bold ${Math.abs(calculateTotals().supplierTotal - calculateTotals().entryTotal) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Math.abs(calculateTotals().supplierTotal - calculateTotals().entryTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                {Math.abs(calculateTotals().supplierTotal - calculateTotals().entryTotal) > 0.01 && (
                  <div className="mt-3 bg-red-100 border border-red-300 rounded-lg p-3">
                    <p className="text-sm text-red-800 font-medium">⚠️ Debit Note is not balanced. Supplier Total must equal Entry Total.</p>
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
                    <h4 className="text-sm font-semibold text-yellow-800 mb-1">Debit Note Information</h4>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• Suppliers are debited (Debit side) - typically Sundry Creditors</li>
                      <li>• Entries are credited (Credit side) - Purchase/Expense/Asset accounts</li>
                      <li>• Total Supplier Amount must equal Total Entry Amount (including GST)</li>
                      <li>• GST reversal: Input GST is credited when goods are returned</li>
                      <li>• Used for purchase returns, price reductions, quality issues, etc.</li>
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
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg text-white font-semibold shadow hover:from-purple-600 hover:to-purple-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : showEditModal ? 'Update Debit Note' : 'Create Debit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Debit Note Modal */}
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
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Debit Note Details</h2>
                    <p className="text-purple-100">View debit note information</p>
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
                <div className="grid grid-cols-2 gap-4 bg-white border border-green-200 rounded-2xl p-4">
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
                    <p className="text-sm text-gray-600">Debit Note Type</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {selectedVoucher.debitNoteType || 'N/A'}
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
                    <p className="text-xl font-bold text-purple-600">
                      ₹{Number(selectedVoucher.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Suppliers */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-black mb-4">Suppliers (Debit Side)</h3>
                {selectedVoucher.suppliers?.map((supplier, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg mb-2 border border-red-200 rounded-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{supplier.account?.name || supplier.account || 'N/A'}</p>
                        
                        {supplier.originalInvoiceNumber && (
                          <p className="text-xs text-gray-500 mt-1">Original Invoice: {supplier.originalInvoiceNumber}</p>
                        )}
                        {supplier.narration && <p className="text-sm text-gray-600 mt-1">{supplier.narration}</p>}
                      </div>
                      <p className="text-lg font-bold text-red-600">
                        ₹{Number(supplier.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Entries */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Credit Entries</h3>
                {selectedVoucher.entries?.map((entry, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg mb-2 border border-green-300 rounded-2xl">
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
                        <p className="text-lg font-bold text-green-600">
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

    <div className="grid grid-cols-3 gap-6 bg-white p-4 border border-gray-300 rounded-2xl">
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
                    handleEditDebitNote(selectedVoucher);
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
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Filter className="text-white" size={24} />
                  <h2 className="text-xl font-bold">Filter Debit Notes</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Debit Note Type</label>
                <select
                  value={filters.debitNoteType}
                  onChange={(e) => setFilters({ ...filters, debitNoteType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Types</option>
                  <option value="Purchase Return">Purchase Return</option>
                  <option value="Price Reduction">Price Reduction</option>
                  <option value="Quality Issue">Quality Issue</option>
                  <option value="Additional Charge">Additional Charge</option>
                  <option value="Adjustment">Adjustment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.isPosted}
                  onChange={(e) => setFilters({ ...filters, isPosted: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg text-white font-semibold shadow hover:from-purple-600 hover:to-purple-700 transition"
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


