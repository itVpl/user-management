import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Search, PlusCircle, Edit, Trash2, Eye, Filter, FileText, Plus, X, DollarSign, Calendar, User, Building, CheckCircle, XCircle, Clock, Truck } from 'lucide-react';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import API_CONFIG from '../../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { addDays, format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';

// Searchable Dropdown Component
const SearchableDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  className = "",
  searchPlaceholder = "Search..."
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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
        }`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {loading ? 'Loading...' : selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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

export default function PurchaseVoucher({ selectedCompanyId = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [companyId, setCompanyId] = useState(selectedCompanyId);
  const [companies, setCompanies] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  
  // Date range state
  const [range, setRange] = useState({
    startDate: addDays(new Date(), -29),
    endDate: new Date(),
    key: 'selection'
  });
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);

  const presets = {
    'Today': [new Date(), new Date()],
    'Yesterday': [addDays(new Date(), -1), addDays(new Date(), -1)],
    'Last 7 Days': [addDays(new Date(), -6), new Date()],
    'Last 30 Days': [addDays(new Date(), -29), new Date()],
    'This Month': [new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)],
    'Last Month': [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    new Date(new Date().getFullYear(), new Date().getMonth(), 0)],
  };
  
  const applyPreset = (label) => {
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setShowPresetMenu(false);
  };
  
  const ymd = (d) => format(d, 'yyyy-MM-dd');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const [formData, setFormData] = useState({
    company: '',
    voucherDate: '',
    voucherNumber: '',
    invoiceNumber: '',
    purchaseType: 'Credit',
    supplierAccount: '',
    cashBankAccount: '',
    paymentMode: 'Cash',
    chequeNumber: '',
    chequeDate: '',
    referenceNumber: '',
    entries: [{
      account: '',
      accountType: 'Purchase',
      amount: '',
      quantity: '',
      rate: '',
      narration: '',
      gst: {
        applicable: false,
        gstType: 'IGST',
        gstRate: '',
        gstAmount: '',
        inputGstAccount: ''
      },
      tds: {
        applicable: false,
        section: '',
        rate: '',
        amount: '',
        tdsAccount: ''
      }
    }],
    narration: '',
    remarks: ''
  });

  // Fetch companies
  const fetchAllCompanies = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/company/all?isActive=true&page=1&limit=100&sortBy=companyName&sortOrder=asc`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
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

  // Fetch ledgers
  const fetchAllLedgers = async (companyIdParam) => {
    if (!companyIdParam) {
      setLedgers([]);
      return;
    }
    try {
      setLoadingLedgers(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/ledger/all?company=${companyIdParam}&page=1&limit=1000&sortBy=name&sortOrder=asc&isActive=true`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
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

  // Fetch purchase vouchers
  const fetchPurchaseVoucherData = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      let url = `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/purchase/all`;
      const queryParams = new URLSearchParams();
      if (companyId) queryParams.append('company', companyId);
    //   if (range.startDate) queryParams.append('startDate', ymd(range.startDate));
    //   if (range.endDate) queryParams.append('endDate', ymd(range.endDate));
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return response.data?.vouchers || response.data?.data || [];
    } catch (error) {
      console.error('Error fetching purchase voucher data:', error);
      throw error;
    }
  };

  // Get purchase voucher by ID
  const getPurchaseVoucherById = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/purchase/${voucherId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching purchase voucher:', error);
      throw error;
    }
  };

  // Update purchase voucher
  const updatePurchaseVoucher = async (voucherId, voucherData) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/purchase/${voucherId}/update`, voucherData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating purchase voucher:', error);
      throw error;
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchPurchaseVoucherData();
      setData(result);
      setFilteredData(result);
    } catch (error) {
      console.error('Error fetching purchase voucher data:', error);
      alertify.error(error.response?.data?.message || error.message || 'Failed to load purchase voucher data');
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [range, companyId]);

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

  useEffect(() => {
    if (companyId) {
      fetchAllLedgers(companyId);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId, range, fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, range]);

  const calculateTotals = () => {
    const entryTotal = formData.entries.reduce((sum, e) => {
      const baseAmount = parseFloat(e.amount) || 0;
      const gstAmount = e.gst.applicable ? (parseFloat(e.gst.gstAmount) || 0) : 0;
      return sum + baseAmount + gstAmount;
    }, 0);
    return entryTotal;
  };

  const addEntry = () => {
    setFormData({
      ...formData,
      entries: [...formData.entries, {
        account: '',
        accountType: 'Purchase',
        amount: '',
        quantity: '',
        rate: '',
        narration: '',
        gst: { applicable: false, gstType: 'IGST', gstRate: '', gstAmount: '', inputGstAccount: '' },
        tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' }
      }]
    });
  };

  const removeEntry = (index) => {
    if (formData.entries.length > 1) {
      const newEntries = formData.entries.filter((_, i) => i !== index);
      setFormData({ ...formData, entries: newEntries });
    }
  };

  const updateEntry = (index, field, value) => {
    const newEntries = [...formData.entries];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      newEntries[index][parent][child] = value;
      if (parent === 'gst' && child === 'gstRate' && newEntries[index].amount) {
        const amount = parseFloat(newEntries[index].amount) || 0;
        const rate = parseFloat(value) || 0;
        newEntries[index].gst.gstAmount = ((amount * rate) / 100).toFixed(2);
      }
      if (parent === 'tds' && child === 'rate' && newEntries[index].amount) {
        const amount = parseFloat(newEntries[index].amount) || 0;
        const rate = parseFloat(value) || 0;
        newEntries[index].tds.amount = ((amount * rate) / 100).toFixed(2);
      }
    } else {
      newEntries[index][field] = value;
      if (field === 'quantity' || field === 'rate') {
        const quantity = parseFloat(newEntries[index].quantity) || 0;
        const rate = parseFloat(newEntries[index].rate) || 0;
        if (quantity && rate) {
          newEntries[index].amount = (quantity * rate).toFixed(2);
        }
      }
      if (field === 'amount' && newEntries[index].gst.applicable && newEntries[index].gst.gstRate) {
        const amount = parseFloat(value) || 0;
        const gstRate = parseFloat(newEntries[index].gst.gstRate) || 0;
        newEntries[index].gst.gstAmount = ((amount * gstRate) / 100).toFixed(2);
      }
      if (field === 'amount' && newEntries[index].tds.applicable && newEntries[index].tds.rate) {
        const amount = parseFloat(value) || 0;
        const tdsRate = parseFloat(newEntries[index].tds.rate) || 0;
        newEntries[index].tds.amount = ((amount * tdsRate) / 100).toFixed(2);
      }
    }
    setFormData({ ...formData, entries: newEntries });
  };

  const getLedgersByType = (accountType) => {
    return ledgers
      .filter(ledger => {
        if (accountType === 'supplier') return ledger.accountType === 'Sundry Creditors';
        if (accountType === 'cashBank') return ['Cash', 'Bank'].includes(ledger.accountType);
        if (accountType === 'purchase') return ['Purchase', 'Expense', 'Asset'].includes(ledger.accountType);
        if (accountType === 'gst') return ledger.accountType === 'Duties & Taxes';
        return true;
      })
      .map(ledger => ({
        value: ledger._id,
        label: `${ledger.name} (${ledger.accountType})`
      }));
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVouchers = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const resetForm = () => {
    setFormData({
      company: companyId || '',
      voucherDate: '',
      voucherNumber: '',
      invoiceNumber: '',
      purchaseType: 'Credit',
      supplierAccount: '',
      cashBankAccount: '',
      paymentMode: 'Cash',
      chequeNumber: '',
      chequeDate: '',
      referenceNumber: '',
      entries: [{
        account: '',
        accountType: 'Purchase',
        amount: '',
        quantity: '',
        rate: '',
        narration: '',
        gst: { applicable: false, gstType: 'IGST', gstRate: '', gstAmount: '', inputGstAccount: '' },
        tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' }
      }],
      narration: '',
      remarks: ''
    });
    setSelectedVoucher(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Prepare payload
      const payload = {
        ...formData,
        totalAmount: calculateTotals(),
        // Clean up entries - remove empty GST and TDS fields
        entries: formData.entries.map(entry => {
          const cleanEntry = { ...entry };
          
          // Clean GST fields
          if (!cleanEntry.gst.applicable) {
            delete cleanEntry.gst.gstRate;
            delete cleanEntry.gst.gstAmount;
            delete cleanEntry.gst.inputGstAccount;
          } else if (!cleanEntry.gst.inputGstAccount || cleanEntry.gst.inputGstAccount === '') {
            delete cleanEntry.gst.inputGstAccount;
          }
          
          // Clean TDS fields
          if (!cleanEntry.tds.applicable) {
            delete cleanEntry.tds.section;
            delete cleanEntry.tds.rate;
            delete cleanEntry.tds.amount;
            delete cleanEntry.tds.tdsAccount;
          } else if (!cleanEntry.tds.tdsAccount || cleanEntry.tds.tdsAccount === '') {
            delete cleanEntry.tds.tdsAccount;
          }
          
          return cleanEntry;
        })
      };

      // Remove empty optional fields
      if (!payload.voucherNumber) delete payload.voucherNumber;
      if (!payload.invoiceNumber) delete payload.invoiceNumber;
      if (!payload.narration) delete payload.narration;
      if (!payload.remarks) delete payload.remarks;
      if (payload.purchaseType === 'Credit') {
        delete payload.cashBankAccount;
        delete payload.paymentMode;
        delete payload.chequeNumber;
        delete payload.chequeDate;
        delete payload.referenceNumber;
      } else {
        delete payload.supplierAccount;
      }

      const url = showEditModal 
        ? `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/purchase/${selectedVoucher._id}/update`
        : `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/purchase/create`;
      
      const method = showEditModal ? 'put' : 'post';
      
      const response = await axios[method](url, payload, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (response.data.success) {
        alertify.success(response.data.message || `Purchase voucher ${showEditModal ? 'updated' : 'created'} successfully`);
        setShowCreateModal(false);
        setShowEditModal(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.error('Error submitting purchase voucher:', error);
      alertify.error(error.response?.data?.message || 'Failed to submit purchase voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (voucher) => {
    try {
      setLoading(true);
      const voucherData = await getPurchaseVoucherById(voucher._id || voucher.id);
      setSelectedVoucher(voucherData);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error loading voucher:', err);
      alertify.error(err.response?.data?.message || err.message || 'Failed to load voucher details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (voucher) => {
    try {
      setLoading(true);
      const voucherData = await getPurchaseVoucherById(voucher._id || voucher.id);
      
      const editCompanyId = voucherData.company?._id || voucherData.company || companyId || '';
      
      setFormData({
        company: editCompanyId,
        voucherDate: voucherData.voucherDate ? new Date(voucherData.voucherDate).toISOString().split('T')[0] : '',
        voucherNumber: voucherData.voucherNumber || '',
        invoiceNumber: voucherData.invoiceNumber || '',
        purchaseType: voucherData.purchaseType || 'Credit',
        supplierAccount: voucherData.supplierAccount?._id || voucherData.supplierAccount || '',
        cashBankAccount: voucherData.cashBankAccount?._id || voucherData.cashBankAccount || '',
        paymentMode: voucherData.paymentMode || 'Cash',
        chequeNumber: voucherData.chequeNumber || '',
        chequeDate: voucherData.chequeDate ? new Date(voucherData.chequeDate).toISOString().split('T')[0] : '',
        referenceNumber: voucherData.referenceNumber || '',
        entries: voucherData.entries?.map(e => ({
          account: e.account?._id || e.account || '',
          accountType: e.accountType || 'Purchase',
          amount: e.amount || '',
          quantity: e.quantity || '',
          rate: e.rate || '',
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
        })) || [{
          account: '',
          accountType: 'Purchase',
          amount: '',
          quantity: '',
          rate: '',
          narration: '',
          gst: { applicable: false, gstType: 'IGST', gstRate: '', gstAmount: '', inputGstAccount: '' },
          tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' }
        }],
        narration: voucherData.narration || '',
        remarks: voucherData.remarks || ''
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

  const handleDelete = async (voucher) => {
    if (!window.confirm('Are you sure you want to delete this purchase voucher?')) return;
    
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.delete(
        `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/purchase/${voucher._id}/delete`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alertify.success('Purchase voucher deleted successfully');
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting voucher:', error);
      alertify.error(error.response?.data?.message || 'Failed to delete voucher');
    }
  };

  const handlePost = async (voucher) => {
    if (!window.confirm('Are you sure you want to post this purchase voucher?')) return;
    
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/purchase/${voucher._id}/post`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alertify.success('Purchase voucher posted successfully');
        fetchData();
      }
    } catch (error) {
      console.error('Error posting voucher:', error);
      alertify.error(error.response?.data?.message || 'Failed to post voucher');
    }
  };

  const handleUnpost = async (voucher) => {
    if (!window.confirm('Are you sure you want to unpost this purchase voucher?')) return;
    
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/purchase/${voucher._id}/unpost`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alertify.success('Purchase voucher unposted successfully');
        fetchData();
      }
    } catch (error) {
      console.error('Error unposting voucher:', error);
      alertify.error(error.response?.data?.message || 'Failed to unpost voucher');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <FileText className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Vouchers</p>
                <p className="text-xl font-bold text-gray-800">{data.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <DollarSign className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-xl font-bold text-red-600">
                  ₹{data.reduce((sum, v) => sum + (v.totalAmount || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          {/* <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-xl font-bold text-purple-600">
                  {data.filter(v => new Date(v.voucherDate).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
            </div>
          </div> */}
        </div>
        <div className="flex items-center gap-4">
          {/* Company Selector - Now in TallyManagement Sidebar */}
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search vouchers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetMenu(v => !v)}
              className="w-40 text-left px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between"
            >
              <span>
                Coustom Date
              </span>
              <span className="ml-3">▼</span>
            </button>

            {showPresetMenu && (
              <div className="absolute z-50 mt-2 w-56 rounded-md border bg-white shadow-lg">
                {Object.keys(presets).map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => applyPreset(lbl)}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                  >
                    {lbl}
                  </button>
                ))}
                <div className="my-1 border-t" />
                <button
                  onClick={() => { setShowPresetMenu(false); setShowCustomRange(true); }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  Custom Range
                </button>
              </div>
            )}
          </div>

          {showCustomRange && (
            <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl p-4">
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
                    onClick={() => setShowCustomRange(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomRange(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg text-white font-semibold shadow hover:from-orange-600 hover:to-orange-700 transition"
          >
            <PlusCircle size={20} /> Create Purchase Voucher
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Date</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Voucher No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Invoice No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Type</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Supplier/Cash</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Amount</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentVouchers.map((voucher, index) => (
                    <tr key={voucher._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">
                          {new Date(voucher.voucherDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-base font-semibold text-gray-700">{voucher.voucherNumber}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{voucher.invoiceNumber || '-'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          voucher.purchaseType === 'Cash' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {voucher.purchaseType}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">
                          {voucher.purchaseType === 'Credit' 
                            ? (voucher.supplierAccount?.name || '-')
                            : (voucher.cashBankAccount?.name || '-')}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">₹{voucher.totalAmount?.toLocaleString() || '0'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          voucher.isPosted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {voucher.isPosted ? 'Posted' : 'Unposted'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleView(voucher)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                          >
                            View
                          </button>
                          {!voucher.isPosted && (
                            <>
                              <button
                                onClick={() => handleEdit(voucher)}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(voucher)}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {voucher.isPosted ? (
                            <button
                              onClick={() => handleUnpost(voucher)}
                              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              Unpost
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePost(voucher)}
                              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              Post
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredData.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm ? 'No vouchers found matching your search' : 'No purchase vouchers found'}
                </p>
                <p className="text-gray-400 text-sm">
                  {searchTerm ? 'Try adjusting your search terms' : 'Create your first purchase voucher to get started'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {totalPages > 1 && filteredData.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} vouchers
            {searchTerm && ` (filtered from ${data.length} total)`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 border rounded-lg transition-colors ${
                  currentPage === page
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
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
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Orange Gradient */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <PlusCircle className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {showEditModal ? 'Edit Purchase Voucher' : 'Create Purchase Voucher'}
                    </h2>
                    <p className="text-orange-100">
                      {showEditModal ? 'Update the existing purchase voucher' : 'Fill in the details to create a new purchase voucher'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Company Section */}
              {companies.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4">Company Information</h3>
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
              
              {/* Basic Information Section - Orange Background */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-800 mb-4">Basic Information</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <input
                      type="date"
                      value={formData.voucherDate}
                      onChange={(e) => setFormData({ ...formData, voucherDate: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <select
                      value={formData.purchaseType}
                      onChange={(e) => setFormData({ ...formData, purchaseType: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="Credit">Credit Purchase</option>
                      <option value="Cash">Cash Purchase</option>
                    </select>
                  </div>
                  {/* <div>
                    <input
                      type="text"
                      value={formData.voucherNumber}
                      onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                      placeholder="Voucher Number (Auto)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div> */}
                  {/* <div>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      placeholder="Invoice Number (Auto)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div> */}
                </div>
              </div>

              {/* Account Information Section - Red Background */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800 mb-4">Account Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  {formData.purchaseType === 'Credit' ? (
                    <div>
                      <SearchableDropdown
                        value={formData.supplierAccount}
                        onChange={(value) => setFormData({ ...formData, supplierAccount: value })}
                        options={ledgers.map(ledger => ({
                          value: ledger._id,
                          label: `${ledger.name} (${ledger.accountType})`
                        }))}
                        placeholder="Select Supplier Account *"
                        loading={loadingLedgers}
                        searchPlaceholder="Search all accounts..."
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <SearchableDropdown
                          value={formData.cashBankAccount}
                          onChange={(value) => setFormData({ ...formData, cashBankAccount: value })}
                          options={ledgers.map(ledger => ({
                            value: ledger._id,
                            label: `${ledger.name} (${ledger.accountType})`
                          }))}
                          placeholder="Select Cash/Bank Account *"
                          loading={loadingLedgers}
                          searchPlaceholder="Search all accounts..."
                        />
                      </div>
                      <div>
                        <select
                          value={formData.paymentMode}
                          onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Bank">Bank</option>
                          <option value="Cheque">Cheque</option>
                          <option value="NEFT">NEFT</option>
                          <option value="RTGS">RTGS</option>
                          <option value="UPI">UPI</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Debit Card">Debit Card</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      {formData.paymentMode === 'Cheque' && (
                        <div>
                          <input
                            type="text"
                            value={formData.chequeNumber}
                            onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                            placeholder="Cheque Number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      )}
                      {['NEFT', 'RTGS', 'UPI'].includes(formData.paymentMode) && (
                        <div>
                          <input
                            type="text"
                            value={formData.referenceNumber}
                            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                            placeholder="Reference Number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Purchase Entries Section - Purple Background */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-purple-800">Purchase Entries</h3>
                  <button
                    type="button"
                    onClick={addEntry}
                    className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition"
                  >
                    + Add Entry
                  </button>
                </div>

                {formData.entries.map((entry, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-md font-semibold text-gray-800">Entry {index + 1}</h4>
                      {formData.entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(index)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-4 mb-3">
                      <div className="col-span-2">
                        <SearchableDropdown
                          value={entry.account}
                          onChange={(value) => updateEntry(index, 'account', value)}
                          options={getLedgersByType('purchase')}
                          placeholder="Select Purchase Account *"
                          loading={loadingLedgers}
                          searchPlaceholder="Search accounts..."
                        />
                      </div>
                      <div>
                        <select
                          value={entry.accountType}
                          onChange={(e) => updateEntry(index, 'accountType', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="Purchase">Purchase</option>
                          <option value="Expense">Expense</option>
                          <option value="Asset">Asset</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          value={entry.quantity}
                          onChange={(e) => updateEntry(index, 'quantity', e.target.value)}
                          placeholder="Quantity"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          value={entry.rate}
                          onChange={(e) => updateEntry(index, 'rate', e.target.value)}
                          placeholder="Rate"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          value={entry.amount}
                          onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                          required
                          placeholder="Amount *"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={entry.narration}
                          onChange={(e) => updateEntry(index, 'narration', e.target.value)}
                          placeholder="Narration"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* GST Section */}
                    <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={entry.gst.applicable}
                          onChange={(e) => updateEntry(index, 'gst.applicable', e.target.checked)}
                          className="mr-2"
                        />
                        <label className="text-sm font-medium text-gray-700">Apply Input GST</label>
                      </div>

                      {entry.gst.applicable && (
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <select
                              value={entry.gst.gstType}
                              onChange={(e) => updateEntry(index, 'gst.gstType', e.target.value)}
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                            >
                              <option value="IGST">IGST</option>
                              <option value="CGST+SGST">CGST+SGST</option>
                            </select>
                          </div>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              value={entry.gst.gstRate}
                              onChange={(e) => updateEntry(index, 'gst.gstRate', e.target.value)}
                              placeholder="GST Rate %"
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              value={entry.gst.gstAmount}
                              onChange={(e) => updateEntry(index, 'gst.gstAmount', e.target.value)}
                              placeholder="GST Amount"
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <SearchableDropdown
                              value={entry.gst.inputGstAccount}
                              onChange={(value) => updateEntry(index, 'gst.inputGstAccount', value)}
                              options={getLedgersByType('gst')}
                              placeholder="Input GST Account"
                              loading={loadingLedgers}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* TDS Section */}
                    <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={entry.tds.applicable}
                          onChange={(e) => updateEntry(index, 'tds.applicable', e.target.checked)}
                          className="mr-2"
                        />
                        <label className="text-sm font-medium text-gray-700">Apply TDS</label>
                      </div>

                      {entry.tds.applicable && (
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <input
                              type="text"
                              value={entry.tds.section}
                              onChange={(e) => updateEntry(index, 'tds.section', e.target.value)}
                              placeholder="TDS Section (e.g., 194C)"
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              value={entry.tds.rate}
                              onChange={(e) => updateEntry(index, 'tds.rate', e.target.value)}
                              placeholder="TDS Rate %"
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              value={entry.tds.amount}
                              onChange={(e) => updateEntry(index, 'tds.amount', e.target.value)}
                              placeholder="TDS Amount"
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <SearchableDropdown
                              value={entry.tds.tdsAccount}
                              onChange={(value) => updateEntry(index, 'tds.tdsAccount', value)}
                              options={getLedgersByType('gst')}
                              placeholder="TDS Account"
                              loading={loadingLedgers}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total Amount Display */}
                <div className="mt-4 p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">Total Amount:</span>
                    <span className="text-2xl font-bold text-white">
                      ₹{calculateTotals().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Information Section - Yellow Background */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-800 mb-4">Additional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <textarea
                      value={formData.narration}
                      onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                      rows="3"
                      placeholder="Narration"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      rows="3"
                      placeholder="Remarks"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : (showEditModal ? 'Update Voucher' : 'Create Voucher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-3xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Eye className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Purchase Voucher Details</h2>
              <p className="text-green-100">View complete purchase information</p>
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

      {/* Body */}
      <div className="p-6 space-y-6">
        
        {/* Voucher Information */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Voucher Information</h3>

          <div className="grid grid-cols-2 gap-4 bg-white p-4 border border-green-200 rounded-2xl">
            <div>
              <p className="text-sm text-gray-600">Voucher Number</p>
              <p className="font-semibold">{selectedVoucher.voucherNumber}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Invoice Number</p>
              <p className="font-semibold">{selectedVoucher.invoiceNumber || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-semibold">
                {new Date(selectedVoucher.voucherDate).toLocaleDateString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Purchase Type</p>
              <span className="inline-flex px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                {selectedVoucher.purchaseType}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-600">Status</p>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
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
                ₹{selectedVoucher.totalAmount?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800 mb-4">Account Information</h3>

          <div className="bg-white border border-purple-200 p-4 rounded-2xl grid grid-cols-2 gap-4">
            {selectedVoucher.purchaseType === "Credit" ? (
              <div>
                <p className="text-sm text-gray-600">Supplier Account</p>
                <p className="font-semibold">{selectedVoucher.supplierAccount?.name || "N/A"}</p>
                <p className="text-xs text-gray-500">
                  {selectedVoucher.supplierAccount?.accountType}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-600">Cash/Bank Account</p>
                  <p className="font-semibold">{selectedVoucher.cashBankAccount?.name || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{selectedVoucher.cashBankAccount?.accountType}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Payment Mode</p>
                  <p className="font-semibold">{selectedVoucher.paymentMode}</p>

                  {selectedVoucher.chequeNumber && (
                    <p className="text-xs text-gray-500">Cheque: {selectedVoucher.chequeNumber}</p>
                  )}
                  {selectedVoucher.referenceNumber && (
                    <p className="text-xs text-gray-500">Ref: {selectedVoucher.referenceNumber}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Entries */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Purchase Entries</h3>

          {selectedVoucher.entries?.map((entry, index) => (
            <div key={index} className="bg-white border border-blue-200 p-4 rounded-2xl mb-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{entry.account?.name}</p>
                  <p className="text-xs text-gray-500">Type: {entry.accountType}</p>

                  {entry.narration && (
                    <p className="text-sm text-gray-600 mt-1">{entry.narration}</p>
                  )}

                  {entry.quantity && entry.rate && (
                    <p className="text-xs text-gray-500 mt-1">
                      {entry.quantity} × ₹{entry.rate}
                    </p>
                  )}

                  {entry.gst?.applicable && (
                    <p className="text-xs text-blue-600 mt-2">
                      GST: {entry.gst.gstType} @ {entry.gst.gstRate}% = ₹{entry.gst.gstAmount}
                    </p>
                  )}

                  {entry.tds?.applicable && (
                    <p className="text-xs text-yellow-600 mt-1">
                      TDS Section {entry.tds.section} @ {entry.tds.rate}% = ₹{entry.tds.amount}
                    </p>
                  )}
                </div>

                <p className="text-xl font-bold text-green-600">
                  ₹{entry.amount?.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        {(selectedVoucher.narration || selectedVoucher.remarks) && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Details</h3>

            <div className="bg-white p-4 border border-gray-300 rounded-2xl grid grid-cols-2 gap-6">
              {selectedVoucher.narration && (
                <div>
                  <p className="text-sm text-gray-600">Narration</p>
                  <p className="font-semibold text-gray-900">{selectedVoucher.narration}</p>
                </div>
              )}

              {selectedVoucher.remarks && (
                <div>
                  <p className="text-sm text-gray-600">Remarks</p>
                  <p className="font-semibold text-gray-900">{selectedVoucher.remarks}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setShowViewModal(false);
              setSelectedVoucher(null);
            }}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
          >
            Close
          </button>

          <button
            onClick={() => {
              setShowViewModal(false);
              handleEditPurchase(selectedVoucher);
            }}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold shadow hover:from-green-600 hover:to-green-700"
          >
            Edit
          </button>
        </div>

      </div>
    </div>
  </div>
)}

    </div>
  );
}


