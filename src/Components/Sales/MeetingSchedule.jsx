import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  PlusCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Link as LinkIcon
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

const STATUS_OPTIONS = ['scheduled', 'completed', 'cancelled', 'rescheduled'];

export default function MeetingSchedule() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [range, setRange] = useState({ startDate: null, endDate: null, key: 'selection' });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [viewMeetingDetail, setViewMeetingDetail] = useState(null);

  // Form state for Add
  const [addForm, setAddForm] = useState({
    meetingWith: '',
    meetingDate: '',
    meetingTime: '',
    subject: '',
    location: '',
    meetingLink: ''
  });
  const [addErrors, setAddErrors] = useState({});
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Form state for Edit (includes status, rescheduledDate, rescheduledTime)
  const [editForm, setEditForm] = useState({
    meetingWith: '',
    meetingDate: '',
    meetingTime: '',
    subject: '',
    location: '',
    meetingLink: '',
    status: 'scheduled',
    rescheduledDate: '',
    rescheduledTime: ''
  });
  const [editErrors, setEditErrors] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

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

  const applyPreset = (label) => {
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setShowPresetMenu(false);
  };

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/inhouseUser/meetings');
      const list = res?.data?.meetings ?? res?.data?.data ?? res?.data ?? [];
      setMeetings(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Fetch meetings error:', err);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetingById = async (meetingId) => {
    try {
      const res = await api.get(`/api/v1/inhouseUser/meetings/${meetingId}`);
      setViewMeetingDetail(res?.data?.meeting ?? res?.data?.data ?? res?.data ?? null);
    } catch (err) {
      console.error('Fetch meeting by id error:', err);
      setViewMeetingDetail(null);
    }
  };

  const openView = (meeting) => {
    setSelectedMeeting(meeting);
    setViewMeetingDetail(meeting);
    if (meeting?._id) fetchMeetingById(meeting._id);
    setShowViewModal(true);
  };

  const openEdit = (meeting) => {
    setSelectedMeeting(meeting);
    const m = meeting || {};
    setEditForm({
      meetingWith: m.meetingWith ?? '',
      meetingDate: m.meetingDate ? (m.meetingDate.slice ? m.meetingDate.slice(0, 10) : m.meetingDate) : '',
      meetingTime: m.meetingTime ?? '',
      subject: m.subject ?? '',
      location: m.location ?? '',
      meetingLink: m.meetingLink ?? '',
      status: m.status ?? 'scheduled',
      rescheduledDate: m.rescheduledDate ? (m.rescheduledDate.slice ? m.rescheduledDate.slice(0, 10) : m.rescheduledDate) : '',
      rescheduledTime: m.rescheduledTime ?? ''
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!addForm.meetingDate?.trim()) err.meetingDate = 'Date is required';
    if (!addForm.meetingTime?.trim()) err.meetingTime = 'Time is required';
    if (!addForm.subject?.trim()) err.subject = 'Subject is required';
    setAddErrors(err);
    if (Object.keys(err).length) return;

    setAddSubmitting(true);
    try {
      await api.post('/api/v1/inhouseUser/meetings', {
        meetingWith: addForm.meetingWith || undefined,
        meetingDate: addForm.meetingDate,
        meetingTime: addForm.meetingTime,
        subject: addForm.subject.trim(),
        location: addForm.location || undefined,
        meetingLink: addForm.meetingLink || undefined
      });
      setShowAddModal(false);
      setAddForm({ meetingWith: '', meetingDate: '', meetingTime: '', subject: '', location: '', meetingLink: '' });
      setAddErrors({});
      fetchMeetings();
    } catch (err) {
      setAddErrors({ submit: err?.response?.data?.message || err?.message || 'Failed to create meeting' });
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!editForm.meetingDate?.trim()) err.meetingDate = 'Date is required';
    if (!editForm.meetingTime?.trim()) err.meetingTime = 'Time is required';
    if (!editForm.subject?.trim()) err.subject = 'Subject is required';
    if (editForm.status === 'rescheduled') {
      if (!editForm.rescheduledDate?.trim()) err.rescheduledDate = 'Required when status is Rescheduled';
      if (!editForm.rescheduledTime?.trim()) err.rescheduledTime = 'Required when status is Rescheduled';
    }
    setEditErrors(err);
    if (Object.keys(err).length) return;

    setEditSubmitting(true);
    try {
      const payload = {
        meetingWith: editForm.meetingWith || undefined,
        meetingDate: editForm.meetingDate,
        meetingTime: editForm.meetingTime,
        subject: editForm.subject.trim(),
        location: editForm.location || undefined,
        meetingLink: editForm.meetingLink || undefined,
        status: editForm.status
      };
      if (editForm.status === 'rescheduled') {
        payload.rescheduledDate = editForm.rescheduledDate;
        payload.rescheduledTime = editForm.rescheduledTime;
      }
      await api.put(`/api/v1/inhouseUser/meetings/${selectedMeeting._id}`, payload);
      setShowEditModal(false);
      setSelectedMeeting(null);
      fetchMeetings();
    } catch (err) {
      setEditErrors({ submit: err?.response?.data?.message || err?.message || 'Failed to update meeting' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const getMeetingDate = (m) => m?.meetingDate ? (m.meetingDate.slice ? m.meetingDate.slice(0, 10) : m.meetingDate) : '';
  const getRescheduledDate = (m) => m?.rescheduledDate ? (m.rescheduledDate.slice ? m.rescheduledDate.slice(0, 10) : m.rescheduledDate) : '';

  const filteredMeetings = meetings.filter((m) => {
    const subject = (m.subject || '').toLowerCase();
    const meetingWith = (m.meetingWith || '').toLowerCase();
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || subject.includes(q) || meetingWith.includes(q);
    if (!matchesSearch) return false;
    const meetingDate = getMeetingDate(m);
    if (!meetingDate) return true;
    if (range.startDate && range.endDate) {
      const d = new Date(meetingDate);
      return d >= range.startDate && d <= range.endDate;
    }
    return true;
  });

  const totalMeetings = filteredMeetings.length;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayMeetings = filteredMeetings.filter((m) => getMeetingDate(m) === todayStr).length;

  const itemsPerPage = 9;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredMeetings.length / itemsPerPage));
  const currentMeetings = filteredMeetings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, range.startDate, range.endDate, meetings.length]);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {totalMeetings}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold">
                Total Meetings
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {todayMeetings}
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
                setAddForm({ meetingWith: '', meetingDate: '', meetingTime: '', subject: '', location: '', meetingLink: '' });
                setAddErrors({});
                setShowAddModal(true);
              }}
              className="flex items-center justify-between gap-4 px-6 h-[40px] bg-blue-600 rounded-lg text-white font-semibold hover:bg-blue-700 transition w-full"
            >
              <span>Add Meeting</span>
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
                  <button type="button" onClick={() => { setRange({ startDate: null, endDate: null, key: 'selection' }); setShowPresetMenu(false); }} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600">Clear Filter</button>
                  <div className="my-1 border-t border-gray-100" />
                  {Object.keys(presets).map((lbl) => (
                    <button key={lbl} type="button" onClick={() => applyPreset(lbl)} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700">{lbl}</button>
                  ))}
                  <div className="my-1 border-t border-gray-100" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search Meetings"
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
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">With</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Subject</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Date & Time</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Link</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Status</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Rescheduled</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMeetings.map((m) => (
                    <tr key={m._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm font-medium text-gray-800">{m.meetingWith || '—'}</td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-800">{m.subject || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-700">{getMeetingDate(m) || '—'} {m.meetingTime ? m.meetingTime : ''}</td>
                      <td className="py-4 px-4">
                        {m.meetingLink ? (
                          <a href={m.meetingLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            <LinkIcon size={14} /> Link
                          </a>
                        ) : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                          m.status === 'completed' ? 'bg-green-100 text-green-800' :
                          m.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          m.status === 'rescheduled' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {m.status || 'scheduled'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {m.status === 'rescheduled' && (m.rescheduledDate || m.rescheduledTime)
                          ? `${getRescheduledDate(m) || ''} ${m.rescheduledTime || ''}`.trim() || '—'
                          : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openView(m)} className="px-3 py-1 rounded border border-blue-500 text-blue-600 text-sm font-medium hover:bg-blue-50">View</button>
                          <button type="button" onClick={() => openEdit(m)} className="px-3 py-1 rounded border border-amber-500 text-amber-600 text-sm font-medium hover:bg-amber-50">Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredMeetings.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">{searchTerm ? 'No meetings found matching your search' : 'No meetings scheduled'}</p>
                <p className="text-gray-400 text-sm">{searchTerm ? 'Try adjusting your search terms' : 'Schedule your first meeting to get started'}</p>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && filteredMeetings.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredMeetings.length)} of {filteredMeetings.length} meetings
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

      {/* Add Meeting Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Create Meeting</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input type="text" value={addForm.subject} onChange={(e) => setAddForm((f) => ({ ...f, subject: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Meeting subject" />
                {addErrors.subject && <p className="text-red-600 text-xs mt-1">{addErrors.subject}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Date *</label>
                <input type="date" value={addForm.meetingDate} onChange={(e) => setAddForm((f) => ({ ...f, meetingDate: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                {addErrors.meetingDate && <p className="text-red-600 text-xs mt-1">{addErrors.meetingDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Time *</label>
                <input type="time" value={addForm.meetingTime} onChange={(e) => setAddForm((f) => ({ ...f, meetingTime: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                {addErrors.meetingTime && <p className="text-red-600 text-xs mt-1">{addErrors.meetingTime}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting With</label>
                <input type="text" value={addForm.meetingWith} onChange={(e) => setAddForm((f) => ({ ...f, meetingWith: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Name or email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" value={addForm.location} onChange={(e) => setAddForm((f) => ({ ...f, location: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
                <input type="url" value={addForm.meetingLink} onChange={(e) => setAddForm((f) => ({ ...f, meetingLink: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="https://..." />
              </div>
              {addErrors.submit && <p className="text-red-600 text-sm">{addErrors.submit}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={addSubmitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{addSubmitting ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Meeting Modal */}
      {showViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { setShowViewModal(false); setViewMeetingDetail(null); setSelectedMeeting(null); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Meeting Details</h3>
              <button type="button" onClick={() => { setShowViewModal(false); setViewMeetingDetail(null); setSelectedMeeting(null); }} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            {(() => {
              const m = viewMeetingDetail || selectedMeeting;
              if (!m) return <p className="text-gray-500">No details</p>;
              return (
                <div className="space-y-3 text-sm">
                  <p><span className="font-medium text-gray-600">With:</span> {m.meetingWith || '—'}</p>
                  <p><span className="font-medium text-gray-600">Subject:</span> {m.subject || '—'}</p>
                  <p><span className="font-medium text-gray-600">Date & Time:</span> {getMeetingDate(m)} {m.meetingTime || ''}</p>
                  <p><span className="font-medium text-gray-600">Location:</span> {m.location || '—'}</p>
                  {m.meetingLink && <p><span className="font-medium text-gray-600">Link:</span> <a href={m.meetingLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{m.meetingLink}</a></p>}
                  <p><span className="font-medium text-gray-600">Status:</span> <span className="capitalize">{m.status || 'scheduled'}</span></p>
                  {m.status === 'rescheduled' && (m.rescheduledDate || m.rescheduledTime) && (
                    <p><span className="font-medium text-gray-600">Rescheduled:</span> {getRescheduledDate(m)} {m.rescheduledTime || ''}</p>
                  )}
                </div>
              );
            })()}
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => { setShowViewModal(false); openEdit(selectedMeeting); }} className="flex-1 px-4 py-2 border border-amber-500 text-amber-600 rounded-lg hover:bg-amber-50">Edit</button>
              <button type="button" onClick={() => { setShowViewModal(false); setViewMeetingDetail(null); setSelectedMeeting(null); }} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {showEditModal && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Update Meeting</h3>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input type="text" value={editForm.subject} onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                {editErrors.subject && <p className="text-red-600 text-xs mt-1">{editErrors.subject}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Date *</label>
                <input type="date" value={editForm.meetingDate} onChange={(e) => setEditForm((f) => ({ ...f, meetingDate: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                {editErrors.meetingDate && <p className="text-red-600 text-xs mt-1">{editErrors.meetingDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Time *</label>
                <input type="time" value={editForm.meetingTime} onChange={(e) => setEditForm((f) => ({ ...f, meetingTime: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                {editErrors.meetingTime && <p className="text-red-600 text-xs mt-1">{editErrors.meetingTime}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting With</label>
                <input type="text" value={editForm.meetingWith} onChange={(e) => setEditForm((f) => ({ ...f, meetingWith: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
                <input type="url" value={editForm.meetingLink} onChange={(e) => setEditForm((f) => ({ ...f, meetingLink: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {editForm.status === 'rescheduled' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rescheduled Date *</label>
                    <input type="date" value={editForm.rescheduledDate} onChange={(e) => setEditForm((f) => ({ ...f, rescheduledDate: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    {editErrors.rescheduledDate && <p className="text-red-600 text-xs mt-1">{editErrors.rescheduledDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rescheduled Time *</label>
                    <input type="time" value={editForm.rescheduledTime} onChange={(e) => setEditForm((f) => ({ ...f, rescheduledTime: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    {editErrors.rescheduledTime && <p className="text-red-600 text-xs mt-1">{editErrors.rescheduledTime}</p>}
                  </div>
                </>
              )}
              {editErrors.submit && <p className="text-red-600 text-sm">{editErrors.submit}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{editSubmitting ? 'Updating...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
