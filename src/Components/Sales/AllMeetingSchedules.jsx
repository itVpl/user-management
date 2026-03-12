import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Link as LinkIcon,
  MessageSquare,
  User as UserIcon,
  MapPin,
  Clock
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

export default function AllMeetingSchedules() {
  const [meetings, setMeetings] = useState([]);
  const [byEmployee, setByEmployee] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [range, setRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    key: 'selection'
  });
  const [empIdFilter, setEmpIdFilter] = useState('');

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [viewMeetingDetail, setViewMeetingDetail] = useState(null);

  const applyPreset = (label) => {
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setShowPresetMenu(false);
  };

  const fetchMeetings = async () => {
    const startDate = toYMD(range.startDate);
    const endDate = toYMD(range.endDate);
    if (!startDate || !endDate) {
      setLoading(false);
      setMeetings([]);
      return;
    }
    setLoading(true);
    try {
      const params = { startDate, endDate };
      if (empIdFilter.trim()) params.empId = empIdFilter.trim();
      const res = await api.get('/api/v1/inhouseUser/meetings/all', { params });
      const data = res?.data;
      let list = [];
      if (Array.isArray(data)) {
        list = data.filter((item) => item && item._id && !item.byEmployee);
        const byEmpItem = data.find((item) => item && Array.isArray(item.byEmployee));
        if (byEmpItem && byEmpItem.byEmployee) setByEmployee(byEmpItem.byEmployee);
        else setByEmployee([]);
      } else {
        // API returns { success, count, data: { meetings: [...] } } or { meetings: [...] }
        const inner = data?.data;
        list = (inner && Array.isArray(inner.meetings) ? inner.meetings : null)
          ?? (Array.isArray(data?.meetings) ? data.meetings : null)
          ?? [];
        setByEmployee(Array.isArray(data?.byEmployee) ? data.byEmployee : (inner?.byEmployee && Array.isArray(inner.byEmployee) ? inner.byEmployee : []));
      }
      setMeetings(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Fetch all meetings error:', err);
      setMeetings([]);
      setByEmployee([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [range.startDate, range.endDate, empIdFilter]);

  const fetchMeetingById = async (meetingId) => {
    try {
      const res = await api.get(`/api/v1/inhouseUser/meetings/${meetingId}`);
      setViewMeetingDetail(res?.data?.meeting ?? res?.data?.data ?? res?.data ?? null);
    } catch (err) {
      setViewMeetingDetail(null);
    }
  };

  const openView = (meeting) => {
    setSelectedMeeting(meeting);
    setViewMeetingDetail(meeting);
    if (meeting?._id) fetchMeetingById(meeting._id);
    setShowViewModal(true);
  };

  const getMeetingDate = (m) => (m?.meetingDate ? (m.meetingDate.slice ? m.meetingDate.slice(0, 10) : m.meetingDate) : '');
  const getRescheduledDate = (m) => (m?.rescheduledDate ? (m.rescheduledDate.slice ? m.rescheduledDate.slice(0, 10) : m.rescheduledDate) : '');

  const getEmployeeName = (m) => m?.employeeName ?? m?.user?.employeeName ?? m?.empId ?? m?.user?.empId ?? '—';
  const getEmployeeId = (m) => m?.empId ?? m?.user?.empId ?? '';

  const filteredMeetings = meetings.filter((m) => {
    const subject = (m.subject || '').toLowerCase();
    const meetingWith = (m.meetingWith || '').toLowerCase();
    const empName = getEmployeeName(m).toLowerCase();
    const empId = getEmployeeId(m).toLowerCase();
    const q = searchTerm.trim().toLowerCase();
    if (q && !subject.includes(q) && !meetingWith.includes(q) && !empName.includes(q) && !empId.includes(q)) return false;
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
  }, [searchTerm, meetings.length]);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {totalMeetings}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Total Meetings
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {todayMeetings}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Today
              </div>
            </div>
          </div>
        </div>
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search Meetings"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
          />
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={22} />
        </div>
      </div>

      <div className="mb-4 border border-gray-200 rounded-xl bg-white p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="relative w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-500 mb-1">Employee ID (optional)</label>
            <input
  type="text"
  value={empIdFilter}
  onChange={(e) => setEmpIdFilter(e.target.value)}
  placeholder="All employees"
  className="w-full px-4 h-[40px] border border-gray-200 rounded-lg bg-white text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
/>
          </div>
          <div className="relative w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-500 mb-1">Date Range</label>
            <button
              type="button"
              onClick={() => setShowPresetMenu((v) => !v)}
              className="cursor-pointer w-full text-left px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors"
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
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Employee</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">With</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Subject</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Date & Time</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Link</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Status</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Rescheduled</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMeetings.map((m) => (
                    <tr key={m._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-700">{getEmployeeName(m)}</td>
                      <td className="py-4 px-4 font-medium text-gray-700">{m.meetingWith || '—'}</td>
                      <td className="py-4 px-4 font-medium text-gray-700">{m.subject || '—'}</td>
                      <td className="py-4 px-4 font-medium text-gray-700">{getMeetingDate(m) || '—'} {m.meetingTime ? m.meetingTime : ''}</td>
                      <td className="py-4 px-4">
                        {m.meetingLink ? (
                          <a href={m.meetingLink} target="_blank" rel="noreferrer" className="text-blue-700 font-medium hover:underline flex items-center gap-1">
                            <LinkIcon size={14} /> Link
                          </a>
                        ) : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded font-medium text-sm capitalize ${
                          m.status === 'completed' ? 'bg-green-100 text-green-800' :
                          m.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          m.status === 'rescheduled' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {m.status || 'scheduled'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-700">
                        {m.status === 'rescheduled' && (m.rescheduledDate || m.rescheduledTime)
                          ? `${getRescheduledDate(m) || ''} ${m.rescheduledTime || ''}`.trim() || '—'
                          : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => openView(m)}
                          className="px-3 py-1 rounded-lg border border-blue-500 text-blue-700 text-base font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredMeetings.length === 0 && !loading && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">{searchTerm ? 'No meetings found matching your search' : 'No meetings in this date range'}</p>
                <p className="text-gray-400 text-sm">Select a date range and optional Employee ID to load meetings</p>
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
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium cursor-pointer">
              <ChevronLeft size={18} /> Previous
            </button>
            <div className="flex items-center gap-1 mx-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" onClick={() => setCurrentPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-base cursor-pointer font-medium ${currentPage === p ? 'bg-white border border-gray-800 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>{p}</button>
              ))}
            </div>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium cursor-pointer">
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* View Meeting Modal */}
      {showViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { setShowViewModal(false); setViewMeetingDetail(null); setSelectedMeeting(null); }}>
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">Meeting Details</h3>
              <button type="button" onClick={() => { setShowViewModal(false); setViewMeetingDetail(null); setSelectedMeeting(null); }} className="p-2 rounded-lg hover:bg-white/10 cursor-pointer text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              {(() => {
                const m = viewMeetingDetail || selectedMeeting;
                if (!m) return <p className="text-gray-500">No details</p>;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                      <UserIcon className="text-gray-400" size={18} />
                      <div>
                        <div className="text-xs text-gray-500">Employee</div>
                        <div className="text-sm font-medium text-gray-800">{getEmployeeName(m)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                      <UserIcon className="text-gray-400" size={18} />
                      <div>
                        <div className="text-xs text-gray-500">With</div>
                        <div className="text-sm font-medium text-gray-800">{m.meetingWith || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl md:col-span-1">
                      <MessageSquare className="text-gray-400" size={18} />
                      <div>
                        <div className="text-xs text-gray-500">Subject</div>
                        <div className="text-sm font-medium text-gray-800">{m.subject || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                      <Calendar className="text-gray-400" size={18} />
                      <div>
                        <div className="text-xs text-gray-500">Date & Time</div>
                        <div className="text-sm font-medium text-gray-800">{getMeetingDate(m)} {m.meetingTime || ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                      <MapPin className="text-gray-400" size={18} />
                      <div>
                        <div className="text-xs text-gray-500">Location</div>
                        <div className="text-sm font-medium text-gray-800">{m.location || '—'}</div>
                      </div>
                    </div>
                    {m.meetingLink && (
                      <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl md:col-span-2">
                        <LinkIcon className="text-gray-400" size={18} />
                        <div>
                          <div className="text-xs text-gray-500">Link</div>
                          <a href={m.meetingLink} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline break-all">
                            {m.meetingLink}
                          </a>
                        </div>
                      </div>
                    )}
                   <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl">
  <div className="w-4 h-4 rounded-full bg-blue-200 shrink-0 mt-0.5" />
  <div>
    <div className="text-xs text-gray-500 mb-1.5">Status</div>
    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize border ${
      m.status === 'completed' ? 'bg-green-50 text-green-700 border-green-300' :
      m.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-300' :
      m.status === 'rescheduled' ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-blue-50 text-blue-700 border-blue-300'
    }`}>
      {m.status || 'scheduled'}
    </span>
  </div>
</div>
                    {m.status === 'rescheduled' && (m.rescheduledDate || m.rescheduledTime) && (
                      <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                        <Clock className="text-gray-400" size={18} />
                        <div>
                          <div className="text-xs text-gray-500">Rescheduled</div>
                          <div className="text-sm font-medium text-gray-800">{getRescheduledDate(m)} {m.rescheduledTime || ''}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* <div className="mt-6 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowViewModal(false); setViewMeetingDetail(null); setSelectedMeeting(null); }}
                  className="px-6 py-2.5 rounded-xl border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 cursor-pointer"
                >
                  Close
                </button>
              </div> */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
