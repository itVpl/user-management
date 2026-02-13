// Employee Feedback Report – List all feedbacks, view detail, accept/reject trainee
import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Loader2,
} from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import {
  getFeedbackReportList,
  getFeedbackReportById,
  acceptTrainee,
  rejectTrainee,
} from '../../services/employeeFeedbackService';

const getStatusBadge = (status) => {
  const s = (status || 'pending').toString().toLowerCase();
  const config = {
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    accepted: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
  };
  const cfg = config[s] || config.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon size={14} />
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
};

const formatDate = (raw) => {
  if (!raw) return '—';
  const d = typeof raw === 'string' ? new Date(raw) : raw;
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const EmployeeFeedbackReport = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [statusFilter, setStatusFilter] = useState(''); // '' = all, or pending | accepted | rejected
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [responseRemark, setResponseRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // 'accept' | 'reject'

  const fetchList = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const params = { page: p, limit: 20 };
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const res = await getFeedbackReportList(params);
      if (res.success && res.data?.feedbacks) {
        setFeedbacks(res.data.feedbacks);
        setPagination(res.pagination || null);
      } else {
        setFeedbacks([]);
        setPagination(null);
      }
    } catch (err) {
      alertify.error(err?.message || 'Failed to load feedback report');
      setFeedbacks([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchList(page);
  }, [page, statusFilter, fetchList]);

  const openDetail = async (id) => {
    if (!id) return;
    setSelectedId(id);
    setShowDetailModal(true);
    setResponseRemark('');
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await getFeedbackReportById(id);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        alertify.error('Failed to load feedback details');
        setShowDetailModal(false);
      }
    } catch (err) {
      alertify.error(err?.message || 'Failed to load feedback details');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedId) return;
    setActionLoading('accept');
    try {
      await acceptTrainee(selectedId, { responseRemark: responseRemark.trim() || undefined });
      alertify.success('Trainee accepted.');
      setShowDetailModal(false);
      setSelectedId(null);
      setDetail(null);
      setResponseRemark('');
      fetchList(page);
    } catch (err) {
      alertify.error(err?.message || 'Failed to accept trainee');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedId) return;
    setActionLoading('reject');
    try {
      await rejectTrainee(selectedId, { responseRemark: responseRemark.trim() || undefined });
      alertify.success('Trainee rejected.');
      setShowDetailModal(false);
      setSelectedId(null);
      setDetail(null);
      setResponseRemark('');
      fetchList(page);
    } catch (err) {
      alertify.error(err?.message || 'Failed to reject trainee');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
        <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 w-[200px]">
            <Filter className="text-gray-400 shrink-0" size={18} />
            <select
              value={statusFilter || 'all'}
              onChange={(e) => {
                const v = e.target.value;
                setStatusFilter(v === 'all' ? '' : v);
                setPage(1);
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Trainee</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Experience</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">English / Comm.</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Dept fit</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Submitted by</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Submitted at</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((fb, idx) => (
                    <tr key={fb._id || idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="text-blue-600" size={16} />
                          </div>
                          <span className="font-medium text-gray-800">{fb.traineeEmployeeFullName || '—'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-700">{fb.experience || '—'}</td>
                      <td className="py-4 px-6 text-gray-700">{fb.englishFrequency} / {fb.communication}</td>
                      <td className="py-4 px-6 text-gray-700">{fb.departmentFit || '—'}</td>
                      <td className="py-4 px-6">{getStatusBadge(fb.status)}</td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        {fb.submittedBy?.employeeName || '—'}
                        {fb.submittedBy?.empId && <span className="text-gray-500"> ({fb.submittedBy.empId})</span>}
                        {fb.submittedBy?.department && <span className="text-gray-500"> • {fb.submittedBy.department}</span>}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">{formatDate(fb.submittedAt)}</td>
                      <td className="py-4 px-6">
                        <button
                          type="button"
                          onClick={() => openDetail(fb._id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1"
                          title="View details / Accept / Reject"
                        >
                          <Eye size={16} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {feedbacks.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No feedbacks found</p>
                <p className="text-gray-400 text-sm">Try changing the status filter</p>
              </div>
            )}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
                <span className="text-sm text-gray-600">
                  Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalCount} total)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {showDetailModal && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4"
          onClick={() => !detailLoading && setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Trainee Feedback Detail</h2>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="text-white hover:text-blue-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-blue-600" />
                </div>
              ) : detail ? (
                <>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Trainee</h3>
                    <p className="font-medium text-gray-800">{detail.traineeEmployeeFullName || '—'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h3 className="text-sm font-bold text-gray-700 mb-1">Experience</h3>
                      <p className="text-gray-800">{detail.experience || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h3 className="text-sm font-bold text-gray-700 mb-1">English</h3>
                      <p className="text-gray-800">{detail.englishFrequency || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h3 className="text-sm font-bold text-gray-700 mb-1">Communication</h3>
                      <p className="text-gray-800">{detail.communication || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h3 className="text-sm font-bold text-gray-700 mb-1">Department fit</h3>
                      <p className="text-gray-800">{detail.departmentFit || '—'}</p>
                    </div>
                  </div>
                  {detail.remark && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h3 className="text-sm font-bold text-gray-700 mb-1">Remark</h3>
                      <p className="text-gray-800">{detail.remark}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Submitted by</h3>
                    <p className="text-sm text-gray-800">
                      {detail.submittedBy?.employeeName || '—'} ({detail.submittedBy?.empId || '—'})
                      {detail.submittedBy?.department && ` • ${detail.submittedBy.department}`}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Submitted at: {formatDate(detail.submittedAt)}</p>
                  </div>
                  {(detail.status === 'accepted' || detail.status === 'rejected') && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h3 className="text-sm font-bold text-gray-700 mb-2">Response</h3>
                      <p className="text-sm text-gray-600">
                        By {detail.respondedBy?.employeeName || detail.respondedBy || '—'} at {formatDate(detail.respondedAt)}
                      </p>
                      {detail.responseRemark && <p className="text-gray-800 mt-1">{detail.responseRemark}</p>}
                    </div>
                  )}
                  {detail.status === 'pending' && (
                    <div className="border-t border-gray-200 pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Response remark (optional for accept, recommended for reject)</label>
                      <textarea
                        value={responseRemark}
                        onChange={(e) => setResponseRemark(e.target.value)}
                        placeholder="e.g. Approved. Can join Sales from next week."
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex gap-2 mt-4">
                        <button
                          type="button"
                          onClick={handleAccept}
                          disabled={actionLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === 'accept' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          Accept trainee
                        </button>
                        <button
                          type="button"
                          onClick={handleReject}
                          disabled={actionLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionLoading === 'reject' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                          Reject trainee
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeFeedbackReport;
