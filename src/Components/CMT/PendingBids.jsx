import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function PendingBids() {
  const [pendingBids, setPendingBids] = useState([]);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [selectedBid, setSelectedBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [approvalModal, setApprovalModal] = useState({
    visible: false,
    type: null, // 'manual' or 'auto'
    bid: null, // the selected bid object
  });
  const [marginAmount, setMarginAmount] = useState(0);
  const [editableMessage, setEditableMessage] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [salesUserId, setSalesUserId] = useState('1234'); // Default sales user ID

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch pending bids by sales user
  const fetchPendingBidsBySalesUser = async (salesUserId = '1234') => {
    try {

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/pending-by-sales-user/${salesUserId}`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data && response.data.success) {
        const transformedBids = response.data.bids.map(bid => ({
          id: `BID-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.load ? `${bid.load.origin?.city || 'N/A'}, ${bid.load.origin?.state || 'N/A'}` : 'N/A, N/A',
          destination: bid.load ? `${bid.load.destination?.city || 'N/A'}, ${bid.load.destination?.state || 'N/A'}` : 'N/A, N/A',
          rate: bid.rate,
          truckerName: bid.carrier?.compName || 'N/A',
          status: 'pending',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          createdBy: `Sales User ${bid.load?.createdBySalesUser?.empName || 'Unknown'} (${bid.load?.createdBySalesUser?.empId || 'N/A'})`,
          docUpload: bid.doDocument || 'sample-doc.jpg',
          remarks: bid.message || '',
          // Additional fields from the new API
          carrierInfo: {
            mcDotNo: bid.carrier?.mc_dot_no || 'N/A',
            email: bid.carrier?.email || 'N/A',
            phone: bid.carrier?.phoneNo || 'N/A',
            fleetSize: bid.carrier?.fleetsize || 'N/A',
            state: bid.carrier?.state || 'N/A',
            city: bid.carrier?.city || 'N/A'
          },
          loadInfo: {
            weight: bid.load?.weight || 0,
            commodity: bid.load?.commodity || 'N/A',
            vehicleType: bid.load?.vehicleType || 'N/A',
            pickupDate: bid.load?.pickupDate || 'N/A',
            deliveryDate: bid.load?.deliveryDate || 'N/A',
            originalRate: bid.load?.rate || 0
          },
          estimatedPickup: new Date(bid.estimatedPickupDate).toLocaleDateString(),
          estimatedDelivery: new Date(bid.estimatedDeliveryDate).toLocaleDateString(),
          placedByInhouseUser: bid.placedByInhouseUser,
          salesUserInfo: bid.load?.createdBySalesUser
        }));

        return transformedBids;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching pending bids by sales user:', error);
      return [];
    }
  };

  // Fetch pending approvals
  const fetchPendingApprovals = async () => {
    try {

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/pending-intermediate-approval`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data && response.data.success) {
        const transformedBids = response.data.bids.map(bid => ({
          id: `BID-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.load ? `${bid.load.origin?.city || 'N/A'}, ${bid.load.origin?.state || 'N/A'}` : 'N/A, N/A',
          destination: bid.load ? `${bid.load.destination?.city || 'N/A'}, ${bid.load.destination?.state || 'N/A'}` : 'N/A, N/A',
          rate: bid.rate,
          truckerName: bid.carrier?.compName || 'N/A',
          status: 'pending',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          createdBy: `Employee ${bid.placedByInhouseUser}`,
          docUpload: bid.doDocument || 'sample-doc.jpg',
          remarks: bid.message || ''
        }));

        return transformedBids;
      }
      return [];
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  };

  // Fetch all pending data
  const fetchAllPendingData = async () => {
    setLoading(true);
    try {

      const [salesUserBids, pendingApprovals] = await Promise.all([
        fetchPendingBidsBySalesUser(salesUserId),
        fetchPendingApprovals()
      ]);


      // Combine both datasets
      const combinedBids = [...(salesUserBids || []), ...(pendingApprovals || [])];

      setPendingBids(combinedBids);

    } catch (error) {
      console.error('Error fetching pending data:', error);
      alertify.error('Error refreshing data');
    } finally {
      setLoading(false);
    }
  };

  // Manual approve function
  const handleManualApprove = async (bidId, customRate, message = '') => {
    setActionLoading(prev => ({ ...prev, [bidId]: 'manual' }));
    try {

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/bid/intermediate/${bidId}/approve`, {
        intermediateRate: parseFloat(customRate),
        message: message || ''
      }, {
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data.success) {
        alertify.success('✅ Bid approved successfully with custom rate!');
        await fetchAllPendingData(); // Refresh the data
      } else {
        alertify.error(response.data.message || 'Failed to approve bid');
      }
    } catch (error) {
      console.error('Manual approve error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      alertify.error(error.response?.data?.message || 'Error approving bid. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [bidId]: null }));
    }
  };

  // Auto approve function
  const handleAutoApprove = async (bidId) => {
    setActionLoading(prev => ({ ...prev, [bidId]: 'auto' }));
    try {
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/bid/intermediate/${bidId}/auto-approve`, {}, {
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data.success) {
        alertify.success('Bid auto-approved successfully');
        await fetchAllPendingData();
      } else {
        alertify.error(response.data.message || 'Failed to auto-approve bid');
      }
    } catch (error) {
      console.error('Auto approve error:', error);
      alertify.error(error.response?.data?.message || 'Error in auto approval. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [bidId]: null }));
    }
  };

  // Status color helper
  const statusColor = (status) => {
    if (!status) return 'bg-yellow-100 text-yellow-700';
    if (status === 'approved') return 'bg-green-100 text-green-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  // Filter bids based on search term
  const filteredBids = pendingBids.filter(bid =>
    bid.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bid.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bid.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bid.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bid.truckerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredBids.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBids = filteredBids.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    // Use the same data fetching logic as the main component
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch approved rates (which includes pending bids)
        const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/approved/`, {
          timeout: 10000,
          headers: API_CONFIG.getAuthHeaders()
        });

        if (response.data && response.data.success) {
          // Transform API data to match our component structure
          const transformedRates = response.data.data.map(rate => ({
            id: `RA-${rate._id.slice(-6)}`,
            rateNum: rate._id,
            shipmentNumber: rate.shipmentNumber || 'N/A',
            origin: rate.origin || 'N/A',
            destination: rate.destination || 'N/A',
            rate: rate.approvedRate || rate.rate || 0,
            truckerName: rate.truckerName || rate.trucker || 'N/A',
            status: 'pending', // Force status to pending for this tab
            createdAt: new Date(rate.approvedDate || rate.createdAt).toISOString().split('T')[0],
            createdBy: `Employee ${rate.empId || '1234'}`,
            docUpload: rate.supportingDocs || 'sample-doc.jpg',
            remarks: rate.remarks || ''
          }));

          setPendingBids(transformedRates);
        } else {
          console.error('API response format error:', response.data);
          setPendingBids([]);
        }
      } catch (error) {
        console.error('Error fetching data for pending tab:', error);
        setPendingBids([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle view bid details
  const handleViewBid = (bid) => {
    setSelectedBid(bid);
    setViewDoc(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pending bids...</p>
          </div>
        </div>
      </div>
    );
  }

  if (previewImg) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden p-4">
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
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Pending Bids</p>
                <p className="text-xl font-bold text-gray-800">{pendingBids.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Truck className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today's Pending</p>
                <p className="text-xl font-bold text-blue-600">{pendingBids.filter(bid => bid.createdAt === new Date().toISOString().split('T')[0]).length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search pending bids..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bid ID</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Origin</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Destination</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Trucker</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentBids.map((bid, index) => (
                <tr key={bid.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{bid.id}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{bid.origin}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{bid.destination}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-bold text-green-600">${bid.rate.toLocaleString()}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-medium text-gray-700">{bid.truckerName}</p>
                      {bid.carrierInfo && (
                        <p className="text-xs text-gray-500">MC: {bid.carrierInfo.mcDotNo}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${statusColor(bid.status)}`}>
                      {bid.status === 'approved' && <CheckCircle size={12} />}
                      {bid.status === 'rejected' && <XCircle size={12} />}
                      {bid.status === 'pending' && <Clock size={12} />}
                      {bid.status || 'Pending'}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      {/* Manual Approve Button */}
                      <button
                        onClick={() => {
                          console.log('Bid data:', bid); // Debug log
                          console.log('Bid rate:', bid.rate); // Debug log
                          setMarginAmount(0); // Reset margin when opening modal
                          setEditableMessage(bid.remarks || ''); // Initialize editable message
                          setApprovalError(''); // Reset any previous errors
                          setApprovalModal({ visible: true, type: 'manual', bid });
                        }}
                        disabled={actionLoading[bid.rateNum]}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 ${
                          actionLoading[bid.rateNum] === 'manual'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700 hover:shadow-xl'
                        }`}
                      >
                        {actionLoading[bid.rateNum] === 'manual' ? (
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Approving...</span>
                          </span>
                        ) : (
                          <>
                            <CheckCircle size={12} className="animate-pulse" />
                            <span>Add Margin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredBids.length === 0 && (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No pending bids found matching your search' : 'No pending bids found'}
            </p>
            <p className="text-gray-400 text-sm">
              {searchTerm ? 'Try adjusting your search terms' : 'All bids have been processed'}
            </p>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {approvalModal.visible && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Add Margin</h2>
                    <p className="text-green-100">Bid ID: {approvalModal.bid?.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setApprovalModal({ visible: false, type: null, bid: null });
                    setMarginAmount(0);
                    setEditableMessage('');
                    setApprovalError('');
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Error Message */}
              {approvalError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="text-red-500" size={16} />
                    <p className="text-red-700 text-sm font-medium">{approvalError}</p>
                  </div>
                </div>
              )}

              {/* Bid Details */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 font-medium">Origin</p>
                    <p className="text-gray-800 font-semibold">{approvalModal.bid?.origin}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Destination</p>
                    <p className="text-gray-800 font-semibold">{approvalModal.bid?.destination}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Trucker</p>
                    <p className="text-gray-800 font-semibold">{approvalModal.bid?.truckerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Original Rate</p>
                    <p className="text-green-600 font-bold">${approvalModal.bid?.rate?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Original Rate Amount Display */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="text-green-600" size={18} />
                  <label className="text-sm font-semibold text-gray-700">
                    Original Rate Amount
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    readOnly
                    className="w-full pl-8 pr-4 py-3 border-2 border-blue-300 rounded-lg text-lg font-semibold bg-gray-50 text-gray-700"
                    value={approvalModal.bid?.rate || 0}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Clock size={12} />
                  Base rate from the bid
                </p>
              </div>

              {/* Add Margin Input */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <PlusCircle className="text-green-600" size={18} />
                  <label className="text-sm font-semibold text-gray-700">
                    Add Margin Amount *
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border-2 border-green-300 rounded-lg text-lg font-semibold transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    value={marginAmount || ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? 0 : Number(e.target.value);
                      setMarginAmount(v);
                      setApprovalError('');
                    }}
                    placeholder="Enter margin amount"
                  />
                </div>
              </div>

              {/* Total Amount Display */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="text-purple-600" size={18} />
                  <label className="text-sm font-semibold text-gray-700">
                    Total (Rate + Margin) *
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="text"
                    readOnly
                    className="w-full pl-8 pr-4 py-3 border-2 border-purple-300 rounded-lg text-lg font-bold bg-purple-50 text-purple-700"
                    value={(() => {
                      const baseRate = Number(approvalModal.bid?.rate || 0);
                      const margin = Number(marginAmount || 0);
                      const total = baseRate + margin;
                      console.log('Total calculation:', { baseRate, margin, total }); // Debug log
                      return total.toFixed(2);
                    })()}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Base: ${Number(approvalModal.bid?.rate || 0).toFixed(2)} + Margin: ${Number(marginAmount || 0).toFixed(2)}
                </p>
              </div>

              {/* Message Section */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <label className="text-sm font-semibold text-gray-700">Message</label>
                </div>
                <div className="bg-white rounded-lg border border-gray-200">
                  <textarea
                    value={editableMessage}
                    onChange={(e) => setEditableMessage(e.target.value)}
                    rows={3}
                    className="w-full p-3 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 leading-relaxed resize-none"
                    placeholder="Enter message or notes..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setApprovalModal({ visible: false, type: null, bid: null });
                    setMarginAmount(0);
                    setEditableMessage('');
                    setApprovalError('');
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 hover:border-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const baseRate = Number(approvalModal.bid?.rate || 0);
                    const margin = Number(marginAmount || 0);
                    const total = baseRate + margin;
                    
                    if (!Number.isFinite(total) || total <= 0) {
                      setApprovalError('Please enter a valid margin amount. Total must be greater than 0.');
                      alertify.error('Please enter a valid margin amount. Total must be greater than 0.');
                      return;
                    }
                    
                    if (margin < 0) {
                      setApprovalError('Margin amount cannot be negative.');
                      alertify.error('Margin amount cannot be negative.');
                      return;
                    }
                    
                    await handleManualApprove(approvalModal.bid.rateNum, total, editableMessage);
                    setApprovalModal({ visible: false, type: null, bid: null });
                    setMarginAmount(0);
                    setEditableMessage('');
                    setApprovalError('');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl"
                >
                  Approve Bid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 