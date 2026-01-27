import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Truck, Calendar, DollarSign, Search, FileText, CheckCircle, Eye, User, AlertTriangle } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import apiService from '../../services/apiService.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';

// Utility functions
const fmtMoney = (v) => (typeof v === "number" ? v.toFixed(2) : "0.00");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");

const InvoicesReport = () => {
  const [dos, setDos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const apiLimit = 1000;
  const [statistics, setStatistics] = useState({});
  const [selectedDoId, setSelectedDoId] = useState('');
  const [selectedDoDetails, setSelectedDoDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Payment Remark states
  const [updatingRemark, setUpdatingRemark] = useState({});
  const [remarkFilter, setRemarkFilter] = useState('all'); // 'all', 'ok', 'not_okay'
  
  // Date range state (default: last 30 days)
  const [range, setRange] = useState({
    startDate: addDays(new Date(), -29),
    endDate: new Date(),
    key: 'selection'
  });
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  
  // Company/Dispatcher filter state (addDispature)
  const [companyFilter, setCompanyFilter] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Presets
  const presets = {
    'All': null, // null means no date filter
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
    if (label === 'All') {
      // Set a wide date range or remove date filter
      const today = new Date();
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 10); // 10 years ago
      setRange({ startDate: pastDate, endDate: today, key: 'selection' });
    } else {
      const [s, e] = presets[label];
      setRange({ startDate: s, endDate: e, key: 'selection' });
    }
    setShowPresetMenu(false);
  };
  
  const ymd = (d) => format(d, 'yyyy-MM-dd'); // "YYYY-MM-DD"

  // Fetch companies for dropdown
  const fetchCompanies = async () => {
    if (loadingCompanies) return;
    
    try {
      setLoadingCompanies(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/do/do/shipper-payment-report/companies`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        const companiesList = response.data.data?.companies || [];
        // Sort companies alphabetically
        companiesList.sort((a, b) => (a || '').localeCompare(b || ''));
        setCompanies(companiesList);
      }
    } catch (err) {
      console.error('Error loading companies:', err);
      alertify.error('Failed to load companies list');
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Fetch companies on component mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchAllDOs();
  }, [range, companyFilter]);

  const fetchAllDOs = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Build query parameters with date range and company/dispatcher filter
      const params = {};
      
      // Add date range if specified
      if (range.startDate && range.endDate) {
        params.startDate = ymd(range.startDate);
        params.endDate = ymd(range.endDate);
      }
      
      // Add company/dispatcher filter if specified (addDispature - supports partial matching)
      if (companyFilter && companyFilter.trim()) {
        params.addDispature = companyFilter.trim();
      }
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/shipper-payment-report`, {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        // Combine paid and unpaid DOs - ensure arrays
        const paidDOs = Array.isArray(response.data.paidDOs?.all) ? response.data.paidDOs.all : [];
        const unpaidDOs = Array.isArray(response.data.unpaidDOs?.all) ? response.data.unpaidDOs.all : [];
        const allDOs = [...paidDOs, ...unpaidDOs];
        
        const transformedDOs = allDOs.map(order => {
          // Transform the API response to match component structure
          const paymentStatus = order.paymentStatus || 'unpaid';
          
          // Create invoice object from paymentDueDate if exists
          const invoice = order.paymentDueDate ? {
            invoiceUrl: null, // Not available in this API
            dueDate: order.paymentDueDate,
            uploadedAt: order.createdAt || order.date,
            dueDateInfo: null // Will be calculated if needed
          } : null;

          // Calculate due date info for invoice
          let dueDateInfo = null;
          if (invoice && invoice.dueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(invoice.dueDate);
            due.setHours(0, 0, 0, 0);
            const diffTime = due - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            dueDateInfo = {
              isOverdue: diffDays < 0,
              isDueToday: diffDays === 0,
              status: diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due_soon' : 'pending',
              daysOverdue: diffDays < 0 ? Math.abs(diffDays) : 0,
              daysRemaining: diffDays >= 0 ? diffDays : 0
            };
          }
          
          if (invoice) {
            invoice.dueDateInfo = dueDateInfo;
          }

          // Get carrier fees from API response (now included in shipper-payment-report)
          const carrierFees = Number(order.carrierFees) || 0;

          return {
            id: `DO-${String(order._id).slice(-6)}`,
            originalId: order._id,
            doNum: order.loadNo || 'N/A',
            clientName: order.billTo || order.shipperName || 'N/A',
            carrierName: order.carrier?.carrierName || 'N/A',
            carrierFees: carrierFees,
            createdAt: new Date(order.createdAt || order.date).toISOString().split('T')[0],
            createdBySalesUser: 'N/A', // Not available in this API
            status: order.assignmentStatus || order.status || 'open',
            // Invoice information
            invoice: invoice,
            // Payment information
            paymentStatus: paymentStatus,
            totalAmount: order.totalAmount || 0,
            lineHaul: order.lineHaul || 0,
            fsc: order.fsc || 0,
            paidAt: order.paidAt || null,
            paidBy: order.paidBy || null,
            paymentMethod: order.paymentMethod || null,
            paymentReference: order.paymentReference || null,
            paymentNotes: order.paymentNotes || null,
            paymentDueDate: order.paymentDueDate || null,
            shipperName: order.shipperName || 'N/A',
            shipperId: order.shipperId || null,
            // Shipper Payment Remark information (NEW)
            shipperPaymentRemark: order.shipperPaymentRemark || {
              status: 'ok',
              updatedBy: null,
              updatedAt: null,
              notes: ''
            },
            // Full order data for details
            fullData: order
          };
        });

        setDos(transformedDOs);
        
        // Set statistics from API response summary
        if (response.data.summary) {
          const stats = {
            total: response.data.summary.totalDOs || 0,
            paid: response.data.summary.paidCount || 0,
            unpaid: response.data.summary.unpaidCount || 0,
            paidTotalAmount: response.data.summary.paidTotalAmount || 0,
            unpaidTotalAmount: response.data.summary.unpaidTotalAmount || 0
          };
          console.log('Setting statistics:', stats);
          console.log('API summary:', response.data.summary);
          setStatistics(stats);
        } else {
          console.warn('No summary found in API response:', response.data);
        }
      }
    } catch (error) {
      console.error('Error fetching DOs:', error);
      alertify.error(`Failed to load shipper payment report: ${error.response?.data?.message || error.response?.status || 'Network Error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter DOs based on search term and date range
  const filteredDOs = useMemo(() => {
    let filtered = dos;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(deliveryOrder => 
        deliveryOrder.id.toLowerCase().includes(searchLower) ||
        deliveryOrder.doNum.toLowerCase().includes(searchLower) ||
        deliveryOrder.clientName.toLowerCase().includes(searchLower) ||
        deliveryOrder.carrierName.toLowerCase().includes(searchLower) ||
        deliveryOrder.createdBySalesUser.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by remark status
    if (remarkFilter !== 'all') {
      filtered = filtered.filter(deliveryOrder => 
        deliveryOrder.shipperPaymentRemark?.status === remarkFilter
      );
    }
    
    // Filter by date range
    if (range.startDate && range.endDate) {
      filtered = filtered.filter(deliveryOrder => {
        const doDate = new Date(deliveryOrder.createdAt);
        const start = new Date(range.startDate);
        const end = new Date(range.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return doDate >= start && doDate <= end;
      });
    }
    
    return filtered;
  }, [dos, searchTerm, range, remarkFilter]);

  // Update Shipper Payment Remark function
  const updateShipperPaymentRemark = async (doId, newStatus, notes = '') => {
    try {
      setUpdatingRemark(prev => ({ ...prev, [doId]: true }));
      
      const response = await apiService.updateShipperPaymentRemark(doId, newStatus, notes);
      
      if (response?.success) {
        // Update the local state
        setDos(prevDos => 
          prevDos.map(deliveryOrder => 
            deliveryOrder.originalId === doId 
              ? {
                  ...deliveryOrder,
                  shipperPaymentRemark: response.data.shipperPaymentRemark
                }
              : deliveryOrder
          )
        );
        
        alertify.success('Shipper payment remark updated successfully');
      } else {
        throw new Error(response?.message || 'Failed to update shipper payment remark');
      }
    } catch (error) {
      console.error('Error updating shipper payment remark:', error);
      alertify.error(`Failed to update remark: ${error.message}`);
    } finally {
      setUpdatingRemark(prev => ({ ...prev, [doId]: false }));
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredDOs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDOs = filteredDOs.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, range, companyFilter]);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Shipper Remark Button Component
  const ShipperRemarkButton = ({ deliveryOrder }) => {
    const isUpdating = updatingRemark[deliveryOrder.originalId];
    const remarkStatus = deliveryOrder.shipperPaymentRemark?.status || 'ok';
    
    const handleRemarkToggle = async () => {
      const newStatus = remarkStatus === 'ok' ? 'not_okay' : 'ok';
      await updateShipperPaymentRemark(deliveryOrder.originalId, newStatus);
    };

    return (
      <button
        onClick={handleRemarkToggle}
        disabled={isUpdating}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 min-w-[70px] ${
          remarkStatus === 'ok' 
            ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300' 
            : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={`Click to mark as ${remarkStatus === 'ok' ? 'Not OK' : 'OK'}`}
      >
        {isUpdating ? 'Updating...' : (remarkStatus === 'ok' ? 'OK' : 'Not OK')}
      </button>
    );
  };

  // Get row styling based on remark status
  const getRowClassName = (deliveryOrder, index) => {
    const baseClass = `border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`;
    
    if (deliveryOrder.shipperPaymentRemark?.status === 'not_okay') {
      return `${baseClass} bg-red-50 border-red-200`;
    }
    
    return baseClass;
  };

  const handleDoSelect = async (doId) => {
    if (!doId) {
      setSelectedDoDetails(null);
      return;
    }

    try {
      setLoadingDetails(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // First, check if we have the DO data in our transformed list (with payment info)
      const existingDo = dos.find(d => d.originalId === doId);
      
      // Fetch DO details
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/${doId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        const order = response.data.data;
        
        // Merge payment information from existing DO if available
        if (existingDo) {
          order.paymentStatus = existingDo.paymentStatus || order.paymentStatus;
          order.paidAt = existingDo.paidAt || order.paidAt;
          order.paidBy = existingDo.paidBy || order.paidBy;
          order.paymentMethod = existingDo.paymentMethod || order.paymentMethod;
          order.paymentReference = existingDo.paymentReference || order.paymentReference;
          order.paymentNotes = existingDo.paymentNotes || order.paymentNotes;
          order.paymentDueDate = existingDo.paymentDueDate || order.paymentDueDate;
        }
        
        setSelectedDoDetails(order);
        setShowDetailsModal(true);
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoices report...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Total DOs Card */}
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

          {/* Paid Count Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-xl font-bold text-green-600">{statistics.paid ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Unpaid Count Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <FileText className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unpaid</p>
                <p className="text-xl font-bold text-red-600">{statistics.unpaid ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Not OK Remarks Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Not OK</p>
                <p className="text-xl font-bold text-orange-600">
                  {dos.filter(d => d.shipperPaymentRemark?.status === 'not_okay').length}
                </p>
              </div>
            </div>
          </div>

        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* Remark Filter */}
          <div className="relative">
            <select
              value={remarkFilter}
              onChange={(e) => setRemarkFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            >
              <option value="all">All DOs</option>
              <option value="ok">OK DOs</option>
              <option value="not_okay">Not OK DOs</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Company/Dispatcher Filter (addDispature) - Dropdown */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={18} />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-[250px] pl-9 pr-8 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
              disabled={loadingCompanies}
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
            {loadingCompanies ? (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <span className="text-gray-400">▼</span>
              </div>
            )}
            {companyFilter && (
              <button
                onClick={() => setCompanyFilter('')}
                className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors z-10"
                title="Clear filter"
              >
                ×
              </button>
            )}
          </div>

          {/* Date Range Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetMenu(v => !v)}
              className="w-[300px] text-left px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between hover:border-gray-400 transition-colors"
            >
              <span>
                {format(range.startDate, 'MMM dd, yyyy')} - {format(range.endDate, 'MMM dd, yyyy')}
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
        </div>
      </div>

      {/* DOs Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load Num</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">BILL TO</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">SHIPPER NAME</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Payment Due Date</th>
                <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Customer Charges</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">CREATED DATE</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Remark</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentDOs.map((deliveryOrder, index) => {
                const invoice = deliveryOrder.invoice;
                const invoiceDueDateInfo = invoice?.dueDateInfo;
                
                return (
                  <tr key={deliveryOrder.id} className={getRowClassName(deliveryOrder, index)}>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-semibold text-gray-700">{deliveryOrder.doNum}</span>
                        {deliveryOrder.shipperPaymentRemark?.status === 'not_okay' && (
                          <AlertTriangle className="text-red-500" size={16} title="Payment issue flagged" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{deliveryOrder.clientName}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{deliveryOrder.shipperName || ''}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center">
                        {deliveryOrder.paymentStatus === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <CheckCircle size={12} />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <FileText size={12} />
                            Unpaid
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {(() => {
                        if (!invoice || !invoice.dueDate) {
                          return <span className="text-gray-400"></span>;
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
                            <div className="flex items-center gap-1">
                              <span 
                                className="font-bold text-base"
                                style={{ color: statusColor }}
                                title={dueDateInfo.isOverdue ? `${dueDateInfo.daysOverdue} days overdue` : `${dueDateInfo.daysRemaining} days remaining`}
                              >
                                {daysValue}
                              </span>
                              <span className="text-xs font-medium" style={{ color: statusColor }}>
                                {dueDateInfo.isOverdue ? 'days overdue' : 'days left'}
                              </span>
                              <CheckCircle 
                                size={16} 
                                style={{ color: statusColor }}
                                className="flex-shrink-0"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-end">
                        <span className="font-semibold text-gray-700">${fmtMoney(deliveryOrder.carrierFees || 0)}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{formatDate(deliveryOrder.createdAt)}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center">
                        <ShipperRemarkButton deliveryOrder={deliveryOrder} />
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
              {searchTerm ? 'No invoices found matching your search' : 'No invoices found'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm ? 'Try adjusting your search terms' : 'No delivery orders found for the selected filters'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredDOs.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredDOs.length)} of {filteredDOs.length} invoices
            {searchTerm ? ` (filtered from ${dos.length} total)` : ''}
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
                      ? 'bg-blue-500 text-white border-blue-500'
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
                    <p className="text-blue-100">Invoice Report</p>
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



              {/* Shipper Payment Information */}
              {selectedDoDetails?.paymentStatus && (
                <div className={`bg-gradient-to-br rounded-2xl p-6 border ${
                  selectedDoDetails.paymentStatus === 'paid' 
                    ? 'from-green-50 to-emerald-50 border-green-200' 
                    : 'from-orange-50 to-yellow-50 border-orange-200'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className={selectedDoDetails.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'} size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Shipper Payment Information</h3>
                    <span className={`ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedDoDetails.paymentStatus === 'paid' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      <CheckCircle size={14} />
                      {selectedDoDetails.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>

              {/* Shipper Payment Remark Section */}
              {selectedDoDetails?.shipperPaymentRemark && (
                <div className={`bg-gradient-to-br rounded-2xl p-6 border mb-6 ${
                  selectedDoDetails.shipperPaymentRemark.status === 'not_okay'
                    ? 'from-red-50 to-pink-50 border-red-200'
                    : 'from-green-50 to-emerald-50 border-green-200'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    {selectedDoDetails.shipperPaymentRemark.status === 'not_okay' ? (
                      <AlertTriangle className="text-red-600" size={20} />
                    ) : (
                      <CheckCircle className="text-green-600" size={20} />
                    )}
                    <h3 className="text-lg font-bold text-gray-800">Shipper Payment Remark</h3>
                    <span className={`ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedDoDetails.shipperPaymentRemark.status === 'not_okay'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedDoDetails.shipperPaymentRemark.status === 'not_okay' ? (
                        <>
                          <AlertTriangle size={14} />
                          Not OK
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          OK
                        </>
                      )}
                    </span>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Status</p>
                        <p className={`font-medium capitalize ${
                          selectedDoDetails.shipperPaymentRemark.status === 'not_okay' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {selectedDoDetails.shipperPaymentRemark.status.replace('_', ' ')}
                        </p>
                      </div>
                      
                      {selectedDoDetails.shipperPaymentRemark.updatedBy && (
                        <>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Updated By</p>
                            <p className="font-medium text-gray-800">
                              {selectedDoDetails.shipperPaymentRemark.updatedBy.employeeName}
                              {selectedDoDetails.shipperPaymentRemark.updatedBy.department && 
                                ` (${selectedDoDetails.shipperPaymentRemark.updatedBy.department})`
                              }
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Updated At</p>
                            <p className="font-medium text-gray-800">
                              {fmtDateTime(selectedDoDetails.shipperPaymentRemark.updatedAt)}
                            </p>
                          </div>
                        </>
                      )}
                      
                      {selectedDoDetails.shipperPaymentRemark.notes && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600 mb-1">Notes</p>
                          <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            {selectedDoDetails.shipperPaymentRemark.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedDoDetails.paymentStatus === 'paid' && (
                        <>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                            <p className="font-medium text-gray-800 capitalize">
                              {selectedDoDetails?.paymentMethod?.replace('_', ' ') || 'N/A'}
                            </p>
                          </div>
                          {selectedDoDetails?.paymentReference && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Payment Reference</p>
                              <p className="font-medium text-gray-800">
                                {selectedDoDetails.paymentReference}
                              </p>
                            </div>
                          )}
                          {selectedDoDetails?.paidAt && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Paid At</p>
                              <p className="font-medium text-gray-800">
                                {fmtDateTime(selectedDoDetails.paidAt)}
                              </p>
                            </div>
                          )}
                          {selectedDoDetails?.paidBy && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Paid By</p>
                              <p className="font-medium text-gray-800">
                                {selectedDoDetails.paidBy?.employeeName || selectedDoDetails.paidBy?.empId || 'N/A'}
                                {selectedDoDetails.paidBy?.department && ` (${selectedDoDetails.paidBy.department})`}
                              </p>
                            </div>
                          )}
                          {selectedDoDetails?.paymentNotes && (
                            <div className="col-span-2">
                              <p className="text-sm text-gray-600 mb-1">Payment Notes</p>
                              <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                {selectedDoDetails.paymentNotes}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      {selectedDoDetails.paymentStatus === 'pending' && (
                        <>
                          {selectedDoDetails?.paymentDueDate && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Payment Due Date</p>
                              <p className="font-medium text-gray-800">
                                {fmtDateTime(selectedDoDetails.paymentDueDate)}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Status</p>
                            <p className="font-medium text-orange-600 capitalize">
                              {selectedDoDetails.paymentStatus}
                            </p>
                          </div>
                        </>
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
};

export default InvoicesReport;

