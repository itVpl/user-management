import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Search, PlusCircle, Edit, Trash2, Eye, CheckCircle, XCircle, Calendar, Filter, ArrowLeftRight } from 'lucide-react';
import API_CONFIG from '../../../config/api.js';
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


export default function ContraVoucher({ selectedCompanyId = null }) {
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
  const [companyId, setCompanyId] = useState(selectedCompanyId);
  const [companies, setCompanies] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);


  // Form state for create/edit
  const [formData, setFormData] = useState({
    company: '',
    voucherDate: '',
    fromAccount: '',
    toAccount: '',
    amount: '',
    narration: '',
    reference: ''
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


  // Fetch all ledgers for a company (only Cash and Bank accounts)
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
      // Filter only Cash and Bank accounts for Contra vouchers
    ;
      setLedgers(ledgersList)
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      alertify.error(error.response?.data?.message || 'Failed to load ledgers');
      setLedgers([]);
    } finally {
      setLoadingLedgers(false);
    }
  };


  // Contra Voucher API Functions
  const fetchContraData = useCallback(async (filterParams = {}) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      let url = `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/contra/all`;
     
      const queryParams = new URLSearchParams();
      if (companyId) queryParams.append('company', companyId);
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
      console.error('Error fetching contra data:', error);
      throw error;
    }
  }, [companyId]);


  const getContraVoucherById = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/contra/${voucherId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching contra voucher:', error);
      throw error;
    }
  };


  const createContraVoucher = async (voucherData) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
     
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }


      const apiUrl = `${API_CONFIG.BASE_URL}/api/v1/tally/voucher/contra/create`;
      console.log('Creating contra voucher with data:', JSON.stringify(voucherData, null, 2));
     
      const response = await axios.post(apiUrl, voucherData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
     
      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to create contra voucher');
      }
     
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error creating contra voucher:', error);
     
      if (error.response) {
        const errorMsg = error.response.data?.message || error.response.data?.error || `Server error: ${error.response.status}`;
        throw new Error(errorMsg);
      } else if (error.request) {
        throw new Error('No response from server. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Failed to create contra voucher');
      }
    }
  };


  const updateContraVoucher = async (voucherId, voucherData) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/contra/${voucherId}/update`, voucherData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.voucher || response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating contra voucher:', error);
      throw error;
    }
  };


  const deleteContraVoucher = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.delete(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/contra/${voucherId}/delete`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting contra voucher:', error);
      throw error;
    }
  };


  const postContraVoucher = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/contra/${voucherId}/post`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error posting contra voucher:', error);
      throw error;
    }
  };


  const unpostContraVoucher = async (voucherId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tally/voucher/contra/${voucherId}/unpost`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error unposting contra voucher:', error);
      throw error;
    }
  };


  // Fetch data based on filters
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchContraData(filters);
      setData(result);
      setFilteredData(result);
    } catch (error) {
      console.error('Error fetching contra data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load contra data';
      alertify.error(errorMessage);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [filters, fetchContraData]);


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


  // Sync with parent selectedCompanyId
  useEffect(() => {
    if (selectedCompanyId && selectedCompanyId !== companyId) {
      setCompanyId(selectedCompanyId);
      setFormData(prev => ({ ...prev, company: selectedCompanyId }));
    }
  }, [selectedCompanyId]);

  // Fetch companies on mount
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


  // Handle create contra
  const handleCreateContra = () => {
    const defaultCompanyId = companyId || (companies.length > 0 ? (companies[0]._id || companies[0].id) : '');
   
    setFormData({
      company: defaultCompanyId,
      voucherDate: new Date().toISOString().split('T')[0],
      fromAccount: '',
      toAccount: '',
      amount: '',
      narration: '',
      reference: ''
    });
   
    if (defaultCompanyId) {
      fetchAllLedgers(defaultCompanyId);
    }
    setShowCreateModal(true);
  };


  // Handle edit contra
  const handleEditContra = async (voucher) => {
    try {
      setLoading(true);
      const voucherData = await getContraVoucherById(voucher._id || voucher.id);
     
      const fromAccountId = voucherData.fromAccount && typeof voucherData.fromAccount === 'object' && voucherData.fromAccount !== null
        ? voucherData.fromAccount._id || voucherData.fromAccount.id
        : voucherData.fromAccount;
     
      const toAccountId = voucherData.toAccount && typeof voucherData.toAccount === 'object' && voucherData.toAccount !== null
        ? voucherData.toAccount._id || voucherData.toAccount.id
        : voucherData.toAccount;
     
      const editCompanyId = voucherData.company?._id || voucherData.company || companyId || '';
     
      setFormData({
        company: editCompanyId,
        voucherDate: voucherData.voucherDate ? new Date(voucherData.voucherDate).toISOString().split('T')[0] : '',
        fromAccount: fromAccountId || '',
        toAccount: toAccountId || '',
        amount: voucherData.amount || '',
        narration: voucherData.narration || '',
        reference: voucherData.reference || ''
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


  // Handle view contra
  const handleViewContra = async (voucher) => {
    try {
      setLoading(true);
      const voucherData = await getContraVoucherById(voucher._id || voucher.id);
      setSelectedVoucher(voucherData);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error loading voucher:', err);
      alertify.error(err.response?.data?.message || err.message || 'Failed to load voucher details');
    } finally {
      setLoading(false);
    }
  };


  // Handle delete contra
  const handleDeleteContra = async (voucher) => {
    if (window.confirm('Are you sure you want to delete this contra voucher?')) {
      try {
        setLoading(true);
        await deleteContraVoucher(voucher._id || voucher.id);
        alertify.success('Contra voucher deleted successfully');
        fetchData();
      } catch (error) {
        alertify.error(error.response?.data?.message || error.message || 'Failed to delete contra voucher');
      } finally {
        setLoading(false);
      }
    }
  };


  // Handle post contra
  const handlePostContra = async (voucher) => {
    try {
      setLoading(true);
      await postContraVoucher(voucher._id || voucher.id);
      alertify.success('Contra voucher posted successfully');
      fetchData();
    } catch (error) {
      alertify.error(error.response?.data?.message || error.message || 'Failed to post contra voucher');
    } finally {
      setLoading(false);
    }
  };


  // Handle unpost contra
  const handleUnpostContra = async (voucher) => {
    try {
      setLoading(true);
      await unpostContraVoucher(voucher._id || voucher.id);
      alertify.success('Contra voucher unposted successfully');
      fetchData();
    } catch (error) {
      alertify.error(error.response?.data?.message || error.message || 'Failed to unpost contra voucher');
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
   
    if (!formData.fromAccount || formData.fromAccount.trim() === '') {
      alertify.error('Please select From Account');
      return;
    }
   
    if (!formData.toAccount || formData.toAccount.trim() === '') {
      alertify.error('Please select To Account');
      return;
    }
   
    if (formData.fromAccount === formData.toAccount) {
      alertify.error('From Account and To Account cannot be the same');
      return;
    }
   
    if (!formData.voucherDate || formData.voucherDate.trim() === '') {
      alertify.error('Please select a Voucher Date');
      return;
    }
   
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alertify.error('Please enter a valid Amount');
      return;
    }
   
    try {
      setLoading(true);
     
      const voucherData = {
        company: selectedCompany,
        voucherDate: formData.voucherDate,
        fromAccount: formData.fromAccount,
        toAccount: formData.toAccount,
        amount: parseFloat(formData.amount)
      };


      if (formData.narration && formData.narration.trim() !== '') {
        voucherData.narration = formData.narration.trim();
      }
      if (formData.reference && formData.reference.trim() !== '') {
        voucherData.reference = formData.reference.trim();
      }


      if (showEditModal && selectedVoucher) {
        await updateContraVoucher(selectedVoucher._id || selectedVoucher.id, voucherData);
        alertify.success('Contra voucher updated successfully');
        setShowEditModal(false);
        setSelectedVoucher(null);
      } else {
        await createContraVoucher(voucherData);
        alertify.success('Contra voucher created successfully');
        setShowCreateModal(false);
        setFormData({
          company: companyId || '',
          voucherDate: new Date().toISOString().split('T')[0],
          fromAccount: '',
          toAccount: '',
          amount: '',
          narration: '',
          reference: ''
        });
      }
     
      await fetchData();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alertify.error(error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save contra voucher');
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
                <ArrowLeftRight className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Contra</p>
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
              placeholder="Search contra vouchers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
         
          {/* Filter Button */}
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold shadow hover:bg-gray-50 transition"
          >
            <Filter size={20} /> Filter
          </button>
         
          {/* Create Contra Button */}
          <button
            onClick={handleCreateContra}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition"
          >
            <PlusCircle size={20} /> Create Contra
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
                <p className="text-gray-600">Loading contra vouchers...</p>
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
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">From Account</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">To Account</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Amount</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Reference</th>
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
                    const fromAccount = item.fromAccount && typeof item.fromAccount === 'object' && item.fromAccount !== null
                      ? (item.fromAccount.name || item.fromAccount._id || 'N/A')
                      : (item.fromAccount || 'N/A');
                    const toAccount = item.toAccount && typeof item.toAccount === 'object' && item.toAccount !== null
                      ? (item.toAccount.name || item.toAccount._id || 'N/A')
                      : (item.toAccount || 'N/A');
                    const amount = item.amount || 0;
                    const reference = item.reference || 'N/A';
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
                          <span className="font-medium text-gray-700">{fromAccount}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700">{toAccount}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700">
                            ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700">{reference}</span>
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
                              onClick={() => handleViewContra(item)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEditContra(item)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              Edit
                            </button>
                            {isPosted ? (
                              <button
                                onClick={() => handleUnpostContra(item)}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Unpost
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePostContra(item)}
                                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Post
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteContra(item)}
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
                        <ArrowLeftRight className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg">
                          {searchTerm
                            ? 'No contra vouchers found matching your search'
                            : 'No contra vouchers found'}
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          {searchTerm
                            ? 'Try adjusting your search terms'
                            : 'Create your first contra voucher to get started'}
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


      {/* Create/Edit Contra Modal */}
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
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    {showEditModal ? <Edit className="text-white" size={24} /> : <PlusCircle className="text-white" size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{showEditModal ? 'Edit Contra' : 'Create Contra'}</h2>
                    <p className="text-blue-100">{showEditModal ? 'Update contra voucher details' : 'Add a new contra voucher'}</p>
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
                          setFormData({ ...formData, company: selectedCompanyId, fromAccount: '', toAccount: '' });
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
             
              {/* Contra Details Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Contra Details</h3>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="Enter amount"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Account (Debit) *</label>
                    <SearchableDropdown
                      value={formData.fromAccount}
                      onChange={(value) => setFormData({ ...formData, fromAccount: value })}
                      options={ledgers.map(ledger => {
                        const companyName = ledger.company?.companyName || 'Unknown Company';
                        const accountCode = ledger.accountCode || 'N/A';
                        return {
                          value: ledger._id || ledger.id,
                          label: `${ledger.name} [${accountCode}] (${ledger.accountType}) - ${companyName}`
                        };
                      })}
                      placeholder="Select From Account *"
                      searchPlaceholder="Search by name, code, or company..."
                      loading={loadingLedgers}
                      disabled={loadingLedgers}
                    />
                    <p className="text-xs text-gray-500 mt-1">Cash/Bank account to debit (from all companies)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Account (Credit) *</label>
                    <SearchableDropdown
                      value={formData.toAccount}
                      onChange={(value) => setFormData({ ...formData, toAccount: value })}
                      options={ledgers.map(ledger => {
                        const companyName = ledger.company?.companyName || 'Unknown Company';
                        const accountCode = ledger.accountCode || 'N/A';
                        return {
                          value: ledger._id || ledger.id,
                          label: `${ledger.name} [${accountCode}] (${ledger.accountType}) - ${companyName}`
                        };
                      })}
                      placeholder="Select To Account *"
                      searchPlaceholder="Search by name, code, or company..."
                      loading={loadingLedgers}
                      disabled={loadingLedgers}
                    />
                    <p className="text-xs text-gray-500 mt-1">Cash/Bank account to credit (from all companies)</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="Cheque number, transaction reference, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                    <textarea
                      value={formData.narration}
                      onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                      placeholder="Description of the transaction"
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
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
                    <h4 className="text-sm font-semibold text-yellow-800 mb-1">Contra Voucher Information</h4>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• Only Cash and Bank accounts can be used in contra vouchers</li>
                      <li>• From Account and To Account must be different</li>
                      <li>• Common uses: Cash deposits, withdrawals, and bank transfers</li>
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
                  {loading ? 'Saving...' : showEditModal ? 'Update Contra' : 'Create Contra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* View Contra Modal */}
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
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Contra Voucher Details</h2>
                    <p className="text-blue-100">View contra voucher information</p>
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
            
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Voucher Information */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-2">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowLeftRight className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Voucher Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-white border border-blue-200 rounded-xl">
                  <div className="bg-white rounded-xl p-2 mt-4 ml-4">
                    <p className="text-sm text-gray-600 mb-1">Voucher Number</p>
                    <p className="font-semibold text-gray-800">{selectedVoucher.voucherNumber || selectedVoucher._id || selectedVoucher.id || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-2 ml-4 mt-4">
                    <p className="text-sm text-gray-600 mb-1">Company</p>
                    <p className="font-semibold text-gray-800">
                      {selectedVoucher.company && typeof selectedVoucher.company === 'object' && selectedVoucher.company !== null
                        ? (selectedVoucher.company.companyName || selectedVoucher.company._id || 'N/A')
                        : (companies.find(c => (c._id || c.id) === selectedVoucher.company)?.companyName || selectedVoucher.company || 'N/A')}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-1 ml-4">
                    <p className="text-sm text-gray-600 mb-1">Voucher Date</p>
                    <p className="font-semibold text-gray-800">
                      {selectedVoucher.voucherDate ? new Date(selectedVoucher.voucherDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-1 ml-4">
                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                    <p className="font-semibold text-gray-800">
                      ₹{Number(selectedVoucher.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  {selectedVoucher.reference && (
                    <div className="bg-white rounded-xl p-1 ml-4">
                      <p className="text-sm text-gray-600 mb-1">Reference Number</p>
                      <p className="font-semibold text-gray-800">{selectedVoucher.reference}</p>
                    </div>
                  )}
                  <div className="bg-white rounded-xl p-1 ml-4">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedVoucher.isPosted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedVoucher.isPosted ? 'Posted' : 'Unposted'}
                    </p>
                  </div>
                  {selectedVoucher.narration && (
                    <div className="col-span-2 bg-white rounded-xl p-1 ml-4 mb-4">
                      <p className="text-sm text-gray-600 mb-1">Narration</p>
                      <p className="font-semibold text-gray-800">{selectedVoucher.narration}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Transaction Details */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowLeftRight className="text-green-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Transaction Details</h3>
                </div>
                <div className="bg-white rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">From Account (Debit)</p>
                      <p className="font-semibold text-gray-800">
                        {selectedVoucher.fromAccount && typeof selectedVoucher.fromAccount === 'object' && selectedVoucher.fromAccount !== null
                          ? (selectedVoucher.fromAccount.name || selectedVoucher.fromAccount._id || 'N/A')
                          : (selectedVoucher.fromAccount || 'N/A')}
                      </p>
                      {selectedVoucher.fromAccount?.accountType && (
                        <p className="text-xs text-gray-500 mt-1">Type: {selectedVoucher.fromAccount.accountType}</p>
                      )}
                    </div>
                    <div className="px-4">
                      <ArrowLeftRight className="text-blue-500" size={32} />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm text-gray-600 mb-1">To Account (Credit)</p>
                      <p className="font-semibold text-gray-800">
                        {selectedVoucher.toAccount && typeof selectedVoucher.toAccount === 'object' && selectedVoucher.toAccount !== null
                          ? (selectedVoucher.toAccount.name || selectedVoucher.toAccount._id || 'N/A')
                          : (selectedVoucher.toAccount || 'N/A')}
                      </p>
                      {selectedVoucher.toAccount?.accountType && (
                        <p className="text-xs text-gray-500 mt-1">Type: {selectedVoucher.toAccount.accountType}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Filter Modal */}
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
                  <h2 className="text-xl font-bold">Filter Contra Vouchers</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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



