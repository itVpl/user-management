import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  User as UserIcon,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  FileText
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'New', label: 'New' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Closed Won', label: 'Closed Won' }
];

const toYMD = (d) => (d ? format(d, 'yyyy-MM-dd') : null);
const API_LIMIT = 10;

export default function Tier1Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [range, setRange] = useState({ startDate: null, endDate: null, key: 'selection' });

  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: API_LIMIT });
  const [currentPage, setCurrentPage] = useState(1);
  const [accessError, setAccessError] = useState(null); // 403 message
  const searchDebounceRef = useRef(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

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

  const fetchLeads = async (page = currentPage) => {
    setLoading(true);
    setAccessError(null);
    try {
      const params = { page, limit: API_LIMIT };
      if (statusFilter) params.status = statusFilter;
      if (searchTerm.trim()) params.customerName = searchTerm.trim();
      if (range.startDate) params.dateFrom = toYMD(range.startDate);
      if (range.endDate) params.dateTo = toYMD(range.endDate);

      const res = await api.get('/api/v1/sales-followup/tier1-followups', { params });
      const data = res?.data?.data ?? res?.data;
      const list = Array.isArray(data) ? data : (data?.followups ?? data?.list ?? []);
      setLeads(Array.isArray(list) ? list : []);

      const pag = res?.data?.pagination ?? data?.pagination ?? {};
      setPagination({
        currentPage: pag.currentPage ?? page,
        totalPages: Math.max(1, pag.totalPages ?? 1),
        totalItems: pag.totalItems ?? list?.length ?? 0,
        itemsPerPage: pag.itemsPerPage ?? API_LIMIT
      });
    } catch (err) {
      console.error('Fetch tier1 leads error:', err);
      if (err?.response?.status === 403) {
        const msg = err?.response?.data?.message || 'Only Sales TL (Tier 3) can access Tier 1 follow-ups list';
        setAccessError(msg);
        alertify.error(msg);
      }
      setLeads([]);
      setPagination({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: API_LIMIT });
    } finally {
      setLoading(false);
    }
  };

  // When filters (status, date range) change: reset to page 1 and fetch
  useEffect(() => {
    setCurrentPage(1);
    fetchLeads(1);
  }, [statusFilter, range.startDate, range.endDate]);

  // Debounced customerName search: after 400ms reset to page 1 and fetch
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchLeads(1);
    }, 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchTerm]);

  // When user changes page: fetch that page (skip initial mount to avoid double fetch with filter effect)
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    fetchLeads(currentPage);
  }, [currentPage]);

  const getCallingDate = (item) => item?.callingDate ? (item.callingDate.slice ? item.callingDate.slice(0, 10) : item.callingDate) : '';
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLeads = leads.filter((l) => getCallingDate(l) === todayStr).length;
  const totalLeads = pagination.totalItems;
  const totalPages = pagination.totalPages;
  const currentLeads = leads;
  const itemsPerPage = pagination.itemsPerPage;
  const startItem = (pagination.currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(pagination.currentPage * itemsPerPage, totalLeads);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const openView = (lead) => {
    setSelectedLead(lead);
    setShowViewModal(true);
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      const s = typeof d === 'string' ? d.slice(0, 10) : d;
      return format(new Date(s), 'MMM dd, yyyy');
    } catch {
      return d;
    }
  };

  const fmtDateTime = (d) => {
    if (!d) return '—';
    try {
      return format(new Date(d), 'MMM dd, yyyy HH:mm');
    } catch {
      return d;
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {totalLeads}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Total Leads
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {todayLeads}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Today
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 w-full xl:w-[350px]">
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setShowPresetMenu((v) => !v)}
                className="w-full text-left px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors cursor-pointer"
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
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by customer name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <div className="w-full sm:w-[200px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-gray-700"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        {accessError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {accessError}
          </div>
        )}
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
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Customer</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Contact Person</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Phone</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Email</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Calling Date</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Status</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Credit Check</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Follow-ups</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLeads.map((lead) => (
                    <tr key={lead._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-700">{lead.customerName || '—'}</td>
                      <td className="py-4 px-4 font-medium text-gray-700">{lead.contactPerson || '—'}</td>
                      <td className="py-4 px-4 font-medium text-gray-700">{lead.phone || '—'}</td>
                      <td className="py-4 px-4 font-medium text-gray-700 max-w-[180px] truncate">{lead.email || '—'}</td>
                      <td className="py-4 px-4 font-medium text-gray-700">{getCallingDate(lead) || '—'}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded font-medium text-sm capitalize ${
                          lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                          lead.status === 'Converted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {lead.status || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-700">{lead.creditCheck || '—'}</td>
                      <td className="py-4 px-4 font-medium text-gray-700">{(lead.followUps || []).length}</td>
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => openView(lead)}
                          className="px-3 py-1 rounded-lg border border-blue-500 text-blue-500 text-base font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {leads.length === 0 && !loading && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">{accessError ? accessError : searchTerm ? 'No leads found matching your search' : 'No tier 1 leads'}</p>
                <p className="text-gray-400 text-sm">{!accessError && (searchTerm ? 'Try adjusting your search terms' : 'Data will appear here from API')}</p>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && totalLeads > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Showing {startItem} to {endItem} of {totalLeads} leads
          </div>
          <div className="flex gap-1 items-center">
            <button type="button" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium cursor-pointer">
              <ChevronLeft size={18} /> Previous
            </button>
            <div className="flex gap-1 items-center mx-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" onClick={() => handlePageChange(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-base cursor-pointer font-medium ${currentPage === p ? 'bg-white border border-gray-800 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>{p}</button>
              ))}
            </div>
            <button type="button" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium cursor-pointer">
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* View Lead Modal */}
      {showViewModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { setShowViewModal(false); setSelectedLead(null); }}>
          <div className="bg-white rounded-2xl border border-gray-200 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">Lead Details</h3>
              <button type="button" onClick={() => { setShowViewModal(false); setSelectedLead(null); }} className="p-2 rounded-lg hover:bg-white/10 cursor-pointer text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <UserIcon className="text-gray-400 shrink-0" size={18} />
                  <div>
                    <div className="text-xs text-gray-500">Customer Name</div>
                    <div className="text-sm font-medium text-gray-800">{selectedLead.customerName || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <UserIcon className="text-gray-400 shrink-0" size={18} />
                  <div>
                    <div className="text-xs text-gray-500">Contact Person</div>
                    <div className="text-sm font-medium text-gray-800">{selectedLead.contactPerson || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <UserIcon className="text-gray-400 shrink-0" size={18} />
                  <div>
                    <div className="text-xs text-gray-500">Concerned Person</div>
                    <div className="text-sm font-medium text-gray-800">{selectedLead.concernedPerson || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <Phone className="text-gray-400 shrink-0" size={18} />
                  <div>
                    <div className="text-xs text-gray-500">Phone</div>
                    <div className="text-sm font-medium text-gray-800">{selectedLead.phone || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <Mail className="text-gray-400 shrink-0" size={18} />
                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="text-sm font-medium text-gray-800 break-all">{selectedLead.email || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <MapPin className="text-gray-400 shrink-0" size={18} />
                  <div>
                    <div className="text-xs text-gray-500">Address</div>
                    <div className="text-sm font-medium text-gray-800">{selectedLead.address || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <Calendar className="text-gray-400 shrink-0" size={18} />
                  <div>
                    <div className="text-xs text-gray-500">Calling Date</div>
                    <div className="text-sm font-medium text-gray-800">{fmtDate(selectedLead.callingDate)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <div className="w-4 h-4 rounded-full bg-blue-200 shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">Status</div>
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                      selectedLead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                      selectedLead.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                      selectedLead.status === 'Converted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>{selectedLead.status || '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <FileText className="text-gray-400 shrink-0" size={18} />
                  <div>
                    <div className="text-xs text-gray-500">Credit Check</div>
                    <div className="text-sm font-medium text-gray-800">{selectedLead.creditCheck || '—'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl">
                  <MessageSquare className="text-gray-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Remarks</div>
                    <div className="text-sm font-medium text-gray-800">{selectedLead.remarks || '—'}</div>
                  </div>
                </div>
                {selectedLead.createdBy && (
                  <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                    <UserIcon className="text-gray-400 shrink-0" size={18} />
                    <div>
                      <div className="text-xs text-gray-500">Created By</div>
                      <div className="text-sm font-medium text-gray-800">
                        {selectedLead.createdBy.employeeName || selectedLead.createdBy.empId || '—'}
                        {selectedLead.createdBy.empId && <span className="text-gray-500 ml-1">({selectedLead.createdBy.empId})</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {(selectedLead.followUps || []).length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Follow-ups</h4>
                  <div className="space-y-3">
                    {selectedLead.followUps.map((fu, idx) => (
                      <div key={fu._id || idx} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{fu.followUpType || '—'}</span>
                          <span className="text-xs text-gray-500">{fmtDateTime(fu.followUpDate)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{fu.followUpNotes || '—'}</p>
                        {fu.nextFollowUpDate && (
                          <p className="text-xs text-gray-500">Next: {fmtDate(fu.nextFollowUpDate)}</p>
                        )}
                        {(fu.attachments || []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {fu.attachments.map((att, i) => (
                              <a key={att._id || i} href={att.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <FileText size={12} /> {att.fileName || 'Attachment'}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => { setShowViewModal(false); setSelectedLead(null); }}
                  className="px-6 py-2.5 rounded-xl border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
