import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTruck, FaBox, FaCalendar, FaClock, FaUser, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaSearch, FaEdit, FaEye } from 'react-icons/fa';
import API_CONFIG from '../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function Consignment() {
  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedConsignment, setSelectedConsignment] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch consignments from API
  const fetchConsignments = async () => {
    try {
      setLoading(true);
      
      // Get authentication token
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      console.log('Token:', token); // Debug token
      
      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      // Fetch data from the new API endpoint for CMT assigned loads
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/cmt-assigned-loads/VPL003`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
        // Removed withCredentials to avoid CORS issues
      });

      console.log('API Response:', response); // Debug response
      console.log('Response Data:', response.data); // Debug response data

      // Check if response has data property
      if (response.data && response.data.success) {
        const assignedLoads = response.data.data?.assignedLoads || [];
        console.log('Assigned Loads:', assignedLoads); // Debug assigned loads
        
        if (Array.isArray(assignedLoads)) {
          const transformedData = assignedLoads.map((assignedLoad, index) => {
            const load = assignedLoad.load;
            const acceptedTrucker = load.truckers?.find(trucker => trucker.status === 'Accepted') || load.truckers?.[0];
            
            return {
              id: assignedLoad._id || index,
              sNo: index + 1,
              shipmentNo: load.shipmentNumber || 'N/A',
              shipperName: load.shipper?.compName || 'N/A',
              truckerName: acceptedTrucker?.carrier?.compName || load.carrier?.compName || 'N/A',
              driverName: acceptedTrucker?.driverName || 'N/A',
              vehicleNo: acceptedTrucker?.vehicleNumber || 'N/A',
              status: load.status || assignedLoad.overallStatus || 'N/A',
              pickupAddress: load.origin?.city || 'N/A',
              deliveryAddress: load.destination?.city || 'N/A',
              dropLocationImages: {},
              containerImages: [],
              eirTickets: [],
              emptyTruckImages: [],
              createdAt: assignedLoad.createdAt || new Date().toISOString().split('T')[0],
              // Additional data for detailed view
              loadDetails: {
                weight: load.weight,
                commodity: load.commodity,
                vehicleType: load.vehicleType,
                pickupDate: load.pickupDate,
                deliveryDate: load.deliveryDate,
                rate: load.rate,
                truckers: load.truckers || []
              }
            };
          });

          console.log('Transformed Data:', transformedData); // Debug transformed data
          setConsignments(transformedData);
        } else {
          console.log('Assigned Loads is not an array:', assignedLoads);
          alertify.error('API returned data is not in expected format');
        }
      } else {
        console.log('Unexpected response structure:', response.data);
        console.log('Response data type:', typeof response.data);
        console.log('Response data keys:', Object.keys(response.data || {}));
        alertify.error('Unexpected response structure from API');
      }
    } catch (error) {
      console.error('Error fetching loads:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        alertify.error(`Error: ${error.response.data?.message || `HTTP ${error.response.status}`}`);
      } else if (error.request) {
        console.error('Request error:', error.request);
        alertify.error('Network error. Please check your connection.');
      } else {
        console.error('Other error:', error.message);
        alertify.error(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsignments();
  }, []);

  // Handle view pickup details
  const handleViewPickup = (consignment) => {
    setSelectedConsignment({
      ...consignment,
      viewType: 'pickup'
    });
    setShowViewModal(true);
  };

  // Handle view drop details
  const handleViewDrop = (consignment) => {
    setSelectedConsignment({
      ...consignment,
      viewType: 'drop'
    });
    setShowViewModal(true);
  };

  // Filter consignments based on search term and sort by creation date (latest first - LIFO)
  const filteredConsignments = consignments
    .filter(consignment =>
      consignment.shipmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consignment.truckerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consignment.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consignment.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consignment.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consignment.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination calculations
  const totalPages = Math.ceil(filteredConsignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentConsignments = filteredConsignments.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'in_transit': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'delivered': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      case 'assigned': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'active': return 'bg-green-100 text-green-800 border border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Consignment Management</h1>
      </div>

      {/* Stats and Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaBox className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Consignments</p>
                <p className="text-xl font-bold text-gray-800">{consignments.length}</p>
              </div>
            </div>
          </div>
                     <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                 <FaTruck className="text-blue-600" size={20} />
               </div>
               <div>
                 <p className="text-sm text-gray-600">Assigned</p>
                 <p className="text-xl font-bold text-blue-600">{consignments.filter(c => c.status?.toLowerCase() === 'assigned').length}</p>
               </div>
             </div>
           </div>
                       <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <FaTruck className="text-orange-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">In Transit</p>
                  <p className="text-xl font-bold text-orange-600">{consignments.filter(c => c.status?.toLowerCase() === 'in transit').length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <FaCheckCircle className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivered</p>
                  <p className="text-xl font-bold text-green-600">{consignments.filter(c => c.status?.toLowerCase() === 'delivered').length}</p>
                </div>
              </div>
            </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search consignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Consignments Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading consignments...</p>
            <p className="text-gray-400 text-sm">Please wait while we fetch the data</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                                 <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                   <tr>
                     <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">S.No</th>
                     <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Shipment Number</th>
                     <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Trucker</th>
                     <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Driver</th>
                     <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Vehicle Number</th>
                     <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Origin</th>
                     <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Destination</th>
                     <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                     <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Pickup</th>
                     <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Drop</th>
                   </tr>
                 </thead>
                <tbody>
                                     {currentConsignments.map((consignment, index) => (
                     <tr key={consignment.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                       <td className="py-2 px-3">
                         <span className="font-medium text-gray-700">{consignment.sNo}</span>
                       </td>
                       <td className="py-2 px-3">
                         <span className="font-medium text-gray-700">{consignment.shipmentNo}</span>
                       </td>
                       <td className="py-2 px-3">
                         <span className="font-medium text-gray-700">{consignment.truckerName}</span>
                       </td>
                       <td className="py-2 px-3">
                         <span className="font-medium text-gray-700">{consignment.driverName}</span>
                       </td>
                       <td className="py-2 px-3">
                         <span className="font-medium text-gray-700">{consignment.vehicleNo}</span>
                       </td>
                       <td className="py-2 px-3">
                         <span className="font-medium text-gray-700 text-sm">{consignment.pickupAddress}</span>
                       </td>
                       <td className="py-2 px-3">
                         <span className="font-medium text-gray-700 text-sm">{consignment.deliveryAddress}</span>
                       </td>
                       <td className="py-2 px-3">
                         <span className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusColor(consignment.status)}`}>
                           {consignment.status.replace('_', ' ')}
                         </span>
                       </td>
                       <td className="py-2 px-3">
                         <button
                           onClick={() => handleViewPickup(consignment)}
                           disabled={viewLoading}
                           className={`px-3 py-1 text-blue-600 text-xs rounded-md transition-colors border border-blue-300 hover:bg-blue-50 ${
                             viewLoading 
                               ? 'opacity-50 cursor-not-allowed' 
                               : ''
                           }`}
                         >
                           {viewLoading ? 'Loading...' : 'View'}
                         </button>
                       </td>
                       <td className="py-2 px-3">
                         <button
                           onClick={() => handleViewDrop(consignment)}
                           disabled={viewLoading}
                           className={`px-3 py-1 text-green-600 text-xs rounded-md transition-colors border border-green-300 hover:bg-green-50 ${
                             viewLoading 
                               ? 'opacity-50 cursor-not-allowed' 
                               : ''
                           }`}
                         >
                           {viewLoading ? 'Loading...' : 'View'}
                         </button>
                       </td>
                     </tr>
                   ))}
                </tbody>
              </table>
            </div>
            {filteredConsignments.length === 0 && (
              <div className="text-center py-12">
                <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm ? 'No consignments found matching your search' : 'No consignments found'}
                </p>
                <p className="text-gray-400 text-sm">
                  {searchTerm ? 'Try adjusting your search terms' : 'No consignments available'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredConsignments.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredConsignments.length)} of {filteredConsignments.length} consignments
            {searchTerm && ` (filtered from ${consignments.length} total)`}
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
                className={`px-3 py-2 border rounded-lg transition-colors ${currentPage === page
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

      {/* View Details Modal */}
      {showViewModal && selectedConsignment && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaEye className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {selectedConsignment.viewType === 'pickup' ? 'Pickup Details' : 'Drop Details'}
                    </h2>
                    <p className="text-blue-100">
                      {selectedConsignment.viewType === 'pickup' ? 'View pickup information' : 'View delivery information'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Load Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Load ID:</strong> {selectedConsignment.shipmentNo}</p>
                    <p><strong>Shipper Name:</strong> {selectedConsignment.shipperName}</p>
                    <p><strong>Trucker Name:</strong> {selectedConsignment.truckerName}</p>
                    <p><strong>Driver Name:</strong> {selectedConsignment.driverName}</p>
                    <p><strong>Vehicle No:</strong> {selectedConsignment.vehicleNo}</p>
                    <p><strong>Status:</strong> 
                      <span className={`ml-2 text-white text-xs px-2 py-1 rounded-full ${getStatusColor(selectedConsignment.status)}`}>
                        {selectedConsignment.status}
                      </span>
                    </p>
                    {selectedConsignment.loadDetails && (
                      <>
                        <p><strong>Weight:</strong> {selectedConsignment.loadDetails.weight} lbs</p>
                        <p><strong>Commodity:</strong> {selectedConsignment.loadDetails.commodity}</p>
                        <p><strong>Vehicle Type:</strong> {selectedConsignment.loadDetails.vehicleType}</p>
                        <p><strong>Rate:</strong> ${selectedConsignment.loadDetails.rate}</p>
                        <p><strong>Pickup Date:</strong> {new Date(selectedConsignment.loadDetails.pickupDate).toLocaleDateString()}</p>
                        <p><strong>Delivery Date:</strong> {new Date(selectedConsignment.loadDetails.deliveryDate).toLocaleDateString()}</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {selectedConsignment.viewType === 'pickup' ? 'Origin (Pickup)' : 'Destination (Drop)'}
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-gray-700 font-medium">
                      {selectedConsignment.viewType === 'pickup' 
                        ? selectedConsignment.pickupAddress 
                        : selectedConsignment.deliveryAddress
                      }
                    </p>
                    {selectedConsignment.viewType === 'drop' && selectedConsignment.dropLocationImages && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Drop Location Images:</h4>
                        <div className="space-y-2">
                          {selectedConsignment.dropLocationImages.podImages && selectedConsignment.dropLocationImages.podImages.length > 0 && (
                            <p className="text-xs text-gray-600">POD Images: {selectedConsignment.dropLocationImages.podImages.length}</p>
                          )}
                          {selectedConsignment.dropLocationImages.loadedTruckImages && selectedConsignment.dropLocationImages.loadedTruckImages.length > 0 && (
                            <p className="text-xs text-gray-600">Loaded Truck Images: {selectedConsignment.dropLocationImages.loadedTruckImages.length}</p>
                          )}
                          {selectedConsignment.dropLocationImages.dropLocationImages && selectedConsignment.dropLocationImages.dropLocationImages.length > 0 && (
                            <p className="text-xs text-gray-600">Drop Location Images: {selectedConsignment.dropLocationImages.dropLocationImages.length}</p>
                          )}
                          {selectedConsignment.dropLocationImages.emptyTruckImages && selectedConsignment.dropLocationImages.emptyTruckImages.length > 0 && (
                            <p className="text-xs text-gray-600">Empty Truck Images: {selectedConsignment.dropLocationImages.emptyTruckImages.length}</p>
                          )}
                          {selectedConsignment.dropLocationImages.notes && (
                            <p className="text-xs text-gray-600">Notes: {selectedConsignment.dropLocationImages.notes}</p>
                          )}
                        </div>
                      </div>
                    )}
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
