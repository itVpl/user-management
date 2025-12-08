import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTruck, FaBox, FaCalendar, FaClock, FaUser, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaSearch, FaEdit, FaEye, FaUserCheck } from 'react-icons/fa';
import API_CONFIG from '../../config/api.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  sessionStorage.getItem('authToken') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('token');

// Helper function to format date and time
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  } catch (error) {
    return { date: 'N/A', time: 'N/A' };
  }
};

export default function AssignLoad() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [reassignModal, setReassignModal] = useState({ visible: false, load: null });
  const [cmtUsers, setCmtUsers] = useState([]);
  const [selectedCmtUser, setSelectedCmtUser] = useState('');
  const [reassignDescription, setReassignDescription] = useState('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [cmtUserSearch, setCmtUserSearch] = useState('');
  const [isCmtDropdownOpen, setIsCmtDropdownOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch loads from API
  const fetchLoads = async () => {
    try {
      setLoading(true);
      
      // Get authentication token
      const token = getAuthToken();
      
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }

      // Fetch data from the API endpoint for CMT assigned loads
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/load/cmt/all-loads-with-assignment`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });


      // Check if response has data property
      if (response.data && response.data.success) {
        const loadsData = response.data.data?.loads || [];

        if (Array.isArray(loadsData)) {
          const transformedData = loadsData.map((load, index) => {
            // Log CMT assignment data for debugging
            if (load.cmtAssignment) {

            }
            
            // Helper function to get origin data (check both single object and array)
            const getOriginData = () => {
              if (load.origin && load.origin.city) {
                return { city: load.origin.city, state: load.origin.state };
              }
              if (load.origins && load.origins.length > 0) {
                return { city: load.origins[0].city, state: load.origins[0].state };
              }
              return { city: 'N/A', state: 'N/A' };
            };

            // Helper function to get destination data (check both single object and array)
            const getDestinationData = () => {
              if (load.destination && load.destination.city) {
                return { city: load.destination.city, state: load.destination.state };
              }
              if (load.destinations && load.destinations.length > 0) {
                return { city: load.destinations[0].city, state: load.destinations[0].state };
              }
              return { city: 'N/A', state: 'N/A' };
            };

            const originData = getOriginData();
            const destinationData = getDestinationData();

            return {
              id: load._id || index,
              sNo: index + 1,
              loadId: load._id,
              shipmentNo: load.shipmentNumber || 'N/A',
              shipperName: load.shipper?.compName || 'N/A',
              shipperEmail: load.shipper?.email || 'N/A',
              weight: load.weight || 0,
              commodity: load.commodity || 'N/A',
              vehicleType: load.vehicleType || 'N/A',
              rate: load.rate || 0,
              rateType: load.rateType || 'N/A',
              status: load.status || 'N/A',
              loadType: load.loadType || 'N/A',
              pickupAddress: originData.city,
              pickupState: originData.state,
              deliveryAddress: destinationData.city,
              deliveryState: destinationData.state,
              pickupDate: load.pickupDate,
              deliveryDate: load.deliveryDate,
              createdAt: load.createdAt || new Date().toISOString().split('T')[0],
              updatedAt: load.updatedAt,
              // CMT Assignment details
              assignedTo: load.assignedTo,
              cmtAssignment: load.cmtAssignment || null,
              customerAddedBy: load.customerAddedBy || {},
              createdBy: load.customerAddedBy || load.addedBy || {},
              loadApprovalStatus: load.loadApprovalStatus || 'N/A',
              cmtApprovals: load.cmtApprovals || [],
              approvalExpiry: load.approvalExpiry,
              isExpired: load.isExpired || false
            };
          });

          setLoads(transformedData);
        } else {

          toast.error('API returned data is not in expected format');
        }
      } else {

        toast.error('Unexpected response structure from API');
      }
    } catch (error) {
      console.error('Error fetching loads:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        toast.error(`Error: ${error.response.data?.message || `HTTP ${error.response.status}`}`);
      } else if (error.request) {
        console.error('Request error:', error.request);
        toast.error('Network error. Please check your connection.');
      } else {
        console.error('Other error:', error.message);
        toast.error(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch CMT users from API
  const fetchCmtUsers = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Please login to access this resource');
        return;
      }
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/CMT`,
        { headers }
      );
      setCmtUsers(res.data?.employees || []);
    } catch (error) {
      console.error('Error fetching CMT users:', error);
      if (error.response?.data?.message) toast.error(error.response.data.message);
      else toast.error('Failed to fetch CMT users data');
    }
  };

  useEffect(() => {
    fetchLoads();
    fetchCmtUsers();
  }, []);

  // Close CMT dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCmtDropdownOpen && !event.target.closest('.cmt-dropdown-container')) {
        setIsCmtDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCmtDropdownOpen]);

  // Filter CMT users based on search
  const filteredCmtUsers = React.useMemo(() => {
    if (!cmtUserSearch.trim()) return cmtUsers.filter(user => user.status === 'active');
    return cmtUsers.filter(user => 
      user.status === 'active' && (
        user.employeeName?.toLowerCase().includes(cmtUserSearch.toLowerCase()) ||
        user.empId?.toLowerCase().includes(cmtUserSearch.toLowerCase()) ||
        user.designation?.toLowerCase().includes(cmtUserSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(cmtUserSearch.toLowerCase())
      )
    );
  }, [cmtUsers, cmtUserSearch]);

  // Get selected CMT user name for display
  const selectedCmtUserName = React.useMemo(() => {
    const user = cmtUsers.find(u => u._id === selectedCmtUser);
    return user ? `${user.employeeName} (${user.empId}) - ${user.designation}` : '';
  }, [cmtUsers, selectedCmtUser]);

  const handleCmtUserSelect = (userId, userName) => {
    setSelectedCmtUser(userId);
    setCmtUserSearch(userName);
    setIsCmtDropdownOpen(false);
  };

  // Handle view load details
  const handleViewLoad = (load) => {

    setSelectedLoad(load);
    setShowViewModal(true);
  };

  // Handle Re-Assign
  const handleReAssign = (load) => {
    setReassignModal({ visible: true, load });
    setSelectedCmtUser('');
    setReassignDescription('');
    setCmtUserSearch('');
    setIsCmtDropdownOpen(false);
  };

  const closeReassignModal = () => {
    setReassignModal({ visible: false, load: null });
    setSelectedCmtUser('');
    setReassignDescription('');
    setReassignSubmitting(false);
    setCmtUserSearch('');
    setIsCmtDropdownOpen(false);
  };

  const handleReassignSubmit = async () => {
    if (!selectedCmtUser) {
      toast.error('Please select a CMT user to assign the load to');
      return;
    }

    if (!reassignDescription.trim()) {
      toast.error('Please provide a description for re-assignment');
      return;
    }

    try {
      setReassignSubmitting(true);
      const token = getAuthToken();
      const empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');
      
      if (!token || !empId) {
        toast.error('Missing token or empId. Please log in again.');
        return;
      }

      // Get the selected CMT user details
      const selectedUser = cmtUsers.find(user => user._id === selectedCmtUser);
      if (!selectedUser) {
        toast.error('Selected CMT user not found');
        return;
      }

      // Prepare API payload
      const payload = {
        loadId: reassignModal.load?.loadId || reassignModal.load?._id,
        newCMTEmpId: selectedUser.empId,
        reason: reassignDescription.trim()
      };

      // Make API call to re-assign load
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/cmt-assignments/reassign`,
        payload,
        { 
          headers: { 
            Authorization: `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          } 
        }
      );

      if (response.data.success || response.status === 200) {
        toast.success(`Load re-assigned successfully to ${selectedUser.employeeName}!`);
        
        closeReassignModal();
        
        // Refresh the data immediately and then again after a delay to ensure updated data

        fetchLoads();
        setTimeout(() => {

          fetchLoads();
        }, 2000);
      } else {
        toast.error(response.data.message || 'Failed to re-assign load');
      }

    } catch (error) {
      console.error('Re-assign error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to re-assign load. Please try again.');
      }
    } finally {
      setReassignSubmitting(false);
    }
  };

  // Filter loads based on search term and sort by creation date (latest first - LIFO)
  const filteredLoads = loads
    .filter(load =>
      load.shipmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.shipperName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.shipperEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.commodity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (load.cmtAssignment?.empName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (load.cmtAssignment?.empId || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination calculations
  const totalPages = Math.ceil(filteredLoads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLoads = filteredLoads.slice(startIndex, endIndex);

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
      case 'bidding': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'assigned': return 'bg-green-100 text-green-800 border border-green-200';
      case 'in_transit': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'active': return 'bg-green-100 text-green-800 border border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'approved': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get approval status color
  const getApprovalStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return `$${Number(amount).toLocaleString()}`;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Stats and Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaBox className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Load</p>
                <p className="text-xl font-bold text-gray-800">{loads.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search loads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchLoads}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Loads Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading loads...</p>
            <p className="text-gray-400 text-sm">Please wait while we fetch the data</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-16">S.No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-24">Load ID</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-48">Shipper</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-40">Pickup</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-40">Delivery</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-20">Weight</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-24">Rate</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-24">Status</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-48">CMT Assignment</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-40">Date & Time</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-32">Approval</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-24">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLoads.map((load, index) => (
                    <tr key={load.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{load.sNo}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{load.loadId ? `L-${load.loadId.slice(-5)}` : 'N/A'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <span className="font-medium text-gray-700">{load.shipperName}</span>
                          <p className="text-xs text-gray-500">{load.shipperEmail}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <span className="font-medium text-gray-700 text-sm">{load.pickupAddress}</span>
                          <p className="text-xs text-gray-500">{load.pickupState}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <span className="font-medium text-gray-700 text-sm">{load.deliveryAddress}</span>
                          <p className="text-xs text-gray-500">{load.deliveryState}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{load.weight} lbs</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-green-600">{formatCurrency(load.rate)}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusColor(load.status)}`}>
                          {load.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {load.cmtAssignment ? (
                          <div>
                            <span className="font-medium text-gray-700 text-sm">{load.cmtAssignment.displayName || load.cmtAssignment.empName}</span>
                            <p className="text-xs text-gray-500">{load.cmtAssignment.empId}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not Assigned</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <span className="font-medium text-gray-700 text-sm">{formatDateTime(load.createdAt).date}</span>
                          <p className="text-xs text-gray-500">{formatDateTime(load.createdAt).time}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${getApprovalStatusColor(load.loadApprovalStatus)}`}>
                          {load.loadApprovalStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => handleReAssign(load)}
                          disabled={reassignSubmitting}
                          className={`px-3 py-1 text-orange-600 text-xs rounded-md transition-colors border border-orange-300 hover:bg-orange-50 ${
                            reassignSubmitting 
                              ? 'opacity-50 cursor-not-allowed' 
                              : ''
                          }`}
                        >
                          {reassignSubmitting ? 'Processing...' : 'Re-Assign'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLoads.length === 0 && (
              <div className="text-center py-12">
                <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm ? 'No loads found matching your search' : 'No loads found'}
                </p>
                <p className="text-gray-400 text-sm">
                  {searchTerm ? 'Try adjusting your search terms' : 'No loads available'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredLoads.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredLoads.length)} of {filteredLoads.length} loads
            {searchTerm && ` (filtered from ${loads.length} total)`}
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
      {showViewModal && selectedLoad && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaEye className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Load Details</h2>
                    <p className="text-blue-100">Complete load information and CMT assignment details</p>
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
              {/* Load Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaBox className="text-blue-600" size={16} />
                    Load Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Load ID:</span> {selectedLoad.loadId ? `L-${selectedLoad.loadId.slice(-5)}` : 'N/A'}</div>
                    <div><span className="font-medium">Shipment No:</span> {selectedLoad.shipmentNo}</div>
                    <div><span className="font-medium">Load Type:</span> {selectedLoad.loadType}</div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full font-bold ${getStatusColor(selectedLoad.status)}`}>
                        {selectedLoad.status}
                      </span>
                    </div>
                    <div><span className="font-medium">Weight:</span> {selectedLoad.weight} Kg</div>
                    <div><span className="font-medium">Commodity:</span> {selectedLoad.commodity}</div>
                    <div><span className="font-medium">Vehicle Type:</span> {selectedLoad.vehicleType}</div>
                    <div><span className="font-medium">Rate:</span> {formatCurrency(selectedLoad.rate)}</div>
                    <div><span className="font-medium">Rate Type:</span> {selectedLoad.rateType}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaTruck className="text-green-600" size={16} />
                    Route Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Pickup:</span>
                      <div className="ml-2">
                        <div>{selectedLoad.pickupAddress}</div>
                        <div className="text-gray-500">{selectedLoad.pickupState}</div>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Delivery:</span>
                      <div className="ml-2">
                        <div>{selectedLoad.deliveryAddress}</div>
                        <div className="text-gray-500">{selectedLoad.deliveryState}</div>
                      </div>
                    </div>
                    <div><span className="font-medium">Pickup Date:</span> {formatDate(selectedLoad.pickupDate)}</div>
                    <div><span className="font-medium">Delivery Date:</span> {formatDate(selectedLoad.deliveryDate)}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaUser className="text-purple-600" size={16} />
                    Shipper Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Company:</span> {selectedLoad.shipperName}</div>
                    <div><span className="font-medium">Email:</span> {selectedLoad.shipperEmail}</div>
                    <div><span className="font-medium">Added By:</span> {selectedLoad.customerAddedBy?.empName || 'N/A'}</div>
                    <div><span className="font-medium">Department:</span> {selectedLoad.customerAddedBy?.department || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* CMT Assignment Details */}
              {selectedLoad.cmtAssignment && (
                <div className="bg-blue-50 p-6 rounded-xl mb-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaUserCheck className="text-blue-600" size={20} />
                    CMT Assignment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Assigned To:</span> {selectedLoad.cmtAssignment.displayName || selectedLoad.cmtAssignment.empName}</div>
                      <div><span className="font-medium">Employee ID:</span> {selectedLoad.cmtAssignment.empId}</div>
                      <div><span className="font-medium">Email:</span> {selectedLoad.cmtAssignment.email}</div>
                      <div><span className="font-medium">Department:</span> {selectedLoad.cmtAssignment.department}</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Assigned At:</span> {formatDate(selectedLoad.cmtAssignment.assignedAt)}</div>
                      <div><span className="font-medium">Status:</span> 
                        <span className={`ml-2 text-xs px-2 py-1 rounded-full font-bold ${getStatusColor(selectedLoad.cmtAssignment.status)}`}>
                          {selectedLoad.cmtAssignment.status}
                        </span>
                      </div>
                      <div><span className="font-medium">Approval Status:</span> 
                        <span className={`ml-2 text-xs px-2 py-1 rounded-full font-bold ${getApprovalStatusColor(selectedLoad.loadApprovalStatus)}`}>
                          {selectedLoad.loadApprovalStatus}
                        </span>
                      </div>
                      <div><span className="font-medium">Expiry:</span> {formatDate(selectedLoad.approvalExpiry)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* CMT Approvals */}
              {selectedLoad.cmtApprovals && selectedLoad.cmtApprovals.length > 0 && (
                <div className="bg-green-50 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaCheckCircle className="text-green-600" size={20} />
                    CMT Approvals
                  </h3>
                  <div className="space-y-3">
                    {selectedLoad.cmtApprovals.map((approval, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-green-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">CMT User:</span>
                            <div className="ml-2">
                              <div>{approval.cmtUser?.empName}</div>
                              <div className="text-gray-500">{approval.cmtUser?.empId}</div>
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Action By:</span>
                            <div className="ml-2">
                              <div>{approval.actionBy?.empName}</div>
                              <div className="text-gray-500">{approval.actionBy?.empId}</div>
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Action:</span>
                            <div className="ml-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-bold ${getApprovalStatusColor(approval.status)}`}>
                                {approval.action} - {approval.status}
                              </span>
                              <div className="text-gray-500 mt-1">{formatDate(approval.actionAt)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Re-Assign Modal */}
      {reassignModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-2xl p-8 border border-orange-100">
            <div className="bg-gradient-to-r from-orange-600 to-red-500 text-white px-6 py-4 rounded-xl shadow mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  Re-Assign Load
                </h2>
                <p className="text-sm text-orange-100 mt-1">
                  Select a CMT user to reassign this load
                </p>
              </div>
              <button 
                onClick={closeReassignModal} 
                type="button" 
                className="text-white text-3xl hover:text-gray-200"
              >
                ×
              </button>
            </div>

            {/* Load Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700 bg-orange-50 px-4 py-3 rounded-lg mb-6">
              <div>
                <strong>Load ID:</strong>
                <br />
                {reassignModal.load?.loadId ? `L-${reassignModal.load.loadId.slice(-5)}` : 'N/A'}
              </div>
              <div>
                <strong>Shipper:</strong>
                <br />
                {reassignModal.load?.shipperName || 'N/A'}
              </div>
              <div>
                <strong>Weight:</strong>
                <br />
                {reassignModal.load?.weight || 0} Kg
              </div>
              <div>
                <strong>Rate:</strong>
                <br />
                {formatCurrency(reassignModal.load?.rate || 0)}
              </div>
              <div>
                <strong>Pickup:</strong>
                <br />
                {reassignModal.load?.pickupAddress || 'N/A'}
              </div>
              <div>
                <strong>Drop:</strong>
                <br />
                {reassignModal.load?.deliveryAddress || 'N/A'}
              </div>
              <div>
                <strong>Vehicle:</strong>
                <br />
                {reassignModal.load?.vehicleType || 'N/A'}
              </div>
              <div>
                <strong>Status:</strong>
                <br />
                {reassignModal.load?.status || 'N/A'}
              </div>
            </div>

            {/* CMT User Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Select CMT User <span className="text-red-500">*</span>
              </label>
              <div className="relative cmt-dropdown-container">
                <input
                  type="text"
                  value={cmtUserSearch}
                  onChange={(e) => {
                    setCmtUserSearch(e.target.value);
                    setIsCmtDropdownOpen(true);
                  }}
                  onFocus={() => setIsCmtDropdownOpen(true)}
                  onClick={() => setIsCmtDropdownOpen(true)}
                  placeholder="Search CMT user by name, ID, designation, or email..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {isCmtDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {/* Clear/Unselect option */}
                    {selectedCmtUser && (
                      <div
                        onClick={() => {
                          setSelectedCmtUser('');
                          setCmtUserSearch('');
                          setIsCmtDropdownOpen(false);
                        }}
                        className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 transition-colors duration-150"
                      >
                        <div className="font-medium text-red-600 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Clear Selection
                        </div>
                      </div>
                    )}
                    
                    {filteredCmtUsers.length > 0 ? (
                      filteredCmtUsers.map((user) => (
                        <div
                          key={user._id}
                          onClick={() => handleCmtUserSelect(user._id, `${user.employeeName} (${user.empId}) - ${user.designation}`)}
                          className={`px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                            selectedCmtUser === user._id ? 'bg-orange-50' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900">{user.employeeName}</div>
                          <div className="text-sm text-gray-600">{user.empId} - {user.designation}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        No CMT users found matching "{cmtUserSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {selectedCmtUser && (
                <div className="mt-3 p-3 bg-orange-50 border-2 border-orange-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div className="text-sm text-orange-800">
                        <span className="font-semibold">Selected:</span> {selectedCmtUserName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCmtUser('');
                        setCmtUserSearch('');
                      }}
                      className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-all duration-150"
                      title="Clear Selection"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reassignDescription}
                onChange={(e) => setReassignDescription(e.target.value)}
                rows={4}
                placeholder="Please provide a description for re-assigning this load..."
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={closeReassignModal}
                disabled={reassignSubmitting}
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassignSubmit}
                disabled={reassignSubmitting}
                className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                  reassignSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {reassignSubmitting ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Re-assigning...
                  </div>
                ) : (
                  'Re-Assign Load'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
