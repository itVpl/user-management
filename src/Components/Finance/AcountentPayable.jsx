import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload, FaUpload, FaTimes } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search, Paperclip, Eye } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

// Utility functions
const fmtMoney = (v) => (typeof v === "number" ? v.toFixed(2) : "0.00");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");
const shortId = (id = "") => (id?.length > 8 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);
const isImageUrl = (url = "") => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
const isPdfUrl = (url = "") => /\.pdf$/i.test(url);

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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className={`w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${disabled ? 'bg-gray-100' : ''}`}>
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
            className="w-full bg-transparent outline-none p-0 text-gray-900"
          />
          <Search className="w-4 h-4 absolute right-3 text-gray-400" />
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

const AcountentPayable = () => {
  const [dos, setDos] = useState([]);
  const [selectedDoId, setSelectedDoId] = useState('');
  const [selectedDoDetails, setSelectedDoDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState({}); // { doId: 'paid' | 'unpaid' | 'pending' }
  const [attachments, setAttachments] = useState({}); // { doId: [files] }
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false); // For DO selection modal
  const [markAsPaidChecked, setMarkAsPaidChecked] = useState({}); // { doId: boolean }
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Client-side pagination
  const apiLimit = 1000; // Fetch more data from API for better client-side search
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'paid', 'unpaid', 'pending'
  const [remarks, setRemarks] = useState({}); // { doId: 'remark text' }
  const [statistics, setStatistics] = useState({});
  const [pagination, setPagination] = useState({});
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all', 'sales_verified', 'cmt_verified', 'sales_rejected', 'accountant_rejected' // '', 'true'
  
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: '',
    paymentReference: '',
    paymentNotes: '',
    carrierPaymentProof: null
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Shipment images and additional documents state
  const [shipImgs, setShipImgs] = useState(null);
  const [shipImgsLoading, setShipImgsLoading] = useState(false);
  const [shipImgsErr, setShipImgsErr] = useState("");
  const [addDocs, setAddDocs] = useState([]);
  const [addDocsLoading, setAddDocsLoading] = useState(false);
  const [addDocsErr, setAddDocsErr] = useState("");

  useEffect(() => {
    fetchAllDOs();
  }, [currentPage, selectedStatus]);

  const fetchAllDOs = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Build query parameters
      // Fetch more data for client-side filtering (like DO Details module)
      const params = {
        page: 1, // Always fetch first page with large limit for client-side filtering
        limit: apiLimit
      };
      
      // Add status filter if not 'all'
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/accountant/dos-by-statuses`, {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        const transformedDOs = (response.data.data?.doDocuments || []).map(order => {
          // Handle both new API structure (shipperId/carrierId) and old structure (shipper/carrier)
          const shipper = order.shipperId || order.shipper || {};
          const carrier = order.carrierId || order.carrier || {};
          
          const puLocs = shipper.pickUpLocations || shipper.pickupLocations || [];
          const drLocs = shipper.dropLocations || shipper.deliveryLocations || [];
          const loadNo = order.customers?.[0]?.loadNo || order.loadReference?.loadId || 'N/A';

          // Debug: Log invoice data if present
          if (order.invoice) {
            console.log(`Invoice found for DO ${order._id}:`, {
              invoiceUrl: order.invoice.invoiceUrl,
              dueDate: order.invoice.dueDate,
              uploadedAt: order.invoice.uploadedAt,
              dueDateInfo: order.invoice.dueDateInfo
            });
          }

          return {
            id: `DO-${String(order._id).slice(-6)}`,
            originalId: order._id,
            doNum: loadNo,
            clientName: order.customers?.[0]?.billTo || order.customers?.[0]?.customerName || order.customerName || 'N/A',
            carrierName: carrier.compName || carrier.carrierName || 'N/A',
            carrierFees: carrier.totalCarrierFees || order.carrier?.totalCarrierFees || 0,
            createdAt: new Date(order.createdAt || order.date).toISOString().split('T')[0],
            createdBySalesUser: order.createdBySalesUser?.employeeName || order.createdBySalesUser || 'N/A',
            status: order.assignmentStatus || order.status || 'open',
            // Invoice information (if uploaded) - includes invoiceUrl, dueDate, uploadedAt, uploadedBy, dueDateInfo
            invoice: order.invoice || null,
            // Full order data for details
            fullData: order
          };
        });

        setDos(transformedDOs);
        
        // Set statistics from API response
        if (response.data.data?.statistics) {
          setStatistics(response.data.data.statistics);
        }
        
        // Set pagination from API response
        if (response.data.data?.pagination) {
          console.log('Pagination from API:', response.data.data.pagination);
          setPagination(response.data.data.pagination);
        } else {
          // Fallback: calculate pagination from data length
          const totalItems = response.data.data?.totalItems || transformedDOs.length;
          const calculatedTotalPages = Math.ceil(totalItems / itemsPerPage);
          const fallbackPagination = {
            currentPage: currentPage || 1,
            totalPages: calculatedTotalPages,
            totalItems: totalItems,
            itemsPerPage: itemsPerPage
          };
          console.log('Calculated pagination:', fallbackPagination);
          setPagination(fallbackPagination);
        }
        
        // Initialize carrier payment statuses from API response
        const initialStatus = {};
        transformedDOs.forEach(deliveryOrder => {
          initialStatus[deliveryOrder.originalId] = deliveryOrder.fullData?.carrierPaymentStatus?.status || 'pending';
        });
        setPaymentStatus(initialStatus);
      }
    } catch (error) {
      console.error('Error fetching DOs:', error);
      alertify.error(`Failed to load delivery orders: ${error.response?.data?.message || error.response?.status || 'Network Error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDoSelect = async (doId) => {
    if (!doId) {
      setSelectedDoDetails(null);
      return;
    }

    try {
      setLoadingDetails(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch DO details
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/${doId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        const order = response.data.data;
        setSelectedDoDetails(order);
        setShowPaymentModal(false); // Close selection modal
        setShowDetailsModal(true); // Open details modal

        // Fetch shipment images
        const shipmentNo = order?.loadReference?.shipmentNumber;
        if (shipmentNo) {
          setShipImgsLoading(true);
          try {
            const imgResp = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/load/shipment/${shipmentNo}/images`, { headers });
            setShipImgs(imgResp?.data || null);
          } catch (e) {
            setShipImgsErr(e?.response?.data?.message || e?.message || "Failed to load shipment images");
          } finally {
            setShipImgsLoading(false);
          }
        }

        // Fetch additional documents
        setAddDocsLoading(true);
        try {
          const docResp = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/${doId}/additional-documents`, { headers });
          setAddDocs(docResp?.data?.data?.documents || docResp?.data?.additionalDocuments || []);
        } catch (e) {
          setAddDocsErr(e?.response?.data?.message || e?.message || "Failed to load additional documents");
          setAddDocs([]);
        } finally {
          setAddDocsLoading(false);
        }
      } else {
        alertify.error('Failed to load DO details');
      }
    } catch (error) {
      console.error('Error fetching DO details:', error);
      alertify.error('Failed to load DO details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Compute totals helper
  const computeTotals = (order) => {
    const customers = order?.customers || [];
    const billTotal = customers.reduce((sum, cust) => {
      const other = Array.isArray(cust?.other)
        ? (cust?.otherTotal || cust.other.reduce((s, item) => s + (Number(item?.total) || 0), 0))
        : (cust?.other || cust?.otherTotal || 0);
      return sum + (cust?.lineHaul || 0) + (cust?.fsc || 0) + other;
    }, 0);
    const carrierTotal = order?.carrier?.totalCarrierFees || 0;
    const netRevenue = billTotal - carrierTotal;
    return { billTotal, carrierTotal, netRevenue };
  };

  const handleSubmitPayment = async (doId) => {
    const doAttachments = attachments[doId] || [];
    
    // Validation: Attachment is compulsory
    if (doAttachments.length === 0) {
      alertify.error('Please upload at least one attachment before submitting');
      return;
    }
    
    try {
      setSubmittingPayment(true);
      
      // Simulate API call (add your actual API call here)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the payment status to 'paid'
      setPaymentStatus(prev => ({
        ...prev,
        [doId]: 'paid'
      }));
      
      setMarkAsPaidChecked(prev => ({
        ...prev,
        [doId]: true
      }));
      
      alertify.success('Payment marked as paid successfully');
      
      // Close modal
      setShowDetailsModal(false);
      setSelectedDoDetails(null);
      setSelectedDoId('');
    } catch (error) {
      console.error('Error submitting payment:', error);
      alertify.error('Failed to submit payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleMarkAsPaid = (doId) => {
    const isChecked = markAsPaidChecked[doId] || false;
    setMarkAsPaidChecked(prev => ({
      ...prev,
      [doId]: !isChecked
    }));

    if (!isChecked) {
      handlePaymentStatusChange(doId, 'paid');
    } else {
      handlePaymentStatusChange(doId, 'unpaid');
    }
  };

  const handleFileUpload = (doId, event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const isValidImage = file.type.startsWith('image/');
      const isValidPDF = file.type === 'application/pdf';
      return isValidImage || isValidPDF;
    });

    if (validFiles.length !== files.length) {
      alertify.warning('Only images and PDF files are allowed');
    }

    if (validFiles.length > 0) {
      setAttachments(prev => ({
        ...prev,
        [doId]: [...(prev[doId] || []), ...validFiles]
      }));
      alertify.success(`${validFiles.length} file(s) added`);
    }
  };

  const handleRemoveFile = (doId, index) => {
    setAttachments(prev => {
      const newFiles = [...(prev[doId] || [])];
      newFiles.splice(index, 1);
      return {
        ...prev,
        [doId]: newFiles
      };
    });
    alertify.success('File removed');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={14} />;
      case 'unpaid':
        return <XCircle size={14} />;
      case 'pending':
        return <Clock size={14} />;
      default:
        return null;
    }
  };

  // Filter DOs based on search and active tab (payment status)
  // Client-side filtering like DO Details module
  const filteredDOs = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    const base = dos.filter((deliveryOrder) => {
      // Search filter - matches multiple fields
      const matchesSearch = !term || (
        deliveryOrder.id?.toLowerCase().includes(term) ||
        deliveryOrder.doNum?.toLowerCase().includes(term) ||
        deliveryOrder.clientName?.toLowerCase().includes(term) ||
        deliveryOrder.carrierName?.toLowerCase().includes(term) ||
        deliveryOrder.createdBySalesUser?.toLowerCase().includes(term)
      );
      
      // Filter by active tab (payment status: all/paid/pending)
      const status = paymentStatus[deliveryOrder.originalId] || 'pending';
      const matchesTab = activeTab === 'all' || status === activeTab;
      
      return matchesSearch && matchesTab;
    });
    
    return base;
  }, [dos, searchTerm, activeTab, paymentStatus]);

  // Client-side pagination (like DO Details module)
  const totalPages = Math.ceil(filteredDOs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDOs = filteredDOs.slice(startIndex, endIndex);

  // Reset to page 1 when search term or active tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Reset to page 1 when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus]);

  // DO options for dropdown
  const doOptions = dos.map(deliveryOrder => ({
    value: deliveryOrder.originalId,
    label: `${deliveryOrder.doNum} - ${deliveryOrder.clientName} - ${deliveryOrder.carrierName}`
  }));

  const handleOpenPaymentModal = (deliveryOrder) => {
    setPaymentData(deliveryOrder);
    setPaymentForm({
      paymentMethod: '',
      paymentReference: '',
      paymentNotes: '',
      carrierPaymentProof: null
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentData) return;

    // Validation
    if (!paymentForm.paymentMethod) {
      alertify.error('Please select a payment method');
      return;
    }
    if (!paymentForm.carrierPaymentProof) {
      alertify.error('Please upload carrier payment proof document');
      return;
    }

    setPaymentLoading(true);
    try {
      const formData = new FormData();
      formData.append('doId', paymentData.originalId);
      
      // Get employee ID from storage
      const empId = sessionStorage.getItem("empId") || localStorage.getItem("empId") || "";
      if (empId) {
        formData.append('accountantEmpId', empId);
      }
      
      formData.append('paymentMethod', paymentForm.paymentMethod);
      if (paymentForm.paymentReference) {
        formData.append('paymentReference', paymentForm.paymentReference);
      }
      if (paymentForm.paymentNotes) {
        formData.append('paymentNotes', paymentForm.paymentNotes);
      }
      formData.append('carrierPaymentProof', paymentForm.carrierPaymentProof);

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/mark-carrier-as-paid`;
      const resp = await axios.post(url, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (resp?.data?.success) {
        alertify.success('Carrier payment marked as paid successfully!');
        setPaymentModalOpen(false);
        // Refresh the data
        fetchAllDOs();
      } else {
        alertify.error(resp?.data?.message || 'Failed to mark carrier as paid');
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to mark carrier as paid';
      alertify.error(errorMsg);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading delivery orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Top Row: Stats and Search */}
        <div className="flex justify-between items-center">
          {/* Statistics Cards */}
          <div className="flex gap-4">
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Truck className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total DO</p>
                  <p className="text-xl font-bold text-gray-800">{statistics.total || dos.length}</p>
                </div>
              </div>
            </div>
            
            {statistics.sales_verified !== undefined && (
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sales Verified</p>
                    <p className="text-xl font-bold text-gray-800">{statistics.sales_verified || 0}</p>
                  </div>
                </div>
              </div>
            )}
            
            {statistics.cmt_verified !== undefined && (
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">CMT Verified</p>
                    <p className="text-xl font-bold text-gray-800">{statistics.cmt_verified || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Search Section */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search DOs..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        
        {/* Status Filter */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-gray-700">Filter by Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="sales_verified">Sales Verified</option>
            <option value="cmt_verified">CMT Verified</option>
            <option value="sales_rejected">Sales Rejected</option>
            <option value="accountant_rejected">Accountant Rejected</option>
          </select>
        </div>
      </div>

      {/* Payment Modal - DO Selection */}
      {showPaymentModal && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => {
            setShowPaymentModal(false);
            setSelectedDoId('');
          }}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <DollarSign className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Make Payment</h2>
                    <p className="text-green-100">Select a Delivery Order</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedDoId('');
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 relative">
              {loadingDetails && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-b-3xl">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-3"></div>
                    <p className="text-gray-600 font-medium">Loading DO details...</p>
                  </div>
                </div>
              )}
              <p className="text-gray-600 mb-4">
                Select a delivery order to manage payment details
              </p>
              <SearchableDropdown
                value={selectedDoId}
                onChange={(doId) => {
                  setSelectedDoId(doId);
                  handleDoSelect(doId);
                }}
                options={doOptions}
                placeholder="Select a Delivery Order"
                loading={loading}
                searchPlaceholder="Search DOs..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {loadingDetails && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold text-lg">Loading DO Details...</p>
              <p className="text-gray-500 text-sm mt-2">Please wait</p>
            </div>
          </div>
        </div>
      )}

      {/* DO Details Modal */}
      {showDetailsModal && selectedDoDetails && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => {
            setShowDetailsModal(false);
            setSelectedDoDetails(null);
            setSelectedDoId('');
          }}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FileText className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">DO Details</h2>
                    <p className="text-blue-100">Payment Management</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedDoDetails(null);
                    setSelectedDoId('');
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Customer Information */}
              {selectedDoDetails?.customers?.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Customer Information</h3>
                  </div>

                  <div className="space-y-4">
                    {selectedDoDetails.customers.map((customer, index) => (
                      <div key={customer?._id || index} className="bg-white rounded-xl p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-bold text-sm">{index + 1}</span>
                          </div>
                          <h4 className="font-semibold text-gray-800">Customer {index + 1}</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Bill To</p>
                            <p className="font-medium text-gray-800">{customer?.billTo || selectedDoDetails?.customerName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Dispatcher Name</p>
                            <p className="font-medium text-gray-800">{customer?.dispatcherName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Load No</p>
                            <p className="font-medium text-gray-800">{customer?.loadNo || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Work Order No</p>
                            <p className="font-medium text-gray-800">{customer?.workOrderNo || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Line Haul</p>
                            <p className="font-medium text-gray-800">${fmtMoney(customer?.lineHaul || 0)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">FSC</p>
                            <p className="font-medium text-gray-800">${fmtMoney(customer?.fsc || 0)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Other</p>
                            <p className="font-medium text-gray-800">${fmtMoney(
                              Array.isArray(customer?.other) 
                                ? (customer?.otherTotal || customer.other.reduce((sum, item) => sum + (Number(item?.total) || 0), 0))
                                : (customer?.other || customer?.otherTotal || 0)
                            )}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="font-bold text-lg text-green-600">${fmtMoney(customer?.calculatedTotal ?? customer?.totalAmount ?? 0)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Carrier Information */}
              {selectedDoDetails?.carrier && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="text-purple-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Carrier Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Truck className="text-purple-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Carrier Name</p>
                        <p className="font-semibold text-gray-800">{selectedDoDetails.carrier?.carrierName || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                        <Truck className="text-pink-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Equipment Type</p>
                        <p className="font-semibold text-gray-800">{selectedDoDetails.carrier?.equipmentType || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Carrier Fees</p>
                        <p className="font-semibold text-gray-800">${fmtMoney(selectedDoDetails.carrier?.totalCarrierFees || 0)}</p>
                      </div>
                    </div>
                  </div>

                  {selectedDoDetails.carrier?.carrierFees?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Carrier Charges</h4>
                      <div className="space-y-2">
                        {selectedDoDetails.carrier.carrierFees.map((charge, i) => (
                          <div key={i} className="bg-white rounded-lg p-3 border border-purple-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-800">{charge?.name}</span>
                              <span className="font-bold text-green-600">${fmtMoney(charge?.total || 0)}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Quantity: {charge?.quantity || 0} × Amount: ${fmtMoney(charge?.amount || 0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Shipper Information */}
              {selectedDoDetails?.shipper && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Shipper Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="text-orange-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Shipper Name</p>
                        <p className="font-semibold text-gray-800">{selectedDoDetails.shipper?.name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pickup Locations */}
                  {((selectedDoDetails.shipper?.pickUpLocations || []).length > 0) && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Pickup Locations</h4>
                      <div className="space-y-3">
                        {(selectedDoDetails.shipper?.pickUpLocations || []).map((location, index) => (
                          <div key={location?._id || index} className="bg-white rounded-lg p-3 border border-orange-200">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Name</p>
                                <p className="font-medium text-gray-800">{location?.name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Address</p>
                                <p className="font-medium text-gray-800">{location?.address || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">City</p>
                                <p className="font-medium text-gray-800">{location?.city || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">State</p>
                                <p className="font-medium text-gray-800">{location?.state || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Zip Code</p>
                                <p className="font-medium text-gray-800">{location?.zipCode || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Pickup Date</p>
                                <p className="font-medium text-gray-800">
                                  {location?.pickUpDate ? fmtDateTime(location.pickUpDate) : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drop Locations */}
                  {((selectedDoDetails.shipper?.dropLocations || []).length > 0) && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Drop Locations</h4>
                      <div className="space-y-3">
                        {(selectedDoDetails.shipper?.dropLocations || []).map((location, index) => (
                          <div key={location?._id || index} className="bg-white rounded-lg p-3 border border-yellow-200">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Name</p>
                                <p className="font-medium text-gray-800">{location?.name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Address</p>
                                <p className="font-medium text-gray-800">{location?.address || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">City</p>
                                <p className="font-medium text-gray-800">{location?.city || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">State</p>
                                <p className="font-medium text-gray-800">{location?.state || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Zip Code</p>
                                <p className="font-medium text-gray-800">{location?.zipCode || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Drop Date</p>
                                <p className="font-medium text-gray-800">
                                  {location?.dropDate ? fmtDateTime(location.dropDate) : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Shipment Images */}
              {shipImgsLoading && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <p className="text-gray-600">Loading shipment images...</p>
                </div>
              )}
              {shipImgsErr && (
                <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                  <p className="text-red-600 text-sm">{shipImgsErr}</p>
                </div>
              )}
              {!shipImgsLoading && shipImgs?.images && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-purple-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Shipment Images</h3>
                  </div>
                  <div className="space-y-4">
                    {/* Pickup Images */}
                    {[
                      ...(shipImgs.images.emptyTruckImages || []),
                      ...(shipImgs.images.loadedTruckImages || []),
                      ...(shipImgs.images.podImages || []),
                      ...(shipImgs.images.eirTickets || []),
                      ...(shipImgs.images.containerImages || []),
                      ...(shipImgs.images.sealImages || []),
                    ].length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Pickup Images</h4>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {[
                            ...(shipImgs.images.emptyTruckImages || []),
                            ...(shipImgs.images.loadedTruckImages || []),
                            ...(shipImgs.images.podImages || []),
                            ...(shipImgs.images.eirTickets || []),
                            ...(shipImgs.images.containerImages || []),
                            ...(shipImgs.images.sealImages || []),
                          ].map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                              <img src={img} alt={`Pickup Image ${i + 1}`} className="h-24 rounded-lg object-cover border border-gray-200" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Drop Images */}
                    {[
                      ...(shipImgs.images.dropLocationImages?.podImages || []),
                      ...(shipImgs.images.dropLocationImages?.loadedTruckImages || []),
                      ...(shipImgs.images.dropLocationImages?.dropLocationImages || []),
                      ...(shipImgs.images.dropLocationImages?.emptyTruckImages || []),
                    ].length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Drop Images</h4>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {[
                            ...(shipImgs.images.dropLocationImages?.podImages || []),
                            ...(shipImgs.images.dropLocationImages?.loadedTruckImages || []),
                            ...(shipImgs.images.dropLocationImages?.dropLocationImages || []),
                            ...(shipImgs.images.dropLocationImages?.emptyTruckImages || []),
                          ].map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                              <img src={img} alt={`Drop Image ${i + 1}`} className="h-24 rounded-lg object-cover border border-gray-200" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Documents */}
              {addDocsLoading && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <p className="text-gray-600">Loading additional documents...</p>
                </div>
              )}
              {addDocsErr && (
                <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                  <p className="text-red-600 text-sm">{addDocsErr}</p>
                </div>
              )}
              {!addDocsLoading && addDocs.length > 0 && (
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-200">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-pink-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Additional Documents</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {addDocs.map((doc, i) => {
                      const url = doc?.documentUrl || "";
                      const isImg = isImageUrl(url);
                      return (
                        <div key={doc?._id || i} className="bg-white rounded-lg p-3 border border-pink-200">
                          <div className="flex items-center gap-2 mb-2">
                            {isImg ? <FileText className="text-blue-500" size={16} /> : <FileText className="text-gray-500" size={16} />}
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                              {isPdfUrl(url) ? "PDF Document" : (isImg ? "Image" : "File")}
                            </a>
                          </div>
                          {isImg && (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="additional-doc" className="w-full h-32 object-cover rounded border border-gray-200" />
                            </a>
                          )}
                          {doc?.uploadedBy && (
                            <div className="mt-2 text-xs text-gray-500">
                              <p>Uploaded by: {doc.uploadedBy.employeeName || 'N/A'} ({doc.uploadedBy.empId || 'N/A'})</p>
                              <p>Dept: {doc.uploadedBy.department || 'N/A'}</p>
                              <p>At: {fmtDateTime(doc.uploadedAt)}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="text-green-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Totals</h3>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const totals = computeTotals(selectedDoDetails);
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Bill Amount (Customer)</span>
                          <span className="font-semibold text-gray-800">${fmtMoney(totals.billTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Carrier Fees</span>
                          <span className="font-semibold text-gray-800">${fmtMoney(totals.carrierTotal)}</span>
                        </div>
                        <div className="border-t border-gray-300 pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-700">Net Revenue</span>
                            <span className="font-bold text-lg text-green-600">${fmtMoney(totals.netRevenue)}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Carrier Payment Information - Only show carrier payment details */}
              {selectedDoDetails?.carrierPaymentStatus?.status === 'paid' && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Carrier Payment Information</h3>
                    <span className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                      <CheckCircle size={14} />
                      Paid
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-green-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                        <p className="font-medium text-gray-800 capitalize">
                          {selectedDoDetails?.carrierPaymentStatus?.paymentMethod?.replace('_', ' ') || 'N/A'}
                        </p>
                      </div>
                      {selectedDoDetails?.carrierPaymentStatus?.paymentReference && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Payment Reference</p>
                          <p className="font-medium text-gray-800">
                            {selectedDoDetails.carrierPaymentStatus.paymentReference}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Paid At</p>
                        <p className="font-medium text-gray-800">
                          {selectedDoDetails?.carrierPaymentStatus?.paidAt ? fmtDateTime(selectedDoDetails.carrierPaymentStatus.paidAt) : 'N/A'}
                        </p>
                      </div>
                      {selectedDoDetails?.carrierPaymentStatus?.paymentNotes && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600 mb-1">Payment Notes</p>
                          <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            {selectedDoDetails.carrierPaymentStatus.paymentNotes}
                          </p>
                        </div>
                      )}
                      {selectedDoDetails?.carrierPaymentStatus?.paymentProof && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600 mb-2">Carrier Payment Proof</p>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3">
                              {isImageUrl(selectedDoDetails.carrierPaymentStatus.paymentProof.fileUrl) ? (
                                <a
                                  href={selectedDoDetails.carrierPaymentStatus.paymentProof.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <FileText className="text-blue-600" size={24} />
                                  <div>
                                    <p className="font-medium">{selectedDoDetails.carrierPaymentStatus.paymentProof.fileName || 'Payment Proof'}</p>
                                    <p className="text-xs text-gray-500">Click to view image</p>
                                  </div>
                                </a>
                              ) : isPdfUrl(selectedDoDetails.carrierPaymentStatus.paymentProof.fileUrl) ? (
                                <a
                                  href={selectedDoDetails.carrierPaymentStatus.paymentProof.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <FileText className="text-red-600" size={24} />
                                  <div>
                                    <p className="font-medium">{selectedDoDetails.carrierPaymentStatus.paymentProof.fileName || 'Payment Proof'}</p>
                                    <p className="text-xs text-gray-500">Click to view PDF</p>
                                  </div>
                                </a>
                              ) : (
                                <a
                                  href={selectedDoDetails.carrierPaymentStatus.paymentProof.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <FileText className="text-gray-600" size={24} />
                                  <div>
                                    <p className="font-medium">{selectedDoDetails.carrierPaymentStatus.paymentProof.fileName || 'Payment Proof'}</p>
                                    <p className="text-xs text-gray-500">Click to download</p>
                                  </div>
                                </a>
                              )}
                            </div>
                            {selectedDoDetails.carrierPaymentStatus.paymentProof.uploadedAt && (
                              <p className="text-xs text-gray-500 mt-2">
                                Uploaded: {fmtDateTime(selectedDoDetails.carrierPaymentStatus.paymentProof.uploadedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Uploaded Files */}
              {selectedDoDetails?.uploadedFiles && selectedDoDetails.uploadedFiles.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-blue-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Files</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedDoDetails.uploadedFiles.map((f, i) => (
                      <div key={f?._id || i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                        <FileText className="text-blue-500" size={20} />
                        <a href={f?.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">
                          {f?.fileName || 'File'}
                        </a>
                        <span className="ml-auto text-xs text-gray-500">{fmtDateTime(f?.uploadDate)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOs Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">DO ID</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load Num</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">BILL TO</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">CARRIER NAME</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">CARRIER FEES</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">CREATED BY</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Invoice</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Payment Due Date</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Pay</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentDOs.map((deliveryOrder, index) => {
                const isPaid = deliveryOrder.fullData?.carrierPaymentStatus?.status === 'paid';
                const invoice = deliveryOrder.invoice;
                const invoiceDueDateInfo = invoice?.dueDateInfo;
                
                // Helper function to format date
                const formatDate = (dateString) => {
                  if (!dateString) return 'N/A';
                  return new Date(dateString).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  });
                };

                return (
                  <tr key={deliveryOrder.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{deliveryOrder.id}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono text-base font-semibold text-gray-700">{deliveryOrder.doNum}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{deliveryOrder.clientName}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{deliveryOrder.carrierName}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">${deliveryOrder.carrierFees || 0}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">
                        {deliveryOrder.createdBySalesUser?.employeeName || deliveryOrder.createdBySalesUser || 'N/A'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center">
                        {invoice ? (
                          <div className="flex flex-col items-center gap-1">
                            <a
                              href={invoice.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                              title="View Invoice"
                            >
                              <FileText size={16} />
                              <span className="text-xs">View</span>
                            </a>
                            <div className="text-xs text-gray-500">
                              {formatDate(invoice.uploadedAt)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No Invoice</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {(() => {
                        if (!invoice || !invoice.dueDate) {
                          return <span className="text-gray-400">—</span>;
                        }
                        
                        const dueDateInfo = invoice.dueDateInfo;
                        if (!dueDateInfo) {
                          return (
                            <div className="flex flex-col gap-1 items-center">
                              <span className="text-sm font-semibold text-gray-600">{formatDate(invoice.dueDate)}</span>
                            </div>
                          );
                        }
                        
                        // Get status color
                        const statusColor = dueDateInfo.isOverdue 
                          ? '#dc3545' // Red for overdue
                          : dueDateInfo.status === 'due_soon' || dueDateInfo.isDueToday
                            ? '#ffc107' // Yellow/Orange for due soon
                            : '#28a745'; // Green for pending
                        
                        // Calculate days value
                        const daysValue = dueDateInfo.isOverdue 
                          ? `-${dueDateInfo.daysOverdue}` 
                          : dueDateInfo.daysRemaining;
                        
                        const dueDateFormatted = formatDate(invoice.dueDate);
                        
                        return (
                          <div className="flex flex-col gap-1 items-center">
                            <span 
                              className="font-semibold text-sm"
                              style={{ color: statusColor }}
                            >
                              {dueDateFormatted}
                            </span>
                            <span 
                              className="font-bold text-base"
                              style={{ color: statusColor }}
                              title={dueDateInfo.isOverdue ? `${dueDateInfo.daysOverdue} days overdue` : `${dueDateInfo.daysRemaining} days remaining`}
                            >
                              {daysValue}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-100 text-green-700">
                            <CheckCircle size={14} />
                            Paid
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenPaymentModal(deliveryOrder)}
                            className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Pay to Carrier"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => {
                            setSelectedDoId(deliveryOrder.originalId);
                            handleDoSelect(deliveryOrder.originalId);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredDOs.length === 0 && (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No DOs found matching your search' : 'No delivery orders found'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination - Show when there's data */}
      {(currentDOs.length > 0 || dos.length > 0) && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {endIndex} of {pagination?.totalItems || dos.length} DOs
            {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                let page;
                if (totalPages <= 10) {
                  page = i + 1;
                } else if (currentPage <= 5) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 4) {
                  page = totalPages - 9 + i;
                } else {
                  page = currentPage - 5 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 border rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPaymentModalOpen(false)}
          >
            <div 
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <DollarSign size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Pay to Carrier</h2>
                      <p className="text-white/80 text-sm">DO ID: {paymentData?.id || 'N/A'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPaymentModalOpen(false)}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <div className="space-y-4">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      required
                    >
                      <option value="">Select Payment Method</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Payment Reference */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={paymentForm.paymentReference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
                      placeholder="Transaction ID, Check Number, etc."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>

                  {/* Payment Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Notes (Optional)
                    </label>
                    <textarea
                      value={paymentForm.paymentNotes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentNotes: e.target.value })}
                      placeholder="Additional notes about the payment"
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                    />
                  </div>

                  {/* Carrier Payment Proof Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Carrier Payment Proof <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              alertify.error('File size must be less than 10MB');
                              return;
                            }
                            setPaymentForm({ ...paymentForm, carrierPaymentProof: file });
                          }
                        }}
                        className="hidden"
                        id="carrier-payment-proof-upload"
                        required
                      />
                      <label
                        htmlFor="carrier-payment-proof-upload"
                        className="cursor-pointer flex flex-col items-center justify-center"
                      >
                        {paymentForm.carrierPaymentProof ? (
                          <div className="text-center">
                            <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-700">{paymentForm.carrierPaymentProof.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(paymentForm.carrierPaymentProof.size / 1024).toFixed(2)} KB
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentForm({ ...paymentForm, carrierPaymentProof: null });
                                document.getElementById('carrier-payment-proof-upload').value = '';
                              }}
                              className="mt-2 text-sm text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Paperclip className="text-gray-400 mb-2" size={40} />
                            <p className="text-sm font-medium text-gray-700">Click to upload carrier payment proof</p>
                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 10MB)</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setPaymentModalOpen(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={paymentLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePaymentSubmit}
                      disabled={paymentLoading || !paymentForm.paymentMethod || !paymentForm.carrierPaymentProof}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                      {paymentLoading ? "Processing..." : "Pay to Carrier"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AcountentPayable;
