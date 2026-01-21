import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload, FaEye, FaFileAlt } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, Eye, Search } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import API_CONFIG from '../../config/api.js';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  fetchTruckers, 
  setCurrentPage,
  selectTruckers,
  selectStatistics,
  selectPagination,
  selectLoading,
  selectError
} from '../../store/slices/carrierApprovalSlice';


export default function CarrierApproval() {
  const dispatch = useAppDispatch();
  const carriers = useAppSelector(selectTruckers);
  const statistics = useAppSelector(selectStatistics);
  const pagination = useAppSelector(selectPagination);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);

  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null); // 'approval' | 'rejection' | null
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const [reason, setReason] = useState('');
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const currentPage = pagination.currentPage;
  const itemsPerPage = pagination.itemsPerPage || 15;


  // Get current user's department
  const getCurrentUserDepartment = () => {
    try {
      const userData = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        return user?.department || null;
      }
    } catch (err) {
      console.error('Error fetching user department:', err);
    }
    return null;
  };


  const currentUserDepartment = useMemo(() => getCurrentUserDepartment(), []);

  // Fetch carriers when page changes
  useEffect(() => {
    dispatch(fetchTruckers({ page: currentPage, limit: itemsPerPage, forceRefresh: false }));
  }, [dispatch, currentPage]);

  // Show error messages
  useEffect(() => {
    if (error) {
      alertify.error(error);
    }
  }, [error]);


  // --- Helpers ---
  const norm = (s) => (s || '').toString().toLowerCase().trim();
  const isApproved = (s) => /approved/i.test(s || '');
  const isRejected = (s) => /rejected/i.test(s || '');
  const isPending  = (s) => !s || /pending/i.test(s);


  const statusColor = (status) => {
    if (isApproved(status)) return 'bg-green-100 text-green-700';
    if (isRejected(status)) return 'bg-red-100 text-red-700';
    if (isPending(status))  return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };


  const getDocumentDisplayName = (docKey) => {
    const displayNames = {
      brokeragePacket: 'Brokerage Packet',
      carrierPartnerAgreement: 'Carrier Partner Agreement',
      w9Form: 'W9 Form',
      mcAuthority: 'MC Authority',
      safetyLetter: 'Safety Letter',
      bankingInfo: 'Banking Information',
      inspectionLetter: 'Inspection Letter',
      insurance: 'Insurance'
    };
    return displayNames[docKey] || docKey;
  };


  const isImageFile = (fileType) => ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes((fileType || '').toUpperCase());


  // --- Search / Filter (client-side filtering on current page) ---
  const filteredCarriers = useMemo(() => {
    if (!searchTerm) return carriers;
    const q = norm(searchTerm);
    return carriers.filter(c =>
      norm(c.compName).includes(q) ||
      norm(c.email).includes(q) ||
      norm(c.mc_dot_no).includes(q)
    );
  }, [carriers, searchTerm]);

  // Use filtered carriers for display
  const currentCarriers = filteredCarriers;

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    dispatch(setCurrentPage(page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  // --- Computed accurate counters from carriers (client-side for current page) ---
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return carriers.filter(c => c?.addedAt && new Date(c.addedAt).toDateString() === today).length;
  }, [carriers]);

  // Computed counts for current page (fallback)
  const computedApproved = useMemo(() => carriers.filter(c => isApproved(c.status)).length, [carriers]);
  const computedRejected = useMemo(() => carriers.filter(c => isRejected(c.status)).length, [carriers]);
  const computedPending = useMemo(() => carriers.filter(c => isPending(c.status)).length, [carriers]);

  // Use statistics from Redux for overall counts, fallback to computed for current page
  const approvedCount = statistics.approvedTruckers || computedApproved;
  const rejectedCount = statistics.rejectedTruckers || computedRejected;
  const pendingCount = statistics.pendingTruckers || computedPending;


  const handleViewCarrier = (carrier) => {
    setSelectedCarrier(carrier);
    setShowCarrierModal(true);
  };


  const handleDocumentPreview = (documentUrl, documentName) => {
    setSelectedDocument({ url: documentUrl, name: documentName });
  };


  // Check if approve/reject buttons should be shown
  const shouldShowActionButtons = (carrierStatus) => {
    const isFinance = currentUserDepartment === "Finance" || currentUserDepartment === "finance";
    const isAccountantApproved = carrierStatus?.toLowerCase() === "accountant_approved";
    const isRejectedStatus = isRejected(carrierStatus);
   
    // If Finance department user and status is rejected (by them), show buttons
    if (isFinance && isRejectedStatus) {
      return true;
    }
   
    // If Finance department user and status is accountant_approved, hide buttons
    if (isFinance && isAccountantApproved) {
      return false;
    }
   
    // For non-Finance users: if status is accountant_approved, show buttons (they can approve/reject)
    if (!isFinance && isAccountantApproved) {
      return true;
    }
   
    // For all other cases, show buttons only if pending
    return isPending(carrierStatus);
  };


  const handleStatusUpdate = async (action) => {
    try {
      if (!selectedCarrier) return;


      // Guard: Check if buttons should be shown (department-based logic)
      if (!shouldShowActionButtons(selectedCarrier.status)) {
        alertify.message('This carrier is already finalized or you do not have permission to perform this action.');
        return;
      }


      // Reject reason mandatory
      if (action === 'rejected' && !reason.trim()) {
        alertify.error('Please enter the reason.');
        return;
      }


      const { userId } = selectedCarrier;
      const isFinance = currentUserDepartment === "Finance" || currentUserDepartment === "finance";


      if (action === 'approved') {
        let apiUrl, payload;
       
        if (isFinance) {
          // Finance department users use accountant approval API (PATCH)
          apiUrl = `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/approval/accountant/${userId}`;
          payload = { approvalReason: reason || 'Documents verified and approved' };
         
          const response = await axios.patch(apiUrl, payload, {
            headers: { 'Content-Type': 'application/json' }
          });
          if (response.data?.success) alertify.success('✅ Carrier approved successfully!');
        } else {
          // Non-Finance department users use manager approval API (PATCH)
          apiUrl = `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/approval/manager/${userId}`;
          payload = { approvalReason: reason || 'Documents verified and approved' };
         
          const response = await axios.patch(apiUrl, payload, {
            headers: { 'Content-Type': 'application/json' }
          });
          if (response.data?.success) alertify.success('✅ Carrier approved successfully!');
        }
      } else if (action === 'rejected') {
        const response = await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/approval/reject/${userId}`,
          {
            rejectionReason: reason.trim(),
            step: 'accountant_rejection'
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (response.data?.success) alertify.error('❌ Carrier rejected successfully!');
      }


      // Cleanup + Refresh
      setModalType(null);
      setReason('');
      setSelectedCarrier(null);
      setViewDoc(false);
      setShowCarrierModal(false);
      // Refresh current page data
      dispatch(fetchTruckers({ page: currentPage, limit: itemsPerPage, forceRefresh: true }));
    } catch (err) {
      console.error('Status update failed:', err);
      alertify.error(`❌ Error: ${err.response?.data?.message || err.message}`);
    }
  };


  // Initial loading state
  if (loading && carriers.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Carriers...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch the information</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading overlay for pagination (no blur)
  const showLoadingOverlay = loading && carriers.length > 0;


  if (previewImg) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center"
        onClick={() => setPreviewImg(null)}
      >
        <div
          className="relative bg-white rounded-2xl shadow-2xl overflow-hidden p-4"
          onClick={(e) => e.stopPropagation()}
        >
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


  // Reason modal
  if (modalType) {
    const label = modalType === 'rejection' ? 'Reason *' : 'Reason (optional)';
    return (
      <div
        className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
        onClick={() => setModalType(null)}
      >
        <div
          className="bg-white p-8 rounded-2xl shadow-2xl w-[420px] relative flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="absolute right-4 top-2 text-xl hover:text-red-500" onClick={() => setModalType(null)}>×</button>
          <label className="text-sm font-semibold mb-2">
            {label}
          </label>
          <textarea
            className="w-full border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg mb-4"
            rows={5}
            placeholder={modalType === 'rejection' ? 'Please enter the reason.' : 'Type reason (optional)'}
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


  // Card counters (use statistics from Redux)
  const totalCarriers = statistics.totalTruckers || carriers.length;


  return (
    <div className="p-6">
      {/* Loading overlay for pagination (no blur) */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold">Loading...</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Truck className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Carriers</p>
                <p className="text-xl font-bold text-gray-800">{totalCarriers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-xl font-bold text-blue-600">{approvedCount}</p>
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
                <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-xl font-bold text-purple-600">{todayCount}</p>
              </div>
            </div>
          </div>
        </div>


        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search carriers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>


      {/* Legacy viewDoc block (kept but actions hidden if finalized) */}
      {viewDoc && selectedCarrier ? (
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-4">
              {shouldShowActionButtons(selectedCarrier.status) && (
                <>
                  <button
                    onClick={() => setModalType('approval')}
                    className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-green-700 text-white px-5 py-2 rounded-full shadow hover:from-green-600 hover:to-green-800 transition"
                  >
                    <CheckCircle size={18} /> Approve
                  </button>
                  <button
                    onClick={() => setModalType('rejection')}
                    className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-700 text-white px-5 py-2 rounded-full shadow hover:from-red-600 hover:to-red-800 transition"
                  >
                    <XCircle size={18} /> Reject
                  </button>
                </>
              )}
            </div>
            {selectedCarrier.docUpload && (
              <a
                href={`${API_CONFIG.BASE_URL}/${selectedCarrier.docUpload}`}
                target="_blank"
                rel="noreferrer"
                className="hover:scale-110 transition-transform"
              >
                <FaDownload className="text-blue-500 text-2xl cursor-pointer" />
              </a>
            )}
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border rounded-2xl p-6 bg-gradient-to-br from-green-50 to-white shadow flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <Building className="text-green-500" size={20} />
                <h3 className="text-lg font-bold text-green-700">Carrier Info</h3>
              </div>
              <div className="flex items-center gap-2 text-gray-700"><User size={16} /> <span className="font-medium">Company:</span> {selectedCarrier.compName}</div>
              <div className="flex items-center gap-2 text-gray-700"><FileText size={16} /> <span className="font-medium">MC/DOT No:</span> {selectedCarrier.mc_dot_no}</div>
              <div className="flex items-center gap-2 text-gray-700"><Mail size={16} /> <span className="font-medium">Email:</span> {selectedCarrier.email}</div>
              <div className="flex items-center gap-2 text-gray-700"><Phone size={16} /> <span className="font-medium">Phone:</span> {selectedCarrier.phoneNo}</div>
              <div className="flex items-center gap-2 text-gray-700"><Truck size={16} /> <span className="font-medium">Carrier Type:</span> {selectedCarrier.carrierType}</div>
              <div className="flex items-center gap-2 text-gray-700"><Calendar size={16} /> <span className="font-medium">Created:</span> {new Date(selectedCarrier.addedAt).toLocaleDateString()}</div>
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2 ${statusColor(selectedCarrier.status)}`}>
                {isApproved(selectedCarrier.status) && <CheckCircle size={14} />}
                {isRejected(selectedCarrier.status) && <XCircle size={14} />}
                {isPending(selectedCarrier.status) && <Clock size={14} />}
                {selectedCarrier.status || 'Pending'}
              </div>
            </div>
            {selectedCarrier.docUpload && (
              <div className="flex flex-col items-center justify-center">
                <img
                  src={`${API_CONFIG.BASE_URL}/${selectedCarrier.docUpload}`}
                  alt="Uploaded Doc"
                  className="rounded-xl shadow-lg max-h-[250px] w-full object-contain border border-green-100 cursor-pointer hover:scale-105 transition"
                  onClick={() => setPreviewImg(`${API_CONFIG.BASE_URL}/${selectedCarrier.docUpload}`)}
                />
                <div className="text-xs text-gray-400 mt-2">Click image to preview</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier ID</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Company Name</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">MC/DOT No</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Email</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Phone</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier Type</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Created</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentCarriers.map((carrier, index) => (
                  <tr key={carrier.userId} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{carrier.userId?.slice(-6) || 'N/A'}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <p className="font-medium text-gray-700">{carrier.compName}</p>
                        <p className="text-sm text-gray-600">{carrier.city}, {carrier.state}</p>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono text-sm text-gray-600">{carrier.mc_dot_no}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-sm text-gray-700">{carrier.email}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-sm text-gray-700">{carrier.phoneNo}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{carrier.carrierType}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusColor(carrier.status)}`}>
                        {isApproved(carrier.status) && <CheckCircle size={14} />}
                        {isRejected(carrier.status) && <XCircle size={14} />}
                        {isPending(carrier.status) && <Clock size={14} />}
                        {carrier.status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <p className="text-sm text-gray-800">{carrier.addedAt ? new Date(carrier.addedAt).toLocaleDateString() : '—'}</p>
                        <p className="text-xs text-gray-500">by {carrier.addedBy?.employeeName || 'System'}</p>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => handleViewCarrier(carrier)}
                        className="bg-transparent text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500/30 transition border border-blue-200"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


          {filteredCarriers.length === 0 && (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No carriers found matching your search' : 'No carriers found'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Carriers will appear here once they register'}
              </p>
            </div>
          )}
        </div>
      )}


      {/* Pagination */}
      {pagination.totalPages > 1 && currentCarriers.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total carriers)
            {searchTerm && ` (${currentCarriers.length} filtered on this page)`}
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-1">
              {/* Always show first page if not near the beginning */}
              {currentPage > 4 && pagination.totalPages > 7 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    1
                  </button>
                  {currentPage > 5 && (
                    <span className="px-2 text-gray-500">...</span>
                  )}
                </>
              )}

              {/* Show page numbers around current page */}
              {(() => {
                const pages = [];
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(pagination.totalPages, currentPage + 2);

                // Adjust if we're near the beginning
                if (currentPage <= 3) {
                  startPage = 1;
                  endPage = Math.min(5, pagination.totalPages);
                }

                // Adjust if we're near the end
                if (currentPage >= pagination.totalPages - 2) {
                  startPage = Math.max(1, pagination.totalPages - 4);
                  endPage = pagination.totalPages;
                }

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(i);
                }

                return pages.map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                ));
              })()}

              {/* Always show last page if not near the end */}
              {currentPage < pagination.totalPages - 3 && pagination.totalPages > 7 && (
                <>
                  {currentPage < pagination.totalPages - 4 && (
                    <span className="px-2 text-gray-500">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    {pagination.totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
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


      {/* Carrier Details Modal (primary) */}
      {showCarrierModal && selectedCarrier && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowCarrierModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Truck className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedCarrier.compName}</h2>
                    <p className="text-blue-100">Carrier Details</p>
                  </div>
                </div>
                <button onClick={() => setShowCarrierModal(false)} className="text-white hover:text-gray-200 text-2xl font-bold">×</button>
              </div>
            </div>


            <div className="p-6 space-y-6">
              {/* Company & Contact */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Company Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <InfoRow icon={<Building className="text-blue-600" size={16} />} label="Company Name" value={selectedCarrier.compName} />
                  <InfoRow icon={<FileText className="text-green-600" size={16} />} label="MC/DOT Number" value={selectedCarrier.mc_dot_no} />
                  <InfoRow icon={<Mail className="text-green-600" size={16} />} label="Email Address" value={selectedCarrier.email} />
                  <InfoRow icon={<Phone className="text-green-600" size={16} />} label="Phone Number" value={selectedCarrier.phoneNo} />
                  <InfoRow icon={<Truck className="text-orange-600" size={16} />} label="Carrier Type" value={selectedCarrier.carrierType} />
                  <InfoRow icon={<Truck className="text-orange-600" size={16} />} label="Fleet Size" value={`${selectedCarrier.fleetsize || 0} trucks`} />
                  <InfoRow icon={<Calendar className="text-gray-600" size={16} />} label="Registration Date" value={selectedCarrier.addedAt ? new Date(selectedCarrier.addedAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : '—'} />
                </div>
                <div className="mt-4">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${statusColor(selectedCarrier.status)}`}>
                    {isApproved(selectedCarrier.status) && <CheckCircle size={14} />}
                    {isRejected(selectedCarrier.status) && <XCircle size={14} />}
                    {isPending(selectedCarrier.status) && <Clock size={14} />}
                    {selectedCarrier.status || 'Pending'}
                  </span>
                </div>
              </div>


              {/* Address */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="text-purple-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Address Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <InfoRow icon={<MapPin className="text-purple-600" size={16} />} label="City" value={selectedCarrier.city} />
                  <InfoRow icon={<MapPin className="text-purple-600" size={16} />} label="State" value={selectedCarrier.state} />
                  <InfoRow icon={<MapPin className="text-purple-600" size={16} />} label="Country" value={selectedCarrier.country} />
                </div>
              </div>


              {/* Documents */}
              {selectedCarrier.documents && Object.keys(selectedCarrier.documents).length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Uploaded Documents</h3>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {selectedCarrier.documentCount || Object.keys(selectedCarrier.documents).length} documents
                    </span>
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(selectedCarrier.documents).map(([docKey, docUrl]) => (
                      <div key={docKey} className="bg-white rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="text-green-600" size={16} />
                            <span className="font-medium text-sm text-gray-800">
                              {getDocumentDisplayName(docKey)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {docUrl.split('.').pop()?.toUpperCase() || 'FILE'}
                          </span>
                        </div>


                        <div className="space-y-2">
                          <div className="text-xs text-gray-600 truncate">
                            {docUrl.split('/').pop()}
                          </div>


                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDocumentPreview(docUrl, getDocumentDisplayName(docKey))}
                              className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition"
                            >
                              <Eye size={12} />
                              Preview
                            </button>
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-600 transition"
                            >
                              <FaDownload size={10} />
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Status reason / timestamps */}
              {(selectedCarrier.statusReason || selectedCarrier.statusUpdatedAt) && (
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Status Information</h3>
                  </div>
                  <div className="space-y-3">
                    {selectedCarrier.statusReason && (
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-sm text-gray-600 mb-1">Status Reason:</p>
                        <p className="text-sm text-gray-800">{selectedCarrier.statusReason}</p>
                      </div>
                    )}
                    {selectedCarrier.statusUpdatedAt && (
                      <div className="text-xs text-gray-500">
                        Last updated: {new Date(selectedCarrier.statusUpdatedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Action Buttons – show based on department and status */}
              {shouldShowActionButtons(selectedCarrier.status) ? (
                <div className="flex gap-4 justify-center pt-2">
                  <button
                    onClick={() => setModalType('approval')}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-semibold"
                  >
                    <CheckCircle size={18} />
                    Approve
                  </button>
                  <button
                    onClick={() => setModalType('rejection')}
                    className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-semibold"
                  >
                    <XCircle size={18} />
                    Reject
                  </button>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-600 font-medium">
                  This carrier is already <span className="capitalize">{selectedCarrier.status}</span>. Approve/Reject options are hidden.
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {selectedDocument && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
          onClick={() => setSelectedDocument(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
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


// Small presentational row
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-white rounded-full border flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="font-semibold text-gray-800">{value || '—'}</p>
      </div>
    </div>
  );
}



