// LeaveApproval.jsx (FINAL UPDATED)
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Calendar, Clock, User, CheckCircle, XCircle, AlertCircle,
  Search, Filter, Eye, MessageSquare, FileText, ExternalLink
} from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import API_CONFIG from '../../config/api.js';
import {
  getRemovalRequests,
  getRemovalRequest,
  acceptRemovalRequest,
  rejectRemovalRequest,
} from '../../services/leaveApprovalService';


// ------------------ CONFIG ------------------
const API_BASE = `${API_CONFIG.BASE_URL}/api/v1/leave`;
const ENDPOINTS = {
  listAllPrimary: `${API_BASE}/all`,
  listPendingForManagerPrimary: `${API_BASE}/pending-manager-approval`,
  listPendingForManagerFallback: `${API_BASE}/pending-manager-approv`,
  managerApprove: (id) => `${API_BASE}/manager-approve/${id}`,
};


// Employee details API (by empId)
const EMP_API = `${API_CONFIG.BASE_URL}/api/v1/inhouseUser`;


const DEBUG = true;
const dbg = () => {}; // Debug function disabled


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


const parseDate = (value) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }
  if (typeof value !== 'string') return null;


  let s = value.trim().replace(/[\[\]]/g, '').replace(/\s+/g, '');
  if (s.includes('to')) return null;


  let d = new Date(s);
  if (!isNaN(d)) return d;


  let m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const mon = Number(m[2]) - 1;
    let year = Number(m[3]);
    if (year < 100) year = 2000 + year;
    d = new Date(year, mon, day);
    return isNaN(d) ? null : d;
  }


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


// 🔁 Expanded synonyms for Department + Position
const getDepartment = (l) =>
  getFirstNonEmpty(
    l.department, l.dept, l.deptName, l.departmentName,
    l.employee?.department, l.employee?.dept, l.employee?.departmentName,
    l.user?.department, l.user?.dept, l.user?.departmentName
  ) || 'N/A';


const getPosition = (l) =>
  getFirstNonEmpty(
    // direct on row
    l.position, l.designation, l.Designation, l.title, l.role, l.jobTitle, l.job_title, l.job, l.post,
    // nested employee
    l.employee?.position, l.employee?.designation, l.employee?.Designation,
    l.employee?.title, l.employee?.role, l.employee?.jobTitle, l.employee?.job_title, l.employee?.job, l.employee?.post,
    // nested user
    l.user?.position, l.user?.designation, l.user?.Designation,
    l.user?.title, l.user?.role, l.user?.jobTitle, l.user?.job_title, l.user?.job, l.user?.post
  ) || 'N/A';


// ---------- Employee hydration helpers ----------
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


const extractDepartmentFromEmployeeResp = (data) => {
  const emp = data?.employee || data?.user || data?.data || data;
  return getFirstNonEmpty(emp?.department, emp?.dept, emp?.departmentName, emp?.deptName) || '';
};


const extractPositionFromEmployeeResp = (data) => {
  const emp = data?.employee || data?.user || data?.data || data;
  return getFirstNonEmpty(
    emp?.position, emp?.designation, emp?.Designation,
    emp?.title, emp?.role, emp?.jobTitle, emp?.job_title, emp?.job, emp?.post
  ) || '';
};


const hydrateEmployeeNames = async (rows) => {
  // cache now stores name + dept + pos
  const cache = new Map();


  const targets = rows.filter(
    (r) =>
      (
        (!r._norm?.employeeName || r._norm.employeeName === 'N/A') ||
        (!r._norm?.department   || r._norm.department   === 'N/A') ||
        (!r._norm?.position     || r._norm.position     === 'N/A')
      ) &&
      r._norm?.employeeId && r._norm.employeeId !== 'N/A'
  );
  const uniqueEmpIds = [...new Set(targets.map((r) => r._norm.employeeId))];
  dbg('Hydrating employee fields for empIds:', uniqueEmpIds);


  await Promise.all(
    uniqueEmpIds.map(async (empId) => {
      try {
        const url = `${EMP_API}/${encodeURIComponent(empId)}`;
        const { data } = await axios.get(url, { withCredentials: true });


        const name = extractNameFromEmployeeResp(data) || data?.employeeName || data?.name;
        const dept = extractDepartmentFromEmployeeResp(data);
        const pos  = extractPositionFromEmployeeResp(data);


        cache.set(empId, {
          name: (name || '').trim(),
          dept: (dept || '').trim(),
          pos : (pos  || '').trim()
        });
      } catch (e) {
        dbg('emp fetch fail', empId, e?.response?.status || e?.message);
      }
    })
  );


  rows.forEach((r) => {
    const empId = r._norm?.employeeId;
    const info = empId && cache.get(empId);
    if (!info) return;


    if (info.name) r._norm.employeeName = r._norm.employeeName === 'N/A' ? info.name : (r._norm.employeeName || info.name);
    if (info.dept && (!r._norm.department || r._norm.department === 'N/A')) r._norm.department = info.dept;
    if (info.pos  && (!r._norm.position   || r._norm.position   === 'N/A')) r._norm.position   = info.pos;
  });


  return rows;
};


// ------------------ LOCAL PERSISTENCE (for fallback mode) ------------------
const DECISION_KEY = 'vpl_leave_decisions_v1';
const saveDecisionToCache = (rowWithNorm) => {
  try {
    const list = JSON.parse(localStorage.getItem(DECISION_KEY) || '[]');
    const id = rowWithNorm?._id || rowWithNorm?.id;
    if (!id) return;
    const idx = list.findIndex(x => (x._id || x.id) === id);
    const base = {
      _id: id,
      leaveType: rowWithNorm.leaveType || null,
      managerRemarks: rowWithNorm.managerRemarks || '',
      startRaw: pickStart(rowWithNorm),
      endRaw: pickEnd(rowWithNorm),
      createdRaw: pickCreatedAny(rowWithNorm),
      status: getStatus(rowWithNorm),
      _norm: {
        employeeName: getEmployeeNameLocal(rowWithNorm) || rowWithNorm?._norm?.employeeName || 'N/A',
        employeeId: getEmployeeId(rowWithNorm),
        department: getDepartment(rowWithNorm),
        position: getPosition(rowWithNorm),
        status: getStatus(rowWithNorm),
        reason: pickReason(rowWithNorm),
        startRaw: pickStart(rowWithNorm),
        endRaw: pickEnd(rowWithNorm),
        createdRaw: pickCreatedAny(rowWithNorm),
        createdFinal: pickCreatedAny(rowWithNorm) || deriveDateFromObjectId(id),
      },
    };
    if (idx >= 0) list[idx] = { ...list[idx], ...base };
    else list.push(base);
    localStorage.setItem(DECISION_KEY, JSON.stringify(list));
  } catch {}
};


const loadDecisionCache = () => {
  try { return JSON.parse(localStorage.getItem(DECISION_KEY) || '[]'); }
  catch { return []; }
};


// ------------------ Pagination helper (compact window) ------------------
const makePages = (total, current, delta = 1) => {
  if (total <= 1) return [1];
  const set = new Set([1, total]);
  for (let i = current - delta; i <= current + delta; i++) {
    if (i > 1 && i < total) set.add(i);
  }
  const pages = [...set].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < pages.length; i++) {
    out.push(pages[i]);
    if (i < pages.length - 1 && pages[i + 1] - pages[i] > 1) out.push('ellipsis');
  }
  return out;
};


// ------------------ COMPONENT ------------------
const LeaveApproval = () => {
  const [activeSection, setActiveSection] = useState('leaveRequests'); // 'leaveRequests' | 'removalRequests'
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // search NAME only
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);

  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [managerRemarks, setManagerRemarks] = useState('');
  const [remarksError, setRemarksError] = useState(''); // validation

  // Sandwich Leave Removal requests (manager)
  const [removalRequests, setRemovalRequests] = useState([]);
  const [removalLoading, setRemovalLoading] = useState(false);
  const [removalPagination, setRemovalPagination] = useState(null);
  const [removalStatusFilter, setRemovalStatusFilter] = useState('pending');
  const [removalPage, setRemovalPage] = useState(1);
  const [selectedRemoval, setSelectedRemoval] = useState(null);
  const [showRemovalDetailModal, setShowRemovalDetailModal] = useState(false);
  const [removalActionLoading, setRemovalActionLoading] = useState(null);
  const [removalResponseRemark, setRemovalResponseRemark] = useState('');


  // Fetch data
  const fetchLeaveRequests = async () => {
    let usedFallback = false;
    try {
      setLoading(true);
      let dataList = [];


      // Try ALL
      try {
        dbg('GET', ENDPOINTS.listAllPrimary);
        const { data } = await axios.get(ENDPOINTS.listAllPrimary, { withCredentials: true });
        dataList = Array.isArray(data?.leaves) ? data.leaves : (Array.isArray(data) ? data : []);
      } catch (eAll) {
        dbg('ALL failed, fallback to pending…', eAll?.response?.status || eAll?.message);
        // Fallback chain
        const tryUrls = [ENDPOINTS.listPendingForManagerPrimary, ENDPOINTS.listPendingForManagerFallback];
        let gotPending = false;
        for (const url of tryUrls) {
          try {
            dbg('GET', url);
            const { data } = await axios.get(url, { withCredentials: true });
            const rawList = Array.isArray(data?.leaves) ? data.leaves
                          : Array.isArray(data) ? data
                          : (data?.leaves || []);
            dataList = rawList;
            gotPending = true;
            usedFallback = true;
            break;
          } catch (e) {
            if (e?.response?.status && e.response.status !== 404) throw e;
            dbg('404 on', url, '— trying next…');
          }
        }
        if (!gotPending) {
          alertify.error('No leave list endpoint found. Check /leave/all or /pending-manager-approval.');
          dataList = [];
        }
      }


      const normalized = (dataList || []).map((l) => {
        const startRaw = pickStart(l);
        const endRaw   = pickEnd(l);
        const createdRaw = pickCreatedAny(l);
        const createdFromId = !createdRaw ? deriveDateFromObjectId(l._id) : null;
        const createdFinal = createdRaw || createdFromId;
        const localName = getEmployeeNameLocal(l);


        return {
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
            createdFinal,
            createdFromId: !!createdFromId,
          }
        };
      });


      // Merge cached decisions if we are in fallback mode
      let merged = normalized;
      if (usedFallback) {
        const cached = loadDecisionCache();
        if (Array.isArray(cached) && cached.length) {
          const existingIds = new Set(merged.map(r => (r._id || r.id)));
          cached.forEach(c => {
            const id = c._id || c.id;
            if (!id) return;
            if (!existingIds.has(id)) {
              merged.push({
                ...c,
                managerRemarks: c.managerRemarks || '',
                _norm: {
                  ...(c._norm || {}),
                  status: (c._norm?.status || c.status || 'pending'),
                }
              });
            } else {
              merged = merged.map(r => {
                if ((r._id || r.id) !== id) return r;
                return {
                  ...r,
                  managerRemarks: c.managerRemarks || r.managerRemarks || '',
                  status: c.status || r.status,
                  _norm: { ...r._norm, status: c._norm?.status || c.status || r._norm?.status }
                };
              });
            }
          });
        }
      }


      const withNames = await hydrateEmployeeNames(merged);
      setLeaveRequests(withNames);
    } catch (err) {
      dbg('Fetch error:', err);
      alertify.error(err?.response?.data?.message || 'Failed to fetch leave requests');
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { fetchLeaveRequests(); }, []);

  const fetchRemovalRequests = useCallback(async (page = 1) => {
    try {
      setRemovalLoading(true);
      const res = await getRemovalRequests({
        status: removalStatusFilter === 'all' ? undefined : removalStatusFilter,
        page,
        limit: 10,
      });
      if (res.success && res.data?.requests) {
        setRemovalRequests(res.data.requests);
        setRemovalPagination(res.pagination || null);
      } else {
        setRemovalRequests([]);
        setRemovalPagination(null);
      }
    } catch (err) {
      alertify.error(err?.message || 'Failed to fetch removal requests');
      setRemovalRequests([]);
      setRemovalPagination(null);
    } finally {
      setRemovalLoading(false);
    }
  }, [removalStatusFilter]);

  useEffect(() => {
    if (activeSection === 'removalRequests') fetchRemovalRequests(removalPage);
  }, [activeSection, removalPage, removalStatusFilter]);

  const openRemovalDetail = async (req) => {
    if (!req?._id) return;
    try {
      const res = await getRemovalRequest(req._id);
      if (res.success && res.data) {
        setSelectedRemoval(res.data);
        setRemovalResponseRemark('');
        setShowRemovalDetailModal(true);
      }
    } catch (e) {
      alertify.error(e?.message || 'Failed to load request details');
    }
  };

  const handleAcceptRemoval = async () => {
    if (!selectedRemoval?._id) return;
    setRemovalActionLoading('accept');
    try {
      await acceptRemovalRequest(selectedRemoval._id, { responseRemark: removalResponseRemark.trim() || undefined });
      alertify.success('Request accepted. Sandwich leave has been removed.');
      setShowRemovalDetailModal(false);
      setSelectedRemoval(null);
      fetchRemovalRequests(removalPage);
    } catch (e) {
      alertify.error(e?.message || 'Failed to accept request');
    } finally {
      setRemovalActionLoading(null);
    }
  };

  const handleRejectRemoval = async () => {
    if (!selectedRemoval?._id) return;
    setRemovalActionLoading('reject');
    try {
      await rejectRemovalRequest(selectedRemoval._id, { responseRemark: removalResponseRemark.trim() || undefined });
      alertify.success('Request rejected.');
      setShowRemovalDetailModal(false);
      setSelectedRemoval(null);
      fetchRemovalRequests(removalPage);
    } catch (e) {
      alertify.error(e?.message || 'Failed to reject request');
    } finally {
      setRemovalActionLoading(null);
    }
  };

  const formatRemovalDate = (raw) => {
    if (!raw) return '—';
    const d = typeof raw === 'string' ? new Date(raw) : raw;
    return isNaN(d.getTime()) ? raw : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };


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


  // Search + status filter
  const filteredLeaves = leaveRequests.filter(l => {
    const nm = (l._norm?.employeeName || '').toLowerCase();
    const matchesSearch = nm.includes(searchTerm.toLowerCase());
    const st = (l._norm?.status || 'pending').toLowerCase();
    const matchesStatus = statusFilter === 'all' || st === statusFilter;
    return matchesSearch && matchesStatus;
  });


  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredLeaves.length / recordsPerPage));
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex   = startIndex + recordsPerPage;
  const currentLeaves = filteredLeaves.slice(startIndex, endIndex);


  // Clamp current page if filters reduce total pages
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]); // eslint-disable-line react-hooks/exhaustive-deps


  const openAction = (leave, type) => {
    setSelectedLeave(leave);
    setActionType(type);
    setManagerRemarks('');
    setRemarksError('');
    setShowActionModal(true);
  };


  const applyLocalDecision = (leaveId, newStatus, remarks = '') => {
    setLeaveRequests(prev =>
      prev.map(r => {
        const match = (r._id || r.id) === leaveId;
        if (!match) return r;
        const updated = {
          ...r,
          status: newStatus,
          managerRemarks: remarks?.trim(),
          _norm: { ...r._norm, status: newStatus }
        };
        saveDecisionToCache(updated);
        return updated;
      })
    );
    setSelectedLeave(prev => {
      if (!prev || (prev._id || prev.id) !== leaveId) return prev;
      const updated = { ...prev, status: newStatus, managerRemarks: remarks?.trim(), _norm: { ...prev._norm, status: newStatus } };
      saveDecisionToCache(updated);
      return updated;
    });
  };


  const submitManagerDecision = async () => {
    if (!selectedLeave || !actionType) return;
    // Remarks required on reject
    if (actionType === 'rejected' && !managerRemarks.trim()) {
      setRemarksError('Please enter the remarks.');
      alertify.error('Please enter the remarks.');
      return;
    }


    const leaveId = selectedLeave._id || selectedLeave.id;
    setActionLoading(p => ({ ...p, [leaveId]: actionType }));
    try {
      const payload = { status: actionType, managerRemarks: managerRemarks?.trim() || '' };
      const url = ENDPOINTS.managerApprove(leaveId);
      dbg('PATCH', url, payload);
      const { data } = await axios.patch(url, payload, { withCredentials: true });


      if (data?.success) {
        applyLocalDecision(leaveId, actionType, managerRemarks);
        alertify.success(`Leave ${actionType} successfully`);
        setShowActionModal(false);
        setShowDetailsModal(false);
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
        <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Leave Requests...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch the information</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="p-6">
      {/* Section tabs: Leave Requests | Sandwich Leave Removal */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveSection('leaveRequests')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeSection === 'leaveRequests'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Leave Requests
        </button>
        <button
          onClick={() => setActiveSection('removalRequests')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeSection === 'removalRequests'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Sandwich Leave Removal
        </button>
      </div>

      {/* Leave Requests section */}
      {activeSection === 'leaveRequests' && (
        <>
      {/* Header Stats */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
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


      {/* Search + Status (one line) */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
        <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
          {/* LEFT: Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>


          {/* RIGHT: Status filter */}
          <div className="flex items-center gap-2 w-[220px]">
            <Filter className="text-gray-400 shrink-0" size={18} />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                const createdFinal = leave._norm?.createdFinal;
                const status = leave._norm?.status || 'pending';
                const reason = leave._norm?.reason || leave.reason || 'N/A';
                const remarks = leave.managerRemarks || '';


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


                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(status)}
                        {status !== 'pending' && remarks ? (
                          <div className="flex items-start gap-1 text-xs italic text-gray-600 mt-1" title={remarks}>
                            {/* <MessageSquare size={12} className="mt-0.5" />
                            <span className="line-clamp-1">“{remarks}”</span> */}
                          </div>
                        ) : null}
                      </div>
                    </td>


                    <td className="py-4 px-6">
                      <p className="text-sm text-gray-600">
                        {formatDateDisplay(createdFinal)}
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
              {searchTerm || statusFilter !== 'all' ? 'No leave requests found matching your criteria' : 'No leave requests found'}
            </p>
            <p className="text-gray-400 text-sm">
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'When employees submit leave, they will appear here'}
            </p>
          </div>
        )}
      </div>


      {/* Pagination (compact + smooth) */}
      {Math.max(1, Math.ceil(filteredLeaves.length / recordsPerPage)) > 1 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {filteredLeaves.length ? startIndex + 1 : 0} to {Math.min(endIndex, filteredLeaves.length)} of {filteredLeaves.length} requests
          </div>


          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              « First
            </button>


            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ‹ Prev
            </button>


            <div className="flex items-center gap-1">
              {makePages(Math.max(1, Math.ceil(filteredLeaves.length / recordsPerPage)), currentPage, 1).map((p, idx) =>
                p === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="px-2 text-gray-500 select-none">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                      currentPage === p ? 'bg-blue-500 text-white shadow' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>


            <button
              onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(filteredLeaves.length / recordsPerPage)), p + 1))}
              disabled={currentPage === Math.max(1, Math.ceil(filteredLeaves.length / recordsPerPage))}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next ›
            </button>


            <button
              onClick={() => setCurrentPage(Math.max(1, Math.ceil(filteredLeaves.length / recordsPerPage)))}
              disabled={currentPage === Math.max(1, Math.ceil(filteredLeaves.length / recordsPerPage))}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last »
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* Sandwich Leave Removal section */}
      {activeSection === 'removalRequests' && (
        <>
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
            <div className="flex flex-row items-center justify-between gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-2 w-[200px]">
                <Filter className="text-gray-400 shrink-0" size={18} />
                <select
                  value={removalStatusFilter}
                  onChange={(e) => { setRemovalStatusFilter(e.target.value); setRemovalPage(1); }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {removalLoading ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Employee</th>
                      <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Reason</th>
                      <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                      <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Submitted At</th>
                      <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {removalRequests.map((req) => {
                      const emp = req.employee || {};
                      const status = (req.status || 'pending').toLowerCase();
                      return (
                        <tr key={req._id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-medium text-gray-800">{emp.employeeName || '—'}</p>
                              <p className="text-sm text-gray-500">{emp.empId || '—'} • {emp.department || '—'}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6 max-w-xs">
                            <p className="text-gray-700 truncate" title={req.reason}>{req.reason || '—'}</p>
                          </td>
                          <td className="py-4 px-6">
                            {status === 'pending' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700"><Clock size={12} /> Pending</span>}
                            {status === 'accepted' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle size={12} /> Accepted</span>}
                            {status === 'rejected' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700"><XCircle size={12} /> Rejected</span>}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600">{formatRemovalDate(req.submittedAt)}</td>
                          <td className="py-4 px-6">
                            <button
                              onClick={() => openRemovalDetail(req)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1"
                              title="View details / Accept / Reject"
                            >
                              <Eye size={16} /> View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!removalLoading && removalRequests.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No sandwich leave removal requests found</p>
              </div>
            )}
            {removalPagination && removalPagination.totalPages > 1 && !removalLoading && (
              <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
                <span className="text-sm text-gray-600">
                  Showing {(removalPagination.currentPage - 1) * removalPagination.limit + 1} to{' '}
                  {Math.min(removalPagination.currentPage * removalPagination.limit, removalPagination.totalCount)} of {removalPagination.totalCount}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRemovalPage((p) => Math.max(1, p - 1))}
                    disabled={!removalPagination.hasPrevPage}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setRemovalPage((p) => p + 1)}
                    disabled={!removalPagination.hasNextPage}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Removal request detail modal */}
      {showRemovalDetailModal && selectedRemoval && (
        <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4" onClick={() => setShowRemovalDetailModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Sandwich Leave Removal Request</h2>
                  <p className="text-amber-100 text-sm">HR requested to remove (waive) a sandwich leave</p>
                </div>
                <button onClick={() => setShowRemovalDetailModal(false)} className="text-white hover:text-amber-200 text-2xl font-bold">×</button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Employee</h3>
                <p className="font-medium text-gray-800">{selectedRemoval.employee?.employeeName || '—'}</p>
                <p className="text-sm text-gray-600">{selectedRemoval.employee?.empId || '—'} • {selectedRemoval.employee?.department || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Sandwich leave</h3>
                <p className="text-sm text-gray-800">Date: {selectedRemoval.sandwichLeaveSnapshot?.date ? formatRemovalDate(selectedRemoval.sandwichLeaveSnapshot.date) : '—'}</p>
                <p className="text-sm text-gray-600">Remarks: {selectedRemoval.sandwichLeaveSnapshot?.remarks || '—'}</p>
                <p className="text-sm text-gray-600">Days count: {selectedRemoval.sandwichLeaveSnapshot?.daysCount ?? '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Reason for removal</h3>
                <p className="text-gray-800">{selectedRemoval.reason || '—'}</p>
              </div>
              {(selectedRemoval.attachments && selectedRemoval.attachments.length > 0) && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 mb-2">Attachments</h3>
                  <ul className="space-y-1">
                    {selectedRemoval.attachments.map((att, i) => (
                      <li key={i}>
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          <ExternalLink size={14} /> {att.originalName || 'Attachment'}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Submitted by</h3>
                <p className="text-sm text-gray-800">{selectedRemoval.submittedBy?.employeeName || '—'} ({selectedRemoval.submittedBy?.empId || '—'}) • {selectedRemoval.submittedAt ? formatRemovalDate(selectedRemoval.submittedAt) : '—'}</p>
              </div>
              {(selectedRemoval.status === 'accepted' || selectedRemoval.status === 'rejected') && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 mb-2">Response</h3>
                  <p className="text-sm text-gray-600">By {selectedRemoval.respondedBy?.employeeName || selectedRemoval.respondedBy || '—'} at {formatRemovalDate(selectedRemoval.respondedAt)}</p>
                  {selectedRemoval.responseRemark && <p className="text-gray-800 mt-1">{selectedRemoval.responseRemark}</p>}
                </div>
              )}
              {selectedRemoval.status === 'pending' && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your remark (optional)</label>
                  <textarea
                    value={removalResponseRemark}
                    onChange={(e) => setRemovalResponseRemark(e.target.value)}
                    placeholder="e.g. Approved as per medical proof."
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleAcceptRemoval}
                      disabled={removalActionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                      {removalActionLoading === 'accept' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={16} />}
                      Accept
                    </button>
                    <button
                      onClick={handleRejectRemoval}
                      disabled={removalActionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      {removalActionLoading === 'reject' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <XCircle size={16} />}
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLeave && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2">Current Status</p>
                    {getStatusBadge(selectedLeave._norm?.status || getStatus(selectedLeave))}
                    {(selectedLeave._norm?.status || getStatus(selectedLeave)) !== 'pending' && (selectedLeave.managerRemarks) ? (
                      <div className="mt-3 p-3 rounded-lg bg-white/70 border border-purple-100">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                          <MessageSquare size={14} />
                          <span>Manager Remarks</span>
                        </div>
                        <p className="text-gray-800">{selectedLeave.managerRemarks}</p>
                      </div>
                    ) : null}
                  </div>


                  {(selectedLeave._norm?.status || getStatus(selectedLeave)) === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => openAction(selectedLeave, 'approved')}
                        disabled={actionLoading[selectedLeave._id]}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                          actionLoading[selectedLeave._id] === 'approved'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        <CheckCircle size={16} />
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
                        <XCircle size={16} />
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
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowActionModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager Remarks{actionType === 'rejected' ? <span className="text-red-600"> *</span> : null}
                </label>
                <textarea
                  value={managerRemarks}
                  onChange={(e) => { setManagerRemarks(e.target.value); if (remarksError) setRemarksError(''); }}
                  placeholder={actionType === 'rejected' ? 'Please enter the remarks.' : 'Add a note for the employee (optional)'}
                  className={`w-full min-h-[100px] p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                    remarksError ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {remarksError ? <p className="mt-1 text-xs text-red-600">{remarksError}</p> : null}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => { setShowActionModal(false); setRemarksError(''); }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitManagerDecision}
                  className={`px-4 py-2 rounded-lg text-white font-semibold transition ${
                    actionType === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionType === 'approved' ? 'Confirm Approve' : 'Confirm Reject'}
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



