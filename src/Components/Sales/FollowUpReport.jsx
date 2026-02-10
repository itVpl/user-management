import React, { useEffect, useState } from 'react';
import axios from 'axios';
import apiService from '../../services/apiService.js';
import { FaArrowLeft, FaDownload, FaFilePdf } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Logo from '../../assets/LogoFinal.png';
import IdentificaLogo from '../../assets/identifica_logo.png';
import MtPoconoLogo from '../../assets/mtPocono.png';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';

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

export default function FollowUpReport() {
  // State for orders
  const [orders, setOrders] = useState([]);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOrderId, setLoadingOrderId] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Date range state (default: last 30 days)
  const [range, setRange] = useState({
    startDate: addDays(new Date(), -29),
    endDate: new Date(),
    key: 'selection'
  });
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [selectedCreatedBy, setSelectedCreatedBy] = useState('');
  const [employeeMap, setEmployeeMap] = useState(new Map()); // Map empId -> employeeName
  const [isDateFilterActive, setIsDateFilterActive] = useState(false); // Default to false to show all records initially

  // Presets
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
    if (label === 'All Dates') {
      setIsDateFilterActive(false);
      setShowPresetMenu(false);
      return;
    }
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setIsDateFilterActive(true);
    setShowPresetMenu(false);
  };
  const ymd = (d) => format(d, 'yyyy-MM-dd'); // "YYYY-MM-DD"

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setLoading(true);

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Use the new API endpoint
      let apiUrl = `${API_CONFIG.BASE_URL}/api/v1/sales-followup/all-simple`;
      
      const response = await axios.get(apiUrl, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        const dataArray = response.data.data || [];
        console.log('API Response Data Length:', dataArray.length);
        
        const transformedOrders = dataArray.map((item, index) => {
          // Find the last follow-up note for display
          const lastFollowUp = item.followUps && item.followUps.length > 0 
            ? item.followUps[item.followUps.length - 1] 
            : null;
            
          const latestNote = lastFollowUp 
            ? (lastFollowUp.followUpNotes || lastFollowUp.note || 'No notes')
            : (item.remarks || 'No notes');

          return {
            id: item._id || `FU-${index}`,
            originalId: item._id,
            customerName: item.customerName || 'N/A',
            address: item.address || 'N/A',
            phone: item.phone || 'N/A',
            email: item.email || 'N/A',
            contactPerson: item.contactPerson || 'N/A',
            concernedPerson: item.concernedPerson || 'N/A',
            creditCheck: item.creditCheck || 'Pending',
            callingDate: item.callingDate || 'N/A',
            city: item.city || 'N/A',
            state: item.state || 'N/A',
            zipCode: item.zipCode || 'N/A',
            country: item.country || 'N/A',
            status: item.status || 'Pending',
            followUps: item.followUps || [],
            createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A',
            rawCreatedAt: item.createdAt,
            updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'N/A',
            createdBy: item.createdBy?.employeeName || item.createdBy?.name || 'N/A',
            createdByEmpId: item.createdBy?.empId || 'N/A',
            company: item.company || 'N/A',
            remarks: item.remarks || '',
            description: latestNote,
            _fullOrderData: item
          };
        });

        console.log('Transformed orders:', transformedOrders);
        setOrders(transformedOrders);
      } else {
        console.error('API response not successful:', response.data);
        alertify.error('Failed to load follow-ups');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      alertify.error(`Failed to load orders: ${error.response?.status || 'Network Error'}`);
    } finally {
      setLoading(false);
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
          // Filter for Sales department only
          const dept = (emp.department || '').toLowerCase();
          
          if (emp.empId && (dept === 'sales')) {
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

  // Initial load - fetch all data once
  useEffect(() => {
    fetchOrders();
    fetchAllEmployees();
  }, []);

  // Status color helper
  const statusColor = (status) => {
    if (!status) return 'bg-yellow-100 text-yellow-700';
    if (status === 'approved') return 'bg-green-100 text-green-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  // Filter orders based on search term, date range, and created by
  const filteredOrders = orders.filter(order => {
    const text = searchTerm.toLowerCase();
    
    // Get searchable fields
    const customerName = (order.customerName || '').toLowerCase();
    const email = (order.email || '').toLowerCase();
    const phone = (order.phone || '').toLowerCase();
    const city = (order.city || '').toLowerCase();
    const state = (order.state || '').toLowerCase();
    const remarks = (order.remarks || '').toLowerCase();
    const contactPerson = (order.contactPerson || '').toLowerCase();
    
    const matchesText =
      customerName.includes(text) ||
      email.includes(text) ||
      phone.includes(text) ||
      city.includes(text) ||
      state.includes(text) ||
      remarks.includes(text) ||
      contactPerson.includes(text);

    // Format createdAt date for comparison (handle both string and Date)
    const rawCreatedAt = order.rawCreatedAt;
    let createdDate = '';
    
    if (rawCreatedAt) {
      try {
        createdDate = format(new Date(rawCreatedAt), 'yyyy-MM-dd');
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    }

    const inRange = !isDateFilterActive || (createdDate >= ymd(range.startDate) && createdDate <= ymd(range.endDate));

    // Filter by Created By (match by empId)
    const matchesCreatedBy = !selectedCreatedBy || 
      (order.createdByEmpId === selectedCreatedBy);

    return matchesText && inRange && matchesCreatedBy;
  }).sort((a, b) => {
    const dateA = new Date(a.rawCreatedAt || 0);
    const dateB = new Date(b.rawCreatedAt || 0);
    return dateB - dateA;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Export to CSV function
  const exportToCSV = () => {
    try {
      if (filteredOrders.length === 0) {
        alertify.warning('No data to export');
        return;
      }

      // Define CSV headers
      const headers = [
        'Customer Name',
        'Email',
        'Phone',
        'Contact Person',
        'City/State',
        'Status',
        'Created At',
        'Created By'
      ];

      // Convert data to CSV format
      const csvContent = [
        headers.join(','),
        ...filteredOrders.map(order => {
          const cityState = `${order.city || ''}${order.city && order.state ? ', ' : ''}${order.state || ''}`;
          
          return [
            `"${order.customerName || 'N/A'}"`,
            `"${order.email || 'N/A'}"`,
            `"${order.phone || 'N/A'}"`,
            `"${order.contactPerson || 'N/A'}"`,
            `"${cityState || 'N/A'}"`,
            `"${order.status || 'N/A'}"`,
            `"${order.createdAt || 'N/A'}"`,
            `"${order.createdBy || 'N/A'}"`
          ].join(',');
        })
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      link.setAttribute('download', `FollowUp_Report_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alertify.success('CSV exported successfully!');
    } catch (error) {
      console.error('Export to CSV error:', error);
      alertify.error('Failed to export CSV');
    }
  };

  // Generate smart pagination page numbers
  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage <= 3) {
        if (currentPage === 1) pages.push(2);
        else pages.push(2, 3);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push('ellipsis');
        pages.push(totalPages - 2, totalPages - 1);
        pages.push(totalPages);
      } else {
        pages.push('ellipsis');
        pages.push(currentPage);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Reset to first page when search term or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, range.startDate, range.endDate, selectedCreatedBy, isDateFilterActive]);

  // Get unique Created By values from all employees
  const uniqueCreatedBy = React.useMemo(() => {
    return Array.from(employeeMap.entries())
      .map(([empId, name]) => ({ 
        value: empId, 
        label: `${name} (${empId})` 
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [employeeMap]);

  // Handle view order
  const handleViewOrder = async (rowOrder) => {
    try {
      // Always fetch from API to ensure we have full data including attachments
      const orderId = rowOrder.originalId || rowOrder._id || null;

      if (!orderId) {
        alertify.error('Order ID not found for this row');
        return;
      }

      setLoadingOrderId(orderId); // Show loading indicator
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/sales-followup/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.data?.success && res.data.data) {
        setSelectedOrder(res.data.data);
        setShowOrderModal(true);
      } else {
        alertify.error('Could not load this follow-up');
      }
    } catch (err) {
      console.error('View order failed:', err?.response?.data || err);
      alertify.error('Failed to fetch follow-up details');
    } finally {
      setLoadingOrderId(null);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    try {
      if (!selectedOrder) {
        alertify.error('Follow-up not found');
        return;
      }

      const orderId = selectedOrder._id;
      if (!orderId) {
        alertify.error('Follow-up ID not found');
        return;
      }

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/sales-followup/${orderId}/status`,
        { status: newStatus },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.success) {
        alertify.success(`Status updated to ${newStatus} successfully!`);

        // Update the local state to reflect the change
        setSelectedOrder(prev => ({
          ...prev,
          status: newStatus
        }));

        // Also update the orders list
        setOrders(prevOrders =>
          prevOrders.map(order => {
            const currentOrderId = order._id || order.originalId;
            const selectedOrderId = selectedOrder._id || selectedOrder.originalId;

            return currentOrderId === selectedOrderId
              ? { ...order, status: newStatus }
              : order;
          })
        );
        
        // Refresh the orders list
        fetchOrders();
      } else {
        console.error('Server response:', response.data);
        alertify.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alertify.error('Failed to update status. Please try again.');
    }
  };

  // Status color helper
  const renderAttachment = (path) => {
    if (!path) return null;

    const paths = Array.isArray(path) ? path : [path];
    if (paths.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-4">
        {paths.map((fileItem, index) => {
          let filePath = fileItem;
          // Handle object structure from API (e.g., { fileUrl: "...", fileName: "..." })
          if (typeof fileItem === 'object' && fileItem !== null) {
            filePath = fileItem.fileUrl || fileItem.file || fileItem.path || '';
          }

          if (typeof filePath !== 'string' || !filePath) return null;
          
          // Clean up the path (trim spaces and remove backticks if present)
          const cleanPath = filePath.trim().replace(/^`|`$/g, '').trim();
          
          const normalizedPath = cleanPath.replace(/\\/g, '/');
          const url = normalizedPath.startsWith('http')
            ? normalizedPath
            : `${API_CONFIG.BASE_URL}/${normalizedPath.replace(/^\//, '')}`;
          const isPdf = normalizedPath.toLowerCase().endsWith('.pdf');
          
          // Get a display name
          const fileName = fileItem.fileName || cleanPath.split('/').pop() || `Attachment ${index + 1}`;

          if (isPdf) {
             return (
              <a 
                key={index}
                href={url}
                download
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors group w-full max-w-sm"
              >
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <FaFilePdf className="text-red-500" size={20} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-gray-700 truncate">{fileName}</p>
                  <p className="text-xs text-red-500 font-medium mt-0.5">Click to Download PDF</p>
                </div>
                <FaDownload className="text-gray-400 group-hover:text-red-500 transition-colors" size={16} />
              </a>
             );
          }

          // For Images: Show Preview
          return (
            <div key={index} className="mt-3 relative group">
              <p className="text-xs font-semibold text-gray-500 mb-1">Attachment {paths.length > 1 ? index + 1 : ''}</p>
              <div className="border rounded-lg overflow-hidden bg-gray-50 h-48 w-full max-w-sm relative group">
                <img src={url} alt="Attachment" className="w-full h-full object-contain" />
                 <a 
                    href={url} 
                    download 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium cursor-pointer"
                  >
                    <FaDownload className="mr-2" /> Download Image
                  </a>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading follow-ups...</p>
          </div>
        </div>
      </div>
    );
  }

  if (previewImg) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center" onClick={() => setPreviewImg(null)}>
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden p-4" onClick={(e) => e.stopPropagation()}>
          <img src={previewImg} alt="Document Preview" className="max-h-[80vh] rounded-xl shadow-lg" />
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute left-4 top-4 bg-white p-2 rounded-full shadow hover:bg-blue-100"
          >
            <FaArrowLeft />
          </button>
        </div>
      </div>
    );
  }

  if (modalType) {
    return (
      <div className="fixed inset-0 z-50 backdrop-blue-sm bg-black/30 flex items-center justify-center" onClick={() => setModalType(null)}>
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-[400px] relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <button className="absolute right-4 top-2 text-xl hover:text-red-500" onClick={() => setModalType(null)}>×</button>
          <textarea
            className="w-full border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg mb-4"
            rows={5}
            placeholder={`Type reason of ${modalType}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-semibold shadow hover:from-blue-700 hover:to-purple-700 transition"
            onClick={() => {
              // Handle status update here
              setModalType(null);
              setReason('');
            }}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Top Section Wrapper */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        {/* First Row: Card & Filters */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full">
          {/* Stats Card */}
         <div className="flex-1 w-full bg-white rounded-xl border border-gray-200 p-4">
 <div className="flex gap-4 h-full items-center">
  
  {/* Circle */}
  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
    <span className="text-2xl font-bold text-gray-800">
      {filteredOrders.length}
    </span>
  </div>

  {/* Text with left margin */}
  <div className="flex items-center ml-15">
    <p className="text-base text-gray-700 font-semibold">
      Total Follow-ups
    </p>
  </div>

</div>

</div>


          {/* Range dropdown */}
          <div className="relative flex-1 w-full">
            <button
              type="button"
              onClick={() => setShowPresetMenu(v => !v)}
              className="w-full text-left px-4 py-3 border border-gray-200 rounded-xl bg-white flex items-center justify-between hover:border-gray-300 transition-colors"
            >
              <span className="text-base font-semibold text-gray-700">
                {isDateFilterActive 
                  ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                  : 'All Dates'
                }
              </span>
              <span className="text-gray-400">▼</span>
            </button>
            
            {showPresetMenu && (
              <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-100 bg-white shadow-lg py-1">
                <button
                  onClick={() => applyPreset('All Dates')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-blue-600 font-medium text-sm"
                >
                  All Dates
                </button>
                {Object.keys(presets).map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => applyPreset(lbl)}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm"
                  >
                    {lbl}
                  </button>
                ))}
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { setShowPresetMenu(false); setShowCustomRange(true); }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm"
                >
                  Custom Range
                </button>
              </div>
            )}
          </div>

          {/* Custom Range calendars */}
          {showCustomRange && (
            <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCustomRange(false)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100" onClick={(e) => e.stopPropagation()}>
                <DateRange
                  ranges={[range]}
                  onChange={(item) => {
                    setRange(item.selection);
                    setIsDateFilterActive(true);
                  }}
                  moveRangeOnFirstSelection={false}
                  months={2}
                  direction="horizontal"
                  rangeColors={['#2563eb']}
                />
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCustomRange(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDateFilterActive(true);
                      setShowCustomRange(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Created By Filter */}
          <div className="relative flex-1 w-full">
            <SearchableDropdown
              value={selectedCreatedBy}
              onChange={(value) => setSelectedCreatedBy(value)}
              options={[
                { value: '', label: (
          <span className="text-base font-semibold text-gray-700">

            
            All Created By
          </span>
        ), },
                ...uniqueCreatedBy
              ]}
              placeholder="Select Created By"
              searchPlaceholder="Search created by..."
              className="w-full"
            />
          </div>
        </div>

        {/* Second Row: Search & Export */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search follow-ups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-base"
            />
          </div>

          {/* Export to CSV Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-transparent border border-gray-200 text-gray-600 hover:bg-green-50 px-6 py-3 rounded-xl transition-all font-semibold whitespace-nowrap text-base"
          >
            <FaDownload size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {viewDoc && selectedOrder ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-3xl mx-auto">
          {/* View Document UI */}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-4 px-4 text-black-600 font-bold text-xs uppercase rounded-l-xl border-y border-l border-gray-200">CUSTOMER NAME</th>
                   <th className="text-left py-4 px-4 text-black-600 font-bold text-xs uppercase border-y border-gray-200">CONTACT PERSON</th>
                  <th className="text-left py-4 px-10 text-black-600 font-bold text-xs uppercase border-y border-gray-200">EMAIL</th>
                  <th className="text-left py-4 px-8 text-black-600 font-bold text-xs uppercase border-y border-gray-200">PHONE</th>
                  {/* <th className="text-left py-4 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">FOLLOW UP TYPE</th>
                  <th className="text-left py-4 px-4 text-black-600 font-bold text-xs uppercase tracking-wider">LATEST NOTE</th> */}
                  <th className="text-left py-4 px-4 text-black-600 font-bold text-xs uppercase border-y border-gray-200">Created At</th>
                  <th className="text-left py-4 px-4 text-black-600 font-bold text-xs uppercase border-y border-gray-200">NEXT FOLLOW UP</th>
                  <th className="text-left py-4 px-4 text-black-600 font-bold text-xs uppercase rounded-r-xl border-y border-r border-gray-200">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y-0">
                {currentOrders.map((order, index) => {
                  // Get latest note from follow-ups
                  const latestFollowUp = order.followUps && order.followUps.length > 0 
                    ? order.followUps[order.followUps.length - 1] 
                    : null;
                  const latestNote = latestFollowUp 
                    ? (latestFollowUp.followUpNotes || latestFollowUp.note || order.description || 'No notes')
                    : (order.description || 'No notes');
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4 bg-white border-y border-l border-gray-200 rounded-l-xl">
                        <span className="text-gray-600 text-base font-medium">{order.customerName}</span>
                      </td>
                      <td className="py-4 px-4 bg-white border-y border-gray-200">
                        <span className="text-gray-600 text-base font-medium">{order.contactPerson}</span>
                      </td>
                      <td className="py-4 px-4 bg-white border-y border-gray-200">
                        <span className="text-gray-600 text-base font-medium">{order.email}</span>
                      </td>
                      <td className="py-4 px-4 bg-white border-y border-gray-200">
                        <span className="font-mono text-base text-gray-600 font-medium">{order.phone}</span>
                      </td>
                      <td className="py-4 px-4 bg-white border-y border-gray-200">
                        <div className="flex flex-col">
                          <span className="text-base text-gray-600 font-medium">
                            {order?.followUps?.[0]?.createdAt
                              ? new Date(order.followUps[0].createdAt).toLocaleDateString()
                              : 'No date'}
                          </span>
                          <span className="text-sm text-gray-600">
                           by {order?.followUps?.[0]?.createdBy?.employeeName || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 bg-white border-y border-gray-200">
                        <div className="flex flex-col">
                          <span className="text-base text-gray-600 font-medium">
                            {order.followUps?.[0]?.nextFollowUpDate
                              ? new Date(order.followUps[0].nextFollowUpDate).toLocaleDateString()
                              : 'No date'}
                          </span>
                          <span className="text-sm text-gray-500">
                           by {order?.followUps?.[0]?.createdBy?.employeeName || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 bg-white border-y border-r border-gray-200 rounded-r-xl">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-lg text-base font-medium transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium text-lg mb-1">
                {searchTerm ? 'No results found' : 'No follow-up records'}
              </p>
              <p className="text-gray-500 text-sm">
                {searchTerm ? 'Try adjusting your search or filters' : 'New follow-ups will appear here'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && filteredOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 px-4">
          <div className="text-sm text-gray-600 mb-4 sm:mb-0">
            Showing <span className="text-gray-900">{startIndex + 1}</span> to <span className="text-gray-900">{Math.min(endIndex, filteredOrders.length)}</span> of <span className="text-gray-900">{filteredOrders.length}</span> entries
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <div className="flex gap-1">
              {getPaginationPages().map((page, index) => {
                if (page === 'ellipsis') {
                  return (
                    <span key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-gray-400">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'border border-gray-900 text-gray-900 bg-white'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {showOrderModal && selectedOrder && (
        <>
          {loadingOrderId && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center">
              <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg font-semibold text-gray-800">Loading Follow-up Details...</p>
                <p className="text-sm text-gray-600">Please wait while we fetch the complete data</p>
              </div>
            </div>
          )}

          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4" onClick={() => setShowOrderModal(false)}>
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="text-white" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Follow-up Details</h2>
                      <p className="text-blue-100">Customer Information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOrderModal(false)}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Customer Information */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Customer Information</h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Customer Name</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.customerName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Contact Person</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.contactPerson || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Concerned Person</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.concernedPerson || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.address || 'N/A'}</p>
                      </div>
                      {/* <div>
                        <p className="text-sm text-gray-600">City/State</p>
                        <p className="font-semibold text-gray-800">
                          {selectedOrder.city || ''}{selectedOrder.city && selectedOrder.state ? ', ' : ''}{selectedOrder.state || ''}
                        </p>
                      </div> */}
                      <div>
                        <p className="text-sm text-gray-600">Calling Date</p>
                        <p className="font-semibold text-gray-800">
                          {selectedOrder.callingDate ? new Date(selectedOrder.callingDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Follow-up History */}
                {selectedOrder.followUps && selectedOrder.followUps.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="text-blue-600" size={20} />
                      <h3 className="text-lg font-bold text-gray-800">Follow-up History</h3>
                    </div>

                    <div className="space-y-3">
                      {selectedOrder.followUps.map((followUp, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-sm font-semibold text-gray-700">
                                {followUp.followUpType || 'Follow-up'}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                {followUp.followUpDate ? new Date(followUp.followUpDate).toLocaleString() : 'No Date'}
                              </p>
                            </div>
                            {followUp.nextFollowUpDate && (
                              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                Next: {new Date(followUp.nextFollowUpDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-2">
                            {followUp.followUpNotes || followUp.note || 'No notes'}
                          </p>

                          {/* Attachments for this follow-up */}
                          {followUp.attachments && (
                            <div className="mt-3">
                              {renderAttachment(followUp.attachments)}
                            </div>
                          )}

                          {followUp.createdBy && (
                            <div className="text-xs text-gray-500 mt-2">
                              By: {followUp.createdBy.employeeName || followUp.createdBy.name || 'Unknown'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                {selectedOrder.remarks && (
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="text-yellow-600" size={20} />
                      <h3 className="text-lg font-bold text-gray-800">Remarks</h3>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-yellow-200">
                      <p className="text-gray-700">{selectedOrder.remarks}</p>
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {selectedOrder.attachments && selectedOrder.attachments.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="text-blue-600" size={20} />
                      <h3 className="text-lg font-bold text-gray-800">Attachments</h3>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                       {renderAttachment(selectedOrder.attachments)}
                    </div>
                  </div>
                )}

                {/* Status Section */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="text-purple-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Status</h3>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                   
                    
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Credit Check</p>
                        <p className="font-medium text-gray-800">{selectedOrder.creditCheck || 'Pending'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Created By</p>
                        <p className="font-medium text-gray-800">{selectedOrder.createdBy?.employeeName || selectedOrder.createdBy?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Created At</p>
                        <p className="font-medium text-gray-800">
                          {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Last Updated</p>
                        <p className="font-medium text-gray-800">
                          {selectedOrder.updatedAt ? new Date(selectedOrder.updatedAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}