import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, User, Mail, Phone, MapPin, CheckCircle, XCircle, Clock, Building, Truck, ChevronDown, UserCheck, X, DollarSign, CreditCard, Send, FileText, Image, Download, Eye, Paperclip, Users } from 'lucide-react';
import API_CONFIG from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

  // Close dropdown when clicking outside or pressing Escape
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
  const hasError = className.includes('border-red');

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full px-4 py-3 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
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
          {/* Search Input */}
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

          {/* Options List */}
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

const AllCustomer = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Created By Filter State
  const [selectedCreatedBy, setSelectedCreatedBy] = useState('');
  const [employeeMap, setEmployeeMap] = useState(new Map()); // Map empId -> employeeName

  // Reassign Modal State
  const [reassignModal, setReassignModal] = useState({ visible: false, customer: null });
  const [salesUsers, setSalesUsers] = useState([]);
  const [selectedSalesUser, setSelectedSalesUser] = useState('');
  const [reassignDescription, setReassignDescription] = useState('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [salesUserSearch, setSalesUserSearch] = useState('');
  const [isSalesDropdownOpen, setIsSalesDropdownOpen] = useState(false);

  // Credit Limit Modal State
  const [creditLimitModal, setCreditLimitModal] = useState({ visible: false, customer: null });
  const [creditLimitAmount, setCreditLimitAmount] = useState('');
  const [creditLimitSubmitting, setCreditLimitSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [creditLimitRequests, setCreditLimitRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchSalesUsers();
    fetchAllEmployees();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/shippers`,
        { headers: API_CONFIG.getAuthHeaders() }
      );
      
      if (response.data && response.data.success) {
        // Sort by createdAt descending (newest first)
        const sortedData = response.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setCustomers(sortedData);
      } else {
        console.error('Failed to fetch customers: API success false');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Mark customer as viewed
  const markCustomerAsViewed = async (customerId) => {
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/customer/${customerId}/mark-viewed`,
        {},
        { headers: API_CONFIG.getAuthHeaders() }
      );

      if (response.data && response.data.success) {
        // Optimistically update local state to remove red dot immediately
        setCustomers(prevCustomers =>
          prevCustomers.map(customer =>
            customer._id === customerId
              ? { ...customer, isNew: false }
              : customer
          )
        );
        return true;
      } else {
        console.error('Failed to mark customer as viewed:', response.data?.message);
        return false;
      }
    } catch (error) {
      console.error('Error marking customer as viewed:', error);
      // Revert optimistic update on error
      fetchCustomers(); // Refresh to get correct state
      return false;
    }
  };

  // Handle customer name click to mark as viewed
  const handleCustomerNameClick = async (customer) => {
    // Mark as viewed if it's a new customer
    if (customer.isNew === true) {
      await markCustomerAsViewed(customer._id);
    }
  };

  const fetchSalesUsers = async () => {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/Sales`,
        { headers: API_CONFIG.getAuthHeaders() }
      );
      if (response.data && response.data.employees) {
        setSalesUsers(response.data.employees);
      }
    } catch (error) {
      console.error('Error fetching Sales users:', error);
    }
  };

  // Fetch all employees to get names for Created By filter
  const fetchAllEmployees = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser`, {
        headers: { 'Authorization': `Bearer ${token}` },
        withCredentials: true
      });

      if (response.data && response.data.employees) {
        const empMap = new Map();
        response.data.employees.forEach(emp => {
          // Filter for Sales department only and active users only
          const dept = (emp.department || '').toLowerCase();
          const isActive = emp.status === 'active' || emp.status === undefined;
          
          if (emp.empId && dept === 'sales' && isActive) {
            const name = emp.employeeName || emp.empName || emp.name || '';
            empMap.set(emp.empId, name.trim() || 'N/A');
          }
        });
        setEmployeeMap(empMap);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Reassign Handlers
  const handleReAssign = (customer) => {
    setReassignModal({ visible: true, customer });
    setSelectedSalesUser('');
    setReassignDescription('');
    setSalesUserSearch('');
    setIsSalesDropdownOpen(false);
  };

  const closeReassignModal = () => {
    setReassignModal({ visible: false, customer: null });
    setSelectedSalesUser('');
    setReassignDescription('');
    setReassignSubmitting(false);
    setSalesUserSearch('');
    setIsSalesDropdownOpen(false);
  };

  const handleSalesUserSelect = (userId, name) => {
    setSelectedSalesUser(userId);
    setSalesUserSearch(name);
    setIsSalesDropdownOpen(false);
  };

  const filteredSalesUsers = salesUsers.filter(user => 
    user.employeeName?.toLowerCase().includes(salesUserSearch.toLowerCase()) ||
    user.empId?.toLowerCase().includes(salesUserSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(salesUserSearch.toLowerCase())
  );

  const selectedSalesUserName = salesUsers.find(u => u._id === selectedSalesUser)?.employeeName || '';

  const handleReassignSubmit = async () => {
    if (!selectedSalesUser) {
      toast.error('Please select a Sales user to assign the customer to');
      return;
    }

    if (!reassignDescription.trim()) {
      toast.error('Please provide a description for re-assignment');
      return;
    }

    try {
      setReassignSubmitting(true);
      
      const selectedUser = salesUsers.find(user => user._id === selectedSalesUser);
      if (!selectedUser) {
        toast.error('Selected Sales user not found');
        return;
      }

      const payload = {
        newSalesEmpId: selectedUser.empId,
        reason: reassignDescription.trim()
      };

      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/reassign-shipper/${reassignModal.customer?._id}`,
        payload,
        { headers: API_CONFIG.getAuthHeaders() }
      );

      if (response.data.success || response.status === 200) {
        toast.success(`Customer re-assigned successfully to ${selectedUser.employeeName}!`);
        closeReassignModal();
        fetchCustomers();
      } else {
        toast.error(response.data.message || 'Failed to re-assign customer');
      }

    } catch (error) {
      console.error('Re-assign error:', error);
      toast.error(error.response?.data?.message || 'Failed to re-assign customer. Please try again.');
    } finally {
      setReassignSubmitting(false);
    }
  };

  // Credit Limit Handlers
  const handleAddCreditLimit = async (customer) => {
    setCreditLimitModal({ visible: true, customer });
    setCreditLimitAmount(customer.creditLimit || '');
    
    // Check if customer already has credit limit requests from the table data
    if (customer.creditLimitRequests && customer.creditLimitRequests.length > 0) {
      setCreditLimitRequests(customer.creditLimitRequests);
      setLoadingRequests(false);
      return;
    }
    
    // Otherwise, fetch credit limit requests for this customer
    setCreditLimitRequests([]);
    setLoadingRequests(true);
    
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/shippers?includeCreditLimitRequests=true`,
        { headers: API_CONFIG.getAuthHeaders() }
      );
      
      if (response.data && response.data.success) {
        const customerWithRequests = response.data.data.find(
          (c) => c._id === customer._id || c.userId === customer.userId
        );
        if (customerWithRequests && customerWithRequests.creditLimitRequests) {
          setCreditLimitRequests(customerWithRequests.creditLimitRequests);
        }
      }
    } catch (error) {
      console.error('Error fetching credit limit requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const closeCreditLimitModal = () => {
    setCreditLimitModal({ visible: false, customer: null });
    setCreditLimitAmount('');
    setCreditLimitSubmitting(false);
    setEmailSent(false);
    setCreditLimitRequests([]);
    setLoadingRequests(false);
  };

  const handleCreditLimitSubmit = async () => {
    if (!creditLimitAmount.trim()) {
      toast.error('Please enter a credit limit amount');
      return;
    }

    const amount = parseFloat(creditLimitAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid credit limit amount');
      return;
    }

    try {
      setCreditLimitSubmitting(true);

      const payload = {
        creditLimit: amount
      };

      const response = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${creditLimitModal.customer?._id}/credit-limit`,
        payload,
        { headers: API_CONFIG.getAuthHeaders() }
      );

      if (response.data.success || response.status === 200) {
        toast.success(`Credit limit updated successfully for ${creditLimitModal.customer?.compName}!`);
        closeCreditLimitModal();
        fetchCustomers();
      } else {
        toast.error(response.data.message || 'Failed to update credit limit');
      }

    } catch (error) {
      console.error('Credit limit update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update credit limit. Please try again.');
    } finally {
      setCreditLimitSubmitting(false);
    }
  };

  // Send Credit Limit Form Email Handler
  const handleSendCreditLimitFormEmail = async () => {
    if (!creditLimitModal.customer?._id) {
      toast.error('Customer ID is required');
      return;
    }

    setSendingEmail(true);
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${creditLimitModal.customer._id}/send-credit-limit-form`,
        {},
        { headers: API_CONFIG.getAuthHeaders() }
      );

      if (response.data.success) {
        setEmailSent(true);
        toast.success(`Credit limit form email sent successfully to ${creditLimitModal.customer?.email || 'shipper'}!`);
      } else {
        toast.error(response.data.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending credit limit form email:', error);
      toast.error(error.response?.data?.message || 'Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Get unique Created By values from all employees
  const uniqueCreatedBy = React.useMemo(() => {
    return Array.from(employeeMap.entries())
      .map(([empId, name]) => ({ 
        value: empId, 
        label: `${name} (${empId})` 
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [employeeMap]);

  const filteredCustomers = customers.filter((customer) => {
    // Search filter
    const matchesSearch = !searchTerm || 
      customer.compName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.mc_dot_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.addedBy?.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.addedBy?.empId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by Created By (match by empId)
    const matchesCreatedBy = !selectedCreatedBy || 
      (customer.addedBy?.empId === selectedCreatedBy);
    
    return matchesSearch && matchesCreatedBy;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCreatedBy]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Generate pagination page numbers (smart pagination)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7; // Maximum number of page buttons to show
    
    if (totalPages <= maxVisiblePages) {
      // If total pages are less than max, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 4) {
        // Near the beginning
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near the end
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Status color helper
  const statusColor = (status) => {
    if (!status) return 'bg-yellow-100 text-yellow-800';
    if (status === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Format date helper
  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '-';
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Get status badge for credit limit requests
  const getStatusBadge = (status) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      submitted: 'bg-blue-100 text-blue-800 border-blue-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };

    const config = statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${config}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A'}
      </span>
    );
  };

  // Format file size helper
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get file icon based on MIME type
  const getFileIcon = (mimeType) => {
    if (!mimeType) return <Paperclip size={20} className="text-gray-500" />;
    if (mimeType.includes('pdf')) return <FileText size={20} className="text-red-500" />;
    if (mimeType.includes('image')) return <Image size={20} className="text-blue-500" />;
    return <Paperclip size={20} className="text-gray-500" />;
  };

  // Check if file can be previewed
  const canPreview = (mimeType) => {
    return mimeType?.includes('pdf') || mimeType?.includes('image');
  };

  // Handle file preview/download
  const handleFileAction = (file, action = 'preview') => {
    if (!file.fileUrl) {
      toast.error('File URL not available');
      return;
    }

    if (action === 'preview' && canPreview(file.mimeType)) {
      // Open in new tab for preview
      window.open(file.fileUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Download file
      const link = document.createElement('a');
      link.href = file.fileUrl;
      link.download = file.originalName || file.filename || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Get relationship badge color
  const getRelationshipBadge = (relationship) => {
    const colors = {
      'Supplier': 'bg-green-100 text-green-800 border-green-300',
      'Customer': 'bg-blue-100 text-blue-800 border-blue-300',
      'Bank': 'bg-purple-100 text-purple-800 border-purple-300',
      'Vendor': 'bg-orange-100 text-orange-800 border-orange-300',
      'Partner': 'bg-pink-100 text-pink-800 border-pink-300',
      'Other': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    
    return colors[relationship] || colors['Other'];
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <User className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Total Customers</p>
                        <p className="text-xl font-bold text-gray-800">{customers.length}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search Customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Created By Filter */}
          <div className="relative">
            <SearchableDropdown
              value={selectedCreatedBy}
              onChange={(value) => setSelectedCreatedBy(value)}
              options={[
                { value: '', label: 'All Created By' },
                ...uniqueCreatedBy
              ]}
              placeholder="Select Created By"
              searchPlaceholder="Search created by..."
              className="w-[250px]"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-96 bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Customers...</p>
          </div>
        </div>
      ) : (
        <>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Company Name</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">MC/DOT No</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Contact Info</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Location</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Credit Limit</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Added By</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                            <User className="w-16 h-16 text-gray-300 mb-4" />
                            <p className="text-gray-500 text-lg">No customers found</p>
                            <p className="text-gray-400 text-sm">Try adjusting your search terms</p>
                        </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((customer, idx) => (
                    <tr 
                      key={customer._id || idx} 
                      className={`border-b border-gray-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-blue-50/30`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                            {/* <div className="bg-blue-100 p-2 rounded-lg">
                                <Building size={16} className="text-blue-600" />
                            </div> */}
                            <div className="flex items-center gap-2 flex-1">
                                <div 
                                  className={`font-semibold text-gray-800 ${customer.isNew === true ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                                  onClick={() => handleCustomerNameClick(customer)}
                                  title={customer.isNew === true ? 'Click to mark as viewed' : ''}
                                >
                                  {customer.compName}
                                </div>
                                {customer.isNew === true && (
                                  <span 
                                    className="new-indicator" 
                                    title="New customer - Click name to view"
                                    style={{
                                      display: 'inline-block',
                                      width: '10px',
                                      height: '10px',
                                      backgroundColor: '#ef4444',
                                      borderRadius: '50%',
                                      flexShrink: 0,
                                      animation: 'glowPulse 2s infinite',
                                      cursor: 'pointer',
                                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.8), 0 0 12px rgba(239, 68, 68, 0.6)',
                                      position: 'relative'
                                    }}
                                    onClick={() => handleCustomerNameClick(customer)}
                                  />
                                )}
                            </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">{customer.mc_dot_no || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm text-gray-700">
                                <Mail size={12} className="text-gray-400" />
                                {customer.email}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Phone size={12} className="text-gray-400" />
                                {customer.phoneNo}
                            </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        <div className="flex items-start gap-1">
                            <MapPin size={14} className="text-gray-400 mt-0.5" />
                            <div>
                                <div>{customer.city}, {customer.state}</div>
                                <div className="text-xs text-gray-500">{customer.country}</div>
                            </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-600">
                          ${customer.creditLimit ? parseFloat(customer.creditLimit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                {customer.addedBy?.employeeName?.charAt(0) || 'A'}
                             </div>
                             <div>
                                <div className="text-sm font-medium">{customer.addedBy?.employeeName || 'N/A'}</div>
                                {customer.addedBy?.department && <div className="text-xs text-gray-500">{customer.addedBy.department}</div>}
                             </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        <div className="flex items-center gap-2">
                          <button
                              onClick={() => handleReAssign(customer)}
                              className="px-3 py-1 text-orange-600 text-xs rounded-md transition-colors border border-orange-300 hover:bg-orange-50"
                          >
                              Re-Assign
                          </button>
                          <button
                              onClick={() => handleAddCreditLimit(customer)}
                              className="px-3 py-1 text-blue-600 text-xs rounded-md transition-colors border border-blue-300 hover:bg-blue-50 flex items-center gap-1"
                          >
                              <CreditCard size={12} />
                              Add Credit Limit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredCustomers.length > 0 && (
            <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCustomers.length)} of {filteredCustomers.length} customers
                {searchTerm && ` (filtered from ${customers.length} total)`}
            </div>
            {totalPages > 1 && (
            <div className="flex gap-2 items-center">
                <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                Previous
                </button>
                {getPageNumbers().map((page, index) => {
                  if (page === 'ellipsis') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => paginate(page)}
                      className={`px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${
                        currentPage === page
                          ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                          : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                Next
                </button>
            </div>
            )}
            </div>
        )}
        </>
      )}

      {/* Re-Assign Modal */}
      {reassignModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-2xl p-8 border border-orange-100">
            <div className="bg-gradient-to-r from-orange-600 to-red-500 text-white px-6 py-4 rounded-xl shadow mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  Re-Assign Customer
                </h2>
                <p className="text-sm text-orange-100 mt-1">
                  Select a Sales user to reassign this customer
                </p>
              </div>
              <button 
                onClick={closeReassignModal} 
                type="button" 
                className="text-white text-3xl hover:text-gray-200"
              >
                <X size={28} />
              </button>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm text-gray-700 bg-orange-50 px-4 py-3 rounded-lg mb-6">
              <div>
                <strong>Company Name:</strong>
                <br />
                {reassignModal.customer?.compName || 'N/A'}
              </div>
              <div>
                <strong>MC/DOT No:</strong>
                <br />
                {reassignModal.customer?.mc_dot_no || 'N/A'}
              </div>
              <div>
                <strong>Email:</strong>
                <br />
                {reassignModal.customer?.email || 'N/A'}
              </div>
              <div>
                <strong>Phone:</strong>
                <br />
                {reassignModal.customer?.phoneNo || 'N/A'}
              </div>
              <div>
                <strong>Status:</strong>
                <br />
                {reassignModal.customer?.status || 'N/A'}
              </div>
              <div>
                <strong>Current Owner:</strong>
                <br />
                {reassignModal.customer?.addedBy?.employeeName || 'N/A'}
              </div>
            </div>

            {/* Sales User Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Select Sales User <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={salesUserSearch}
                  onChange={(e) => {
                    setSalesUserSearch(e.target.value);
                    setIsSalesDropdownOpen(true);
                  }}
                  onFocus={() => setIsSalesDropdownOpen(true)}
                  placeholder="Search Sales user by name, ID, or email..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
                
                {isSalesDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {/* Clear/Unselect option */}
                    {selectedSalesUser && (
                      <div
                        onClick={() => {
                          setSelectedSalesUser('');
                          setSalesUserSearch('');
                          setIsSalesDropdownOpen(false);
                        }}
                        className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 transition-colors duration-150"
                      >
                        <div className="font-medium text-red-600 flex items-center gap-2">
                          <X size={16} />
                          Clear Selection
                        </div>
                      </div>
                    )}
                    
                    {filteredSalesUsers.length > 0 ? (
                      filteredSalesUsers.map((user) => (
                        <div
                          key={user._id}
                          onClick={() => handleSalesUserSelect(user._id, `${user.employeeName} (${user.empId})`)}
                          className={`px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                            selectedSalesUser === user._id ? 'bg-orange-50' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900">{user.employeeName}</div>
                          <div className="text-sm text-gray-600">{user.empId} - {user.designation}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        No Sales users found matching "{salesUserSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {selectedSalesUser && (
                <div className="mt-3 p-3 bg-orange-50 border-2 border-orange-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div className="text-sm text-orange-800">
                        <span className="font-semibold">Selected:</span> {selectedSalesUserName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSalesUser('');
                        setSalesUserSearch('');
                      }}
                      className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-all duration-150"
                      title="Clear Selection"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Reason for Re-assignment <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reassignDescription}
                onChange={(e) => setReassignDescription(e.target.value)}
                placeholder="Please explain why this customer is being re-assigned..."
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 h-24 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={closeReassignModal}
                disabled={reassignSubmitting}
                className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignSubmit}
                disabled={reassignSubmitting}
                className={`px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 text-white font-medium shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2 ${
                  reassignSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {reassignSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <UserCheck size={18} />
                    Confirm Re-Assign
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Limit Modal */}
      {creditLimitModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 p-4">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 border border-blue-100">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 rounded-xl shadow mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <CreditCard size={24} />
                  Add Credit Limit
                </h2>
                <p className="text-sm text-blue-100 mt-1">
                  Set credit limit for this customer
                </p>
              </div>
              <button 
                onClick={closeCreditLimitModal} 
                type="button" 
                className="text-white text-3xl hover:text-gray-200"
              >
                <X size={28} />
              </button>
            </div>

            {/* Customer Details */}
            <div className="space-y-3 text-sm text-gray-700 bg-blue-50 px-4 py-3 rounded-lg mb-6">
              {/* First Line: Company Name and MC/DOT No */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Company Name:</strong>
                  <br />
                  <span className="text-gray-800">{creditLimitModal.customer?.compName || 'N/A'}</span>
                </div>
                <div>
                  <strong>MC/DOT No:</strong>
                  <br />
                  <span className="text-gray-800">{creditLimitModal.customer?.mc_dot_no || 'N/A'}</span>
                </div>
              </div>
              {/* Second Line: Added By and Credit Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Added By:</strong>
                  <br />
                  <span className="text-gray-800">{creditLimitModal.customer?.addedBy?.employeeName || 'N/A'}</span>
                </div>
                <div>
                  <strong>Current Credit Limit:</strong>
                  <br />
                  <span className="font-semibold text-blue-600">
                    ${creditLimitModal.customer?.creditLimit ? parseFloat(creditLimitModal.customer.creditLimit).toLocaleString() : '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Credit Limit Requests Section */}
            {loadingRequests ? (
              <div className="mb-6 flex justify-center items-center py-4">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-gray-600">Loading requests...</span>
              </div>
            ) : creditLimitRequests.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock size={18} />
                  Credit Limit Requests ({creditLimitRequests.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {creditLimitRequests.map((request) => (
                    <div key={request._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.status)}
                          {request.submittedData?.submittedAt ? (
                            <span className="text-xs text-gray-500">
                              Submitted: {formatDate(request.submittedData.submittedAt)}
                            </span>
                          ) : request.createdAt ? (
                            <span className="text-xs text-gray-500">
                              Created: {formatDate(request.createdAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      
                      {request.submittedData ? (
                        <>
                          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                            <div>
                              <span className="text-gray-600">Requested Amount:</span>
                              <div className="font-semibold text-blue-600 text-base">
                                {formatCurrency(request.submittedData.requestedCreditLimit)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Current Limit:</span>
                              <div className="font-semibold text-gray-700">
                                {formatCurrency(request.submittedData.currentCreditLimit)}
                              </div>
                            </div>
                            {request.submittedData.businessType && (
                              <div>
                                <span className="text-gray-600">Business Type:</span>
                                <div className="text-gray-700">{request.submittedData.businessType}</div>
                              </div>
                            )}
                            {request.submittedData.paymentTerms && (
                              <div>
                                <span className="text-gray-600">Payment Terms:</span>
                                <div className="text-gray-700">{request.submittedData.paymentTerms}</div>
                              </div>
                            )}
                            {request.submittedData.yearsInBusiness && (
                              <div>
                                <span className="text-gray-600">Years in Business:</span>
                                <div className="text-gray-700">{request.submittedData.yearsInBusiness}</div>
                              </div>
                            )}
                            {request.submittedData.annualRevenue && (
                              <div>
                                <span className="text-gray-600">Annual Revenue:</span>
                                <div className="text-gray-700">{formatCurrency(request.submittedData.annualRevenue)}</div>
                              </div>
                            )}
                          </div>
                          
                          {/* Legacy Text Reference (single text field) */}
                          {request.submittedData.references && 
                           (!request.submittedData.textReferences || request.submittedData.textReferences.length === 0) && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <span className="text-gray-600 text-sm font-semibold">Text References:</span>
                              <div className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{request.submittedData.references}</div>
                            </div>
                          )}
                          
                          {/* Multiple Text References */}
                          {request.submittedData.textReferences && request.submittedData.textReferences.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-2 mb-3">
                                <Users size={16} className="text-gray-600" />
                                <span className="text-gray-600 text-sm font-semibold">
                                  Business References ({request.submittedData.textReferences.length})
                                </span>
                              </div>
                              <div className="space-y-3">
                                {request.submittedData.textReferences.map((ref, refIdx) => (
                                  <div
                                    key={refIdx}
                                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h5 className="font-semibold text-gray-900 text-sm">
                                            {ref.companyName || 'Unnamed Company'}
                                          </h5>
                                          {ref.relationship && (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getRelationshipBadge(ref.relationship)}`}>
                                              {ref.relationship}
                                            </span>
                                          )}
                                        </div>
                                        {ref.contactPerson && (
                                          <p className="text-xs text-gray-600">
                                            Contact: <span className="font-medium">{ref.contactPerson}</span>
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-2 mt-2 text-xs">
                                      {ref.email && (
                                        <div className="flex items-center gap-2">
                                          <Mail size={12} className="text-gray-400" />
                                          <span className="text-gray-500">Email:</span>
                                          <a 
                                            href={`mailto:${ref.email}`}
                                            className="text-blue-600 hover:underline"
                                          >
                                            {ref.email}
                                          </a>
                                        </div>
                                      )}
                                      {ref.phone && (
                                        <div className="flex items-center gap-2">
                                          <Phone size={12} className="text-gray-400" />
                                          <span className="text-gray-500">Phone:</span>
                                          <a 
                                            href={`tel:${ref.phone}`}
                                            className="text-blue-600 hover:underline"
                                          >
                                            {ref.phone}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {ref.notes && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">Notes:</span> {ref.notes}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* File Attachments */}
                          {request.submittedData.referenceFiles && request.submittedData.referenceFiles.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-2 mb-3">
                                <Paperclip size={16} className="text-gray-600" />
                                <span className="text-gray-600 text-sm font-semibold">
                                  Reference Files ({request.submittedData.referenceFiles.length})
                                </span>
                              </div>
                              <div className="space-y-2">
                                {request.submittedData.referenceFiles.map((file, fileIdx) => (
                                  <div
                                    key={fileIdx}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="flex-shrink-0">
                                        {getFileIcon(file.mimeType)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate" title={file.originalName || file.filename}>
                                          {file.originalName || file.filename || `File ${fileIdx + 1}`}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {formatFileSize(file.fileSize)} {file.mimeType && `• ${file.mimeType.split('/')[1]?.toUpperCase() || file.mimeType}`}
                                        </div>
                                        {file.uploadedAt && (
                                          <div className="text-xs text-gray-400 mt-0.5">
                                            Uploaded: {formatDate(file.uploadedAt)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                      {canPreview(file.mimeType) && (
                                        <button
                                          onClick={() => handleFileAction(file, 'preview')}
                                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
                                          title="Preview file"
                                        >
                                          <Eye size={14} />
                                          Preview
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleFileAction(file, 'download')}
                                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
                                        title="Download file"
                                      >
                                        <Download size={14} />
                                        Download
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {request.submittedData.additionalNotes && (
                            <div className="mt-2">
                              <span className="text-gray-600 text-sm font-semibold">Additional Notes:</span>
                              <div className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{request.submittedData.additionalNotes}</div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="mt-3 text-sm text-gray-600">
                          <p>Form link sent. Waiting for shipper to submit the form.</p>
                        </div>
                      )}
                      
                      {request.emailSentBy && (
                        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                          Email sent by: {request.emailSentBy.employeeName} ({request.emailSentBy.department})
                          {request.emailSentAt && ` on ${formatDate(request.emailSentAt, true)}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 text-center">No credit limit requests found for this customer.</p>
              </div>
            )}

            {/* Credit Limit Input */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Credit Limit Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  value={creditLimitAmount}
                  onChange={(e) => setCreditLimitAmount(e.target.value)}
                  placeholder="Enter credit limit amount..."
                  min="0"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Enter the maximum credit amount allowed for this customer
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={closeCreditLimitModal}
                disabled={creditLimitSubmitting || sendingEmail}
                className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCreditLimitFormEmail}
                disabled={sendingEmail || emailSent}
                className={`px-6 py-2.5 rounded-xl font-medium shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2 ${
                  emailSent 
                    ? 'bg-green-600 text-white hover:shadow-green-500/30' 
                    : sendingEmail
                    ? 'bg-gray-400 text-white opacity-70 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white hover:shadow-purple-500/30'
                }`}
              >
                {sendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : emailSent ? (
                  <>
                    <CheckCircle size={18} />
                    Email Sent
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Form Email
                  </>
                )}
              </button>
              <button
                onClick={handleCreditLimitSubmit}
                disabled={creditLimitSubmitting}
                className={`px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2 ${
                  creditLimitSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {creditLimitSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Update Credit Limit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
      
      {/* CSS for glowing pulse animation */}
      <style>{`
        @keyframes glowPulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.8), 0 0 12px rgba(239, 68, 68, 0.6), 0 0 16px rgba(239, 68, 68, 0.4);
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 12px rgba(239, 68, 68, 1), 0 0 18px rgba(239, 68, 68, 0.8), 0 0 24px rgba(239, 68, 68, 0.6);
            transform: scale(1.1);
          }
        }
        
        .new-indicator:hover {
          box-shadow: 0 0 15px rgba(239, 68, 68, 1), 0 0 25px rgba(239, 68, 68, 0.9), 0 0 35px rgba(239, 68, 68, 0.7) !important;
          transform: scale(1.2);
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default AllCustomer;
