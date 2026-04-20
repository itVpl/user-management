import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';
import {
  Search,
  Users,
  UserX,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Minus,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown
} from 'lucide-react';
import API_CONFIG from '../../config/api.js';

const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];

const getToken = () =>
  sessionStorage.getItem('token') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('authToken') ||
  localStorage.getItem('authToken') ||
  null;

const formatEmpDisplayName = (row) => {
  const name = (row?.employeeName || '').trim();
  const alias = (row?.aliasName != null ? String(row.aliasName) : '').trim();
  if (!name && !alias) return '—';
  if (alias && name) return `${name} (${alias})`;
  return name || alias;
};

const escapeCsvCell = (val) => {
  const s = val == null ? '' : String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

/** Maps API fields like todayLogin / isLogin to a display string */
const formatTodayLogin = (row) => {
  const raw =
    row?.todayLogin ??
    row?.today_login ??
    row?.isTodayLogin ??
    row?.is_today_login ??
    row?.isLogin ??
    row?.is_login;
  if (raw === true || raw === 'true' || raw === 1) return 'Yes';
  if (raw === false || raw === 'false' || raw === 0) return 'No';
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
  return '—';
};

const getTodayLoginRaw = (row) =>
  row?.todayLogin ??
  row?.today_login ??
  row?.isTodayLogin ??
  row?.is_today_login ??
  row?.isLogin ??
  row?.is_login;

/** @typedef {'empName'|'status'|'calls'|'todayLogin'|'carrier'|'rateRequest'|'softwareSell'|'totalCarrier'|'totalRR'|'totalSoftwareSell'} SortColumnKey */

/** @param {Record<string, unknown>} row @param {SortColumnKey} key */
function getSortValue(row, key) {
  switch (key) {
    case 'empName':
      return formatEmpDisplayName(row).toLowerCase();
    case 'status':
      return String(row?.status ?? '').trim().toLowerCase();
    case 'calls':
      return Number(row?.calls ?? 0);
    case 'todayLogin': {
      const raw = getTodayLoginRaw(row);
      if (raw === true || raw === 'true' || raw === 1) return 1;
      if (raw === false || raw === 'false' || raw === 0) return 0;
      const label = formatTodayLogin(row).toLowerCase();
      if (label === 'yes') return 1;
      if (label === 'no') return 0;
      return -1;
    }
    case 'carrier':
      return Number(row?.Truckers ?? 0);
    case 'rateRequest':
      return Number(row?.Load ?? 0);
    case 'softwareSell':
      return Number(row?.softwareSell ?? 0);
    case 'totalCarrier':
      return Number(row?.totalTrucker ?? 0);
    case 'totalRR':
      return Number(row?.totalLoadAssign ?? 0);
    case 'totalSoftwareSell':
      return Number(row?.totalSoftwareSell ?? 0);
    default:
      return '';
  }
}

/** @param {unknown} a @param {unknown} b @param {'asc'|'desc'} direction */
function compareSortValues(a, b, direction) {
  const typeA = typeof a;
  const typeB = typeof b;
  if (typeA === 'number' && typeB === 'number' && !Number.isNaN(a) && !Number.isNaN(b)) {
    const n = /** @type {number} */ (a) - /** @type {number} */ (b);
    return direction === 'asc' ? n : -n;
  }
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  const cmp = sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? cmp : -cmp;
}

/**
 * @param {object} props
 * @param {string} props.label
 * @param {SortColumnKey} props.columnKey
 * @param {SortColumnKey | null} props.sortKey
 * @param {'asc'|'desc'} props.sortDir
 * @param {(k: SortColumnKey) => void} props.onSort
 */
function SortableTh({ label, columnKey, sortKey, sortDir, onSort }) {
  const active = sortKey === columnKey;
  const sortHint = active
    ? sortDir === 'asc'
      ? `Sorted low → high. Click for high → low.`
      : `Sorted high → low. Click for low → high.`
    : 'Click to sort';

  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      className="text-left align-bottom py-3 px-2 sm:px-3"
    >
      <button
        type="button"
        title={sortHint}
        aria-label={
          active
            ? `${label}: ${sortDir === 'asc' ? 'ascending' : 'descending'}. Activate to reverse order.`
            : `${label}: not sorted. Activate to sort ascending.`
        }
        onClick={() => onSort(columnKey)}
        className={[
          'group flex w-full min-h-[2.5rem] max-w-full min-w-0 items-center gap-2 rounded-lg border text-left text-sm sm:text-base transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
          active
            ? 'border-blue-200/90 bg-gradient-to-b from-blue-50 to-blue-50/70 px-2.5 py-2 text-blue-900 shadow-sm ring-1 ring-blue-100/80'
            : 'border-transparent bg-transparent px-2 py-2 text-gray-800 hover:border-gray-200 hover:bg-gray-50'
        ].join(' ')}
      >
        <span
          className={[
            'min-w-0 flex-1 truncate leading-snug',
            active ? 'font-semibold tracking-tight' : 'font-medium group-hover:text-gray-900'
          ].join(' ')}
        >
          {label}
        </span>
        <span className="inline-flex shrink-0 flex-col items-stretch gap-0.5" aria-hidden>
          {!active ? (
            <span className="inline-flex items-center justify-center rounded-md p-0.5 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600">
              <ChevronsUpDown size={16} strokeWidth={2.25} />
            </span>
          ) : sortDir === 'asc' ? (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-1.5 py-1 text-[10px] font-bold uppercase leading-none tracking-wide text-white shadow-sm"
              title="Ascending"
            >
              <ArrowUp size={13} strokeWidth={2.75} className="shrink-0" />
              <span className="hidden sm:inline">Asc</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-1.5 py-1 text-[10px] font-bold uppercase leading-none tracking-wide text-white shadow-sm"
              title="Descending"
            >
              <ArrowDown size={13} strokeWidth={2.75} className="shrink-0" />
              <span className="hidden sm:inline">Desc</span>
            </span>
          )}
        </span>
      </button>
    </th>
  );
}

function StatusBadge({ status }) {
  const s = String(status ?? '').trim().toLowerCase();
  if (s === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200/90">
        <CheckCircle size={14} className="text-emerald-600 shrink-0" strokeWidth={2.5} aria-hidden />
        Active
      </span>
    );
  }
  if (s === 'inactive') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-rose-50 text-rose-800 border-rose-200/90">
        <XCircle size={14} className="text-rose-600 shrink-0" strokeWidth={2.5} aria-hidden />
        Inactive
      </span>
    );
  }
  const label = String(status ?? '').trim() || '—';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-50 text-gray-700 border-gray-200">
      <Minus size={14} className="text-gray-500 shrink-0" strokeWidth={2.5} aria-hidden />
      {label}
    </span>
  );
}

function TodayLoginBadge({ row }) {
  const raw = getTodayLoginRaw(row);
  const label = formatTodayLogin(row);
  const yes =
    raw === true ||
    raw === 'true' ||
    raw === 1 ||
    String(label).toLowerCase() === 'yes';
  const no =
    raw === false ||
    raw === 'false' ||
    raw === 0 ||
    String(label).toLowerCase() === 'no';

  if (yes) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-sky-50 text-sky-900 border-sky-200/90">
        <LogIn size={14} className="text-sky-600 shrink-0" strokeWidth={2.5} aria-hidden />
        Yes
      </span>
    );
  }
  if (no) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-900 border-amber-200/90">
        <LogOut size={14} className="text-amber-700 shrink-0" strokeWidth={2.5} aria-hidden />
        No
      </span>
    );
  }
  if (!label || label === '—') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-50 text-gray-500 border-gray-200">
        <Minus size={14} className="text-gray-400 shrink-0" strokeWidth={2.5} aria-hidden />
        —
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-violet-50 text-violet-900 border-violet-200/90">
      <LogIn size={14} className="text-violet-600 shrink-0 opacity-80" strokeWidth={2.5} aria-hidden />
      {label}
    </span>
  );
}

export default function CmtDeptReport() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState({
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
  });
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [status, setStatus] = useState('active');
  /** When true, load `/cmt/users-call-summary` (calls / in / out); metrics columns show — */
  const [callSummaryMode, setCallSummaryMode] = useState(false);
  // const [isLogin, setIsLogin] = useState('false'); // logged-in filter paused for now
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortKey, setSortKey] = useState(/** @type {SortColumnKey | null} */ (null));
  const [sortDir, setSortDir] = useState(/** @type {'asc' | 'desc'} */ ('asc'));

  const presets = {
    Today: [new Date(), new Date()],
    Yesterday: [addDays(new Date(), -1), addDays(new Date(), -1)],
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

  const startDateStr = useMemo(
    () => (range.startDate ? format(range.startDate, 'yyyy-MM-dd') : null),
    [range.startDate]
  );
  const endDateStr = useMemo(() => (range.endDate ? format(range.endDate, 'yyyy-MM-dd') : null), [range.endDate]);

  const token = useMemo(() => getToken(), []);
  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const fetchSummary = useCallback(async () => {
    if (!startDateStr || !endDateStr) {
      setRows([]);
      return;
    }
    const base = `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/cmt`;
    const summaryParams = {
      startDate: startDateStr,
      endDate: endDateStr,
      status
    };
    try {
      setLoading(true);

      if (!callSummaryMode) {
        const res = await axios.get(`${base}/users-summary`, {
          headers: authHeaders,
          params: summaryParams,
          withCredentials: true
        });
        setRows(Array.isArray(res?.data?.users) ? res.data.users : []);
        return;
      }

      const [summaryRes, callRes] = await Promise.all([
        axios.get(`${base}/users-summary`, {
          headers: authHeaders,
          params: summaryParams,
          withCredentials: true
        }),
        axios.get(`${base}/users-call-summary`, {
          headers: authHeaders,
          params: { startDate: startDateStr, endDate: endDateStr },
          withCredentials: true
        })
      ]);

      const summaryUsers = Array.isArray(summaryRes?.data?.users) ? summaryRes.data.users : [];
      const callUsers = Array.isArray(callRes?.data?.users) ? callRes.data.users : [];
      const callByEmpId = new Map(
        callUsers.map((u) => [String(u?.empId ?? '').trim(), u])
      );

      const merged = summaryUsers.map((row) => {
        const id = String(row?.empId ?? '').trim();
        const c = callByEmpId.get(id);
        return {
          ...row,
          calls: c?.calls ?? 0,
          incomingCalls: c?.incomingCalls ?? 0,
          outgoingCalls: c?.outgoingCalls ?? 0
        };
      });

      setRows(merged);
    } catch (error) {
      console.error('Failed to fetch CMT report:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, startDateStr, endDateStr, status, callSummaryMode]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const filteredRows = useMemo(() => {
    const list = rows;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;
    return list.filter((row) => {
      const empName = (row?.employeeName || '').toLowerCase();
      const empId = (row?.empId || '').toLowerCase();
      const aliasName = (row?.aliasName || '').toLowerCase();
      const rowStatus = (row?.status || '').toLowerCase();
      const todayLogin = formatTodayLogin(row).toLowerCase();
      const callsStr = String(row?.calls ?? '').toLowerCase();
      return (
        empName.includes(term) ||
        empId.includes(term) ||
        aliasName.includes(term) ||
        rowStatus.includes(term) ||
        (todayLogin !== '—' && todayLogin.includes(term)) ||
        callsStr.includes(term)
      );
    });
  }, [rows, searchTerm]);

  const handleColumnSort = useCallback((key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    }
  }, [sortKey]);

  const sortedFilteredRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const key = sortKey;
    const dir = sortDir;
    return [...filteredRows].sort((rowA, rowB) => {
      const va = getSortValue(rowA, key);
      const vb = getSortValue(rowB, key);
      return compareSortValues(va, vb, dir);
    });
  }, [filteredRows, sortKey, sortDir]);

  const totalCount = sortedFilteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedFilteredRows.slice(start, start + limit);
  }, [sortedFilteredRows, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, limit, startDateStr, endDateStr, status, callSummaryMode]);

  const activeCount = useMemo(
    () => rows.filter((r) => String(r?.status || '').toLowerCase() === 'active').length,
    [rows]
  );
  const inactiveCount = useMemo(
    () => rows.filter((r) => String(r?.status || '').toLowerCase() === 'inactive').length,
    [rows]
  );

  /** `withDateRange`: false for Total Carrier — only empId (no start/end in URL). */
  const openTruckerReportForRow = (row, { withDateRange = true } = {}) => {
    if (!row?.empId) return;
    if (withDateRange && (!startDateStr || !endDateStr)) return;
    const q = new URLSearchParams({ empId: String(row.empId) });
    if (withDateRange && startDateStr && endDateStr) {
      q.set('startDate', startDateStr);
      q.set('endDate', endDateStr);
    }
    navigate(`/TruckerReport?${q.toString()}`);
  };

  const openRateRequestReportForRow = (row, { withDateRange = true } = {}) => {
    if (!row?.empId) return;
    if (withDateRange && (!startDateStr || !endDateStr)) return;
    const q = new URLSearchParams({ cmtEmpId: String(row.empId) });
    if (withDateRange && startDateStr && endDateStr) {
      q.set('startDate', startDateStr);
      q.set('endDate', endDateStr);
    }
    const name = (row?.employeeName || '').trim();
    navigate(
      `/RateRequestReport?${q.toString()}`,
      name ? { state: { cmtRateReportEmployeeName: name } } : undefined
    );
  };

  const handleExportToExcel = () => {
    if (!startDateStr || !endDateStr || sortedFilteredRows.length === 0) return;
    const headers = [
      'Emp Name',
      'Status',
      'Calls',
      'Today Login',
      'Carrier',
      'Rate Request',
      'Software Sell',
      'Total Carrier',
      'Total RR',
      'Total Software Sell'
    ];
    let csv = '\uFEFF';
    csv += `${escapeCsvCell('Filter Start Date')},${escapeCsvCell(startDateStr)}\n`;
    csv += `${escapeCsvCell('Filter End Date')},${escapeCsvCell(endDateStr)}\n`;
    csv += '\n';
    csv += headers.map(escapeCsvCell).join(',') + '\n';
    for (const row of sortedFilteredRows) {
      csv +=
        [
          formatEmpDisplayName(row),
          row?.status ?? '',
          callSummaryMode
            ? `${row?.calls ?? 0} (in ${row?.incomingCalls ?? 0} / out ${row?.outgoingCalls ?? 0})`
            : '—',
          formatTodayLogin(row),
          row?.Truckers ?? 0,
          row?.Load ?? 0,
          row?.softwareSell ?? 0,
          row?.totalTrucker ?? 0,
          row?.totalLoadAssign ?? 0,
          row?.totalSoftwareSell ?? 0
        ]
          .map(escapeCsvCell)
          .join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CMT_users_summary_${startDateStr}_to_${endDateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users size={22} className="text-blue-700" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
              Total Users: {rows.length}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <UserCheck size={22} className="text-green-700" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
              Active: {activeCount}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <UserX size={22} className="text-red-700" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
              Inactive: {inactiveCount}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2 xl:col-span-1 xl:min-w-[280px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setShowPresetMenu((v) => !v)}
                className="w-full text-left px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors"
              >
                <span className="text-gray-800">
                  {range.startDate && range.endDate
                    ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                    : 'Select Date Range'}
                </span>
                <span className="ml-3 text-gray-400 shrink-0">▼</span>
              </button>

              {showPresetMenu && (
                <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-100 bg-white shadow-lg py-1 right-0">
                  <button
                    type="button"
                    onClick={() => {
                      setRange({ startDate: null, endDate: null, key: 'selection' });
                      setShowPresetMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600"
                  >
                    Clear Filter
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  {Object.keys(presets).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => applyPreset(lbl)}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                    >
                      {lbl}
                    </button>
                  ))}
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowPresetMenu(false);
                      setShowCustomRange(true);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    Custom Range
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-[45px] px-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex flex-col justify-end">
            {/* <label
              htmlFor="cmt-call-summary-mode"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Calls
            </label> */}
            <div className="h-[45px] px-3 border border-gray-200 rounded-lg bg-white flex items-center justify-between">
              <span className="text-sm text-gray-700">Calls</span>
              <button
                id="cmt-call-summary-mode"
                type="button"
                role="switch"
                aria-checked={callSummaryMode}
                onClick={() => setCallSummaryMode((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  callSummaryMode ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    callSummaryMode ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          {/* Login Status filter — paused for now
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login Status</label>
            <select
              value={isLogin}
              onChange={(e) => setIsLogin(e.target.value)}
              className="w-full h-[45px] px-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            >
              <option value="false">Not Logged In</option>
              <option value="true">Logged In</option>
            </select>
          </div>
          */}
          <div className="flex flex-col sm:flex-row gap-2 w-full xl:col-span-1 min-w-0">
            <button
              type="button"
              onClick={fetchSummary}
              className="h-[45px] flex-1 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={handleExportToExcel}
              disabled={!startDateStr || !endDateStr || sortedFilteredRows.length === 0 || loading}
              title={
                !startDateStr || !endDateStr
                  ? 'Select a date range first'
                  : sortedFilteredRows.length === 0
                    ? 'No rows to export'
                    : `Export (${startDateStr} → ${endDateStr})`
              }
              className={`h-[45px] flex-1 rounded-lg font-semibold border border-gray-200 flex items-center justify-center gap-2 transition-all ${
                !startDateStr || !endDateStr || sortedFilteredRows.length === 0 || loading
                  ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                  : 'text-gray-800 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FileSpreadsheet size={18} className="shrink-0" />
              Export to Excel
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search by Emp Name / Emp ID / Alias / Status / Today Login / Calls"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
          />
          <Search className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
        </div>
      </div>

      {showCustomRange && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4"
          onClick={() => setShowCustomRange(false)}
          role="presentation"
        >
          <div className="bg-white rounded-xl shadow-2xl p-4 max-w-[calc(100vw-2rem)]" onClick={(e) => e.stopPropagation()} role="presentation">
            <DateRange
              ranges={[range.startDate && range.endDate ? range : { startDate: new Date(), endDate: new Date(), key: 'selection' }]}
              onChange={(item) => {
                if (item.selection.startDate && item.selection.endDate) {
                  setRange(item.selection);
                }
              }}
              moveRangeOnFirstSelection={false}
              months={2}
              direction="horizontal"
            />
            <div className="flex justify-end gap-2 mt-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setRange({ startDate: null, endDate: null, key: 'selection' });
                  setShowCustomRange(false);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowCustomRange(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (range.startDate && range.endDate) {
                    setShowCustomRange(false);
                  }
                }}
                className={`px-4 py-2 rounded-lg ${
                  range.startDate && range.endDate
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!range.startDate || !range.endDate}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-blue-600" size={36} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-gray-200">
                  <tr>
                    <SortableTh
                      label="Emp Name"
                      columnKey="empName"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      label="Status"
                      columnKey="status"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      label="Calls"
                      columnKey="calls"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      label="Today Login"
                      columnKey="todayLogin"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      label="Carrier"
                      columnKey="carrier"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      label="Rate Request"
                      columnKey="rateRequest"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      label="Software Sell"
                      columnKey="softwareSell"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      label="Total Carrier"
                      columnKey="totalCarrier"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      label="Total RR"
                      columnKey="totalRR"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      label="Total Software Sell"
                      columnKey="totalSoftwareSell"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12">
                        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No records found</p>
                        <p className="text-gray-400 text-sm mt-1">Try changing filters or date range</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, index) => (
                      <tr key={`${row?.empId || row?.employeeName || 'row'}-${index}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4 text-sm text-gray-800 font-medium">{formatEmpDisplayName(row)}</td>
                        <td className="py-4 px-4">
                          <StatusBadge status={row?.status} />
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-800 font-medium tabular-nums">
                          {callSummaryMode ? (
                            <span title="Incoming / Outgoing">
                              {row?.calls ?? 0}
                              <span className="text-gray-500 font-normal text-xs ml-1">
                                ({row?.incomingCalls ?? 0}↓ / {row?.outgoingCalls ?? 0}↑)
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <TodayLoginBadge row={row} />
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-700">
                          {(row?.Truckers ?? 0) > 0 &&
                          startDateStr &&
                          endDateStr &&
                          row?.empId ? (
                            <button
                              type="button"
                              onClick={() => openTruckerReportForRow(row)}
                              className="font-medium text-blue-700 hover:text-blue-900 hover:underline cursor-pointer text-left"
                            >
                              {row?.Truckers ?? 0}
                            </button>
                          ) : (
                            <span className="font-medium text-gray-800 tabular-nums">{row?.Truckers ?? 0}</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-700">
                          {(row?.Load ?? 0) > 0 && startDateStr && endDateStr && row?.empId ? (
                            <button
                              type="button"
                              onClick={() => openRateRequestReportForRow(row)}
                              className="font-medium text-blue-700 hover:text-blue-900 hover:underline cursor-pointer text-left"
                            >
                              {row?.Load ?? 0}
                            </button>
                          ) : (
                            <span className="font-medium text-gray-800 tabular-nums">{row?.Load ?? 0}</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-700">{row?.softwareSell ?? 0}</td>
                        <td className="py-4 px-4 text-sm text-gray-700">
                          {(row?.totalTrucker ?? 0) > 0 && row?.empId ? (
                            <button
                              type="button"
                              onClick={() => openTruckerReportForRow(row, { withDateRange: false })}
                              className="font-medium text-blue-700 hover:text-blue-900 hover:underline cursor-pointer text-left"
                            >
                              {row?.totalTrucker ?? 0}
                            </button>
                          ) : (
                            <span className="font-medium text-gray-800 tabular-nums">{row?.totalTrucker ?? 0}</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-800 tabular-nums">
                          {row?.totalLoadAssign ?? 0}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-700">{row?.totalSoftwareSell ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-3 sm:p-4">
              <div className="flex w-full min-w-0 flex-nowrap items-center justify-between gap-2 sm:gap-4 overflow-x-auto">
                <div className="shrink-0 text-sm text-gray-600 whitespace-nowrap">
                  Showing {totalCount ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalCount)} of {totalCount}
                  {totalCount > 0 && <span className="text-gray-500"> · Page {page} of {totalPages}</span>}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                  <label htmlFor="cmt-page-limit" className="font-medium">Rows per page</label>
                  <select
                    id="cmt-page-limit"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="h-9 min-w-[88px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {PAGE_LIMIT_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex shrink-0 flex-nowrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 px-2 sm:px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    <ChevronLeft size={18} />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || totalCount === 0}
                    className="flex items-center gap-1 px-2 sm:px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    <span>Next</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
