import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload, FaUpload, FaTimes } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
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
  const itemsPerPage = 10;
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'paid', 'unpaid', 'pending'
  const [remarks, setRemarks] = useState({}); // { doId: 'remark text' }

  useEffect(() => {
    fetchAllDOs();
  }, []);

  const fetchAllDOs = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        const transformedDOs = (response.data.data || []).map(order => {
          const puLocs = order.shipper?.pickUpLocations || order.shipper?.pickupLocations || [];
          const drLocs = order.shipper?.dropLocations || order.shipper?.deliveryLocations || [];
          const loadNo = order.customers?.[0]?.loadNo || 'N/A';

          return {
            id: `DO-${String(order._id).slice(-6)}`,
            originalId: order._id,
            doNum: loadNo,
            clientName: order.customers?.[0]?.billTo || 'N/A',
            carrierName: order.carrier?.carrierName || 'N/A',
            carrierFees: order.carrier?.totalCarrierFees || 0,
            createdAt: new Date(order.date).toISOString().split('T')[0],
            createdBySalesUser: order.createdBySalesUser || 'N/A',
            status: order.status || 'open',
            // Full order data for details
            fullData: order
          };
        });

        setDos(transformedDOs);
        
        // Initialize payment statuses as 'pending'
        const initialStatus = {};
        transformedDOs.forEach(deliveryOrder => {
          initialStatus[deliveryOrder.originalId] = 'pending';
        });
        setPaymentStatus(initialStatus);
      }
    } catch (error) {
      console.error('Error fetching DOs:', error);
      alertify.error(`Failed to load delivery orders: ${error.response?.status || 'Network Error'}`);
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
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/${doId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        setSelectedDoDetails(response.data.data);
        setShowPaymentModal(false); // Close selection modal
        setShowDetailsModal(true); // Open details modal
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

  // Filter DOs based on search and active tab
  const filteredDOs = dos.filter(deliveryOrder => {
    const text = searchTerm.toLowerCase();
    const matchesSearch = (
      deliveryOrder.id.toLowerCase().includes(text) ||
      deliveryOrder.doNum.toLowerCase().includes(text) ||
      deliveryOrder.clientName.toLowerCase().includes(text) ||
      deliveryOrder.carrierName.toLowerCase().includes(text)
    );
    
    // Filter by active tab
    const status = paymentStatus[deliveryOrder.originalId] || 'pending';
    const matchesTab = activeTab === 'all' || status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDOs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDOs = filteredDOs.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to page 1 when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  // DO options for dropdown
  const doOptions = dos.map(deliveryOrder => ({
    value: deliveryOrder.originalId,
    label: `${deliveryOrder.doNum} - ${deliveryOrder.clientName} - ${deliveryOrder.carrierName}`
  }));

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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div 
            onClick={() => setActiveTab('all')}
            className={`bg-white rounded-2xl shadow-xl p-4 border cursor-pointer transition-all hover:shadow-2xl ${
              activeTab === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Truck className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total DOs</p>
                <p className="text-xl font-bold text-gray-800">{dos.length}</p>
              </div>
            </div>
          </div>
          <div 
            onClick={() => setActiveTab('paid')}
            className={`bg-white rounded-2xl shadow-xl p-4 border cursor-pointer transition-all hover:shadow-2xl ${
              activeTab === 'paid' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-xl font-bold text-green-600">
                  {Object.values(paymentStatus).filter(s => s === 'paid').length}
                </p>
              </div>
            </div>
          </div>
          <div 
            onClick={() => setActiveTab('unpaid')}
            className={`bg-white rounded-2xl shadow-xl p-4 border cursor-pointer transition-all hover:shadow-2xl ${
              activeTab === 'unpaid' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unpaid</p>
                <p className="text-xl font-bold text-red-600">
                  {Object.values(paymentStatus).filter(s => s === 'unpaid').length}
                </p>
              </div>
            </div>
          </div>
          <div 
            onClick={() => setActiveTab('pending')}
            className={`bg-white rounded-2xl shadow-xl p-4 border cursor-pointer transition-all hover:shadow-2xl ${
              activeTab === 'pending' ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-xl font-bold text-yellow-600">
                  {Object.values(paymentStatus).filter(s => s === 'pending').length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search DOs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl"
          >
            <DollarSign size={20} />
            Make Payment
          </button>
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
              {/* Carrier Details */}
              <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-2xl p-6 shadow">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="text-green-600" size={20} />
                  <h3 className="text-lg font-bold text-green-700">Carrier Details</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-600">Carrier Name:</span>
                    <span className="ml-2 text-gray-800">{selectedDoDetails.carrier?.carrierName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Phone:</span>
                    <span className="ml-2 text-gray-800">{selectedDoDetails.carrier?.carrierDetails?.phoneNo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Equipment Type:</span>
                    <span className="ml-2 text-gray-800">{selectedDoDetails.carrier?.equipmentType || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Total Carrier Fees:</span>
                    <span className="ml-2 text-gray-800 font-semibold">${selectedDoDetails.carrier?.totalCarrierFees || 0}</span>
                  </div>
                </div>
              </div>

              {/* Load Details */}
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-6 shadow">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-blue-700">Load Details</h3>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
                  <div>
                    <span className="font-medium text-gray-600">Load Number:</span>
                    <span className="ml-2 text-gray-800">{selectedDoDetails.customers?.[0]?.loadNo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Bill To:</span>
                    <span className="ml-2 text-gray-800">{selectedDoDetails.customers?.[0]?.billTo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Dispatcher:</span>
                    <span className="ml-2 text-gray-800">{selectedDoDetails.customers?.[0]?.dispatcherName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Work Order No:</span>
                    <span className="ml-2 text-gray-800">{selectedDoDetails.customers?.[0]?.workOrderNo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Total Amount:</span>
                    <span className="ml-2 text-gray-800 font-semibold">${selectedDoDetails.customers?.[0]?.totalAmount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Sales Person Details */}
              <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-2xl p-6 shadow">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-purple-600" size={20} />
                  <h3 className="text-lg font-bold text-purple-700">Sales Person Details</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                  <div className='bg-white p-2 rounded-md border border-gray-200'>
                    <span className="font-medium text-gray-600">Created By:</span>
                    <span className="ml-2 text-gray-800">
                      {selectedDoDetails.createdBySalesUser?.employeeName || selectedDoDetails.createdBySalesUser || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Created Date:</span>
                    <span className="ml-2 text-gray-800">
                      {new Date(selectedDoDetails.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Status Section */}
              <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-2xl p-6 shadow">
                <h3 className="text-lg font-bold text-orange-700 mb-4">Payment Status</h3>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-600">Current Status:</span>
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(paymentStatus[selectedDoDetails._id] || 'pending')}`}>
                    {getStatusIcon(paymentStatus[selectedDoDetails._id] || 'pending')}
                    {(paymentStatus[selectedDoDetails._id] || 'pending').charAt(0).toUpperCase() + (paymentStatus[selectedDoDetails._id] || 'pending').slice(1)}
                  </span>
                </div>
              </div>

              {/* File Attachment Section */}
              <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-2xl p-6 shadow">
                <h3 className="text-lg font-bold text-indigo-700 mb-4">
                  Attachments <span className="text-red-500 text-sm">*Required</span>
                </h3>
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Upload Files (Images/PDF)
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition">
                      <FaUpload />
                      <span>Choose Files</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(selectedDoDetails._id, e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Supported formats: Images (JPG, PNG) and PDF</p>
                </div>
                {attachments[selectedDoDetails._id] && attachments[selectedDoDetails._id].length > 0 && (
                  <div className="space-y-2">
                    {attachments[selectedDoDetails._id].map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="text-blue-500" size={20} />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(selectedDoDetails._id, index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remarks Section */}
              <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 shadow">
                <h3 className="text-lg font-bold text-gray-700 mb-4">Remarks</h3>
                <textarea
                  value={remarks[selectedDoDetails._id] || ''}
                  onChange={(e) => setRemarks(prev => ({
                    ...prev,
                    [selectedDoDetails._id]: e.target.value
                  }))}
                  placeholder="Enter any remarks or notes..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleSubmitPayment(selectedDoDetails._id)}
                  disabled={submittingPayment}
                  className={`flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-all shadow-lg ${
                    submittingPayment 
                      ? 'opacity-70 cursor-not-allowed' 
                      : 'hover:from-blue-600 hover:to-blue-700 hover:shadow-xl'
                  }`}
                >
                  {submittingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Submit Payment
                    </>
                  )}
                </button>
              </div>
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
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">PAYMENT STATUS</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">CREATED BY</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentDOs.map((deliveryOrder, index) => (
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
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(paymentStatus[deliveryOrder.originalId] || 'pending')}`}>
                      {getStatusIcon(paymentStatus[deliveryOrder.originalId] || 'pending')}
                      {(paymentStatus[deliveryOrder.originalId] || 'pending').charAt(0).toUpperCase() + (paymentStatus[deliveryOrder.originalId] || 'pending').slice(1)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">
                      {deliveryOrder.createdBySalesUser?.employeeName || deliveryOrder.createdBySalesUser || 'N/A'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedDoId(deliveryOrder.originalId);
                          handleDoSelect(deliveryOrder.originalId);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        View Details
                      </button>
                      {/* <button
                        onClick={() => handleMarkAsPaid(deliveryOrder.originalId)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          markAsPaidChecked[deliveryOrder.originalId]
                            ? 'bg-green-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        <CheckCircle size={14} />
                        {markAsPaidChecked[deliveryOrder.originalId] ? 'Paid' : 'Mark Paid'}
                      </button> */}
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* Pagination */}
      {totalPages > 1 && filteredDOs.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredDOs.length)} of {filteredDOs.length} DOs
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
                    ? 'bg-blue-500 text-white border-blue-500'
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
    </div>
  );
};

export default AcountentPayable;
