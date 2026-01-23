import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Truck, Calendar, DollarSign, Search, FileText, CheckCircle, Eye, User } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';

// Utility functions
const fmtMoney = (v) => (typeof v === "number" ? v.toFixed(2) : "0.00");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");
const isImageUrl = (url = "") => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
const isPdfUrl = (url = "") => /\.pdf$/i.test(url);

const PayableReport = () => {
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
  
  // Date range state (default: last 30 days)
  const [range, setRange] = useState({
    startDate: addDays(new Date(), -29),
    endDate: new Date(),
    key: 'selection'
  });
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);

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

  useEffect(() => {
    fetchAllDOs();
  }, [range]);

  const fetchAllDOs = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Build query parameters with date range
      const params = {};
      
      // Add date range if specified
      if (range.startDate && range.endDate) {
        params.startDate = ymd(range.startDate);
        params.endDate = ymd(range.endDate);
      }
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/carrier-payment-report`, {
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
          const paymentStatus = order.carrierPaymentStatus || 'unpaid';
          
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

          return {
            id: `DO-${String(order._id).slice(-6)}`,
            originalId: order._id,
            doNum: order.loadNo || '',
            clientName: order.billTo || '',
            carrierName: order.carrierName || '',
            carrierFees: order.carrierFeesAmount || order.totalCarrierFees || 0,
            createdAt: new Date(order.createdAt || order.date).toISOString().split('T')[0],
            createdBySalesUser: '',
            status: order.assignmentStatus || order.status || 'open',
            // Invoice information
            invoice: invoice,
            // Payment information
            paymentStatus: paymentStatus,
            totalAmount: order.totalCarrierFees || 0,
            paidAt: order.paidAt || null,
            paidBy: order.paidBy || null,
            paymentMethod: order.paymentMethod || null,
            paymentReference: order.paymentReference || null,
            paymentNotes: order.paymentNotes || null,
            paymentDueDate: order.paymentDueDate || null,
            carrierId: order.carrierId || null,
            carrierFeesArray: order.carrierFees || [],
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
      alertify.error(`Failed to load carrier payment report: ${error.response?.data?.message || error.response?.status || 'Network Error'}`);
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
  }, [dos, searchTerm, range]);

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
  }, [searchTerm, range]);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
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
        
        // The API response should already contain carrierPaymentStatus with paymentProof
        // We don't need to merge from existingDo since the API has the complete data
        // The carrierPaymentStatus.paymentProof will be available if the DO is paid
        
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
            <p className="text-gray-600">Loading payable report...</p>
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
        </div>
        
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search payables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">CARRIER NAME</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Payment Due Date</th>
                <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier Fees</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">CREATED DATE</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentDOs.map((deliveryOrder, index) => {
                const invoice = deliveryOrder.invoice;
                const invoiceDueDateInfo = invoice?.dueDateInfo;
                
                return (
                  <tr key={deliveryOrder.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3">
                      <span className="font-mono text-base font-semibold text-gray-700">{deliveryOrder.doNum}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{deliveryOrder.carrierName || ''}</span>
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
              {searchTerm ? 'No payables found matching your search' : 'No payables found'}
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
            Showing {startIndex + 1} to {Math.min(endIndex, filteredDOs.length)} of {filteredDOs.length} payables
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
                    <p className="text-blue-100">Payable Report</p>
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
                        <p className="font-semibold text-gray-800">{selectedDoDetails.carrier?.carrierName || selectedDoDetails.carrier?.compName || ''}</p>
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

              {/* Carrier Payment Information */}
              {selectedDoDetails?.carrierPaymentStatus && (
                <div className={`bg-gradient-to-br rounded-2xl p-6 border ${
                  selectedDoDetails.carrierPaymentStatus === 'paid' 
                    ? 'from-green-50 to-emerald-50 border-green-200' 
                    : 'from-orange-50 to-yellow-50 border-orange-200'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className={selectedDoDetails.carrierPaymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'} size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Carrier Payment Information</h3>
                    <span className={`ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedDoDetails.carrierPaymentStatus === 'paid' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      <CheckCircle size={14} />
                      {selectedDoDetails.carrierPaymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedDoDetails.carrierPaymentStatus === 'paid' && (
                        <>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                            <p className="font-medium text-gray-800 capitalize">
                              {selectedDoDetails?.paymentMethod?.replace('_', ' ') || ''}
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
                                {selectedDoDetails.paidBy?.employeeName || selectedDoDetails.paidBy?.empId || ''}
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
                          {selectedDoDetails?.carrierPaymentStatus?.paymentProof && (
                            <div className="col-span-2">
                              <p className="text-sm text-gray-600 mb-2">Invoice / Payment Proof</p>
                              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                  {isImageUrl(selectedDoDetails.carrierPaymentStatus.paymentProof.fileUrl) ? (
                                    <div className="flex flex-col items-center gap-2">
                                      <a
                                        href={selectedDoDetails.carrierPaymentStatus.paymentProof.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                      >
                                        <FileText className="text-blue-600" size={24} />
                                        <div>
                                          <p className="font-medium">{selectedDoDetails.carrierPaymentStatus.paymentProof.fileName || 'Invoice'}</p>
                                          <p className="text-xs text-gray-500">Click to view image</p>
                                        </div>
                                      </a>
                                      <img
                                        src={selectedDoDetails.carrierPaymentStatus.paymentProof.fileUrl}
                                        alt="Invoice"
                                        className="max-w-full max-h-64 rounded-lg border border-gray-300 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(selectedDoDetails.carrierPaymentStatus.paymentProof.fileUrl, '_blank')}
                                      />
                                    </div>
                                  ) : isPdfUrl(selectedDoDetails.carrierPaymentStatus.paymentProof.fileUrl) ? (
                                    <a
                                      href={selectedDoDetails.carrierPaymentStatus.paymentProof.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                      <FileText className="text-red-600" size={24} />
                                      <div>
                                        <p className="font-medium">{selectedDoDetails.carrierPaymentStatus.paymentProof.fileName || 'Invoice PDF'}</p>
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
                                        <p className="font-medium">{selectedDoDetails.carrierPaymentStatus.paymentProof.fileName || 'Invoice Document'}</p>
                                        <p className="text-xs text-gray-500">Click to download</p>
                                      </div>
                                    </a>
                                  )}
                                </div>
                                {selectedDoDetails.carrierPaymentStatus.paymentProof.uploadedAt && (
                                  <p className="text-xs text-gray-500 mt-3">
                                    Uploaded: {fmtDateTime(selectedDoDetails.carrierPaymentStatus.paymentProof.uploadedAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {selectedDoDetails.carrierPaymentStatus === 'pending' && (
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
                              {selectedDoDetails.carrierPaymentStatus}
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

export default PayableReport;

