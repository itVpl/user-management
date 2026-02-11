import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaDownload } from 'react-icons/fa';
import { 
  User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, 
  MapPin, Calendar, DollarSign, Search, AlertCircle, TrendingDown, TrendingUp 
} from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function ManagerPendingBids() {
  const [pendingBids, setPendingBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBid, setSelectedBid] = useState(null);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBids, setTotalBids] = useState(0);
  const [statistics, setStatistics] = useState({
    totalPending: 0,
    totalValue: 0,
    avgRate: 0
  });

  // Approval/Rejection Modal State
  const [actionModal, setActionModal] = useState({
    visible: false,
    bid: null,
    action: null // 'approve' or 'reject'
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionErrors, setActionErrors] = useState({
    rejectionReason: ''
  });

  // Fetch pending bids for manager
  const fetchManagerPendingBids = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/manager/pending`, {
        params: {
          page,
          limit,
          sortBy: 'forwardedToManager.forwardedAt',
          sortOrder: 'desc'
        },
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        const transformedBids = response.data.bids.map(bid => {
          // Helper function to extract origin
          const getOrigin = () => {
            if (bid.origins && Array.isArray(bid.origins) && bid.origins.length > 0) {
              const firstOrigin = bid.origins[0];
              const city = firstOrigin.city || firstOrigin.extractedCity || firstOrigin.addressLine1 || '';
              const state = firstOrigin.state || '';
              if (city || state) {
                return `${city || 'N/A'}, ${state || 'N/A'}`;
              }
            }
            if (bid.load?.origins && Array.isArray(bid.load.origins) && bid.load.origins.length > 0) {
              const firstOrigin = bid.load.origins[0];
              const city = firstOrigin.city || firstOrigin.extractedCity || firstOrigin.addressLine1 || '';
              const state = firstOrigin.state || '';
              if (city || state) {
                return `${city || 'N/A'}, ${state || 'N/A'}`;
              }
            }
            if (bid.load?.origin) {
              const city = bid.load.origin.city || bid.load.origin.extractedCity || bid.load.origin.addressLine1 || '';
              const state = bid.load.origin.state || '';
              if (city || state) {
                return `${city || 'N/A'}, ${state || 'N/A'}`;
              }
            }
            return 'N/A, N/A';
          };

          // Helper function to extract destination
          const getDestination = () => {
            if (bid.destinations && Array.isArray(bid.destinations) && bid.destinations.length > 0) {
              const firstDestination = bid.destinations[0];
              const city = firstDestination.city || firstDestination.extractedCity || firstDestination.addressLine1 || '';
              const state = firstDestination.state || '';
              if (city || state) {
                return `${city || 'N/A'}, ${state || 'N/A'}`;
              }
            }
            if (bid.load?.destinations && Array.isArray(bid.load.destinations) && bid.load.destinations.length > 0) {
              const firstDestination = bid.load.destinations[0];
              const city = firstDestination.city || firstDestination.extractedCity || firstDestination.addressLine1 || '';
              const state = firstDestination.state || '';
              if (city || state) {
                return `${city || 'N/A'}, ${state || 'N/A'}`;
              }
            }
            if (bid.load?.destination) {
              const city = bid.load.destination.city || bid.load.destination.extractedCity || bid.load.destination.addressLine1 || '';
              const state = bid.load.destination.state || '';
              if (city || state) {
                return `${city || 'N/A'}, ${state || 'N/A'}`;
              }
            }
            return 'N/A, N/A';
          };

          return {
            id: `BID-${bid._id.slice(-6)}`,
            rateNum: bid._id,
            loadId: bid.load?._id ? `L-${bid.load._id.slice(-5)}` : 'N/A',
            shipmentNumber: bid.load?.shipmentNumber || 'N/A',
            origin: getOrigin(),
            destination: getDestination(),
            originalRate: bid.originalRate || bid.originalLoadRate || bid.load?.rate || 0,
            intermediateRate: bid.intermediateRate || 0,
            currentRate: bid.currentRate || bid.intermediateRate || bid.originalRate || 0,
            thresholdRate: bid.thresholdRate || 0,
            rateDifference: bid.rateDifference || 0,
            rateDifferencePercentage: bid.rateDifferencePercentage || '0',
            truckerName: bid.carrier?.compName || 'N/A',
            shipperName: bid.shipper?.compName || bid.load?.shipper?.compName || 'N/A',
            status: bid.status || 'Pending',
            createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
            forwardedAt: bid.forwardedToManager?.forwardedAt ? new Date(bid.forwardedToManager.forwardedAt).toISOString().split('T')[0] : 'N/A',
            forwardedBy: bid.forwardedToManager?.forwardedBy?.empName || 'N/A',
            forwardReason: bid.forwardedToManager?.forwardReason || 'Rate is below threshold',
            driverName: bid.driverName || 'N/A',
            driverPhone: bid.driverPhone || 'N/A',
            vehicleNumber: bid.vehicleNumber || 'N/A',
            vehicleType: bid.vehicleType || bid.load?.vehicleType || 'N/A',
            estimatedPickupDate: bid.estimatedPickupDate ? new Date(bid.estimatedPickupDate).toLocaleDateString() : 'N/A',
            estimatedDeliveryDate: bid.estimatedDeliveryDate ? new Date(bid.estimatedDeliveryDate).toLocaleDateString() : 'N/A',
            docUpload: bid.doDocument || bid.attachment || 'sample-doc.jpg',
            message: bid.message || '',
            carrierInfo: {
              mcDotNo: bid.carrier?.mc_dot_no || 'N/A',
              email: bid.carrier?.email || 'N/A',
              phone: bid.carrier?.phoneNo || 'N/A',
              state: bid.carrier?.state || 'N/A',
              city: bid.carrier?.city || 'N/A'
            },
            shipperInfo: {
              compName: bid.shipper?.compName || bid.load?.shipper?.compName || 'N/A',
              mc_dot_no: bid.shipper?.mc_dot_no || bid.load?.shipper?.mc_dot_no || 'N/A',
              email: bid.shipper?.email || bid.load?.shipper?.email || 'N/A',
              phoneNo: bid.shipper?.phoneNo || bid.load?.shipper?.phoneNo || 'N/A',
              state: bid.shipper?.state || bid.load?.shipper?.state || 'N/A',
              city: bid.shipper?.city || bid.load?.shipper?.city || 'N/A'
            },
            loadInfo: {
              weight: bid.load?.weight || 0,
              commodity: bid.load?.commodity || 'N/A',
              vehicleType: bid.load?.vehicleType || 'N/A',
              pickupDate: bid.load?.pickupDate || 'N/A',
              deliveryDate: bid.load?.deliveryDate || 'N/A',
              originalRate: bid.load?.rate || 0
            },
            forwardedToManager: bid.forwardedToManager || null,
            negotiationHistory: bid.forwardedToManager?.negotiationHistory || bid.internalNegotiation?.history || []
          };
        });

        setPendingBids(transformedBids);
        setTotalPages(response.data.totalPages || 1);
        setTotalBids(response.data.totalBids || 0);
        setCurrentPage(response.data.currentPage || page);
        
        // Set statistics
        if (response.data.statistics) {
          setStatistics({
            totalPending: response.data.statistics.totalPending || 0,
            totalValue: response.data.statistics.totalValue || 0,
            avgRate: response.data.statistics.avgRate || 0
          });
        }
      } else {
        console.error('Manager pending bids API response format error:', response.data);
        setPendingBids([]);
      }
    } catch (error) {
      console.error('Error fetching manager pending bids:', error);
      alertify.error('Error fetching pending bids');
      setPendingBids([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerPendingBids(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage]);

  // Handle approve/reject action
  const handleApproveReject = async (bidId, status, rejectionReasonText = '') => {
    try {
      setActionSubmitting(true);
      setActionErrors({ rejectionReason: '' });

      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/bid/${bidId}/manager-approve`,
        {
          status: status,
          rejectionReason: rejectionReasonText || ''
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        if (status === 'Approved') {
          alertify.success('✅ Bid approved successfully!');
        } else {
          alertify.success('Bid rejected successfully!');
        }
        
        setActionModal({ visible: false, bid: null, action: null });
        setRejectionReason('');
        
        // Refresh the list
        await fetchManagerPendingBids(currentPage, itemsPerPage);
      } else {
        alertify.error(response.data?.message || 'Failed to process bid');
      }
    } catch (error) {
      console.error('Error approving/rejecting bid:', error);
      const errorMessage = error.response?.data?.message || 'Error processing bid. Please try again.';
      alertify.error(errorMessage);
      
      if (error.response?.status === 400 && status === 'Rejected') {
        setActionErrors({ rejectionReason: errorMessage });
      }
    } finally {
      setActionSubmitting(false);
    }
  };

  // Handle open approve modal
  const handleOpenApproveModal = (bid) => {
    setActionModal({ visible: true, bid, action: 'approve' });
    setRejectionReason('');
    setActionErrors({ rejectionReason: '' });
  };

  // Handle open reject modal
  const handleOpenRejectModal = (bid) => {
    setActionModal({ visible: true, bid, action: 'reject' });
    setRejectionReason('');
    setActionErrors({ rejectionReason: '' });
  };

  // Handle submit approve/reject
  const handleSubmitAction = async () => {
    if (actionModal.action === 'reject') {
      if (!rejectionReason.trim()) {
        setActionErrors({ rejectionReason: 'Rejection reason is required' });
        alertify.error('Please provide a rejection reason');
        return;
      }
      await handleApproveReject(actionModal.bid.rateNum, 'Rejected', rejectionReason.trim());
    } else {
      await handleApproveReject(actionModal.bid.rateNum, 'Approved');
    }
  };

  // Filter bids based on search term
  const filteredBids = pendingBids.filter(bid => {
    return bid.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.truckerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bid.shipperName && bid.shipperName.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle view bid details
  const handleViewBid = (bid) => {
    setSelectedBid(bid);
    setViewDoc(true);
  };

  // Export to CSV function
  const handleExportToCSV = () => {
    try {
      const dataToExport = filteredBids;
      
      if (dataToExport.length === 0) {
        alertify.warning('No data to export');
        return;
      }

      const headers = [
        'Bid ID',
        'Load ID',
        'Shipment Number',
        'Origin',
        'Destination',
        'Original Rate',
        'Current Rate',
        'Threshold Rate',
        'Rate Difference',
        'Rate Diff %',
        'Shipper',
        'Carrier',
        'Forwarded By',
        'Forwarded Date',
        'Forward Reason'
      ];

      const csvContent = [
        headers.join(','),
        ...dataToExport.map(bid => [
          bid.id || '',
          bid.loadId || '',
          `"${bid.shipmentNumber || ''}"`,
          `"${bid.origin || ''}"`,
          `"${bid.destination || ''}"`,
          bid.originalRate || 0,
          bid.currentRate || 0,
          bid.thresholdRate || 0,
          bid.rateDifference || 0,
          `"${bid.rateDifferencePercentage || '0'}%"`,
          `"${bid.shipperName || 'N/A'}"`,
          `"${bid.truckerName || 'N/A'}"`,
          `"${bid.forwardedBy || 'N/A'}"`,
          `"${bid.forwardedAt || 'N/A'}"`,
          `"${bid.forwardReason || 'N/A'}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `manager_pending_bids_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alertify.success('Data exported successfully');
    } catch (error) {
      console.error('Export to CSV error:', error);
      alertify.error('Error exporting data');
    }
  };

  // Loading state
  if (loading && pendingBids.length === 0) {
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

  // Image preview modal
  if (previewImg) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden p-4">
          <img src={previewImg} alt="Document Preview" className="max-h-[80vh] rounded-xl shadow-lg" />
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute left-4 top-4 bg-white p-2 rounded-full shadow hover:bg-blue-100"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Bids */}
          <div className="bg-white rounded-2xl border border border-gray-200 p-4 relative overflow-hidden">
            <div className="flex justify-between items-start h-full flex-col gap-4">
              <div className="text-gray-700 font-medium">Pending Bids</div>
              <div className="flex justify-between items-center w-full">
                <div className="text-2xl font-bold text-gray-900">{statistics.totalPending || pendingBids.length}</div>
                <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
                  <Clock className="text-red-500" size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Total Value */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex justify-between items-start h-full flex-col gap-4">
              <div className="text-gray-700 font-medium">Total Value</div>
              <div className="flex justify-between items-center w-full">
                <div className="text-2xl font-bold text-gray-900">${statistics.totalValue?.toLocaleString() || '0'}</div>
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                  <DollarSign className="text-blue-500" size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Avg Rate */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex justify-between items-start h-full flex-col gap-4">
              <div className="text-gray-700 font-medium">Avg Rate</div>
              <div className="flex justify-between items-center w-full">
                <div className="text-2xl font-bold text-gray-900">${statistics.avgRate?.toLocaleString() || '0'}</div>
                <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center">
                  <DollarSign className="text-purple-500" size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Export Section */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search pending bids..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </div>
          <button
            onClick={handleExportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            <FaDownload size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto p-4">
          <table className="w-full border-separate border-spacing-y-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs whitespace-nowrap first:rounded-l-lg last:rounded-r-lg uppercase tracking-wider">Bid ID</th>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs whitespace-nowrap uppercase tracking-wider">Load ID</th>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs uppercase tracking-wider">Origin</th>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs uppercase tracking-wider">Destination</th>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs whitespace-nowrap uppercase tracking-wider">Original Rate</th>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs whitespace-nowrap uppercase tracking-wider">Current Rate</th>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs whitespace-nowrap uppercase tracking-wider">Threshold</th>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs whitespace-nowrap uppercase tracking-wider">Rate Diff %</th>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs uppercase tracking-wider">Shipper</th>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs uppercase tracking-wider">Carrier</th>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs uppercase tracking-wider">Forwarded By</th>
                <th className="text-left py-4 px-2 text-gray-700 font-bold text-xs whitespace-nowrap first:rounded-l-lg last:rounded-r-lg uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBids.map((bid, index) => {
                const rateDiffPercent = parseFloat(bid.rateDifferencePercentage) || 0;
                const isBelowThreshold = rateDiffPercent < 0;

                return (
                  <tr key={bid.id} className="group">
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200 first:border-l first:rounded-l-lg last:border-r last:rounded-r-lg whitespace-nowrap">
                      <span className="font-medium text-gray-700 text-sm">{bid.id}</span>
                    </td>
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200 whitespace-nowrap">
                      <span className="font-medium text-gray-700 text-sm">{bid.loadId}</span>
                    </td>
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200">
                      <span className="font-medium text-gray-700 text-sm">{bid.origin}</span>
                    </td>
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200">
                      <span className="font-medium text-gray-700 text-sm">{bid.destination}</span>
                    </td>
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200 whitespace-nowrap">
                      <span className="font-medium text-gray-600 text-sm">${bid.originalRate.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200 whitespace-nowrap">
                      <span className="font-bold text-blue-600 text-sm">${bid.currentRate.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200 whitespace-nowrap">
                      <span className="font-medium text-gray-600 text-sm">${bid.thresholdRate.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {isBelowThreshold ? (
                          <TrendingDown className="text-red-500" size={16} />
                        ) : (
                          <TrendingUp className="text-green-500" size={16} />
                        )}
                        <span className={`font-bold text-sm ${isBelowThreshold ? 'text-red-600' : 'text-green-600'}`}>
                          {bid.rateDifferencePercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-700 text-sm">{bid.shipperName}</p>
                        <p className="text-xs text-gray-500 mt-1">MC: {bid.shipperInfo?.mc_dot_no || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-700 text-sm">{bid.truckerName}</p>
                        <p className="text-xs text-gray-500 mt-1">MC: {bid.carrierInfo?.mcDotNo || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-700 text-sm">{bid.forwardedBy}</p>
                        <p className="text-xs text-gray-500 mt-1">{bid.forwardedAt}</p>
                      </div>
                    </td>
                    <td className="py-4 px-2 bg-white border-t border-b border-gray-200 first:border-l first:rounded-l-lg last:border-r last:rounded-r-lg whitespace-nowrap">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleViewBid(bid)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleOpenApproveModal(bid)}
                          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleOpenRejectModal(bid)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center py-4 bg-gray-50 border-t border-gray-200 px-4">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalBids)} of {totalBids} bids
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`px-3 py-1 rounded-lg ${
                    currentPage === i + 1
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {filteredBids.length === 0 && !loading && (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Bids</h3>
          <p className="text-gray-500">There are no bids pending manager approval at this time.</p>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {actionModal.visible && actionModal.bid && (
        <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className={`p-6 text-white ${actionModal.action === 'approve' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-pink-600'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    {actionModal.action === 'approve' ? (
                      <CheckCircle className="text-white" size={24} />
                    ) : (
                      <XCircle className="text-white" size={24} />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {actionModal.action === 'approve' ? 'Approve Bid' : 'Reject Bid'}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {actionModal.action === 'approve' 
                        ? 'Confirm approval of this bid' 
                        : 'Provide reason for rejection'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActionModal({ visible: false, bid: null, action: null });
                    setRejectionReason('');
                    setActionErrors({ rejectionReason: '' });
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Bid Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Bid Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Bid ID:</span>
                    <p className="text-gray-800">{actionModal.bid.id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Load ID:</span>
                    <p className="text-gray-800">{actionModal.bid.loadId}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Origin:</span>
                    <p className="text-gray-800">{actionModal.bid.origin}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Destination:</span>
                    <p className="text-gray-800">{actionModal.bid.destination}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Original Rate:</span>
                    <p className="text-gray-800">${actionModal.bid.originalRate.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Current Rate:</span>
                    <p className="text-gray-800 font-bold">${actionModal.bid.currentRate.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Threshold Rate:</span>
                    <p className="text-gray-800">${actionModal.bid.thresholdRate.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Rate Difference:</span>
                    <p className={`font-bold ${parseFloat(actionModal.bid.rateDifferencePercentage) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {actionModal.bid.rateDifferencePercentage}%
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-600">Forward Reason:</span>
                    <p className="text-gray-800 mt-1">{actionModal.bid.forwardReason}</p>
                  </div>
                </div>
              </div>

              {/* Rejection Reason Input (only for reject) */}
              {actionModal.action === 'reject' && (
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="text-red-600" size={18} />
                    <label className="text-sm font-semibold text-gray-700">
                      Rejection Reason *
                    </label>
                  </div>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      setActionErrors({ rejectionReason: '' });
                    }}
                    rows={4}
                    required
                    className="w-full px-4 py-3 border-2 border-red-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="Please provide a reason for rejecting this bid..."
                  />
                  {actionErrors.rejectionReason && (
                    <p className="mt-2 text-sm text-red-600">{actionErrors.rejectionReason}</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setActionModal({ visible: false, bid: null, action: null });
                    setRejectionReason('');
                    setActionErrors({ rejectionReason: '' });
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 hover:border-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAction}
                  disabled={actionSubmitting}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed ${
                    actionModal.action === 'approve'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
                  }`}
                >
                  {actionSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </span>
                  ) : (
                    actionModal.action === 'approve' ? 'Approve Bid' : 'Reject Bid'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bid Details Modal */}
      {viewDoc && selectedBid && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="text-yellow-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Pending Bid Details</h2>
                  <p className="text-yellow-600">Bid ID: {selectedBid.id}</p>
                </div>
              </div>
              <button
                onClick={() => setViewDoc(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Bid Details */}
              <div className="border rounded-2xl p-6 bg-gradient-to-br from-yellow-50 to-white shadow">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="text-yellow-500" size={20} />
                  <h3 className="text-lg font-bold text-yellow-700">Bid Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User size={16} />
                    <span className="font-medium">Carrier:</span> {selectedBid.truckerName}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <FileText size={16} />
                    <span className="font-medium">MC/DOT:</span> {selectedBid.carrierInfo?.mcDotNo || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail size={16} />
                    <span className="font-medium">Email:</span> {selectedBid.carrierInfo?.email || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone size={16} />
                    <span className="font-medium">Phone:</span> {selectedBid.carrierInfo?.phone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin size={16} />
                    <span className="font-medium">Origin:</span> {selectedBid.origin}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin size={16} />
                    <span className="font-medium">Destination:</span> {selectedBid.destination}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <DollarSign size={16} />
                    <span className="font-medium">Original Rate:</span> ${selectedBid.originalRate.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <DollarSign size={16} />
                    <span className="font-medium">Current Rate:</span> 
                    <span className="font-bold text-blue-600">${selectedBid.currentRate.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <DollarSign size={16} />
                    <span className="font-medium">Threshold Rate:</span> ${selectedBid.thresholdRate.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <FileText size={16} />
                    <span className="font-medium">Rate Difference:</span> 
                    <span className={`font-bold ${parseFloat(selectedBid.rateDifferencePercentage) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${selectedBid.rateDifference} ({selectedBid.rateDifferencePercentage}%)
                    </span>
                  </div>
                  {selectedBid.message && (
                    <div className="flex items-start gap-2 text-gray-700">
                      <FileText size={16} className="mt-1" />
                      <div>
                        <span className="font-medium">Message:</span>
                        <p className="mt-1">{selectedBid.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Shipper Information */}
              <div className="border rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white shadow">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="text-blue-500" size={20} />
                  <h3 className="text-lg font-bold text-blue-700">Shipper Information</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Building size={16} />
                    <span className="font-medium">Company:</span> {selectedBid.shipperName}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <FileText size={16} />
                    <span className="font-medium">MC/DOT:</span> {selectedBid.shipperInfo?.mc_dot_no || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail size={16} />
                    <span className="font-medium">Email:</span> {selectedBid.shipperInfo?.email || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone size={16} />
                    <span className="font-medium">Phone:</span> {selectedBid.shipperInfo?.phoneNo || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin size={16} />
                    <span className="font-medium">Location:</span> {selectedBid.shipperInfo?.city}, {selectedBid.shipperInfo?.state}
                  </div>
                </div>
              </div>
              
              {/* Forward Information */}
              <div className="border rounded-2xl p-6 bg-gradient-to-br from-purple-50 to-white shadow">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="text-purple-500" size={20} />
                  <h3 className="text-lg font-bold text-purple-700">Forward Information</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User size={16} />
                    <span className="font-medium">Forwarded By:</span> {selectedBid.forwardedBy}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar size={16} />
                    <span className="font-medium">Forwarded Date:</span> {selectedBid.forwardedAt}
                  </div>
                  <div className="flex items-start gap-2 text-gray-700">
                    <AlertCircle size={16} className="mt-1" />
                    <div>
                      <span className="font-medium">Reason:</span>
                      <p className="mt-1">{selectedBid.forwardReason}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

