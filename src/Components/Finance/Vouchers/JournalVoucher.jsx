import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Search, PlusCircle, BookOpen, Edit, Eye, Filter, Trash2, CheckCircle, XCircle, Calendar } from 'lucide-react';
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
  const paddingClass = compact ? 'px-3 py-2' : 'px-4 py-3';
  const textSizeClass = compact ? 'text-sm' : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full ${paddingClass} border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 cursor-pointer ${
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              <div className="px-4 py-2 text-gray-500 text-sm text-center">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function JournalVoucher({ selectedCompanyId = null }) {
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
    journalType: '',
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
  
  const [formData, setFormData] = useState({
    company: '',
    voucherDate: '',
    journalType: 'Other',
    referenceNumber: '',
    entries: [
      { account: '', entryType: 'Debit', amount: '', narration: '', billWise: '', billReference: '', tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' }, gst: { applicable: false, gstType: '', gstRate: '', gstAmount: '' } },
      { account: '', entryType: 'Credit', amount: '', narration: '', billWise: '', billReference: '', tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' }, gst: { applicable: false, gstType: '', gstRate: '', gstAmount: '' } }
    ],
    totalAmount: '',
    narration: '',
    remarks: ''
  });

  // API Functions
  const fetchAllCompanies = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
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

  const fetchAllLedgers = async (companyIdParam) => {
    if (!companyIdParam) {
      setLedgers([]);
      return;
    }
    try {
      setLoadingLedgers(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
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

  const fetchJournalData = async (filterParams = {}) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      let url = `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/journal/all`;
      const queryParams = new URLSearchParams();
      if (companyId) queryParams.append('company', companyId);
      if (filterParams.startDate) queryParams.append('startDate', filterParams.startDate);
      if (filterParams.endDate) queryParams.append('endDate', filterParams.endDate);
      if (filterParams.journalType) queryParams.append('journalType', filterParams.journalType);
      if (filterParams.isPosted !== '') queryParams.append('isPosted', filterParams.isPosted === 'true');
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return response.data?.vouchers || response.data?.data || [];
    } catch (error) {
      console.error('Error fetching journal data:', error);
      throw error;
    }
  };

  const getJournalVoucherById = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/journal/${voucherId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching journal voucher:', error);
      throw error;
    }
  };

  const createJournalVoucher = async (voucherData) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      if (!token) throw new Error('Authentication token not found. Please login again.');
      const response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/journal/create`, voucherData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 30000
      });
      if (response.data?.success === false) throw new Error(response.data?.message || 'Failed to create journal voucher');
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error creating journal voucher:', error);
      if (error.response) {
        throw new Error(error.response.data?.message || error.response.data?.error || `Server error: ${error.response.status}`);
      } else if (error.request) {
        throw new Error('No response from server. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Failed to create journal voucher');
      }
    }
  };

  const updateJournalVoucher = async (voucherId, voucherData) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/journal/${voucherId}/update`, voucherData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating journal voucher:', error);
      throw error;
    }
  };

  const deleteJournalVoucher = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.delete(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/journal/${voucherId}/delete`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting journal voucher:', error);
      throw error;
    }
  };

  const postJournalVoucher = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/journal/${voucherId}/post`, {}, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error posting journal voucher:', error);
      throw error;
    }
  };

  const unpostJournalVoucher = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/journal/${voucherId}/unpost`, {}, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error unposting journal voucher:', error);
      throw error;
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchJournalData(filters);
      setData(result);
      setFilteredData(result);
    } catch (error) {
      console.error('Error fetching journal data:', error);
      alertify.error(error.response?.data?.message || error.message || 'Failed to load journal data');
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [filters, companyId]);

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
  }, [companyId, fetchData]);

  const handleCreateJournal = () => {
    const defaultCompanyId = companyId || (companies.length > 0 ? (companies[0]._id || companies[0].id) : '');
    setFormData({
      company: defaultCompanyId,
      voucherDate: new Date().toISOString().split('T')[0],
      journalType: 'Other',
      referenceNumber: '',
      entries: [
        { account: '', entryType: 'Debit', amount: '', narration: '', billWise: '', billReference: '', tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' }, gst: { applicable: false, gstType: '', gstRate: '', gstAmount: '' } },
        { account: '', entryType: 'Credit', amount: '', narration: '', billWise: '', billReference: '', tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' }, gst: { applicable: false, gstType: '', gstRate: '', gstAmount: '' } }
      ],
      totalAmount: '',
      narration: '',
      remarks: ''
    });
    if (defaultCompanyId) fetchAllLedgers(defaultCompanyId);
    setShowCreateModal(true);
  };

  const handleEditJournal = async (voucher) => {
    try {
      setLoading(true);
      const voucherData = await getJournalVoucherById(voucher._id || voucher.id);
      const editCompanyId = voucherData.company?._id || voucherData.company || companyId || '';
      setFormData({
        company: editCompanyId,
        voucherDate: voucherData.voucherDate ? new Date(voucherData.voucherDate).toISOString().split('T')[0] : '',
        journalType: voucherData.journalType || 'Other',
        referenceNumber: voucherData.referenceNumber || '',
        entries: (voucherData.entries || []).map(entry => ({
          account: entry.account && typeof entry.account === 'object' ? (entry.account._id || entry.account.id) : entry.account,
          entryType: entry.entryType || 'Debit',
          amount: entry.amount || '',
          narration: entry.narration || '',
          billWise: entry.billWise || '',
          billReference: entry.billReference || '',
          tds: entry.tds?.applicable ? {
            applicable: true,
            section: entry.tds.section || '',
            rate: entry.tds.rate || '',
            amount: entry.tds.amount || '',
            tdsAccount: entry.tds.tdsAccount && typeof entry.tds.tdsAccount === 'object' ? (entry.tds.tdsAccount._id || entry.tds.tdsAccount.id) : entry.tds.tdsAccount || ''
          } : { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' },
          gst: entry.gst?.applicable ? {
            applicable: true,
            gstType: entry.gst.gstType || '',
            gstRate: entry.gst.gstRate || '',
            gstAmount: entry.gst.gstAmount || ''
          } : { applicable: false, gstType: '', gstRate: '', gstAmount: '' }
        })),
        totalAmount: voucherData.totalAmount || '',
        narration: voucherData.narration || '',
        remarks: voucherData.remarks || ''
      });
      if (editCompanyId) fetchAllLedgers(editCompanyId);
      setSelectedVoucher(voucher);
      setShowEditModal(true);
    } catch (err) {
      console.error('Error loading voucher:', err);
      alertify.error(err.response?.data?.message || err.message || 'Failed to load voucher details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewJournal = async (voucher) => {
    try {
      setLoading(true);
      const voucherData = await getJournalVoucherById(voucher._id || voucher.id);
      setSelectedVoucher(voucherData);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error loading voucher:', err);
      alertify.error(err.response?.data?.message || err.message || 'Failed to load voucher details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJournal = async (voucher) => {
    if (window.confirm('Are you sure you want to delete this journal voucher?')) {
      try {
        setLoading(true);
        await deleteJournalVoucher(voucher._id || voucher.id);
        alertify.success('Journal voucher deleted successfully');
        fetchData();
      } catch (error) {
        alertify.error(error.response?.data?.message || error.message || 'Failed to delete journal voucher');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePostJournal = async (voucher) => {
    try {
      setLoading(true);
      await postJournalVoucher(voucher._id || voucher.id);
      alertify.success('Journal voucher posted successfully');
      fetchData();
    } catch (error) {
      alertify.error(error.response?.data?.message || error.message || 'Failed to post journal voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpostJournal = async (voucher) => {
    try {
      setLoading(true);
      await unpostJournalVoucher(voucher._id || voucher.id);
      alertify.success('Journal voucher unposted successfully');
      fetchData();
    } catch (error) {
      alertify.error(error.response?.data?.message || error.message || 'Failed to unpost journal voucher');
    } finally {
      setLoading(false);
    }
  };

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
    if (!formData.entries || formData.entries.length < 2) {
      alertify.error('Please add at least one Debit and one Credit entry');
      return;
    }

    // Validate entries and calculate totals
    let totalDebit = 0;
    let totalCredit = 0;
    let hasDebit = false;
    let hasCredit = false;

    for (let i = 0; i < formData.entries.length; i++) {
      const entry = formData.entries[i];
      if (!entry.account || entry.account.toString().trim() === '') {
        alertify.error(`Please select an Account for Entry ${i + 1}`);
        return;
      }
      if (!entry.entryType || (entry.entryType !== 'Debit' && entry.entryType !== 'Credit')) {
        alertify.error(`Please select Entry Type (Debit/Credit) for Entry ${i + 1}`);
        return;
      }
      const amount = parseFloat(entry.amount);
      if (isNaN(amount) || amount <= 0) {
        alertify.error(`Please enter a valid Amount for Entry ${i + 1}`);
        return;
      }

      if (entry.entryType === 'Debit') {
        totalDebit += amount;
        hasDebit = true;
      } else {
        totalCredit += amount;
        hasCredit = true;
      }
    }

    if (!hasDebit) {
      alertify.error('At least one Debit entry is required');
      return;
    }
    if (!hasCredit) {
      alertify.error('At least one Credit entry is required');
      return;
    }
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alertify.error(`Journal entry must balance: Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)})`);
      return;
    }
    
    try {
      setLoading(true);
      const voucherData = {
        company: selectedCompany,
        voucherDate: formData.voucherDate,
        journalType: formData.journalType || 'Other',
        entries: formData.entries.map(entry => {
          const entryData = {
            account: entry.account,
            entryType: entry.entryType,
            amount: parseFloat(entry.amount)
          };
          if (entry.narration && entry.narration.trim() !== '') entryData.narration = entry.narration.trim();
          if (entry.billWise && entry.billWise.trim() !== '') entryData.billWise = entry.billWise;
          if (entry.billReference && entry.billReference.trim() !== '') entryData.billReference = entry.billReference.trim();
          if (entry.tds?.applicable === true) {
            entryData.tds = {
              applicable: true,
              section: entry.tds.section || '',
              rate: parseFloat(entry.tds.rate) || 0,
              amount: parseFloat(entry.tds.amount) || 0
            };
            if (entry.tds.tdsAccount && entry.tds.tdsAccount.trim() !== '') {
              entryData.tds.tdsAccount = entry.tds.tdsAccount.trim();
            }
          }
          if (entry.gst?.applicable === true) {
            entryData.gst = {
              applicable: true,
              gstType: entry.gst.gstType || 'None',
              gstRate: parseFloat(entry.gst.gstRate) || 0,
              gstAmount: parseFloat(entry.gst.gstAmount) || 0
            };
          }
          return entryData;
        }),
        totalAmount: parseFloat(totalDebit)
      };

      if (formData.referenceNumber && formData.referenceNumber.trim() !== '') {
        voucherData.referenceNumber = formData.referenceNumber.trim();
      }
      if (formData.narration && formData.narration.trim() !== '') {
        voucherData.narration = formData.narration.trim();
      }
      if (formData.remarks && formData.remarks.trim() !== '') {
        voucherData.remarks = formData.remarks.trim();
      }

      if (showEditModal && selectedVoucher) {
        await updateJournalVoucher(selectedVoucher._id || selectedVoucher.id, voucherData);
        alertify.success('Journal voucher updated successfully');
        setShowEditModal(false);
        setSelectedVoucher(null);
      } else {
        await createJournalVoucher(voucherData);
        alertify.success('Journal voucher created successfully');
        setShowCreateModal(false);
        setFormData({
          company: companyId || '',
          voucherDate: new Date().toISOString().split('T')[0],
          journalType: 'Other',
          referenceNumber: '',
          entries: [
            { account: '', entryType: 'Debit', amount: '', narration: '', billWise: '', billReference: '', tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' }, gst: { applicable: false, gstType: '', gstRate: '', gstAmount: '' } },
            { account: '', entryType: 'Credit', amount: '', narration: '', billWise: '', billReference: '', tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' }, gst: { applicable: false, gstType: '', gstRate: '', gstAmount: '' } }
          ],
          totalAmount: '',
          narration: '',
          remarks: ''
        });
      }
      await fetchData();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alertify.error(error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save journal voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = () => {
    setFormData({
      ...formData,
      entries: [...formData.entries, {
        account: '',
        entryType: 'Debit',
        amount: '',
        narration: '',
        billWise: '',
        billReference: '',
        tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' },
        gst: { applicable: false, gstType: '', gstRate: '', gstAmount: '' }
      }]
    });
  };

  const handleRemoveEntry = (index) => {
    if (formData.entries.length > 2) {
      setFormData({
        ...formData,
        entries: formData.entries.filter((_, i) => i !== index)
      });
    } else {
      alertify.warning('At least two entries (one Debit and one Credit) are required');
    }
  };

  const handleUpdateEntry = (index, field, value) => {
    const updatedEntries = [...formData.entries];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedEntries[index][parent][child] = value;
    } else {
      updatedEntries[index][field] = value;
    }
    setFormData({ ...formData, entries: updatedEntries });
  };

  const calculateBalance = () => {
    let debit = 0;
    let credit = 0;
    formData.entries.forEach(entry => {
      const amount = parseFloat(entry.amount) || 0;
      if (entry.entryType === 'Debit') debit += amount;
      else if (entry.entryType === 'Credit') credit += amount;
    });
    return { debit, credit, difference: debit - credit };
  };

  const balance = calculateBalance();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Journal Vouchers</h2>
              <p className="text-gray-600 text-sm">Manage non-cash accounting entries</p>
            </div>
          </div>
          <button
            onClick={handleCreateJournal}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition flex items-center gap-2 shadow-lg"
          >
            <PlusCircle size={20} />
            Create Journal
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search journal vouchers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={() => setShowCustomRange(true)}
            className="flex items-center gap-2 px-4 py-2 border border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
          >
            <Calendar size={18} className="text-blue-600" />
            <span className="text-sm font-medium">
              {format(range.startDate, 'dd MMM yyyy')} - {format(range.endDate, 'dd MMM yyyy')}
            </span>
          </button>
          <button
            onClick={() => setShowFilterModal(true)}
            className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
          >
            <Filter size={20} />
            Status Filter
          </button>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12">
          <div className="flex justify-center items-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading journal vouchers...</p>
            </div>
          </div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12">
          <div className="text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No journal vouchers found</p>
            <p className="text-gray-400 text-sm mt-2">Create your first journal voucher to get started</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Voucher No.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Journal Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((voucher, index) => (
                  <tr key={voucher._id || voucher.id || index} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">{voucher.voucherNumber || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {voucher.voucherDate ? new Date(voucher.voucherDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        {voucher.journalType || 'Other'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ₹{voucher.totalAmount ? voucher.totalAmount.toLocaleString() : '0'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {voucher.isPosted ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                          <CheckCircle size={14} /> Posted
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                          <XCircle size={14} /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleViewJournal(voucher)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEditJournal(voucher)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Edit"
                          disabled={voucher.isPosted}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteJournal(voucher)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                          disabled={voucher.isPosted}
                        >
                          <Trash2 size={18} />
                        </button>
                        {voucher.isPosted ? (
                          <button
                            onClick={() => handleUnpostJournal(voucher)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="Unpost"
                          >
                            <XCircle size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePostJournal(voucher)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                            title="Post"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-2xl">
              <h3 className="text-xl font-bold">Filter Journal Vouchers</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Journal Type</label>
                <select
                  value={filters.journalType}
                  onChange={(e) => setFilters({ ...filters, journalType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Types</option>
                  <option value="Adjustment">Adjustment</option>
                  <option value="Depreciation">Depreciation</option>
                  <option value="Provision">Provision</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Rectification">Rectification</option>
                  <option value="Opening Balance">Opening Balance</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.isPosted}
                  onChange={(e) => setFilters({ ...filters, isPosted: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Status</option>
                  <option value="true">Posted</option>
                  <option value="false">Draft</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={() => {
                  setFilters({ startDate: '', endDate: '', journalType: '', isPosted: '' });
                  setShowFilterModal(false);
                  fetchData();
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setShowFilterModal(false);
                  fetchData();
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-3xl sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    {showEditModal ? <Edit size={24} /> : <PlusCircle size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{showEditModal ? 'Edit Journal' : 'Create Journal'}</h2>
                    <p className="text-purple-100">{showEditModal ? 'Update journal voucher details' : 'Add a new journal voucher'}</p>
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

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Company Section */}
              {companies.length > 0 && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-800 mb-4">Company Information</h3>
                  <select
                    required
                    value={formData.company}
                    onChange={(e) => {
                      const selectedCompanyId = e.target.value;
                      setFormData({ ...formData, company: selectedCompanyId });
                      setCompanyId(selectedCompanyId);
                      if (selectedCompanyId) fetchAllLedgers(selectedCompanyId);
                      else setLedgers([]);
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
              )}

              {/* Journal Details */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Journal Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <input
                      type="date"
                      required
                      value={formData.voucherDate}
                      onChange={(e) => setFormData({ ...formData, voucherDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <select
                      value={formData.journalType}
                      onChange={(e) => setFormData({ ...formData, journalType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Other">Other</option>
                      <option value="Adjustment">Adjustment</option>
                      <option value="Depreciation">Depreciation</option>
                      <option value="Provision">Provision</option>
                      <option value="Transfer">Transfer</option>
                      <option value="Rectification">Rectification</option>
                      <option value="Opening Balance">Opening Balance</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="Reference Number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Entries Section */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-green-800">Journal Entries</h3>
                  <button
                    type="button"
                    onClick={handleAddEntry}
                    className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
                  >
                    + Add Entry
                  </button>
                </div>

                {/* Balance Summary */}
                <div className="mb-4 p-3 bg-white rounded-lg border-2 border-gray-300">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total Debit</p>
                      <p className="text-lg font-bold text-green-600">₹{balance.debit.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total Credit</p>
                      <p className="text-lg font-bold text-blue-600">₹{balance.credit.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Difference</p>
                      <p className={`text-lg font-bold ${Math.abs(balance.difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{Math.abs(balance.difference).toFixed(2)}
                        {Math.abs(balance.difference) < 0.01 ? ' ✓' : ' ✗'}
                      </p>
                    </div>
                  </div>
                </div>

                {formData.entries.map((entry, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg mb-4 border-2 border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-md font-semibold text-gray-800">Entry {index + 1}</h4>
                      {formData.entries.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEntry(index)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <SearchableDropdown
                          value={entry.account}
                          onChange={(value) => handleUpdateEntry(index, 'account', value)}
                          options={ledgers.map(ledger => ({ value: ledger._id || ledger.id, label: ledger.name || 'Unknown' }))}
                          placeholder="Select Account *"
                          searchPlaceholder="Search accounts..."
                          loading={loadingLedgers}
                          disabled={!formData.company || loadingLedgers}
                          compact={true}
                        />
                      </div>
                      <div>
                        <select
                          required
                          value={entry.entryType}
                          onChange={(e) => handleUpdateEntry(index, 'entryType', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="Debit">Debit</option>
                          <option value="Credit">Credit</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          required
                          step="0.01"
                          value={entry.amount}
                          onChange={(e) => handleUpdateEntry(index, 'amount', e.target.value)}
                          placeholder="Amount *"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <select
                          value={entry.billWise}
                          onChange={(e) => handleUpdateEntry(index, 'billWise', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Bill Wise Type</option>
                          <option value="Against Ref">Against Ref</option>
                          <option value="New Ref">New Ref</option>
                          <option value="Advance">Advance</option>
                          <option value="On Account">On Account</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={entry.billReference}
                          onChange={(e) => handleUpdateEntry(index, 'billReference', e.target.value)}
                          placeholder="Bill Reference"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <input
                        type="text"
                        value={entry.narration}
                        onChange={(e) => handleUpdateEntry(index, 'narration', e.target.value)}
                        placeholder="Entry Narration"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* TDS Section */}
                    <div className="mb-3 bg-gray-50 p-3 rounded-lg">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={entry.tds.applicable}
                          onChange={(e) => handleUpdateEntry(index, 'tds.applicable', e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">TDS Applicable</span>
                      </label>
                      {entry.tds.applicable && (
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <input
                            type="text"
                            value={entry.tds.section}
                            onChange={(e) => handleUpdateEntry(index, 'tds.section', e.target.value)}
                            placeholder="Section (e.g., 194C)"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={entry.tds.rate}
                            onChange={(e) => handleUpdateEntry(index, 'tds.rate', e.target.value)}
                            placeholder="Rate (%)"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={entry.tds.amount}
                            onChange={(e) => handleUpdateEntry(index, 'tds.amount', e.target.value)}
                            placeholder="Amount"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <SearchableDropdown
                            value={entry.tds.tdsAccount}
                            onChange={(value) => handleUpdateEntry(index, 'tds.tdsAccount', value)}
                            options={ledgers.map(ledger => ({ value: ledger._id || ledger.id, label: ledger.name || 'Unknown' }))}
                            placeholder="TDS Account"
                            searchPlaceholder="Search accounts..."
                            loading={loadingLedgers}
                            disabled={!formData.company || loadingLedgers}
                            compact={true}
                          />
                        </div>
                      )}
                    </div>

                    {/* GST Section */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={entry.gst.applicable}
                          onChange={(e) => handleUpdateEntry(index, 'gst.applicable', e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">GST Applicable</span>
                      </label>
                      {entry.gst.applicable && (
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          <select
                            value={entry.gst.gstType}
                            onChange={(e) => handleUpdateEntry(index, 'gst.gstType', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="None">None</option>
                            <option value="IGST">IGST</option>
                            <option value="CGST+SGST">CGST+SGST</option>
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.gst.gstRate}
                            onChange={(e) => handleUpdateEntry(index, 'gst.gstRate', e.target.value)}
                            placeholder="Rate (%)"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={entry.gst.gstAmount}
                            onChange={(e) => handleUpdateEntry(index, 'gst.gstAmount', e.target.value)}
                            placeholder="Amount"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Details */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Additional Details</h3>
                <div className="space-y-3">
                  <textarea
                    value={formData.narration}
                    onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                    placeholder="Overall Narration"
                    rows="2"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Remarks"
                    rows="2"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedVoucher(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || Math.abs(balance.difference) > 0.01}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : showEditModal ? 'Update Journal' : 'Create Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedVoucher && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-3xl sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">View Journal Voucher</h2>
                    <p className="text-purple-100">Voucher details</p>
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

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Voucher Number</p>
                    <p className="text-base font-semibold text-gray-900">{selectedVoucher.voucherNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedVoucher.voucherDate ? new Date(selectedVoucher.voucherDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Journal Type</p>
                    <p className="text-base font-semibold text-gray-900">{selectedVoucher.journalType || 'Other'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-base font-semibold text-gray-900">
                      ₹{selectedVoucher.totalAmount ? selectedVoucher.totalAmount.toLocaleString() : '0'}
                    </p>
                  </div>
                  {selectedVoucher.referenceNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Reference Number</p>
                      <p className="text-base font-semibold text-gray-900">{selectedVoucher.referenceNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-base font-semibold">
                      {selectedVoucher.isPosted ? (
                        <span className="text-green-600">Posted</span>
                      ) : (
                        <span className="text-yellow-600">Draft</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Entries */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Journal Entries</h3>
                <div className="space-y-3">
                  {selectedVoucher.entries && selectedVoucher.entries.map((entry, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Account</p>
                          <p className="text-base font-semibold text-gray-900">
                            {entry.account?.name || entry.account || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Entry Type</p>
                          <p className="text-base font-semibold">
                            <span className={`px-3 py-1 rounded-full text-xs ${
                              entry.entryType === 'Debit' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {entry.entryType}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Amount</p>
                          <p className="text-base font-semibold text-gray-900">
                            ₹{entry.amount ? entry.amount.toLocaleString() : '0'}
                          </p>
                        </div>
                        {entry.narration && (
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600">Narration</p>
                            <p className="text-base text-gray-900">{entry.narration}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              {(selectedVoucher.narration || selectedVoucher.remarks) && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4">Additional Details</h3>
                  {selectedVoucher.narration && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">Narration</p>
                      <p className="text-base text-gray-900">{selectedVoucher.narration}</p>
                    </div>
                  )}
                  {selectedVoucher.remarks && (
                    <div>
                      <p className="text-sm text-gray-600">Remarks</p>
                      <p className="text-base text-gray-900">{selectedVoucher.remarks}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedVoucher(null);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
