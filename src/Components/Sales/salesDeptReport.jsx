import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { CheckCircle, XCircle, BarChart3, Search, Download } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import API_CONFIG from '../../config/api.js';

function ymd(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultStartDate() {
  return ymd(new Date());
}

function defaultEndDate() {
  return ymd(new Date());
}

/** Inclusive calendar days between YYYY-MM-DD strings */
function inclusiveDaySpan(startYmd, endYmd) {
  const s = new Date(`${startYmd}T12:00:00`);
  const e = new Date(`${endYmd}T12:00:00`);
  return Math.floor((e - s) / 86400000) + 1;
}

const PAGE_SIZE_OPTIONS = [25, 50, 75, 100, 125, 150, 175, 200];
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;
/** Page size when fetching all rows for Excel (API max). */
const EXPORT_FETCH_LIMIT = 200;

/** Keep in sync with `SALES_EMPLOYEE_METRICS_ADD_DISPATURE_OPTIONS` in `inhouseUserController.js`. */
const SALES_EMPLOYEE_METRICS_ADD_DISPATURE_OPTIONS = Object.freeze([
  'IDENTIFICA LLC',
  'MT. POCONO TRANSPORTATION INC',
  'V Power Logistics',
]);

/** Same surface as Sales dashboard sections (AgentDashboard). */
const vplSurfaceClass =
  'bg-white border border-[#C8C8C8] rounded-[17.59px]';
const vplSurfaceStyle = {
  boxShadow: '7.54px 7.54px 67.85px 0px rgba(0, 0, 0, 0.05)',
  borderWidth: '1.31px',
};

const fieldInputClass =
  'px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors hover:border-gray-400';
const filterLabelClass =
  'text-sm font-semibold text-gray-800 whitespace-nowrap';

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7Days', label: 'Last 7 Days' },
  { value: 'last30Days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
];

function parseYmdToDate(ymdValue) {
  if (!ymdValue) return null;
  const [y, m, d] = String(ymdValue).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function filterMetricsRowsBySearch(rows, tableSearch) {
  const q = tableSearch.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const target = [
      row.empId,
      row.employeeName,
      row.status,
      row.DO,
      row.Calls,
      row.Customer,
      row.RR,
      row.Software,
      row.marginPercent,
    ]
      .map((v) => (v == null ? '' : String(v).toLowerCase()))
      .join(' ');
    return target.includes(q);
  });
}

function getPresetRange(presetValue) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (presetValue === 'today') return { startDate: ymd(startOfToday), endDate: ymd(endOfToday) };
  if (presetValue === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { startDate: ymd(y), endDate: ymd(y) };
  }
  if (presetValue === 'last7Days') {
    const s = new Date(today);
    s.setDate(s.getDate() - 6);
    return { startDate: ymd(s), endDate: ymd(today) };
  }
  if (presetValue === 'last30Days') {
    const s = new Date(today);
    s.setDate(s.getDate() - 29);
    return { startDate: ymd(s), endDate: ymd(today) };
  }
  if (presetValue === 'thisMonth') {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { startDate: ymd(s), endDate: ymd(e) };
  }
  if (presetValue === 'lastMonth') {
    const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const e = new Date(today.getFullYear(), today.getMonth(), 0);
    return { startDate: ymd(s), endDate: ymd(e) };
  }
  return { startDate: defaultStartDate(), endDate: defaultEndDate() };
}

export default function SalesDeptReport() {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [empStatus, setEmpStatus] = useState('');
  const [empId, setEmpId] = useState('');
  /** Trims on send; empty = no filter (DO count & marginPercent only on backend). */
  const [addDispature, setAddDispature] = useState('');
  const [includeCalls, setIncludeCalls] = useState(true);

  const [salesEmployees, setSalesEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState('');
  const [datePreset, setDatePreset] = useState('today');
  const [showCustomRange, setShowCustomRange] = useState(false);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [meta, setMeta] = useState({
    callsIncluded: true,
    callsNote: null,
  });
  const [filtersEcho, setFiltersEcho] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [customRangeSelection, setCustomRangeSelection] = useState([
    {
      startDate: parseYmdToDate(defaultStartDate()),
      endDate: parseYmdToDate(defaultEndDate()),
      key: 'selection',
    },
  ]);

  const daySpan = useMemo(
    () => inclusiveDaySpan(startDate, endDate),
    [startDate, endDate]
  );

  useEffect(() => {
    if (daySpan > 31) setIncludeCalls(false);
    else setIncludeCalls(true);
  }, [daySpan]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, empStatus, empId, limit, includeCalls, addDispature]);

  const applyDatePreset = (presetValue) => {
    const next = getPresetRange(presetValue);
    setDatePreset(presetValue);
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    setCustomRangeSelection([
      {
        startDate: parseYmdToDate(next.startDate) || new Date(),
        endDate: parseYmdToDate(next.endDate) || new Date(),
        key: 'selection',
      },
    ]);
  };

  const upsertAuthHeaders = useCallback(() => {
    const token =
      sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const fetchSalesEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/Sales`,
        {
          headers: upsertAuthHeaders(),
          withCredentials: true,
        }
      );
      if (res.data && Array.isArray(res.data)) {
        setSalesEmployees(res.data);
      } else if (res.data?.success && Array.isArray(res.data.data)) {
        setSalesEmployees(res.data.data);
      } else if (Array.isArray(res.data?.employees)) {
        setSalesEmployees(res.data.employees);
      } else {
        setSalesEmployees([]);
      }
    } catch (err) {
      console.error('Sales employees fetch error:', err);
      setSalesEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  }, [upsertAuthHeaders]);

  useEffect(() => {
    fetchSalesEmployees();
  }, [fetchSalesEmployees]);

  const buildMetricsParams = useCallback(
    (pageNum, pageLimit) => {
      const params = new URLSearchParams();
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      params.set('page', String(pageNum));
      params.set(
        'limit',
        String(Math.min(MAX_PAGE_SIZE, Math.max(PAGE_SIZE_OPTIONS[0], pageLimit)))
      );
      if (empStatus === 'active' || empStatus === 'inactive') {
        params.set('empStatus', empStatus);
      }
      if (empId) params.set('empId', empId);
      params.set('includeCalls', includeCalls ? 'true' : 'false');
      const addDispatureTrimmed = addDispature.trim();
      if (addDispatureTrimmed) {
        params.set('addDispature', addDispatureTrimmed);
      }
      return params;
    },
    [startDate, endDate, empStatus, empId, includeCalls, addDispature]
  );

  const fetchMetrics = useCallback(async () => {
    if (!startDate || !endDate) return;
    if (startDate > endDate) {
      alertify.error('Start date cannot be after end date.');
      return;
    }
    if (daySpan > 92) {
      alertify.error('Date range cannot exceed 92 days.');
      return;
    }

    const addDispatureTrimmed = addDispature.trim();
    if (
      addDispatureTrimmed &&
      !SALES_EMPLOYEE_METRICS_ADD_DISPATURE_OPTIONS.includes(addDispatureTrimmed)
    ) {
      alertify.error(
        `Company (addDispature) must be exactly: ${SALES_EMPLOYEE_METRICS_ADD_DISPATURE_OPTIONS.join(
          '; '
        )}`
      );
      return;
    }

    try {
      setLoading(true);
      const params = buildMetricsParams(page, limit);

      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/sales/employee-metrics?${params.toString()}`,
        {
          headers: upsertAuthHeaders(),
          withCredentials: true,
        }
      );

      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
        const p = res.data.pagination || {};
        setPagination({
          page: p.page ?? page,
          limit: p.limit ?? limit,
          total: p.total ?? 0,
          totalPages: Math.max(1, p.totalPages ?? 1),
        });
        const m = res.data.meta || {};
        setMeta({
          callsIncluded: m.callsIncluded !== false,
          callsNote: m.callsNote ?? null,
        });
        setFiltersEcho(res.data.filters || null);
      } else {
        setRows([]);
        alertify.error(res.data?.message || 'Unable to load employee metrics.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to load sales employee metrics.';
      console.error('employee-metrics error:', err);
      alertify.error(msg);
      setRows([]);
      const body = err.response?.data;
      if (body?.filters) setFiltersEcho(body.filters);
    } finally {
      setLoading(false);
    }
  }, [
    startDate,
    endDate,
    page,
    limit,
    empStatus,
    empId,
    includeCalls,
    addDispature,
    daySpan,
    upsertAuthHeaders,
    buildMetricsParams,
  ]);

  useEffect(() => {
    if (employeesLoading) return;
    fetchMetrics();
  }, [employeesLoading, fetchMetrics]);

  const clearFilters = () => {
    const next = getPresetRange('today');
    setDatePreset('today');
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    setEmpStatus('');
    setEmpId('');
    setShowCustomRange(false);
    setLimit(DEFAULT_PAGE_SIZE);
    setAddDispature('');
    setTableSearch('');
    setCustomRangeSelection([
      {
        startDate: parseYmdToDate(next.startDate) || new Date(),
        endDate: parseYmdToDate(next.endDate) || new Date(),
        key: 'selection',
      },
    ]);
  };

  const formatMargin = (v) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
    return `${Number(v).toFixed(2)}%`;
  };

  const callsCell = (row) => {
    if (row.Calls === null || row.Calls === undefined) {
      return (
        <span
          className="text-gray-400 cursor-help border-b border-dotted border-gray-300"
          title={meta.callsNote || 'Call counts not included for this response.'}
        >
          —
        </span>
      );
    }
    return <span className="text-gray-800 tabular-nums">{row.Calls}</span>;
  };

  const employmentStatusClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return 'bg-green-100 text-green-800';
    if (s === 'inactive') return 'bg-gray-200 text-gray-700';
    return 'bg-blue-100 text-blue-800';
  };

  const visibleRows = useMemo(
    () => filterMetricsRowsBySearch(rows, tableSearch),
    [rows, tableSearch]
  );

  const exportToExcel = useCallback(async () => {
    if (!startDate || !endDate) return;
    if (startDate > endDate) {
      alertify.error('Start date cannot be after end date.');
      return;
    }
    if (daySpan > 92) {
      alertify.error('Date range cannot exceed 92 days.');
      return;
    }
    const addDispatureTrimmed = addDispature.trim();
    if (
      addDispatureTrimmed &&
      !SALES_EMPLOYEE_METRICS_ADD_DISPATURE_OPTIONS.includes(addDispatureTrimmed)
    ) {
      alertify.error(
        `Company (addDispature) must be exactly: ${SALES_EMPLOYEE_METRICS_ADD_DISPATURE_OPTIONS.join(
          '; '
        )}`
      );
      return;
    }

    try {
      setExportLoading(true);
      const allRows = [];
      let pageNum = 1;
      let totalPages = 1;
      const fetchLimit = Math.min(EXPORT_FETCH_LIMIT, MAX_PAGE_SIZE);

      do {
        const params = buildMetricsParams(pageNum, fetchLimit);
        const res = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/sales/employee-metrics?${params.toString()}`,
          {
            headers: upsertAuthHeaders(),
            withCredentials: true,
          }
        );
        if (!res.data?.success) {
          alertify.error(res.data?.message || 'Unable to load data for export.');
          return;
        }
        const chunk = Array.isArray(res.data.data) ? res.data.data : [];
        allRows.push(...chunk);
        const p = res.data.pagination || {};
        totalPages = Math.max(1, p.totalPages ?? 1);
        pageNum += 1;
      } while (pageNum <= totalPages);

      const exportRows = filterMetricsRowsBySearch(allRows, tableSearch);

      if (exportRows.length === 0) {
        alertify.warning('No rows to export for the current filters.');
        return;
      }

      const headers = [
        'Emp ID',
        'Name',
        'Margin %',
        'Logged in',
        'DO',
        'Calls',
        'Customer',
        'RR',
        'Software',
        'Status'
      ];

      const dataRows = exportRows.map((row) => [
        row.empId ?? '',
        row.employeeName ?? '',
        
        row.marginPercent === null ||
        row.marginPercent === undefined ||
        Number.isNaN(Number(row.marginPercent))
          ? ''
          : Number(row.marginPercent),
        
        row.isLogin ? 'Yes' : 'No',
        row.DO ?? '',
        row.Calls === null || row.Calls === undefined ? '' : row.Calls,
        row.Customer ?? '',
        row.RR ?? '',
        row.Software ?? '',
        row.status ?? '',
      ]);

      const worksheetData = [headers, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      ws['!cols'] = [
        { wch: 12 },
        { wch: 28 },
        { wch: 10 },
        { wch: 10 },
        { wch: 8 },
        { wch: 8 },
        { wch: 10 },
        { wch: 8 },
        { wch: 10 },
        { wch: 12 },
      ];

      const wsMeta = XLSX.utils.aoa_to_sheet([
        ['Report', 'Sales employee metrics'],
        ['Start date', startDate],
        ['End date', endDate],
        ['Emp status', empStatus || 'all'],
        ['Employee (empId)', empId || ''],
        ['Company (addDispature)', addDispatureTrimmed || ''],
        ['Include 8×8 calls', includeCalls ? 'yes' : 'no'],
        ['Calls in response', meta.callsIncluded ? 'included' : 'omitted'],
        ['Rows exported', String(exportRows.length)],
        ['Table search applied', tableSearch.trim() || '(none)'],
      ]);
      wsMeta['!cols'] = [{ wch: 22 }, { wch: 40 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Metrics');
      XLSX.utils.book_append_sheet(wb, wsMeta, 'Filters');

      const safeStart = startDate.replace(/[^\d-]/g, '');
      const safeEnd = endDate.replace(/[^\d-]/g, '');
      const filename = `Sales_Employee_Metrics_${safeStart}_${safeEnd}.xlsx`;
      XLSX.writeFile(wb, filename);
      alertify.success(`Exported ${exportRows.length} row(s).`);
    } catch (err) {
      console.error('Sales metrics Excel export:', err);
      alertify.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Export failed.'
      );
    } finally {
      setExportLoading(false);
    }
  }, [
    startDate,
    endDate,
    daySpan,
    addDispature,
    empStatus,
    empId,
    includeCalls,
    tableSearch,
    buildMetricsParams,
    upsertAuthHeaders,
    meta.callsIncluded,
  ]);

  if (employeesLoading) {
    return (
      <div className="p-4 md:p-6 font-poppins min-h-[50vh]">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm font-medium">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 font-poppins max-w-[1920px] mx-auto w-full">
      {/* <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">
          Sales Dept Report
        </h1>
      </div> */}

      <div className={`mb-4 p-4 md:p-5 space-y-4 ${vplSurfaceClass}`} style={vplSurfaceStyle}>
        <div className="w-full max-w-[360px] rounded-2xl border border-gray-200 bg-white px-5 py-4 min-h-[116px] flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-lg leading-tight font-semibold text-gray-600">Total Count</p>
            <p className="text-2xl leading-none font-bold text-gray-800 mt-4">{pagination.total}</p>
          </div>
          <div className="h-12 w-12 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative w-full min-w-0 flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search by employee, status, DO, calls, customer, RR, software"
              className={`w-full pl-10 ${fieldInputClass}`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={exportToExcel}
              disabled={exportLoading || loading || pagination.total === 0}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              title="Download all pages for current filters as .xlsx"
            >
              <Download className="w-4 h-4 shrink-0" />
              {exportLoading ? 'Exporting…' : 'Export Excel'}
            </button>
          <div
            className="inline-flex shrink-0 items-center gap-2.5 rounded-xl border border-gray-200/90 bg-gradient-to-b from-white to-gray-50/70 px-3 py-1.5 shadow-sm"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)' }}
            title={
              daySpan > 31
                ? 'Long ranges can be slow — turn off if you only need counts.'
                : 'Answered talk-time counts for the selected range.'
            }
          >
            <button
              type="button"
              role="switch"
              aria-checked={includeCalls}
              aria-label={includeCalls ? '8×8 calls included in metrics' : '8×8 calls omitted from metrics'}
              onClick={() => setIncludeCalls((v) => !v)}
              className={`
                group relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full
                transition-colors duration-200 ease-out
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                ${includeCalls ? 'bg-blue-600 shadow-inner' : 'bg-gray-300 hover:bg-gray-400/90'}
              `}
            >
              <span
                aria-hidden
                className={`
                  absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/[0.06]
                  transition-transform duration-200 ease-out
                  ${includeCalls ? 'translate-x-5 shadow-blue-900/10' : 'translate-x-0'}
                `}
              />
            </button>
            <span className="whitespace-nowrap text-sm font-semibold text-gray-800">
              Include 8×8 calls
            </span>
          </div>
          </div>
        </div>
      </div>

      <div className={`mb-6 p-4 md:p-5 ${vplSurfaceClass}`} style={vplSurfaceStyle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
          <div className="min-w-0">
            <label className={`${filterLabelClass} block mb-1.5`}>Date</label>
            <div className="relative">
              <select
                value={datePreset}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'customRange') {
                    setDatePreset('customRange');
                    setShowCustomRange(true);
                    return;
                  }
                  applyDatePreset(v);
                }}
                className={`${fieldInputClass} h-[42px] w-full pr-8 appearance-none`}
              >
                {DATE_PRESETS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="customRange">Custom Range</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
            </div>
          </div>

          <div className="min-w-0">
            <label className={`${filterLabelClass} block mb-1.5`}>Status</label>
            <div className="relative">
              <select
                value={empStatus}
                onChange={(e) => setEmpStatus(e.target.value)}
                className={`${fieldInputClass} h-[42px] w-full pr-8 appearance-none`}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
            </div>
          </div>

          <div className="min-w-0">
            <label className={`${filterLabelClass} block mb-1.5`}>Employee</label>
            <div className="relative">
              <select
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className={`${fieldInputClass} h-[42px] w-full pr-8 appearance-none`}
              >
                <option value="">All sales employees</option>
                {salesEmployees.map((employee, index) => {
                  const value = employee.empId || '';
                  const label = `${employee.employeeName || employee.name || 'Unknown'} (${employee.empId || '—'})`;
                  return (
                    <option key={employee._id || `${value}-${index}`} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
            </div>
          </div>

          <div className="min-w-0">
            <label
              className={`${filterLabelClass} block mb-1.5`}
              title="Filters DO count and margin % only (doModel addDispature)."
            >
              Company
            </label>
            <div className="relative">
              <select
                value={addDispature}
                onChange={(e) => setAddDispature(e.target.value)}
                className={`${fieldInputClass} h-[42px] w-full pr-8 appearance-none`}
              >
                <option value="">All</option>
                {SALES_EMPLOYEE_METRICS_ADD_DISPATURE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
            </div>
          </div>

          <div className="min-w-0 flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full whitespace-nowrap px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {showCustomRange && (
        <div className="fixed inset-0 z-[60] bg-black/35 flex items-center justify-center p-3 sm:p-4" onClick={() => setShowCustomRange(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[760px] max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 sm:px-5 pt-3.5 sm:pt-4 pb-2.5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Custom Date Range</h3>
              <p className="text-sm text-gray-500 mt-1">Select start and end date</p>
            </div>
            <div className="px-3 sm:px-4 py-3 overflow-auto max-h-[calc(90vh-130px)]">
              <div className="rounded-xl border border-gray-100 inline-block align-top">
                <DateRange
                  ranges={customRangeSelection}
                  onChange={(item) => {
                    setCustomRangeSelection([item.selection]);
                  }}
                  moveRangeOnFirstSelection={false}
                  months={2}
                  direction="horizontal"
                />
              </div>
            </div>
            <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = getPresetRange('today');
                  setDatePreset('today');
                  setStartDate(next.startDate);
                  setEndDate(next.endDate);
                  setCustomRangeSelection([
                    {
                      startDate: parseYmdToDate(next.startDate) || new Date(),
                      endDate: parseYmdToDate(next.endDate) || new Date(),
                      key: 'selection',
                    },
                  ]);
                  setShowCustomRange(false);
                }}
                className="h-[40px] px-4 border rounded-xl hover:bg-gray-50 text-sm font-medium"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowCustomRange(false)}
                className="h-[40px] px-4 border rounded-xl hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const selection = customRangeSelection[0];
                  if (selection?.startDate && selection?.endDate) {
                    setDatePreset('customRange');
                    setStartDate(ymd(selection.startDate));
                    setEndDate(ymd(selection.endDate));
                    setShowCustomRange(false);
                  }
                }}
                className={`h-[40px] px-4 rounded-xl text-sm font-medium ${
                  customRangeSelection[0]?.startDate && customRangeSelection[0]?.endDate
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!customRangeSelection[0]?.startDate || !customRangeSelection[0]?.endDate}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`overflow-hidden relative ${vplSurfaceClass}`}
        style={vplSurfaceStyle}
      >
        {loading && (
          <div className="absolute inset-0 bg-white/75 z-20 flex items-center justify-center backdrop-blur-[1px]">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="relative max-h-[70vh] overflow-auto rounded-[inherit]">
          <table className="w-full min-w-[960px]">
            <thead className="bg-gray-50 border-b border-[#C8C8C8] sticky top-0 z-10">
              <tr>
                <th className="text-left py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wide">
                  Emp ID
                </th>
                <th className="text-left py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wide">
                  Name
                </th>
                <th className="text-right py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wide">
                  Margin %
                </th>
                <th className="text-center py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wide">
                  Logged in
                </th>
                <th className="text-right py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wide">
                  DO
                </th>
                <th className="text-right py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wide">
                  Calls
                </th>
                <th className="text-right py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wide">
                  Customer
                </th>
                <th className="text-right py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wide">
                  RR
                </th>
                <th className="text-right py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wide">
                  Software
                </th>
                <th className="text-left py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr
                  key={`${row.empId}-${index}`}
                  className={`border-b border-gray-100/90 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'
                  }`}
                >
                  <td className="py-2.5 px-3 text-sm font-medium text-gray-800">
                    {row.empId}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-gray-800">
                    {row.employeeName}
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm text-gray-800 tabular-nums">
                    {formatMargin(row.marginPercent)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {row.isLogin ? (
                      <span title="Open session today" className="inline-flex text-green-600">
                        <CheckCircle size={18} />
                      </span>
                    ) : (
                      <span title="No open session" className="inline-flex text-gray-300">
                        <XCircle size={18} />
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-sm text-gray-800">
                    {row.DO ?? '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm">{callsCell(row)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-sm text-gray-800">
                    {row.Customer ?? '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-sm text-gray-800">
                    {row.RR ?? '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-sm text-gray-800">
                    {row.Software ?? '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${employmentStatusClass(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && visibleRows.length === 0 && (
            <div className="text-center py-12 px-4">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-90" />
              <p className="text-gray-600 text-base font-semibold">
                No rows for this page
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Adjust filters or date range and try again.
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        className={`flex flex-wrap justify-between items-center gap-4 mt-6 p-4 md:p-5 ${vplSurfaceClass}`}
        style={vplSurfaceStyle}
      >
        <div className="text-sm text-gray-700 font-medium">
          Page {pagination.page} of {pagination.totalPages}
          <span className="mx-2">·</span>
          {pagination.total} employees total
          {filtersEcho && (
            <span className="block text-xs text-gray-500 font-normal mt-1">
              Range {filtersEcho.startDate} → {filtersEcho.endDate}
              {filtersEcho.empStatus && filtersEcho.empStatus !== 'all'
                ? ` · ${filtersEcho.empStatus}`
                : ''}
              {filtersEcho.addDispature != null &&
              String(filtersEcho.addDispature).trim() !== ''
                ? ` · addDispature: ${String(filtersEcho.addDispature).trim()}`
                : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex shrink-0 items-center gap-2 mr-2">
            <label className={filterLabelClass}>Rows:</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className={`${fieldInputClass} min-w-[4.5rem]`}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700 font-semibold px-2 tabular-nums">
            {page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page >= pagination.totalPages || loading}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
