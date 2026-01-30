import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, CreditCard, Filter, Eye, Calendar, Building, DollarSign, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import API_CONFIG from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CreditLimitRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString()
      });

      if (filters.status) {
        queryParams.append('status', filters.status);
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/credit-limit-requests?${queryParams}`,
        { headers: API_CONFIG.getAuthHeaders() }
      );

      if (response.data.success) {
        setRequests(response.data.data.requests || []);
        setPagination(response.data.data.pagination || pagination);
      } else {
        toast.error(response.data.message || 'Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error fetching credit limit requests:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-800', icon: AlertCircle },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon size={14} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <CreditCard className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-xl font-bold text-gray-800">{pagination.totalItems}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm appearance-none cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-96 bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Requests...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Company Name</th>
                    <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">MC/DOT No</th>
                    <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Current Limit</th>
                    <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Requested Limit</th>
                    <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Submitted At</th>
                    <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Sent By</th>
                    <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <CreditCard className="w-16 h-16 text-gray-300 mb-4" />
                          <p className="text-gray-500 text-lg">No credit limit requests found</p>
                          <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    requests.map((request, idx) => (
                      <tr
                        key={request._id || idx}
                        className={`border-b border-gray-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-purple-50/30`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Building size={16} className="text-gray-400" />
                            <div>
                              <div className="font-semibold text-gray-800">{request.shipperCompanyName || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{request.shipperEmail || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                            {request.shipperId?.mc_dot_no || request.mcDotNo || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-600">
                            {formatCurrency(request.submittedData?.currentCreditLimit)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-blue-600">
                            {formatCurrency(request.submittedData?.requestedCreditLimit)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-sm">
                          {formatDate(request.submittedData?.submittedAt)}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          <div className="text-sm">
                            <div className="font-medium">{request.emailSentBy?.employeeName || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{request.emailSentBy?.department || ''}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleViewDetails(request)}
                            className="px-3 py-1 text-blue-600 text-xs rounded-md transition-colors border border-blue-300 hover:bg-blue-50 flex items-center gap-1"
                          >
                            <Eye size={12} />
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="text-sm text-gray-600">
                Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                {pagination.totalItems} requests
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page >= pagination.totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-2xl p-8 border border-purple-100 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white px-6 py-4 rounded-xl shadow mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <CreditCard size={24} />
                  Credit Limit Request Details
                </h2>
                <p className="text-sm text-purple-100 mt-1">
                  Request ID: {selectedRequest._id}
                </p>
              </div>
              <button
                onClick={closeDetailsModal}
                type="button"
                className="text-white text-3xl hover:text-gray-200"
              >
                <XCircle size={28} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Shipper Information */}
              <div className="bg-purple-50 px-4 py-3 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Building size={18} />
                  Shipper Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Company Name:</strong>
                    <br />
                    <span className="text-gray-700">{selectedRequest.shipperCompanyName || 'N/A'}</span>
                  </div>
                  <div>
                    <strong>MC/DOT No:</strong>
                    <br />
                    <span className="text-gray-700">{selectedRequest.shipperId?.mc_dot_no || selectedRequest.mcDotNo || 'N/A'}</span>
                  </div>
                  <div>
                    <strong>Email:</strong>
                    <br />
                    <span className="text-gray-700">{selectedRequest.shipperEmail || 'N/A'}</span>
                  </div>
                  <div>
                    <strong>Current Credit Limit:</strong>
                    <br />
                    <span className="font-semibold text-purple-600">
                      {formatCurrency(selectedRequest.submittedData?.currentCreditLimit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              {selectedRequest.submittedData && (
                <div className="bg-blue-50 px-4 py-3 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <DollarSign size={18} />
                    Request Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Requested Credit Limit:</strong>
                        <br />
                        <span className="font-semibold text-blue-600 text-lg">
                          {formatCurrency(selectedRequest.submittedData.requestedCreditLimit)}
                        </span>
                      </div>
                      <div>
                        <strong>Business Type:</strong>
                        <br />
                        <span className="text-gray-700">{selectedRequest.submittedData.businessType || 'N/A'}</span>
                      </div>
                      <div>
                        <strong>Years in Business:</strong>
                        <br />
                        <span className="text-gray-700">{selectedRequest.submittedData.yearsInBusiness || 'N/A'}</span>
                      </div>
                      <div>
                        <strong>Annual Revenue:</strong>
                        <br />
                        <span className="text-gray-700">
                          {selectedRequest.submittedData.annualRevenue
                            ? formatCurrency(selectedRequest.submittedData.annualRevenue)
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <strong>Payment Terms:</strong>
                        <br />
                        <span className="text-gray-700">{selectedRequest.submittedData.paymentTerms || 'N/A'}</span>
                      </div>
                      <div>
                        <strong>Submitted At:</strong>
                        <br />
                        <span className="text-gray-700">
                          {formatDate(selectedRequest.submittedData.submittedAt)}
                        </span>
                      </div>
                    </div>
                    {selectedRequest.submittedData.references && (
                      <div>
                        <strong>References:</strong>
                        <br />
                        <span className="text-gray-700">{selectedRequest.submittedData.references}</span>
                      </div>
                    )}
                    {selectedRequest.submittedData.additionalNotes && (
                      <div>
                        <strong>Additional Notes:</strong>
                        <br />
                        <span className="text-gray-700">{selectedRequest.submittedData.additionalNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Email Information */}
              <div className="bg-gray-50 px-4 py-3 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Calendar size={18} />
                  Email Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Sent By:</strong>
                    <br />
                    <span className="text-gray-700">
                      {selectedRequest.emailSentBy?.employeeName || 'N/A'} ({selectedRequest.emailSentBy?.empId || 'N/A'})
                    </span>
                    <br />
                    <span className="text-xs text-gray-500">{selectedRequest.emailSentBy?.department || ''}</span>
                  </div>
                  <div>
                    <strong>Sent At:</strong>
                    <br />
                    <span className="text-gray-700">{formatDate(selectedRequest.emailSentAt)}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center">
                {getStatusBadge(selectedRequest.status)}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
              <button
                onClick={closeDetailsModal}
                className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
    </div>
  );
};

export default CreditLimitRequests;
