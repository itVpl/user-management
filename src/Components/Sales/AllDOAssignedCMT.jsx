import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, MapPin, Truck, Calendar, DollarSign, Search } from 'lucide-react';
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
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  fetchDOReport, 
  setCurrentPage,
  setAddDispature,
  selectDOReportOrders,
  selectDOReportPagination,
  selectDOReportLoading,
  selectDOReportError,
  selectCurrentAddDispature
} from '../../store/slices/doReportSlice';

export default function AllDOAssignedCMT() {
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectDOReportOrders);
  const pagination = useAppSelector(selectDOReportPagination);
  const loading = useAppSelector(selectDOReportLoading);
  const error = useAppSelector(selectDOReportError);
  const selectedCompany = useAppSelector(selectCurrentAddDispature);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState(''); // Active search term (only set when search button clicked)
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedLoadData, setSelectedLoadData] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // 15 records per page

  // Date range state - no default, only set when user selects dates
  const [range, setRange] = useState({
    startDate: null,
    endDate: null,
    key: 'selection'
  });
  const [dateFilterApplied, setDateFilterApplied] = useState(false); // Track if date filter is applied
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);

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
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setDateFilterApplied(true); // Mark date filter as applied
    setShowPresetMenu(false);
  };
  const ymd = (d) => d ? format(d, 'yyyy-MM-dd') : null; // "YYYY-MM-DD" or null

  // Parse search term to detect what type of search it is
  const parseSearchTerm = (term) => {
    if (!term || term.trim() === '') {
      return {
        loadNumber: null,
        shipmentNo: null,
        carrierName: null,
        containerNo: null,
        pickupDate: null,
        dropDate: null,
        returnDate: null,
        assignedToCMT: null,
        createdByEmpId: null
      };
    }
    
    const trimmedTerm = term.trim();
    
    // 1. Check if it's a load number (starts with 'L' followed by numbers, e.g., L12345, L0770)
    const loadNumberPattern = /^L\d+/i;
    if (loadNumberPattern.test(trimmedTerm)) {
      return {
        loadNumber: trimmedTerm.toUpperCase(),
        shipmentNo: null,
        carrierName: null,
        containerNo: null,
        pickupDate: null,
        dropDate: null,
        returnDate: null,
        assignedToCMT: null,
        createdByEmpId: null
      };
    }
    
    // 2. Check if it's a date (YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY)
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
      /^\d{1,2}-\d{1,2}-\d{4}$/ // M-D-YYYY
    ];
    
    for (const pattern of datePatterns) {
      if (pattern.test(trimmedTerm)) {
        // Convert to YYYY-MM-DD format
        let dateStr = trimmedTerm;
        if (dateStr.includes('/') || dateStr.includes('-')) {
          const parts = dateStr.split(/[\/\-]/);
          if (parts.length === 3) {
            // If format is MM/DD/YYYY or MM-DD-YYYY
            if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
              const month = parts[0].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              const year = parts[2];
              dateStr = `${year}-${month}-${day}`;
            }
            // If already YYYY-MM-DD, keep as is
            else if (parts[0].length === 4) {
              dateStr = trimmedTerm;
            }
          }
        }
        
        // Try to parse the date to validate it
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          // For dates, search in pickupDate (most common use case)
          // User can search dropDate or returnDate by being more specific if needed
          return {
            loadNumber: null,
            shipmentNo: null,
            carrierName: null,
            containerNo: null,
            pickupDate: dateStr,
            dropDate: null,
            returnDate: null,
            assignedToCMT: null,
            createdByEmpId: null
          };
        }
      }
    }
    
    // 3. Check if it's an employee ID (starts with EMP or short alphanumeric code)
    const empIdPattern = /^(EMP|emp)[\dA-Za-z]+$/i;
    if (empIdPattern.test(trimmedTerm)) {
      // Could be assignedToCMT or createdByEmpId - we'll try assignedToCMT first
      return {
        loadNumber: null,
        shipmentNo: null,
        carrierName: null,
        containerNo: null,
        pickupDate: null,
        dropDate: null,
        returnDate: null,
        assignedToCMT: trimmedTerm.toUpperCase(),
        createdByEmpId: null
      };
    }
    
    // 4. Check if it's a shipment number (usually numeric or alphanumeric)
    // Shipment numbers are often longer numeric strings
    const shipmentPattern = /^\d{6,}$/; // 6+ digits
    if (shipmentPattern.test(trimmedTerm)) {
      return {
        loadNumber: null,
        shipmentNo: trimmedTerm,
        carrierName: null,
        containerNo: null,
        pickupDate: null,
        dropDate: null,
        returnDate: null,
        assignedToCMT: null,
        createdByEmpId: null
      };
    }
    
    // 5. Check if it's a container number (usually alphanumeric, often starts with letters)
    // Container numbers often have format like MSKU6924917, ONEU6068302
    const containerPattern = /^[A-Z]{2,}\d+$/i; // 2+ letters followed by numbers
    if (containerPattern.test(trimmedTerm)) {
      return {
        loadNumber: null,
        shipmentNo: null,
        carrierName: null,
        containerNo: trimmedTerm.toUpperCase(),
        pickupDate: null,
        dropDate: null,
        returnDate: null,
        assignedToCMT: null,
        createdByEmpId: null
      };
    }
    
    // 6. Default: treat as carrier name search
    return {
      loadNumber: null,
      shipmentNo: null,
      carrierName: trimmedTerm,
      containerNo: null,
      pickupDate: null,
      dropDate: null,
      returnDate: null,
      assignedToCMT: null,
      createdByEmpId: null
    };
  };

  // Handle search button click
  const handleSearch = () => {
    setActiveSearchTerm(searchTerm.trim());
    setCurrentPage(1); // Reset to page 1 when searching
  };

  // Handle Enter key in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveSearchTerm('');
    setCurrentPage(1);
  };

  // Reset to page 1 when date range changes
  useEffect(() => {
    if (dateFilterApplied) {
      setCurrentPage(1);
    }
  }, [range, dateFilterApplied]);

  // Fetch data from backend with all filters
  useEffect(() => {
    const searchParams = parseSearchTerm(activeSearchTerm);
    
    // Only send date params if date filter is applied
    const startDateParam = dateFilterApplied ? ymd(range.startDate) : null;
    const endDateParam = dateFilterApplied ? ymd(range.endDate) : null;
    
    dispatch(fetchDOReport({ 
      page: currentPage, 
      limit: itemsPerPage, 
      addDispature: selectedCompany || null,
      loadNumber: searchParams.loadNumber,
      shipmentNo: searchParams.shipmentNo,
      carrierName: searchParams.carrierName,
      containerNo: searchParams.containerNo,
      pickupDate: searchParams.pickupDate,
      dropDate: searchParams.dropDate,
      returnDate: searchParams.returnDate,
      assignedToCMT: searchParams.assignedToCMT,
      createdByEmpId: searchParams.createdByEmpId,
      startDate: startDateParam,
      endDate: endDateParam,
      cmtAssignedOnly: true, // Only fetch CMT assigned orders
      forceRefresh: false 
    }));
  }, [dispatch, currentPage, selectedCompany, activeSearchTerm, range, dateFilterApplied]);


  // Backend handles filtering, so we just use the orders from API
  // Only apply minimal client-side filtering if needed (fallback)
  const filteredOrders = orders.filter(order => {
    // Double-check CMT assigned (backend should handle this, but keep as safety)
    const isCMTAssigned = order.assignmentStatus === 'assigned' || order.assignedToCMT;
    return isCMTAssigned;
  });

  // Use backend pagination
  const totalPages = pagination.totalPages || 1;
  const totalItems = pagination.totalItems || filteredOrders.length;
  const currentOrders = filteredOrders; // Already paginated by backend

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Generate smart pagination page numbers
  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage <= 4) {
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
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

  const handleViewOrder = async (rowOrder) => {
    try {
      const orderId = rowOrder.originalId || rowOrder.id.replace('DO-', '');
      if (!orderId) {
        alertify.error('Order ID not found for this row');
        return;
      }

      setLoadingOrderDetails(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}/with-load`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.data?.success && res.data.data) {
        setSelectedOrder(res.data.data.doDetails);
        setSelectedLoadData(res.data.data.loadDetails);
        setShowOrderModal(true);
      } else {
        alertify.error('Could not load this delivery order');
      }
    } catch (err) {
      console.error('View order failed:', err?.response?.data || err);
      alertify.error('Failed to fetch order details');
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const statusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'assigned':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const extractBols = (order) => {
    const bols = [];
    if (order.bols && Array.isArray(order.bols)) {
      order.bols.forEach(b => {
        const v = typeof b === 'string' ? b : (b?.bolNo || b?.number || '');
        if (v && String(v).trim()) bols.push(String(v).trim());
      });
    }
    if (!bols.length && order?.bolInformation) bols.push(String(order.bolInformation));
    return Array.from(new Set(bols));
  };

  // Loading state
  if (loading && orders.length === 0) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading CMT assigned orders...</p>
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Truck className="text-indigo-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total CMT Assigned Orders</p>
                <p className="text-xl font-bold text-gray-800">{totalItems || filteredOrders.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-xl font-bold text-purple-600">{filteredOrders.filter(order => {
                  const orderDate = order.createdAt || '';
                  const today = ymd(new Date());
                  return orderDate === today;
                }).length}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search: Load No (L0618), Shipment No, Carrier, Container, Date (MM/DD/YYYY), CMT ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-96 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            {searchTerm && (
              <>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Search
                </button>
                <button
                  onClick={handleClearSearch}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                  title="Clear search"
                >
                  ✕
                </button>
              </>
            )}
          </div>
          {/* Date Range dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetMenu(v => !v)}
              className="w-[300px] text-left px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between"
            >
              <span>
                {dateFilterApplied && range.startDate && range.endDate
                  ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                  : 'Select Date Range'}
              </span>
              <span className="ml-3">▼</span>
            </button>

            {showPresetMenu && (
              <div className="absolute z-50 mt-2 w-56 rounded-md border bg-white shadow-lg">
                {dateFilterApplied && (
                  <>
                    <button
                      onClick={() => {
                        setDateFilterApplied(false);
                        setRange({ startDate: null, endDate: null, key: 'selection' });
                        setShowPresetMenu(false);
                        setCurrentPage(1);
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
                    >
                      Clear Date Filter
                    </button>
                    <div className="my-1 border-t" />
                  </>
                )}
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

          {/* Custom Range calendars */}
          {showCustomRange && (
            <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCustomRange(false)}>
              <div className="bg-white rounded-xl shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
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
                      // Reset date filter if cancelled
                      if (!dateFilterApplied) {
                        setRange({ startDate: null, endDate: null, key: 'selection' });
                      }
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterApplied(true); // Apply date filter
                      setShowCustomRange(false);
                      setCurrentPage(1); // Reset to page 1
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load Num</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Shipment No</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier Name</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Container No</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Pick Up Date</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Drop Date</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Return Date</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">ASSIGNED CMT</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">CREATED BY</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentOrders.map((order, index) => {
                // Get load number from customers[0].loadNo
                const loadNum = order.customers?.[0]?.loadNo || order.doNum || 'N/A';
                
                // Get shipment number from shipper
                const shipmentNo = order.shipper?.shipmentNo || order._fullOrderData?.shipper?.shipmentNo || 'N/A';
                
                // Get carrier name
                const carrierName = order.carrierName || order.carrier?.carrierName || order._fullOrderData?.carrier?.carrierName || 'N/A';
                
                // Get container number
                const containerNo = order.containerNo || order.shipper?.containerNo || order._fullOrderData?.shipper?.containerNo || 'N/A';
                
                // Get pickup date from first pickup location
                const pickupDate = order.shipper?.pickUpLocations?.[0]?.pickUpDate || 
                                  order.shipper?.pickupLocations?.[0]?.pickUpDate ||
                                  order._fullOrderData?.shipper?.pickUpLocations?.[0]?.pickUpDate ||
                                  order._fullOrderData?.shipper?.pickupLocations?.[0]?.pickUpDate || null;
                const formattedPickupDate = pickupDate ? new Date(pickupDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit' 
                }) : 'N/A';
                
                // Get drop date from first drop location
                const dropDate = order.shipper?.dropLocations?.[0]?.dropDate || 
                               order.shipper?.deliveryLocations?.[0]?.dropDate ||
                               order._fullOrderData?.shipper?.dropLocations?.[0]?.dropDate ||
                               order._fullOrderData?.shipper?.deliveryLocations?.[0]?.dropDate || null;
                const formattedDropDate = dropDate ? new Date(dropDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit' 
                }) : 'N/A';
                
                // Get return date (only for DRAYAGE)
                const returnDate = order.returnLocation?.returnDate || 
                                  order._fullOrderData?.returnLocation?.returnDate || null;
                const formattedReturnDate = returnDate ? new Date(returnDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit' 
                }) : 'N/A';
                
                // Get assigned CMT
                const assignedCMT = order.assignedToCMT?.employeeName || 
                                   order._fullOrderData?.assignedToCMT?.employeeName || 'N/A';
                
                // Get created by
                const createdByDisplay = order.createdBySalesUser?.employeeName || 
                                        order._fullOrderData?.createdBySalesUser?.employeeName ||
                                        order.createdByData?.employeeName ||
                                        order.createdBy || 'N/A';
                
                return (
                  <tr key={order.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3">
                      <span className="font-mono text-base font-semibold text-gray-700">{loadNum}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{shipmentNo}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{carrierName}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{containerNo}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{formattedPickupDate}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{formattedDropDate}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{formattedReturnDate}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-indigo-600">{assignedCMT}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{createdByDisplay}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
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
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No CMT assigned orders found matching your search' : 'No CMT assigned orders found'}
            </p>
            <p className="text-gray-400 text-sm">
              {searchTerm ? 'Try adjusting your search terms' : 'Orders assigned to CMT will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredOrders.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} orders
            {activeSearchTerm && ` (filtered)`}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Previous
            </button>
            {getPaginationPages().map((page, index) => {
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
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 border rounded-lg transition-colors text-sm font-medium min-w-[40px] ${
                    currentPage === page
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loadingOrderDetails && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-[60] flex justify-center items-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-gray-800">Loading Order Details...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch the complete data</p>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
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
                      <Truck className="text-white" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">CMT Assigned DO Details</h2>
                      <p className="text-blue-100">Delivery Order Information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowOrderModal(false);
                      setSelectedOrder(null);
                      setSelectedLoadData(null);
                    }}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
              {/* 1. Carrier Information */}
              {selectedOrder?.carrier && (
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
                        <p className="font-semibold text-gray-800">{selectedOrder.carrier?.carrierName || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                        <Truck className="text-pink-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Equipment Type</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.carrier?.equipmentType || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Carrier Fees</p>
                        <p className="font-semibold text-gray-800">${selectedOrder.carrier?.totalCarrierFees || 0}</p>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.carrier?.carrierFees?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Carrier Charges</h4>
                      <div className="space-y-2">
                        {selectedOrder.carrier.carrierFees.map((charge, i) => (
                          <div key={i} className="bg-white rounded-lg p-3 border border-purple-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-800">{charge?.name}</span>
                              <span className="font-bold text-green-600">${charge?.total || 0}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Quantity: {charge?.quantity || 0} × Amount: ${charge?.amount || 0}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Shipment Information */}
              {selectedOrder?.shipper && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Shipper Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="text-orange-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Shipment No</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.shipper?.shipmentNo || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="text-blue-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Container No</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.shipper?.containerNo || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Truck className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Container Type</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.shipper?.containerType || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pickup Locations (WITH Weight and Date) */}
                  {((selectedOrder.shipper?.pickUpLocations || []).length > 0) && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Pickup Locations</h4>
                      <div className="space-y-3">
                        {(selectedOrder.shipper?.pickUpLocations || []).map((location, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
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
                                <p className="text-sm text-gray-600">Weight (lbs)</p>
                                <p className="font-medium text-gray-800">
                                  {typeof location?.weight !== 'undefined' && location?.weight !== null && location?.weight !== ''
                                    ? location.weight
                                    : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Pickup Date</p>
                                <p className="font-medium text-gray-800">
                                  {location?.pickUpDate
                                    ? (() => {
                                        try {
                                          const date = new Date(location.pickUpDate);
                                          if (isNaN(date.getTime())) {
                                            return 'Invalid Date';
                                          }
                                          return date.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            timeZone: 'UTC'
                                          });
                                        } catch (error) {
                                          console.error('Error formatting pickup date:', error, location.pickUpDate);
                                          return 'Invalid Date';
                                        }
                                      })()
                                    : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drop Locations (WITH Weight and Date) */}
                  {((selectedOrder.shipper?.dropLocations || []).length > 0) && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Drop Locations</h4>
                      <div className="space-y-3">
                        {(selectedOrder.shipper?.dropLocations || []).map((location, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
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
                                <p className="text-sm text-gray-600">Weight (lbs)</p>
                                <p className="font-medium text-gray-800">
                                  {typeof location?.weight !== 'undefined' && location?.weight !== null && location?.weight !== ''
                                    ? location.weight
                                    : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Drop Date</p>
                                <p className="font-medium text-gray-800">
                                  {location?.dropDate
                                    ? (() => {
                                        try {
                                          const date = new Date(location.dropDate);
                                          if (isNaN(date.getTime())) {
                                            return 'Invalid Date';
                                          }
                                          return date.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            timeZone: 'UTC'
                                          });
                                        } catch (error) {
                                          console.error('Error formatting drop date:', error, location.dropDate);
                                          return 'Invalid Date';
                                        }
                                      })()
                                    : 'N/A'}
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

              {/* 5. Return Location */}
              {selectedOrder?.returnLocation && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="text-indigo-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Return Location</h3>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.name || 'N/A'}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-sm text-gray-600">Return Full Address</p>
                        <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.returnFullAddress || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">City</p>
                        <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.city || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">State</p>
                        <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.state || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Zip Code</p>
                        <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.zipCode || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Weight</p>
                        <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.weight || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600">Return Date</p>
                        <p className="font-medium text-gray-800">
                          {selectedOrder.returnLocation?.returnDate
                            ? (() => {
                                try {
                                  const date = new Date(selectedOrder.returnLocation.returnDate);
                                  if (isNaN(date.getTime())) {
                                    return 'Invalid Date';
                                  }
                                  return date.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'UTC'
                                  });
                                } catch (error) {
                                  console.error('Error formatting return date:', error, selectedOrder.returnLocation.returnDate);
                                  return 'Invalid Date';
                                }
                              })()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Created By */}
              {selectedOrder?.createdBySalesUser && (
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="text-teal-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Created By</h3>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-teal-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm font-medium">Employee ID:</span>
                        <span className="font-semibold text-gray-800">{selectedOrder.createdBySalesUser.empId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm font-medium">Employee Name:</span>
                        <span className="font-semibold text-gray-800">{selectedOrder.createdBySalesUser.employeeName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm font-medium">Department:</span>
                        <span className="font-semibold text-gray-800">{selectedOrder.createdBySalesUser.department || 'N/A'}</span>
                      </div>
                      {selectedOrder.createdAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm font-medium">Created At:</span>
                          <span className="font-semibold text-gray-800">
                            {new Date(selectedOrder.createdAt).toLocaleString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Important Dates from Load Details */}
              {selectedLoadData?.importantDates && Object.values(selectedLoadData.importantDates).some(date => date !== null) && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="text-blue-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Important Dates</h3>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedLoadData.importantDates.vesselDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm font-medium">Vessel Date:</span>
                          <span className="text-gray-800 text-sm">
                            {new Date(selectedLoadData.importantDates.vesselDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      {selectedLoadData.importantDates.lastFreeDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm font-medium">Last Free Date:</span>
                          <span className="text-gray-800 text-sm">
                            {new Date(selectedLoadData.importantDates.lastFreeDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      {selectedLoadData.importantDates.dischargeDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm font-medium">Discharge Date:</span>
                          <span className="text-gray-800 text-sm">
                            {new Date(selectedLoadData.importantDates.dischargeDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      {selectedLoadData.importantDates.outgateDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm font-medium">Outgate Date:</span>
                          <span className="text-gray-800 text-sm">
                            {new Date(selectedLoadData.importantDates.outgateDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      {selectedLoadData.importantDates.emptyDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm font-medium">Empty Date:</span>
                          <span className="text-gray-800 text-sm">
                            {new Date(selectedLoadData.importantDates.emptyDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      {selectedLoadData.importantDates.perDiemFreeDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm font-medium">Per Diem Free Date:</span>
                          <span className="text-gray-800 text-sm">
                            {new Date(selectedLoadData.importantDates.perDiemFreeDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      {selectedLoadData.importantDates.ingateDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm font-medium">Ingate Date:</span>
                          <span className="text-gray-800 text-sm">
                            {new Date(selectedLoadData.importantDates.ingateDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      {selectedLoadData.importantDates.readyToReturnDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm font-medium">Ready To Return Date:</span>
                          <span className="text-gray-800 text-sm">
                            {new Date(selectedLoadData.importantDates.readyToReturnDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      {selectedLoadData.importantDates.dlvyDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm font-medium">Delivery Date:</span>
                          <span className="text-gray-800 text-sm font-semibold">
                            {new Date(selectedLoadData.importantDates.dlvyDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
