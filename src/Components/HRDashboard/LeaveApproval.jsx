import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search, 
  Filter,
  Download,
  Eye,
  FileText,
  Mail,
  Phone,
  MapPin,
  Building,
  DollarSign,
  Truck,
  PlusCircle,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

const LeaveApproval = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);

  // Fetch leave requests
  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://vpl-liveproject-1.onrender.com/api/v1/leave/all', {
        withCredentials: true
      });

      if (response.data && response.data.leaves) {
        setLeaveRequests(response.data.leaves);
      } else {
        setLeaveRequests([]);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      alertify.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  // Handle leave approval/rejection
  const handleLeaveAction = async (leaveId, action, remarks = '') => {
    setActionLoading(prev => ({ ...prev, [leaveId]: action }));
    
    try {
      const response = await axios.put(
        `https://vpl-liveproject-1.onrender.com/api/v1/leave/${leaveId}/${action}`,
        { remarks },
        { withCredentials: true }
      );

      if (response.data.success) {
        alertify.success(`Leave ${action} successfully`);
        await fetchLeaveRequests(); // Refresh data
      } else {
        alertify.error(response.data.message || `Failed to ${action} leave`);
      }
    } catch (error) {
      console.error(`Error ${action}ing leave:`, error);
      alertify.error(`Error ${action}ing leave. Please try again.`);
    } finally {
      setActionLoading(prev => ({ ...prev, [leaveId]: null }));
    }
  };

  // Status badge component
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
      cancelled: { color: 'bg-gray-100 text-gray-700', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon size={14} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Filter and search
  const filteredLeaves = leaveRequests.filter(leave => {
    const matchesSearch = 
      leave.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.leaveType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLeaves.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentLeaves = filteredLeaves.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate leave duration
  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading leave requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Leave Requests</p>
                <p className="text-xl font-bold text-gray-800">{leaveRequests.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-xl font-bold text-yellow-600">
                  {leaveRequests.filter(leave => leave.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-xl font-bold text-green-600">
                  {leaveRequests.filter(leave => leave.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-xl font-bold text-red-600">
                  {leaveRequests.filter(leave => leave.status === 'rejected').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by employee name, leave type, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={18} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Employee</th>
                <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Leave Type</th>
                <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Duration</th>
                <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Reason</th>
                <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Applied On</th>
                <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentLeaves.map((leave, index) => (
                <tr key={leave._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="text-blue-600" size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{leave.employeeName || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{leave.employeeId || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium text-gray-700">{leave.leaveType || 'N/A'}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-gray-700">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {calculateDuration(leave.startDate, leave.endDate)} days
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-gray-700 max-w-xs truncate" title={leave.reason}>
                      {leave.reason || 'N/A'}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    {getStatusBadge(leave.status)}
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm text-gray-600">{formatDate(leave.createdAt)}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedLeave(leave);
                          setShowDetailsModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      
                      {leave.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleLeaveAction(leave._id, 'approve')}
                            disabled={actionLoading[leave._id]}
                            className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                              actionLoading[leave._id] === 'approve'
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            {actionLoading[leave._id] === 'approve' ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <CheckCircle size={12} />
                            )}
                            Approve
                          </button>
                          
                          <button
                            onClick={() => handleLeaveAction(leave._id, 'reject')}
                            disabled={actionLoading[leave._id]}
                            className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                              actionLoading[leave._id] === 'reject'
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                          >
                            {actionLoading[leave._id] === 'reject' ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <XCircle size={12} />
                            )}
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {currentLeaves.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm || statusFilter !== 'all' 
                ? 'No leave requests found matching your criteria' 
                : 'No leave requests found'}
            </p>
            <p className="text-gray-400 text-sm">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Leave requests will appear here when employees submit them'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredLeaves.length)} of {filteredLeaves.length} requests
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ArrowLeft size={16} />
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    currentPage === page
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Next
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Leave Details Modal */}
      {showDetailsModal && selectedLeave && (
        <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Calendar className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Leave Request Details</h2>
                    <p className="text-blue-100">Employee leave application information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Employee Information */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <User className="text-blue-600" size={18} />
                  <h3 className="text-lg font-bold text-blue-700">Employee Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Name</p>
                    <p className="text-gray-800">{selectedLeave.employeeName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Employee ID</p>
                    <p className="text-gray-800">{selectedLeave.employeeId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Department</p>
                    <p className="text-gray-800">{selectedLeave.department || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Position</p>
                    <p className="text-gray-800">{selectedLeave.position || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Leave Details */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="text-green-600" size={18} />
                  <h3 className="text-lg font-bold text-green-700">Leave Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Leave Type</p>
                    <p className="text-gray-800">{selectedLeave.leaveType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Duration</p>
                    <p className="text-gray-800">
                      {calculateDuration(selectedLeave.startDate, selectedLeave.endDate)} days
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Start Date</p>
                    <p className="text-gray-800">{formatDate(selectedLeave.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">End Date</p>
                    <p className="text-gray-800">{formatDate(selectedLeave.endDate)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-600">Reason</p>
                    <p className="text-gray-800">{selectedLeave.reason || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="text-purple-600" size={18} />
                  <h3 className="text-lg font-bold text-purple-700">Status & Actions</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Current Status</p>
                    {getStatusBadge(selectedLeave.status)}
                  </div>
                  
                  {selectedLeave.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleLeaveAction(selectedLeave._id, 'approve');
                          setShowDetailsModal(false);
                        }}
                        disabled={actionLoading[selectedLeave._id]}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                          actionLoading[selectedLeave._id] === 'approve'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        {actionLoading[selectedLeave._id] === 'approve' ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Approve
                      </button>
                      
                      <button
                        onClick={() => {
                          handleLeaveAction(selectedLeave._id, 'reject');
                          setShowDetailsModal(false);
                        }}
                        disabled={actionLoading[selectedLeave._id]}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                          actionLoading[selectedLeave._id] === 'reject'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        {actionLoading[selectedLeave._id] === 'reject' ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <XCircle size={16} />
                        )}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveApproval; 