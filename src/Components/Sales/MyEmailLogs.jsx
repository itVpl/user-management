import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  FileText
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import API_CONFIG from '../../config/api.js';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const INVALID_EMAIL_PREFIXES = ['info@', 'support@', 'help@', 'contact@'];

const presets = {
  'Today': [new Date(), new Date()],
  'Yesterday': [addDays(new Date(), -1), addDays(new Date(), -1)],
  'Last 7 Days': [addDays(new Date(), -6), new Date()],
  'Last 30 Days': [addDays(new Date(), -29), new Date()],
  'This Month': [
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  ],
  'Last Month': [
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    new Date(new Date().getFullYear(), new Date().getMonth(), 0)
  ]
};

const toYMD = (d) => (d ? format(d, 'yyyy-MM-dd') : '');

export default function MyEmailLogs() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [range, setRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
    key: 'selection'
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const [addForm, setAddForm] = useState({
    email: '',
    purpose: '',
    date: toYMD(new Date())
  });
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [addErrors, setAddErrors] = useState({});
  const [addSubmitting, setAddSubmitting] = useState(false);

  const applyPreset = (label) => {
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setShowPresetMenu(false);
  };

  const fetchEmails = async () => {
    const startDate = toYMD(range.startDate);
    const endDate = toYMD(range.endDate);
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get('/api/v1/sales-executive-target/my-emails', { params });
      const data = res?.data;
      // API returns { success, data: { logs: [...], total, ... } }
      const list = data?.data?.logs ?? data?.logs ?? data?.emails ?? (Array.isArray(data) ? data : []);
      setEmails(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Fetch my emails error:', err);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [range.startDate, range.endDate]);

  const isInvalidRecipientEmail = (email) => {
    const lower = (email || '').toLowerCase().trim();
    return INVALID_EMAIL_PREFIXES.some((prefix) => lower.startsWith(prefix));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const err = {};
    const emailVal = (addForm.email || '').trim();
    if (!emailVal) err.email = 'Recipient email is required';
    else if (isInvalidRecipientEmail(emailVal)) err.email = 'Recipient cannot be info@, support@, help@, contact@';
    if (!(addForm.purpose || '').trim()) err.purpose = 'Purpose is required';
    setAddErrors(err);
    if (Object.keys(err).length) return;

    setAddSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('email', emailVal);
      formData.append('purpose', addForm.purpose.trim());
      formData.append('date', addForm.date || toYMD(new Date()));
      if (screenshotFile) formData.append('screenshot', screenshotFile);

      await api.post('/api/v1/sales-executive-target/log-email', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowAddModal(false);
      setAddForm({ email: '', purpose: '', date: toYMD(new Date()) });
      setScreenshotFile(null);
      setAddErrors({});
      fetchEmails();
    } catch (err) {
      setAddErrors({ submit: err?.response?.data?.message || err?.message || 'Failed to log email' });
    } finally {
      setAddSubmitting(false);
    }
  };

  const openView = (item) => {
    setSelectedEmail(item);
    setShowViewModal(true);
  };

  const getEmailDate = (item) => (item?.date ? (item.date.slice ? item.date.slice(0, 10) : item.date) : item?.createdAt ? (item.createdAt.slice ? item.createdAt.slice(0, 10) : item.createdAt) : '');

  const filteredEmails = emails.filter((item) => {
    const email = (item.email || '').toLowerCase();
    const purpose = (item.purpose || '').toLowerCase();
    const q = searchTerm.trim().toLowerCase();
    if (q && !email.includes(q) && !purpose.includes(q)) return false;
    return true;
  });

  const totalEmails = filteredEmails.length;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayEmails = filteredEmails.filter((item) => getEmailDate(item) === todayStr).length;

  const itemsPerPage = 9;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / itemsPerPage));
  const currentEmails = filteredEmails.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, emails.length]);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {totalEmails}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold">
                Total Emails
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {todayEmails}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold">
                Today
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 w-full xl:w-[350px]">
            <button
              type="button"
              onClick={() => {
                setAddForm({ email: '', purpose: '', date: toYMD(new Date()) });
                setScreenshotFile(null);
                setAddErrors({});
                setShowAddModal(true);
              }}
              className="flex items-center justify-between gap-4 px-6 h-[40px] bg-blue-600 rounded-lg text-white font-semibold hover:bg-blue-700 transition w-full"
            >
              <span>Log Email</span>
              <PlusCircle size={20} />
            </button>
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setShowPresetMenu((v) => !v)}
                className="w-full text-left px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors"
              >
                <span>
                  {range.startDate && range.endDate
                    ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                    : 'Select Date Range'}
                </span>
                <span className="ml-3 text-gray-400">▼</span>
              </button>
              {showPresetMenu && (
                <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-100 bg-white shadow-lg py-1 right-0">
                  <button type="button" onClick={() => setShowPresetMenu(false)} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600">Close</button>
                  <div className="my-1 border-t border-gray-100" />
                  {Object.keys(presets).map((lbl) => (
                    <button key={lbl} type="button" onClick={() => applyPreset(lbl)} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700">{lbl}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search Emails"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
          />
          <Search className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Email</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Purpose</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Date</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Screenshot</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEmails.map((item) => (
                    <tr key={item._id || item.email + item.date} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm text-gray-800">{item.email || '—'}</td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-800">{item.purpose || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-700">{getEmailDate(item) || '—'}</td>
                      <td className="py-4 px-4">
                        {item.screenshot || item.screenshotUrl ? (
                          <a href={item.screenshotUrl || item.screenshot} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            <FileText size={14} /> View
                          </a>
                        ) : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <button type="button" onClick={() => openView(item)} className="px-3 py-1 rounded border border-blue-500 text-blue-600 text-sm font-medium hover:bg-blue-50">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredEmails.length === 0 && (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">{searchTerm ? 'No emails found matching your search' : 'No email logs in this date range'}</p>
                <p className="text-gray-400 text-sm">{searchTerm ? 'Try adjusting your search' : 'Log your first email to get started'}</p>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && filteredEmails.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEmails.length)} of {filteredEmails.length} emails
          </div>
          <div className="flex gap-1 items-center">
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
              <ChevronLeft size={18} /> Previous
            </button>
            <div className="flex items-center gap-1 mx-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" onClick={() => setCurrentPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${currentPage === p ? 'bg-white border border-gray-800 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>{p}</button>
              ))}
            </div>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Log Email Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Log Email</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg ${addErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  placeholder="e.g. client@example.com"
                />
                {addErrors.email && <p className="text-red-600 text-xs mt-1">{addErrors.email}</p>}
                <p className="text-gray-500 text-xs mt-1">info@, support@, help@, contact@ are not allowed.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
                <input
                  type="text"
                  value={addForm.purpose}
                  onChange={(e) => setAddForm((f) => ({ ...f, purpose: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg ${addErrors.purpose ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  placeholder="Brief purpose of the email"
                />
                {addErrors.purpose && <p className="text-red-600 text-xs mt-1">{addErrors.purpose}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={addForm.date}
                  onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot (Image/PDF)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600"
                />
              </div>
              {addErrors.submit && <p className="text-red-600 text-sm">{addErrors.submit}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={addSubmitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {addSubmitting ? 'Saving...' : 'Log Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Email Modal */}
      {showViewModal && selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { setShowViewModal(false); setSelectedEmail(null); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Email Log Details</h3>
              <button type="button" onClick={() => { setShowViewModal(false); setSelectedEmail(null); }} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <p><span className="font-medium text-gray-600">Email:</span> {selectedEmail.email || '—'}</p>
              <p><span className="font-medium text-gray-600">Purpose:</span> {selectedEmail.purpose || '—'}</p>
              <p><span className="font-medium text-gray-600">Date:</span> {getEmailDate(selectedEmail) || '—'}</p>
              {(selectedEmail.screenshot || selectedEmail.screenshotUrl) && (
                <div>
                  <span className="font-medium text-gray-600 block mb-2">Screenshot</span>
                  <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                    {/\.(pdf|PDF)$/.test(selectedEmail.screenshotUrl || selectedEmail.screenshot || '') ? (
                      <a href={selectedEmail.screenshotUrl || selectedEmail.screenshot} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-4 text-blue-600 hover:underline">
                        <FileText size={20} /> Open PDF
                      </a>
                    ) : (
                      <>
                        <img
                          src={selectedEmail.screenshotUrl || selectedEmail.screenshot}
                          alt="Screenshot"
                          className="w-full max-h-[280px] object-contain"
                        />
                        <a href={selectedEmail.screenshotUrl || selectedEmail.screenshot} target="_blank" rel="noreferrer" className="block text-center py-2 text-blue-600 hover:underline text-xs">Open in new tab</a>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6">
              <button type="button" onClick={() => { setShowViewModal(false); setSelectedEmail(null); }} className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
