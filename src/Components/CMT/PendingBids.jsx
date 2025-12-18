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
  const handleManualApprove = async (bidId, customRate) => {
    setActionLoading(prev => ({ ...prev, [bidId]: 'manual' }));
    try {

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/bid/intermediate/${bidId}/approve`, {
        intermediateRate: parseInt(customRate)
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
                        onClick={() => setApprovalModal({ visible: true, type: 'manual', bid })}
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
                            <span>Approve</span>
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
    </div>
  );
} 