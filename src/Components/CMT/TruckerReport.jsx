import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload, FaEye, FaFileAlt } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, Eye, Search, BarChart3 } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import API_CONFIG from '../../config/api.js';

export default function TruckerReport() {
  const [truckers, setTruckers] = useState([]);
  const [statistics, setStatistics] = useState({
    totalTruckers: 0,
    approvedTruckers: 0,
    rejectedTruckers: 0,
    pendingApproval: 0,
    totalLoads: 0,
    completedLoads: 0,
    pendingLoads: 0,
    totalRevenue: 0
  });
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedTrucker, setSelectedTrucker] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    fetchTruckerReports();
  }, []);

  // Reset to first page when search term, filter, or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchFilter, statusFilter]);

  const fetchTruckerReports = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/truckers`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.data && res.data.success) {
        const truckersData = res.data.data || [];
        setTruckers(truckersData);

        // Calculate statistics from the actual data
        const approvedCount = truckersData.filter(t => t.status === 'approved' || t.status === 'accountant_approved').length;
        const rejectedCount = truckersData.filter(t => t.status === 'rejected').length;
        const pendingCount  = truckersData.filter(t => t.status === 'pending').length;

        setStatistics({
          totalTruckers: truckersData.length,
          approvedTruckers: approvedCount,
          rejectedTruckers: rejectedCount,
          pendingApproval: pendingCount,
          totalLoads: truckersData.reduce((sum, t) => sum + (t.totalLoads || 0), 0),
          completedLoads: truckersData.reduce((sum, t) => sum + (t.completedLoads || 0), 0),
          pendingLoads: truckersData.reduce((sum, t) => sum + (t.pendingLoads || 0), 0),
          totalRevenue: truckersData.reduce((sum, t) => sum + (t.totalRevenue || 0), 0)
        });
      } else {
        console.error('API response format error:', res.data);
        setTruckers([]);
        setStatistics({
          totalTruckers: 0,
          approvedTruckers: 0,
          rejectedTruckers: 0,
          pendingApproval: 0,
          totalLoads: 0,
          completedLoads: 0,
          pendingLoads: 0,
          totalRevenue: 0
        });
      }
    } catch (err) {
      console.error('Error fetching trucker reports:', err);
      setTruckers([]);
      setStatistics({
        totalTruckers: 0,
        approvedTruckers: 0,
        rejectedTruckers: 0,
        pendingApproval: 0,
        totalLoads: 0,
        completedLoads: 0,
        pendingLoads: 0,
        totalRevenue: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      const { userId } = selectedTrucker || {};
      if (!userId) return;

      if (status === 'approved') {
        const response = await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/approval/accountant/${userId}`,
          { approvalReason: reason?.trim() || "Trucker report verified and approved" },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (response.data.success) {
          alertify.success('✅ Trucker report approved successfully!');
        }
      } else if (status === 'rejected') {
        const response = await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/approval/reject/${userId}`,
          { rejectionReason: reason?.trim() || "Trucker report verification failed", step: "accountant_rejection" },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (response.data.success) {
          alertify.error('❌ Trucker report rejected successfully!');
        }
      }
      setModalType(null);
      setReason('');
      setSelectedTrucker(null);
      setViewDoc(false);
      fetchTruckerReports();
    } catch (err) {
      console.error('Status update failed:', err);
      alertify.error(`❌ Error: ${err.response?.data?.message || err.message}`);
    }
  };

  // Helpers
  const statusColor = (status) => {
    if (!status) return 'bg-yellow-100 text-yellow-700';
    if (status === 'approved' || status === 'accountant_approved') return 'bg-green-100 text-green-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (status === 'active') return 'bg-blue-100 text-blue-700';
    if (status === 'inactive') return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
  };

  const handleDocumentPreview = (documentUrl, documentName) => {
    setSelectedDocument({ url: documentUrl, name: documentName });
  };

  const isImageFile = (fileType) => {
    return ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(fileType?.toUpperCase());
  };

  // -------- FILTER + SORT (memoized) --------
  const filteredTruckers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return (truckers || [])
      .filter(trucker => {
        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'approved' && !(trucker.status === 'approved' || trucker.status === 'accountant_approved')) return false;
          if (statusFilter === 'rejected' && trucker.status !== 'rejected') return false;
          if (statusFilter === 'pending'  && trucker.status !== 'pending')  return false;
        }

        // Search filter
        if (!term) return true;

        const comp = trucker.compName?.toLowerCase() || '';
        const email = trucker.email?.toLowerCase() || '';
        const mcDot = trucker.mc_dot_no?.toLowerCase() || '';
        const state = trucker.state?.toLowerCase() || '';
        const city  = trucker.city?.toLowerCase() || '';

        switch (searchFilter) {
          case 'mc_dot':
            return mcDot.includes(term);
          case 'state':
            return state.startsWith(term) || state === term;
          case 'city':
            return city.includes(term);
          case 'all':
          default:
            return (
              comp.includes(term) ||
              email.includes(term) ||
              mcDot.includes(term) ||
              state.includes(term) ||
              city.includes(term)
            );
        }
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [truckers, statusFilter, searchFilter, searchTerm]);

  // -------- PAGINATION derived from FILTERED list (bug fix) --------
  const totalPages = Math.max(1, Math.ceil(filteredTruckers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTruckers = filteredTruckers.slice(startIndex, endIndex);

  // Format currency (reserved for any revenue cells later)
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading trucker reports...</p>
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

  if (modalType) {
    return (
      <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-[400px] relative flex flex-col items-center">
          <button className="absolute right-4 top-2 text-xl hover:text-red-500" onClick={() => setModalType(null)}>×</button>
          <textarea
            className="w-full border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg mb-4"
            rows={5}
            placeholder={`Type reason of ${modalType}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-semibold shadow hover:from-blue-700 hover:to-purple-700 transition"
            onClick={() => handleStatusUpdate(modalType === 'approval' ? 'approved' : 'rejected')}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div
            className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Truck className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Truckers</p>
                <p className="text-xl font-bold text-gray-800">{statistics.totalTruckers}</p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'approved' ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
            onClick={() => setStatusFilter('approved')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-xl font-bold text-green-600">{statistics.approvedTruckers}</p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'rejected' ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
            onClick={() => setStatusFilter('rejected')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-xl font-bold text-red-600">{statistics.rejectedTruckers}</p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{statistics.pendingApproval}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Fields</option>
              <option value="mc_dot">MC/DOT No</option>
              <option value="state">State</option>
              <option value="city">City</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={`Search by ${searchFilter === 'all' ? 'all fields' : searchFilter === 'mc_dot' ? 'MC/DOT No' : searchFilter}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Table with Sticky Header + Scroll */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="relative max-h-[70vh] overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Trucker ID</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Company Name</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">MC/DOT No</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Email</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Phone</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Created</th>
              </tr>
            </thead>
            <tbody>
              {currentTruckers.map((trucker, index) => (
                <tr key={trucker.userId} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{trucker.userId?.slice(-6) || 'N/A'}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-medium text-gray-700">{trucker.compName}</p>
                      <p className="text-sm text-gray-600">{trucker.city}, {trucker.state}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-mono text-sm text-gray-600">{trucker.mc_dot_no}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-sm text-gray-700">{trucker.email}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-sm text-gray-700">{trucker.phoneNo}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusColor(trucker.status)}`}>
                      {(trucker.status === 'approved' || trucker.status === 'accountant_approved') && <CheckCircle size={14} />}
                      {trucker.status === 'rejected' && <XCircle size={14} />}
                      {trucker.status === 'pending' && <Clock size={14} />}
                      {trucker.status === 'approved' ? 'Approved' :
                        trucker.status === 'accountant_approved' ? 'Accountant Approved' :
                        trucker.status === 'rejected' ? 'Rejected' :
                        trucker.status === 'pending' ? 'Pending' :
                        trucker.status || 'Pending'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <p className="text-sm text-gray-800">{new Date(trucker.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">by {trucker.addedBy?.employeeName || 'System'}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTruckers.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No truckers found matching your search' : 'No truckers found'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Truckers will appear here once they register'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredTruckers.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {filteredTruckers.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredTruckers.length)} of {filteredTruckers.length} truckers
            {searchTerm && ` (filtered from ${truckers.length} total)`}
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-1">
              {currentPage > 3 && (
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                  >
                    1
                  </button>
                  {currentPage > 4 && <span className="px-2 text-gray-400">...</span>}
                </>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 7) return true;
                  if (currentPage <= 4) return page <= 5;
                  if (currentPage >= totalPages - 3) return page >= totalPages - 4;
                  return page >= currentPage - 2 && page <= currentPage + 2;
                })
                .map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${currentPage === page
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}
                  >
                    {page}
                  </button>
                ))}

              {currentPage < totalPages - 2 && totalPages > 7 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-2 text-gray-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {selectedDocument && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">{selectedDocument.name}</h3>
              <button
                onClick={() => setSelectedDocument(null)}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              {isImageFile(selectedDocument.url.split('.').pop()) ? (
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.name}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <FaFileAlt className="text-6xl text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Document preview not available</p>
                    <a
                      href={selectedDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                    >
                      Download Document
                    </a>
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
