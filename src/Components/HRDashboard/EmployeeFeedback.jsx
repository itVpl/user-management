// Employee Feedback – Submit trainee feedback + My submissions
import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
} from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import {
  submitEmployeeFeedback,
  getMyFeedbacks,
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

const initialForm = {
  traineeEmployeeFullName: '',
  experience: '',
  englishFrequency: '',
  communication: '',
  departmentFit: '',
  remark: '',
};

const EmployeeFeedback = () => {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'mySubmissions'
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myPagination, setMyPagination] = useState(null);
  const [myPage, setMyPage] = useState(1);
  const [viewDetail, setViewDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const fetchMyFeedbacks = useCallback(async (page = 1) => {
    try {
      setMyLoading(true);
      const res = await getMyFeedbacks({ page, limit: 10 });
      if (res.success && res.data?.feedbacks) {
        setMyFeedbacks(res.data.feedbacks);
        setMyPagination(res.pagination || null);
      } else {
        setMyFeedbacks([]);
        setMyPagination(null);
      }
    } catch (err) {
      alertify.error(err?.message || 'Failed to load your submissions');
      setMyFeedbacks([]);
      setMyPagination(null);
    } finally {
      setMyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'mySubmissions') fetchMyFeedbacks(myPage);
  }, [activeTab, myPage, fetchMyFeedbacks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { traineeEmployeeFullName, experience, englishFrequency, communication, departmentFit } = form;
    if (!traineeEmployeeFullName?.trim() || !experience?.trim() || !englishFrequency?.trim() || !communication?.trim() || !departmentFit?.trim()) {
      alertify.error('Please fill Trainee name, Experience, English, Communication and Department fit.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await submitEmployeeFeedback(form);
      if (res.success) {
        alertify.success(res.message || 'Feedback submitted successfully.');
        setForm(initialForm);
        setActiveTab('mySubmissions');
        fetchMyFeedbacks(1);
        setMyPage(1);
      } else {
        alertify.error(res.message || 'Failed to submit feedback.');
      }
    } catch (err) {
      alertify.error(err?.message || err.data?.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('submit')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'submit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Send className="w-4 h-4 inline mr-2" />
          Submit Feedback
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mySubmissions')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'mySubmissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          My Submissions
        </button>
      </div>

      {activeTab === 'submit' && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Trainee Feedback</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trainee full name *</label>
              <input
                type="text"
                name="traineeEmployeeFullName"
                value={form.traineeEmployeeFullName}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience *</label>
              <input
                type="text"
                name="experience"
                value={form.experience}
                onChange={handleChange}
                placeholder="e.g. 6 months, 1 year"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">English level / frequency *</label>
              <input
                type="text"
                name="englishFrequency"
                value={form.englishFrequency}
                onChange={handleChange}
                placeholder="e.g. Good, Fair, or 1–5"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Communication *</label>
              <input
                type="text"
                name="communication"
                value={form.communication}
                onChange={handleChange}
                placeholder="e.g. Good, Fair, or scale"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department fit *</label>
              <input
                type="text"
                name="departmentFit"
                value={form.departmentFit}
                onChange={handleChange}
                placeholder="e.g. Sales, HR"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remark (optional)</label>
              <textarea
                name="remark"
                value={form.remark}
                onChange={handleChange}
                placeholder="Additional remark"
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Submit Feedback
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'mySubmissions' && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {myLoading ? (
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
                      <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Submitted at</th>
                      <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myFeedbacks.map((fb, idx) => (
                      <tr key={fb._id || idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="py-4 px-6 font-medium text-gray-800">{fb.traineeEmployeeFullName || '—'}</td>
                        <td className="py-4 px-6 text-gray-700">{fb.experience || '—'}</td>
                        <td className="py-4 px-6 text-gray-700">{fb.englishFrequency} / {fb.communication}</td>
                        <td className="py-4 px-6 text-gray-700">{fb.departmentFit || '—'}</td>
                        <td className="py-4 px-6">{getStatusBadge(fb.status)}</td>
                        <td className="py-4 px-6 text-sm text-gray-600">{formatDate(fb.submittedAt)}</td>
                        <td className="py-4 px-6">
                          <button
                            type="button"
                            onClick={() => { setViewDetail(fb); setShowDetailModal(true); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="View details"
                          >
                            <Eye size={16} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {myFeedbacks.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No submissions yet</p>
                  <p className="text-gray-400 text-sm">Use &quot;Submit Feedback&quot; to add trainee feedback.</p>
                </div>
              )}
              {myPagination && myPagination.totalPages > 1 && (
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
                  <span className="text-sm text-gray-600">
                    Page {myPagination.currentPage} of {myPagination.totalPages} ({myPagination.totalCount} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMyPage((p) => Math.max(1, p - 1))}
                      disabled={!myPagination.hasPrevPage}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setMyPage((p) => p + 1)}
                      disabled={!myPagination.hasNextPage}
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
      )}

      {/* Detail modal */}
      {showDetailModal && viewDetail && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Submission details</h2>
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
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Trainee</h3>
                <p className="font-medium text-gray-800">{viewDetail.traineeEmployeeFullName || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 mb-1">Experience</h3>
                  <p className="text-gray-800">{viewDetail.experience || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 mb-1">English</h3>
                  <p className="text-gray-800">{viewDetail.englishFrequency || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 mb-1">Communication</h3>
                  <p className="text-gray-800">{viewDetail.communication || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 mb-1">Department fit</h3>
                  <p className="text-gray-800">{viewDetail.departmentFit || '—'}</p>
                </div>
              </div>
              {viewDetail.remark && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 mb-1">Remark</h3>
                  <p className="text-gray-800">{viewDetail.remark}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Status</h3>
                {getStatusBadge(viewDetail.status)}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Submitted by</h3>
                <p className="text-sm text-gray-800">
                  {viewDetail.submittedBy?.employeeName || '—'} ({viewDetail.submittedBy?.empId || '—'})
                  {viewDetail.submittedBy?.department && ` • ${viewDetail.submittedBy.department}`}
                </p>
                <p className="text-sm text-gray-600 mt-1">Submitted at: {formatDate(viewDetail.submittedAt)}</p>
              </div>
              {(viewDetail.status === 'accepted' || viewDetail.status === 'rejected') && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 mb-2">Response</h3>
                  <p className="text-sm text-gray-600">
                    By {viewDetail.respondedBy?.employeeName || viewDetail.respondedBy || '—'}
                    {viewDetail.respondedBy?.empId && ` (${viewDetail.respondedBy.empId})`} at {formatDate(viewDetail.respondedAt)}
                  </p>
                  {viewDetail.responseRemark && (
                    <p className="text-gray-800 mt-2 p-2 bg-white rounded border border-gray-200">{viewDetail.responseRemark}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeFeedback;
