import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Search,
  PlusCircle,
  DollarSign,
  Edit,
  Eye,
  Filter,
  FileText
} from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

// Local searchable dropdown used only in this section
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

// Helper function for FY (copied from TallyManagement)
const getCurrentFinancialYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (currentMonth >= 4) {
    return `${currentYear}-${String(currentYear + 1).slice(-2)}`;
  } else {
    return `${currentYear - 1}-${String(currentYear).slice(-2)}`;
  }
};

export default function PaymentSection() {
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
    startDate: '',
    endDate: '',
    isPosted: ''
  });
  const [companyId, setCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  

  const [formData, setFormData] = useState({
    company: '',
    voucherNumber: '',
    voucherDate: '',
    paymentAccount: '',
    paymentMode: '',
    chequeNumber: '',
    chequeDate: '',
    referenceNumber: '',
    entries: [{
      account: '',
      amount: '',
      billWise: '',
      billReference: '',
      tds: {
        applicable: false,
        section: '',
        rate: '',
        amount: '',
        tdsAccount: ''
      },
      gst: {
        applicable: false,
        gstType: '',
        gstRate: '',
        gstAmount: ''
      },
      narration: ''
    }],
    totalAmount: '',
    narration: '',
    remarks: ''
  });

  

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
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load companies';
      alertify.error(errorMessage);
      return null;
    }
  };

  const fetchDefaultCompany = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/company/default/get`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const company = response.data?.data || response.data?.company || response.data;
      return company?._id || company?.id || null;
    } catch (error) {
      console.error('Error fetching default company:', error);
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

  const fetchPaymentData = async (filterParams = {}, companyIdParam = null) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      let url = `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/payment/all`;

      const queryParams = new URLSearchParams();
      const selectedCompanyId = companyIdParam !== null ? companyIdParam : companyId;
      if (selectedCompanyId && selectedCompanyId.trim() !== '') {
        queryParams.append('company', selectedCompanyId);
      }
      if (filterParams.startDate) queryParams.append('startDate', filterParams.startDate);
      if (filterParams.endDate) queryParams.append('endDate', filterParams.endDate);
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
      console.error('Error fetching payment data:', error);
      throw error;
    }
  };

  const getPaymentVoucherById = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/payment/${voucherId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching payment voucher:', error);
      throw error;
    }
  };

  const createPaymentVoucher = async (voucherData) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      const apiUrl = `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/payment/create`;

      const response = await axios.post(apiUrl, voucherData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data?.success === false) {
        const errorMsg = response.data?.message || 'Failed to create payment voucher';
        throw new Error(errorMsg);
      }

      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error creating payment voucher:', error);

      if (error.response) {
        const errorMsg = error.response.data?.message || error.response.data?.error || `Server error: ${error.response.status}`;
        throw new Error(errorMsg);
      } else if (error.request) {
        throw new Error('No response from server. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Failed to create payment voucher');
      }
    }
  };

  const updatePaymentVoucher = async (voucherId, voucherData) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/payment/${voucherId}/update`, voucherData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating payment voucher:', error);
      throw error;
    }
  };

  const deletePaymentVoucher = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.delete(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/payment/${voucherId}/delete`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting payment voucher:', error);
      throw error;
    }
  };

  const postPaymentVoucher = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/payment/${voucherId}/post`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error posting payment voucher:', error);
      throw error;
    }
  };

  const unpostPaymentVoucher = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/payment/${voucherId}/unpost`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error unposting payment voucher:', error);
      throw error;
    }
  };

  const generateNextVoucherNumber = async (companyIdParam) => {
    try {
      if (!companyIdParam) {
        const fy = getCurrentFinancialYear();
        return `PAYMENT/${fy}/00001`;
      }

      const existingVouchers = await fetchPaymentData({}, companyIdParam);

      const currentFY = getCurrentFinancialYear();
      const prefix = `PAYMENT/${currentFY}/`;

      const matchingVouchers = existingVouchers.filter(voucher => {
        const voucherNum = voucher.voucherNumber || '';
        return voucherNum.startsWith(prefix);
      });

      let maxSequence = 0;
      matchingVouchers.forEach(voucher => {
        const voucherNum = voucher.voucherNumber || '';
        if (voucherNum.startsWith(prefix)) {
          const sequenceStr = voucherNum.replace(prefix, '');
          const sequenceNum = parseInt(sequenceStr, 10);
          if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
            maxSequence = sequenceNum;
          }
        }
      });

      const nextSequence = maxSequence + 1;
      const sequenceStr = String(nextSequence).padStart(5, '0');

      return `${prefix}${sequenceStr}`;
    } catch (error) {
      console.error('Error generating voucher number:', error);
      const fy = getCurrentFinancialYear();
      return `PAYMENT/${fy}/00001`;
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchPaymentData(filters, companyId);
      setData(result);
      setFilteredData(result);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load payment data';
      alertify.error(errorMessage);
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
    if (showCreateModal || showEditModal) {
      let total = 0;

      formData.entries.forEach(entry => {
        const entryAmount = parseFloat(entry.amount) || 0;
        total += entryAmount;

        if (entry.tds?.applicable && entry.tds?.amount) {
          const tdsAmount = parseFloat(entry.tds.amount) || 0;
          total += tdsAmount;
        }

        if (entry.gst?.applicable && entry.gst?.gstAmount) {
          const gstAmount = parseFloat(entry.gst.gstAmount) || 0;
          total += gstAmount;
        }
      });

      const calculatedTotal = total > 0 ? total.toFixed(2) : '';
      if (formData.totalAmount !== calculatedTotal) {
        setFormData(prev => ({ ...prev, totalAmount: calculatedTotal }));
      }
    }
  }, [formData.entries, showCreateModal, showEditModal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadCompanies = async () => {
      const defaultCompanyId = await fetchAllCompanies();
      if (defaultCompanyId) {
        setFormData(prev => ({ ...prev, company: defaultCompanyId }));
      } else {
        const company = await fetchDefaultCompany();
        if (company) {
          setCompanyId(company);
          setFormData(prev => ({ ...prev, company }));
        }
      }
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchAllLedgers(companyId);
      fetchData();
    }
  }, [companyId, fetchData]);

  const handleCreatePayment = async () => {
    const defaultCompanyId = companyId || (companies.length > 0 ? (companies[0]._id || companies[0].id) : '');

    let autoGeneratedVoucherNumber = '';
    try {
      autoGeneratedVoucherNumber = await generateNextVoucherNumber(defaultCompanyId);
    } catch (error) {
      console.error('Error generating voucher number:', error);
      const fy = getCurrentFinancialYear();
      autoGeneratedVoucherNumber = `PAYMENT/${fy}/00001`;
    }

    setFormData({
      company: defaultCompanyId,
      voucherNumber: autoGeneratedVoucherNumber,
      voucherDate: new Date().toISOString().split('T')[0],
      paymentAccount: '',
      paymentMode: '',
      chequeNumber: '',
      chequeDate: '',
      referenceNumber: '',
      entries: [{
        account: '',
        amount: '',
        billWise: '',
        billReference: '',
        tds: {
          applicable: false,
          section: '',
          rate: '',
          amount: '',
          tdsAccount: ''
        },
        gst: {
          applicable: false,
          gstType: '',
          gstRate: '',
          gstAmount: ''
        },
        narration: ''
      }],
      totalAmount: '',
      narration: '',
      remarks: ''
    });
    if (defaultCompanyId) {
      fetchAllLedgers(defaultCompanyId);
    }
    setShowCreateModal(true);
  };

  const handleEditPayment = async (voucher) => {
    try {
      setLoading(true);
      const voucherData = await getPaymentVoucherById(voucher._id || voucher.id);

      const paymentAccountId = voucherData.paymentAccount && typeof voucherData.paymentAccount === 'object' && voucherData.paymentAccount !== null
        ? voucherData.paymentAccount._id || voucherData.paymentAccount.id
        : voucherData.paymentAccount;

      const editCompanyId = voucherData.company?._id || voucherData.company || companyId || '';

      setFormData({
        company: editCompanyId,
        voucherNumber: voucherData.voucherNumber || '',
        voucherDate: voucherData.voucherDate ? new Date(voucherData.voucherDate).toISOString().split('T')[0] : '',
        paymentAccount: paymentAccountId || '',
        paymentMode: voucherData.paymentMode || '',
        chequeNumber: voucherData.chequeNumber || '',
        chequeDate: voucherData.chequeDate ? new Date(voucherData.chequeDate).toISOString().split('T')[0] : '',
        referenceNumber: voucherData.referenceNumber || '',
        entries: (voucherData.entries || []).map(entry => ({
          account: entry.account && typeof entry.account === 'object' && entry.account !== null
            ? (entry.account._id || entry.account.id)
            : entry.account,
          amount: entry.amount || '',
          billWise: entry.billWise || '',
          billReference: entry.billReference || '',
          tds: entry.tds?.applicable ? {
            applicable: true,
            section: entry.tds.section || '',
            rate: entry.tds.rate || '',
            amount: entry.tds.amount || '',
            tdsAccount: entry.tds.tdsAccount && typeof entry.tds.tdsAccount === 'object' && entry.tds.tdsAccount !== null
              ? (entry.tds.tdsAccount._id || entry.tds.tdsAccount.id)
              : entry.tds.tdsAccount || ''
          } : { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' },
          gst: entry.gst?.applicable ? {
            applicable: true,
            gstType: entry.gst.gstType || '',
            gstRate: entry.gst.gstRate || '',
            gstAmount: entry.gst.gstAmount || ''
          } : { applicable: false, gstType: '', gstRate: '', gstAmount: '' },
          narration: entry.narration || ''
        })),
        totalAmount: voucherData.totalAmount || '',
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
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load voucher details';
      alertify.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayment = async (voucher) => {
    try {
      setLoading(true);
      const voucherData = await getPaymentVoucherById(voucher._id || voucher.id);
      setSelectedVoucher(voucherData);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error loading voucher:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load voucher details';
      alertify.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (voucher) => {
    if (window.confirm('Are you sure you want to delete this payment voucher?')) {
      try {
        setLoading(true);
        await deletePaymentVoucher(voucher._id || voucher.id);
        alertify.success('Payment voucher deleted successfully');
        fetchData();
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete payment voucher';
        alertify.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePostPayment = async (voucher) => {
    try {
      setLoading(true);
      await postPaymentVoucher(voucher._id || voucher.id);
      alertify.success('Payment voucher posted successfully');
      fetchData();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to post payment voucher';
      alertify.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpostPayment = async (voucher) => {
    try {
      setLoading(true);
      await unpostPaymentVoucher(voucher._id || voucher.id);
      alertify.success('Payment voucher unposted successfully');
      fetchData();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to unpost payment voucher';
      alertify.error(errorMessage);
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

    if (!formData.paymentAccount || formData.paymentAccount.trim() === '') {
      alertify.error('Please select a Payment Account');
      return;
    }

    if (!formData.voucherDate || formData.voucherDate.trim() === '') {
      alertify.error('Please select a Voucher Date');
      return;
    }

    if (!formData.paymentMode || formData.paymentMode.trim() === '') {
      alertify.error('Please select a Payment Mode');
      return;
    }

    if (!formData.entries || formData.entries.length === 0) {
      alertify.error('Please add at least one entry');
      return;
    }

    for (let i = 0; i < formData.entries.length; i++) {
      const entry = formData.entries[i];
      if (!entry.account || entry.account.toString().trim() === '') {
        alertify.error(`Please select an Account for Entry ${i + 1}`);
        return;
      }
      const amount = parseFloat(entry.amount);
      if (isNaN(amount) || amount <= 0) {
        alertify.error(`Please enter a valid Amount for Entry ${i + 1}`);
        return;
      }
    }

    try {
      setLoading(true);

      let totalAmount = formData.totalAmount;
      if (!totalAmount || parseFloat(totalAmount) <= 0) {
        totalAmount = formData.entries.reduce((sum, entry) => {
          let entryTotal = parseFloat(entry.amount) || 0;
          if (entry.tds?.applicable) {
            entryTotal += parseFloat(entry.tds.amount) || 0;
          }
          if (entry.gst?.applicable) {
            entryTotal += parseFloat(entry.gst.gstAmount) || 0;
          }
          return sum + entryTotal;
        }, 0);
      }

      const voucherData = {
        company: String(selectedCompany).trim(),
        voucherDate: formData.voucherDate,
        paymentAccount: String(formData.paymentAccount).trim(),
        paymentMode: formData.paymentMode,
        entries: formData.entries.map(entry => {
          const entryData = {
            account: String(entry.account).trim(),
            amount: parseFloat(entry.amount) || 0
          };

          if (entry.narration && entry.narration.trim() !== '') {
            entryData.narration = entry.narration.trim();
          }
          if (entry.billWise && entry.billWise.trim() !== '') {
            entryData.billWise = entry.billWise.trim();
          }
          if (entry.billReference && entry.billReference.trim() !== '') {
            entryData.billReference = entry.billReference.trim();
          }

          if (entry.tds?.applicable === true) {
            const tdsData = {
              applicable: true
            };

            if (entry.tds.section && entry.tds.section.trim() !== '') {
              tdsData.section = entry.tds.section.trim();
            }

            const tdsRate = parseFloat(entry.tds.rate);
            const tdsAmount = parseFloat(entry.tds.amount);

            if (!isNaN(tdsRate) && tdsRate > 0) {
              tdsData.rate = tdsRate;
            }

            if (!isNaN(tdsAmount) && tdsAmount > 0) {
              tdsData.amount = tdsAmount;
            }

            if (entry.tds.tdsAccount && entry.tds.tdsAccount.toString().trim() !== '') {
              tdsData.tdsAccount = String(entry.tds.tdsAccount).trim();
            }

            entryData.tds = tdsData;
          }

          if (entry.gst?.applicable === true) {
            const gstData = {
              applicable: true
            };

            if (entry.gst.gstType && entry.gst.gstType.trim() !== '' && entry.gst.gstType !== 'None') {
              gstData.gstType = entry.gst.gstType.trim();
            }

            const gstRate = parseFloat(entry.gst.gstRate);
            const gstAmount = parseFloat(entry.gst.gstAmount);

            if (!isNaN(gstRate) && gstRate > 0) {
              gstData.gstRate = gstRate;
            }

            if (!isNaN(gstAmount) && gstAmount > 0) {
              gstData.gstAmount = gstAmount;
            }

            entryData.gst = gstData;
          }

          return entryData;
        }),
        totalAmount: parseFloat(totalAmount) || 0
      };

      if (formData.voucherNumber && formData.voucherNumber.trim() !== '') {
        voucherData.voucherNumber = formData.voucherNumber.trim();
      }

      if (formData.chequeNumber && formData.chequeNumber.trim() !== '') {
        voucherData.chequeNumber = formData.chequeNumber.trim();
      }
      if (formData.chequeDate && formData.chequeDate.trim() !== '') {
        voucherData.chequeDate = formData.chequeDate;
      }
      if (formData.referenceNumber && formData.referenceNumber.trim() !== '') {
        voucherData.referenceNumber = formData.referenceNumber.trim();
      }
      if (formData.narration && formData.narration.trim() !== '') {
        voucherData.narration = formData.narration.trim();
      }
      if (formData.remarks && formData.remarks.trim() !== '') {
        voucherData.remarks = formData.remarks.trim();
      }

      if (!voucherData.company || !voucherData.voucherDate || !voucherData.paymentAccount || !voucherData.paymentMode) {
        alertify.error('Missing required fields. Please check all required fields are filled.');
        setLoading(false);
        return;
      }

      if (!voucherData.entries || voucherData.entries.length === 0) {
        alertify.error('At least one entry is required.');
        setLoading(false);
        return;
      }

      for (let i = 0; i < voucherData.entries.length; i++) {
        const entry = voucherData.entries[i];
        if (!entry.account || !entry.amount || entry.amount <= 0) {
          alertify.error(`Entry ${i + 1} is missing required fields or has invalid amount.`);
          setLoading(false);
          return;
        }
      }

      if (showEditModal && selectedVoucher) {
        await updatePaymentVoucher(selectedVoucher._id || selectedVoucher.id, voucherData);
        alertify.success('Payment voucher updated successfully');
        setShowEditModal(false);
        setSelectedVoucher(null);
      } else {
        await createPaymentVoucher(voucherData);
        alertify.success('Payment voucher created successfully');
        setShowCreateModal(false);
        setFormData({
          company: companyId || '',
          voucherNumber: '',
          voucherDate: new Date().toISOString().split('T')[0],
          paymentAccount: '',
          paymentMode: '',
          chequeNumber: '',
          chequeDate: '',
          referenceNumber: '',
          entries: [{
            account: '',
            amount: '',
            billWise: '',
            billReference: '',
            tds: {
              applicable: false,
              section: '',
              rate: '',
              amount: '',
              tdsAccount: ''
            },
            gst: {
              applicable: false,
              gstType: '',
              gstRate: '',
              gstAmount: ''
            },
            narration: ''
          }],
          totalAmount: '',
          narration: '',
          remarks: ''
        });
      }

      await fetchData();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save payment voucher';
      alertify.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchData();
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      isPosted: ''
    });
    fetchData();
    setShowFilterModal(false);
  };

  const handleAddEntry = () => {
    setFormData({
      ...formData,
      entries: [...formData.entries, {
        account: '',
        amount: '',
        billWise: '',
        billReference: '',
        tds: { applicable: false, section: '', rate: '', amount: '', tdsAccount: '' },
        gst: { applicable: false, gstType: '', gstRate: '', gstAmount: '' },
        narration: ''
      }]
    });
  };

  const handleRemoveEntry = (index) => {
    setFormData({
      ...formData,
      entries: formData.entries.filter((_, i) => i !== index)
    });
  };

  const handleUpdateEntry = (index, field, value) => {
    const updatedEntries = [...formData.entries];
    const entry = updatedEntries[index];

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedEntries[index][parent][child] = value;
    } else {
      updatedEntries[index][field] = value;
    }

    if (field === 'tds.rate') {
      const entryAmount = parseFloat(entry.amount) || 0;
      const tdsRate = parseFloat(value) || 0;
      if (entryAmount > 0 && tdsRate > 0) {
        updatedEntries[index].tds.amount = ((entryAmount * tdsRate) / 100).toFixed(2);
      } else {
        updatedEntries[index].tds.amount = '';
      }
    }

    if (field === 'gst.gstRate') {
      const entryAmount = parseFloat(entry.amount) || 0;
      const gstRate = parseFloat(value) || 0;
      if (entryAmount > 0 && gstRate > 0) {
        updatedEntries[index].gst.gstAmount = ((entryAmount * gstRate) / 100).toFixed(2);
      } else {
        updatedEntries[index].gst.gstAmount = '';
      }
    }

    if (field === 'amount' && entry.tds?.applicable && entry.tds?.rate) {
      const entryAmount = parseFloat(value) || 0;
      const tdsRate = parseFloat(entry.tds.rate) || 0;
      if (entryAmount > 0 && tdsRate > 0) {
        updatedEntries[index].tds.amount = ((entryAmount * tdsRate) / 100).toFixed(2);
      } else {
        updatedEntries[index].tds.amount = '';
      }
    }

    if (field === 'amount' && entry.gst?.applicable && entry.gst?.gstRate) {
      const entryAmount = parseFloat(value) || 0;
      const gstRate = parseFloat(entry.gst.gstRate) || 0;
      if (entryAmount > 0 && gstRate > 0) {
        updatedEntries[index].gst.gstAmount = ((entryAmount * gstRate) / 100).toFixed(2);
      } else {
        updatedEntries[index].gst.gstAmount = '';
      }
    }

    setFormData({ ...formData, entries: updatedEntries });
  };

  const SectionIcon = DollarSign;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6">
        {/* Header with Search and Create Button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-6">
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <SectionIcon className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Payment</p>
                  <p className="text-xl font-bold text-gray-800">{filteredData.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {companies.length > 0 && (
              <div className="relative">
                <select
                  value={companyId || ''}
                  onChange={(e) => {
                    const selectedCompanyId = e.target.value;
                    setCompanyId(selectedCompanyId);
                    setFormData(prev => ({ ...prev, company: selectedCompanyId }));
                    setFilters({
                      startDate: '',
                      endDate: '',
                      isPosted: ''
                    });
                    if (selectedCompanyId) {
                      fetchPaymentData({}, selectedCompanyId).then(result => {
                        setData(result);
                        setFilteredData(result);
                      }).catch(error => {
                        console.error('Error fetching payment data:', error);
                        const errorMessage = error.response?.data?.message || error.message || 'Failed to load payment data';
                        alertify.error(errorMessage);
                        setData([]);
                        setFilteredData([]);
                      });
                    } else {
                      setData([]);
                      setFilteredData([]);
                    }
                  }}
                  className="w-48 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm font-medium"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company._id || company.id} value={company._id || company.id}>
                      {company.companyName} {company.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search payment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setShowFilterModal(true)}
              className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold shadow hover:bg-gray-50 transition"
            >
              <Filter size={20} /> Filter
            </button>

            <button
              onClick={handleCreatePayment}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition"
            >
              <PlusCircle size={20} /> Create Payment
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
                  <p className="text-gray-600">Loading payment...</p>
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
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Payment Account</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Payment Mode</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Reference</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Total Amount</th>
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
                      const paymentAccount = item.paymentAccount && typeof item.paymentAccount === 'object' && item.paymentAccount !== null
                        ? (item.paymentAccount.name || item.paymentAccount._id || 'N/A')
                        : (item.paymentAccount || 'N/A');
                      const paymentMode = item.paymentMode || 'N/A';
                      const referenceNumber = item.referenceNumber || item.chequeNumber || 'N/A';
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
                            <span className="font-medium text-gray-700">{paymentAccount}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-medium text-gray-700">{paymentMode}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-medium text-gray-700">{referenceNumber}</span>
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
                                onClick={() => handleViewPayment(item)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleEditPayment(item)}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Edit
                              </button>
                              {isPosted ? (
                                <button
                                  onClick={() => handleUnpostPayment(item)}
                                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                                >
                                  Unpost
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePostPayment(item)}
                                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                                >
                                  Post
                                </button>
                              )}
                              <button
                                onClick={() => handleDeletePayment(item)}
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
                      <td colSpan="8" className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <SectionIcon className="w-16 h-16 text-gray-300 mb-4" />
                          <p className="text-gray-500 text-lg">
                            {searchTerm
                              ? 'No payment vouchers found matching your search'
                              : 'No payment vouchers found'}
                          </p>
                          <p className="text-gray-400 text-sm mt-2">
                            {searchTerm
                              ? 'Try adjusting your search terms'
                              : 'Create your first entry to get started'}
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
      </div>

      {/* Create/Edit Payment Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4">
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    {showEditModal ? <Edit className="text-white" size={24} /> : <PlusCircle className="text-white" size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{showEditModal ? 'Edit Payment' : 'Create Payment'}</h2>
                    <p className="text-blue-100">{showEditModal ? 'Update payment voucher details' : 'Add a new payment voucher'}</p>
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
                          setFormData({ ...formData, company: selectedCompanyId, paymentAccount: '' });
                          setCompanyId(selectedCompanyId);
                          if (selectedCompanyId) {
                            fetchAllLedgers(selectedCompanyId);
                          } else {
                            setLedgers([]);
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Voucher Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      value={formData.voucherNumber}
                      onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                      placeholder="Voucher Number (Auto-generated)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      required
                      value={formData.voucherDate}
                      onChange={(e) => setFormData({ ...formData, voucherDate: e.target.value })}
                      placeholder="Voucher Date *"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Payment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="date"
                      required
                      value={formData.voucherDate}
                      onChange={(e) => setFormData({ ...formData, voucherDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Voucher Date *"
                    />
                  </div>
                  <div>
                    <SearchableDropdown
                      value={formData.paymentAccount}
                      onChange={(value) => setFormData({ ...formData, paymentAccount: value })}
                      options={ledgers.map(ledger => ({
                        value: ledger._id || ledger.id,
                        label: ledger.name || 'Unknown'
                      }))}
                      placeholder="Select Payment Account *"
                      searchPlaceholder="Search ledgers..."
                      loading={loadingLedgers}
                      disabled={!formData.company || loadingLedgers}
                    />
                  </div>
                  <div>
                    <select
                      required
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Payment Mode *</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="Reference Number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-blue-800">Payment Entries</h3>
                  <button
                    type="button"
                    onClick={handleAddEntry}
                    className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
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
                          onClick={() => handleRemoveEntry(index)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <SearchableDropdown
                          value={entry.account}
                          onChange={(value) => handleUpdateEntry(index, 'account', value)}
                          options={ledgers.map(ledger => ({
                            value: ledger._id || ledger.id,
                            label: ledger.name || 'Unknown'
                          }))}
                          placeholder="Select Account *"
                          searchPlaceholder="Search accounts..."
                          loading={loadingLedgers}
                          disabled={!formData.company || loadingLedgers}
                          className="w-full"
                          compact={true}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          required
                          step="0.01"
                          value={entry.amount}
                          onChange={(e) => handleUpdateEntry(index, 'amount', e.target.value)}
                          placeholder="Amount *"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <select
                          value={entry.billWise}
                          onChange={(e) => handleUpdateEntry(index, 'billWise', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Bill Wise Type</option>
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

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
                          <div>
                            <input
                              type="text"
                              value={entry.tds.section}
                              onChange={(e) => handleUpdateEntry(index, 'tds.section', e.target.value)}
                              placeholder="Section (e.g., 194C)"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              value={entry.tds.rate}
                              onChange={(e) => handleUpdateEntry(index, 'tds.rate', e.target.value)}
                              placeholder="Rate (%)"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              value={entry.tds.amount}
                              onChange={(e) => handleUpdateEntry(index, 'tds.amount', e.target.value)}
                              placeholder="Amount (Auto-calculated)"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <SearchableDropdown
                              value={entry.tds.tdsAccount}
                              onChange={(value) => handleUpdateEntry(index, 'tds.tdsAccount', value)}
                              options={ledgers.map(ledger => ({
                                value: ledger._id || ledger.id,
                                label: ledger.name || 'Unknown'
                              }))}
                              placeholder="TDS Account"
                              searchPlaceholder="Search accounts..."
                              loading={loadingLedgers}
                              disabled={!formData.company || loadingLedgers}
                              className="w-full"
                              compact={true}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mb-3 bg-gray-50 p-3 rounded-lg">
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
                          <div>
                            <select
                              value={entry.gst.gstType}
                              onChange={(e) => handleUpdateEntry(index, 'gst.gstType', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select GST Type</option>
                              <option value="IGST">IGST</option>
                              <option value="CGST+SGST">CGST+SGST</option>
                              <option value="None">None</option>
                            </select>
                          </div>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              value={entry.gst.gstRate}
                              onChange={(e) => handleUpdateEntry(index, 'gst.gstRate', e.target.value)}
                              placeholder="GST Rate (%)"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              value={entry.gst.gstAmount}
                              onChange={(e) => handleUpdateEntry(index, 'gst.gstAmount', e.target.value)}
                              placeholder="GST Amount (Auto-calculated)"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <textarea
                        rows="2"
                        value={entry.narration}
                        onChange={(e) => handleUpdateEntry(index, 'narration', e.target.value)}
                        placeholder="Narration"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Additional Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <textarea
                      rows="2"
                      value={formData.narration}
                      onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                      placeholder="Overall Narration"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.totalAmount}
                        readOnly
                        placeholder="Total Amount (Auto-calculated)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        placeholder="Remarks"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedVoucher(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow transition ${
                    loading
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:from-blue-600 hover:to-blue-700'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Saving...
                    </span>
                  ) : (
                    showEditModal ? 'Update Payment' : 'Create Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Payment Modal */}
      {showViewModal && selectedVoucher && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4">
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Payment Voucher Details</h2>
                    <p className="text-blue-100">View payment voucher information</p>
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
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-2">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Voucher Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-white border border-blue-200 rounded-xl">
                  <div className="bg-white rounded-xl p-2 mt-4 ml-4 ">
                    <p className="text-sm text-gray-600 mb-1">Voucher Number</p>
                    <p className="font-semibold text-gray-800">{selectedVoucher.voucherNumber || selectedVoucher._id || selectedVoucher.id || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-2 ml-4 mt-4 ">
                    <p className="text-sm text-gray-600 mb-1">Company</p>
                    <p className="font-semibold text-gray-800">
                      {selectedVoucher.company && typeof selectedVoucher.company === 'object' && selectedVoucher.company !== null
                        ? (selectedVoucher.company.companyName || selectedVoucher.company._id || 'N/A')
                        : (companies.find(c => (c._id || c.id) === selectedVoucher.company)?.companyName || selectedVoucher.company || 'N/A')}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-1 ml-4 ">
                    <p className="text-sm text-gray-600 mb-1">Voucher Date</p>
                    <p className="font-semibold text-gray-800">
                      {selectedVoucher.voucherDate ? new Date(selectedVoucher.voucherDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-1 ml-4 ">
                    <p className="text-sm text-gray-600 mb-1">Payment Account</p>
                    <p className="font-semibold text-gray-800">
                      {selectedVoucher.paymentAccount && typeof selectedVoucher.paymentAccount === 'object' && selectedVoucher.paymentAccount !== null
                        ? (selectedVoucher.paymentAccount.name || selectedVoucher.paymentAccount._id || 'N/A')
                        : (selectedVoucher.paymentAccount || 'N/A')}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-1 ml-4 ">
                    <p className="text-sm text-gray-600 mb-1">Payment Mode</p>
                    <p className="font-semibold text-gray-800">{selectedVoucher.paymentMode || 'N/A'}</p>
                  </div>
                  {selectedVoucher.chequeNumber && (
                    <div className="bg-white rounded-xl p-1 ml-4">
                      <p className="text-sm text-gray-600 mb-1">Cheque Number</p>
                      <p className="font-semibold text-gray-800">{selectedVoucher.chequeNumber}</p>
                    </div>
                  )}
                  {selectedVoucher.chequeDate && (
                    <div className="bg-white rounded-xl p-1 ml-4">
                      <p className="text-sm text-gray-600 mb-1">Cheque Date</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(selectedVoucher.chequeDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div className="bg-white rounded-xl p-1 ml-4">
                    <p className="text-sm text-gray-600 mb-1">Reference Number</p>
                    <p className="font-semibold text-gray-800">{selectedVoucher.referenceNumber || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-1 ml-4">
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <p className="font-semibold text-gray-800">
                      ₹{Number(selectedVoucher.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-1 ml-4 ">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedVoucher.isPosted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedVoucher.isPosted ? 'Posted' : 'Unposted'}
                    </p>
                  </div>
                  {selectedVoucher.narration && (
                    <div className="col-span-2 bg-white rounded-xl p-1 ml-4">
                      <p className="text-sm text-gray-600 mb-1">Narration</p>
                      <p className="font-semibold text-gray-800">{selectedVoucher.narration}</p>
                    </div>
                  )}
                  <div className="bg-white rounded-xl p-1 ml-4 mb-4 ">
                    <p className="text-sm text-gray-600 mb-1">Remarks</p>
                    <p className="font-semibold text-gray-800">{selectedVoucher.remarks || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="text-green-600" size={20} />
                </div>
                {selectedVoucher.entries && selectedVoucher.entries.length > 0 ? (
                  <div className="space-y-4">
                    {selectedVoucher.entries.map((entry, index) => (
                      <div key={index} className="bg-white rounded-xl p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-bold text-sm">{index + 1}</span>
                          </div>
                          <h4 className="font-semibold text-gray-800">Entry {index + 1}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Account:</span>
                            <span className="ml-2 font-medium text-gray-800">
                              {entry.account && typeof entry.account === 'object' && entry.account !== null
                                ? (entry.account.name || entry.account._id || 'N/A')
                                : (entry.account || 'N/A')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Amount:</span>
                            <span className="ml-2 font-medium text-gray-800">
                              ₹{Number(entry.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Bill Wise:</span>
                            <span className="ml-2 font-medium text-gray-800">{entry.billWise || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Bill Reference:</span>
                            <span className="ml-2 font-medium text-gray-800">{entry.billReference || 'N/A'}</span>
                          </div>
                          {entry.tds?.applicable && (
                            <>
                              <div>
                                <span className="text-gray-600">TDS Section:</span>
                                <span className="ml-2 font-medium text-gray-800">{entry.tds.section || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">TDS Rate:</span>
                                <span className="ml-2 font-medium text-gray-800">{entry.tds.rate || 0}%</span>
                              </div>
                              <div>
                                <span className="text-gray-600">TDS Amount:</span>
                                <span className="ml-2 font-medium text-gray-800">
                                  ₹{Number(entry.tds.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </>
                          )}
                          {entry.gst?.applicable && (
                            <>
                              <div>
                                <span className="text-gray-600">GST Type:</span>
                                <span className="ml-2 font-medium text-gray-800">{entry.gst.gstType || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">GST Rate:</span>
                                <span className="ml-2 font-medium text-gray-800">{entry.gst.gstRate || 0}%</span>
                              </div>
                              <div>
                                <span className="text-gray-600">GST Amount:</span>
                                <span className="ml-2 font-medium text-gray-800">
                                  ₹{Number(entry.gst.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </>
                          )}
                          {entry.narration && (
                            <div className="col-span-2">
                              <span className="text-gray-600">Narration:</span>
                              <p className="mt-1 text-gray-800">{entry.narration}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No entries found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

