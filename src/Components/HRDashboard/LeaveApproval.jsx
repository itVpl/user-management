import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Calendar, Clock, User, CheckCircle, XCircle, AlertCircle,
  Search, Filter, Eye, ArrowLeft, ArrowRight
} from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import API_CONFIG from '../../config/api.js';
// ------------------ CONFIG ------------------
const API_BASE = `${API_CONFIG.BASE_URL}/api/v1/leave`;
const ENDPOINTS = {
  listPendingForManagerPrimary: `${API_BASE}/pending-manager-approval`,
  listPendingForManagerFallback: `${API_BASE}/pending-manager-approv`,
  managerApprove: (id) => `${API_BASE}/manager-approve/${id}`,
};

// Employee details API (by empId)
const EMP_API = `${API_CONFIG.BASE_URL}/api/v1/inhouseUser`;

// toggle for consoles
const DEBUG = true;
const dbg = (...a) => DEBUG && console.log('[LeaveApproval]', ...a);

// ------------------ HELPERS ------------------
const getFirstNonEmpty = (...vals) =>
  vals.find(v => v !== undefined && v !== null && String(v).trim() !== '');

const deriveDateFromObjectId = (id) => {
  if (!id || typeof id !== 'string' || id.length < 8) return null;
  try {
    const tsSec = parseInt(id.substring(0, 8), 16);
    const d = new Date(tsSec * 1000);
    return isNaN(d) ? null : d;
  } catch { return null; }
};

/** Robust date parser for ISO, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, and messy spaces */
const parseDate = (value) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !isNaN(value)) return value;

  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }
  if (typeof value !== 'string') return null;

  let s = value.trim();

  // strip brackets + collapse spaces
  s = s.replace(/[\[\]]/g, '').replace(/\s+/g, '');

  // ignore ranges like "...to..."
  if (s.includes('to')) return null;

  // native first (handles ISO)
  let d = new Date(s);
  if (!isNaN(d)) return d;

  // DD-MM-YYYY or DD/MM/YYYY (2-digit year allowed)
  let m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const mon = Number(m[2]) - 1;
    let year = Number(m[3]);
    if (year < 100) year = 2000 + year; // '25' -> 2025
    d = new Date(year, mon, day);
    return isNaN(d) ? null : d;
  }

  // YYYY-MM-DD
  m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m) {
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d) ? null : d;
  }

  return null;
};

const formatDateDisplay = (raw) => {
  const d = parseDate(raw);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const calcDurationInclusive = (startRaw, endRaw) => {
  const start = parseDate(startRaw);
  const end = parseDate(endRaw);
  if (!start || !end) return null;
  const s = new Date(start); s.setHours(0,0,0,0);
  const e = new Date(end);   e.setHours(0,0,0,0);
  const [a, b] = s <= e ? [s, e] : [e, s];
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
};

// Likely API keys
const pickStart = (l) => getFirstNonEmpty(l.startDate, l.fromDate, l.dateFrom, l.start, l.from, l.dates?.[0]);
const pickEnd   = (l) => getFirstNonEmpty(l.endDate,   l.toDate,   l.dateTo,   l.end,   l.to,   l.dates?.[1], pickStart(l));
const pickCreatedAny = (l) => getFirstNonEmpty(
  l.createdAt, l.created_at, l.created_on, l.createdOn,
  l.appliedOn, l.applied_at, l.appliedDate, l.applicationDate,
  l.requestedAt, l.requestDate, l.submittedAt, l.submitDate,
  l.date, l.timestamp, l.time, l.created
);
const pickReason = (l) => getFirstNonEmpty(l.reason, l.notes, l.note, l.description, l.message, l.remark, l.remarks);

const getStatus = (l) => {
  const s = (getFirstNonEmpty(l.status) ?? 'pending').toString().trim().toLowerCase();
  if (s === '1') return 'approved';
  if (s === '0') return 'pending';
  return s;
};

const getEmployeeNameLocal = (l) => {
  const fn = getFirstNonEmpty(l.firstName, l.employee?.firstName, l.user?.firstName);
  const ln = getFirstNonEmpty(l.lastName, l.employee?.lastName, l.user?.lastName);
  const full = [fn, ln].filter(Boolean).join(' ').trim();
  return getFirstNonEmpty(l.employeeName, l.name, l.fullName, l.employee?.name, l.employee?.fullName, l.user?.name, full) || '';
};
const getEmployeeId = (l) =>
  getFirstNonEmpty(l.employeeId, l.empId, l.empID, l.employeeCode, l.employee?.empId, l.employee?.employeeId, l.user?.empId) || 'N/A';
const getDepartment = (l) =>
  getFirstNonEmpty(l.department, l.employee?.department, l.user?.department) || 'N/A';
const getPosition = (l) =>
  getFirstNonEmpty(l.position, l.designation, l.employee?.position, l.user?.position) || 'N/A';

// ---------- Employee name hydration ----------
const extractNameFromEmployeeResp = (data) => {
  const emp = data?.employee || data?.user || data?.data || data;
  if (!emp) return '';
  const explicit =
    emp.employeeName || emp.fullName || emp.name ||
    [emp.firstName || emp.fname, emp.lastName || emp.lname || emp.surname]
      .filter(Boolean)
      .join(' ')
      .trim();
  return (explicit || '').trim();
};

const hydrateEmployeeNames = async (rows) => {
  const cache = new Map();

  const targets = rows.filter(
    (r) =>
      (!r._norm?.employeeName || r._norm.employeeName === 'N/A') &&
      r._norm?.employeeId &&
      r._norm.employeeId !== 'N/A'
  );
  const uniqueEmpIds = [...new Set(targets.map((r) => r._norm.employeeId))];
  dbg('Hydrating employee names for empIds:', uniqueEmpIds);

  await Promise.all(
    uniqueEmpIds.map(async (empId) => {
      try {
        const url = `${EMP_API}/${encodeURIComponent(empId)}`;
        const { data } = await axios.get(url, { withCredentials: true });
        const name = extractNameFromEmployeeResp(data) || data?.employeeName || data?.name;
        if (name) {
          cache.set(empId, name);
          dbg('Name hydrated:', empId, '->', name);
        } else {
          dbg('No name found in emp API for', empId, data);
        }
      } catch (e) {
        dbg('emp fetch fail', empId, e?.response?.status || e?.message);
      }
    })
  );

  rows.forEach((r) => {
    const empId = r._norm?.employeeId;
    if (empId && cache.has(empId)) {
      r._norm.employeeName = cache.get(empId);
    }
  });

  return rows;
};

// ------------------ COMPONENT ------------------
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

  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [managerRemarks, setManagerRemarks] = useState('');

  // Fetch pending leaves for manager approval
  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const tryUrls = [ENDPOINTS.listPendingForManagerPrimary, ENDPOINTS.listPendingForManagerFallback];
      let success = false, lastErr = null;

      for (const url of tryUrls) {
        try {
          dbg('GET', url);
          const { data } = await axios.get(url, { withCredentials: true });
          dbg('RAW:', data);

          const rawList = Array.isArray(data?.leaves) ? data.leaves
                        : Array.isArray(data) ? data
                        : (data?.leaves || []);

          const normalized = (rawList || []).map((l, i) => {
            const startRaw = pickStart(l);
            const endRaw   = pickEnd(l);
            const createdRaw = pickCreatedAny(l);
            const createdFromId = !createdRaw ? deriveDateFromObjectId(l._id) : null;
            const createdFinal = createdRaw || createdFromId;

            const localName = getEmployeeNameLocal(l);

            const norm = {
              ...l,
              _norm: {
                employeeName: localName || 'N/A',
                employeeId:   getEmployeeId(l),
                department:   getDepartment(l),
                position:     getPosition(l),
                status:       getStatus(l),
                reason:       pickReason(l),
                startRaw, endRaw,
                createdRaw,
                createdFinal,       // Date | null
                createdFromId: !!createdFromId,
              }
            };
            dbg(`Row[${i}]`, {
              id: l._id,
              emp: `${norm._norm.employeeName} / ${norm._norm.employeeId}`,
              status: norm._norm.status,
              startRaw, endRaw,
              createdRaw,
              createdFromId: norm._norm.createdFromId,
              createdFinal: createdFinal ? createdFinal.toString() : null
            });
            return norm;
          });

          const withNames = await hydrateEmployeeNames(normalized);
          setLeaveRequests(withNames);
          success = true;
          break;
        } catch (e) {
          lastErr = e;
          if (e?.response?.status && e.response.status !== 404) throw e;
          dbg('404 on', url, '— trying fallback…');
        }
      }

      if (!success) {
        dbg('Both endpoints 404/failed', lastErr);
        alertify.error('Pending approvals endpoint not found (404). Please confirm the route.');
        setLeaveRequests([]);
      }
    } catch (err) {
      dbg('Fetch error:', err);
      alertify.error(err?.response?.data?.message || 'Failed to fetch pending approvals');
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaveRequests(); }, []);

  const getStatusBadge = (statusRaw) => {
    const status = (statusRaw || 'pending').toString().toLowerCase();
    const statusConfig = {
      pending:  { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      approved: { color: 'bg-green-100 text-green-700',  icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-700',      icon: XCircle },
      cancelled:{ color: 'bg-gray-100 text-gray-700',    icon: AlertCircle },
    };
    const cfg = statusConfig[status] || statusConfig.pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
        <Icon size={14} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // filter/search using normalized values
  const filteredLeaves = leaveRequests.filter(l => {
    const nm  = (l._norm?.employeeName || '').toLowerCase();
    const typ = (l.leaveType || '').toLowerCase();
    const rsn = (l._norm?.reason || '').toLowerCase();
    const matchesSearch = nm.includes(searchTerm.toLowerCase()) ||
                          typ.includes(searchTerm.toLowerCase()) ||
                          rsn.includes(searchTerm.toLowerCase());
    const st = l._norm?.status || 'pending';
    const matchesStatus = statusFilter === 'all' || st === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // pagination
  const totalPages = Math.max(1, Math.ceil(filteredLeaves.length / recordsPerPage));
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex   = startIndex + recordsPerPage;
  const currentLeaves = filteredLeaves.slice(startIndex, endIndex);

  const openAction = (leave, type) => {
    setSelectedLeave(leave);
    setActionType(type);
    setManagerRemarks('');
    setShowActionModal(true);
  };

  // ---- NEW: local optimistic update helper (keeps row; just changes status)
  const applyLocalDecision = (leaveId, newStatus, remarks = '') => {
    setLeaveRequests(prev =>
      prev.map(r => {
        const match = (r._id || r.id) === leaveId;
        if (!match) return r;
        const updated = {
          ...r,
          status: newStatus,                // in case raw consumer exists
          managerRemarks: remarks?.trim(),
          _norm: {
            ...r._norm,
            status: newStatus,             // UI reads from _norm.status
          }
        };
        return updated;
      })
    );
    // also update details modal selection if open
    setSelectedLeave(prev => {
      if (!prev) return prev;
      if ((prev._id || prev.id) !== leaveId) return prev;
      return {
        ...prev,
        status: newStatus,
        managerRemarks: remarks?.trim(),
        _norm: { ...prev._norm, status: newStatus }
      };
    });
  };

  const submitManagerDecision = async () => {
    if (!selectedLeave || !actionType) return;
    const leaveId = selectedLeave._id || selectedLeave.id;
    setActionLoading(p => ({ ...p, [leaveId]: actionType }));
    try {
      const payload = { status: actionType, managerRemarks: managerRemarks?.trim() || '' };
      const url = ENDPOINTS.managerApprove(leaveId);
      dbg('PATCH', url, payload);
      const { data } = await axios.patch(url, payload, { withCredentials: true });
      dbg('PATCH resp:', data);

      if (data?.success) {
        // ✅ Keep row, just change status locally
        applyLocalDecision(leaveId, actionType, managerRemarks);

        alertify.success(`Leave ${actionType} successfully`);
        setShowActionModal(false);
        setShowDetailsModal(false);

        // ❌ DO NOT refetch here, otherwise approved/rejected will vanish (pending API)
        // await fetchLeaveRequests();
      } else {
        alertify.error(data?.message || `Failed to ${actionType} leave`);
      }
    } catch (e) {
      dbg('Decision error:', e);
      alertify.error(`Error ${actionType}ing leave. Please try again.`);
    } finally {
      setActionLoading(p => ({ ...p, [leaveId]: null }));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pending approvals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header Stats */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending for Manager</p>
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
                  {leaveRequests.filter(l => (l._norm?.status || 'pending') === 'pending').length}
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
                  {leaveRequests.filter(l => (l._norm?.status || 'pending') === 'approved').length}
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
                  {leaveRequests.filter(l => (l._norm?.status || 'pending') === 'rejected').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
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

      {/* Table */}
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
              {currentLeaves.map((leave, index) => {
                const nm  = leave._norm?.employeeName || 'N/A';
                const emp = leave._norm?.employeeId || 'N/A';
                const startRaw = leave._norm?.startRaw;
                const endRaw   = leave._norm?.endRaw;
                const createdFinal = leave._norm?.createdFinal; // Date | null
                const status = leave._norm?.status || 'pending';
                const reason = leave._norm?.reason || leave.reason || 'N/A';

                const duration = calcDurationInclusive(startRaw, endRaw);
                const durationText = duration ? `${duration} ${duration === 1 ? 'day' : 'days'}` : '—';

                return (
                  <tr key={leave._id || index} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="text-blue-600" size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{nm}</p>
                          <p className="text-sm text-gray-500">{emp}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-medium text-gray-700">{leave.leaveType || 'N/A'}</span>
                    </td>

                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-gray-700">
                          {formatDateDisplay(startRaw)} - {formatDateDisplay(endRaw)}
                        </p>
                        <p className="text-sm text-gray-500">{durationText}</p>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <p className="text-gray-700 max-w-xs truncate" title={reason}>{reason}</p>
                    </td>

                    <td className="py-4 px-6">{getStatusBadge(status)}</td>

                    <td className="py-4 px-6">
                      <p className="text-sm text-gray-600">
                        {createdFinal ? createdFinal.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                      </p>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedLeave(leave); setShowDetailsModal(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>

                        {status === 'pending' && (
                          <>
                            <button
                              onClick={() => openAction(leave, 'approved')}
                              disabled={actionLoading[leave._id]}
                              className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                                actionLoading[leave._id] === 'approved'
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-green-500 text-white hover:bg-green-600'
                              }`}
                            >
                              {actionLoading[leave._id] === 'approved'
                                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                : <CheckCircle size={12} />}
                              Approve
                            </button>

                            <button
                              onClick={() => openAction(leave, 'rejected')}
                              disabled={actionLoading[leave._id]}
                              className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                                actionLoading[leave._id] === 'rejected'
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-red-500 text-white hover:bg-red-600'
                              }`}
                            >
                              {actionLoading[leave._id] === 'rejected'
                                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                : <XCircle size={12} />}
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {currentLeaves.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm || statusFilter !== 'all' ? 'No leave requests found matching your criteria' : 'No pending approvals found'}
            </p>
            <p className="text-gray-400 text-sm">
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'When employees submit leave, pending approvals will appear here'}
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
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    currentPage === page ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Next
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLeave && (
        <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <button onClick={() => setShowDetailsModal(false)} className="text-white hover:text-gray-200 text-2xl font-bold transition-colors">×</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <User className="text-blue-600" size={18} />
                  <h3 className="text-lg font-bold text-blue-700">Employee Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Name</p>
                    <p className="text-gray-800">{(selectedLeave._norm?.employeeName && selectedLeave._norm.employeeName !== 'N/A')
                      ? selectedLeave._norm.employeeName
                      : getFirstNonEmpty(getEmployeeNameLocal(selectedLeave), 'N/A')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Employee ID</p>
                    <p className="text-gray-800">{selectedLeave._norm?.employeeId || getEmployeeId(selectedLeave)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Department</p>
                    <p className="text-gray-800">{selectedLeave._norm?.department || getDepartment(selectedLeave)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Position</p>
                    <p className="text-gray-800">{selectedLeave._norm?.position || getPosition(selectedLeave)}</p>
                  </div>
                </div>
              </div>

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
                      {(() => {
                        const d = calcDurationInclusive(pickStart(selectedLeave), pickEnd(selectedLeave));
                        return d ? `${d} ${d === 1 ? 'day' : 'days'}` : '—';
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Start Date</p>
                    <p className="text-gray-800">{formatDateDisplay(pickStart(selectedLeave))}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">End Date</p>
                    <p className="text-gray-800">{formatDateDisplay(pickEnd(selectedLeave))}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-600">Reason</p>
                    <p className="text-gray-800">{pickReason(selectedLeave) || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="text-purple-600" size={18} />
                  <h3 className="text-lg font-bold text-purple-700">Status & Actions</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Current Status</p>
                    {getStatusBadge(selectedLeave._norm?.status || getStatus(selectedLeave))}
                  </div>

                  {(selectedLeave._norm?.status || getStatus(selectedLeave)) === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAction(selectedLeave, 'approved')}
                        disabled={actionLoading[selectedLeave._id]}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                          actionLoading[selectedLeave._id] === 'approved'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        {actionLoading[selectedLeave._id] === 'approved'
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          : <CheckCircle size={16} />}
                        Approve
                      </button>

                      <button
                        onClick={() => openAction(selectedLeave, 'rejected')}
                        disabled={actionLoading[selectedLeave._id]}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                          actionLoading[selectedLeave._id] === 'rejected'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        {actionLoading[selectedLeave._id] === 'rejected'
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          : <XCircle size={16} />}
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

      {/* Action Modal */}
      {showActionModal && selectedLeave && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className={`p-5 ${actionType === 'approved' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
              <h3 className="text-lg font-bold">
                {actionType === 'approved' ? 'Approve Leave' : 'Reject Leave'}
              </h3>
              <p className="text-white/80 text-sm">
                {(selectedLeave._norm?.employeeName && selectedLeave._norm.employeeName !== 'N/A')
                  ? selectedLeave._norm.employeeName
                  : getFirstNonEmpty(getEmployeeNameLocal(selectedLeave), 'N/A')}
                {' '}• {selectedLeave._norm?.employeeId || getEmployeeId(selectedLeave)}
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager Remarks</label>
                <textarea
                  value={managerRemarks}
                  onChange={(e) => setManagerRemarks(e.target.value)}
                  placeholder="Add a note for the employee (optional)"
                  className="w-full min-h-[90px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitManagerDecision}
                  disabled={actionLoading[selectedLeave._id]}
                  className={`px-4 py-2 rounded-lg text-white font-semibold transition ${
                    actionType === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  } ${actionLoading[selectedLeave._id] ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {actionLoading[selectedLeave._id] ? 'Working...' : actionType === 'approved' ? 'Confirm Approve' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeaveApproval;
