// Hourly Performance Report — GET /api/v1/hourly-checkin/report (requires "Hourly Performance Report" module)
import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import {
  getHourlyCheckinReport,
  getHourlyCheckinById,
} from '../../services/hourlyCheckinReportService';
import API_CONFIG from '../../config/api';
import {
  RefreshCw,
  Filter,
  Calendar,
  User,
  Building2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  BarChart3,
  Eye,
  Paperclip,
} from 'lucide-react';

/** Same surface as Sales Dept Report / Agent dashboard sections */
const vplSurfaceClass = 'bg-white border border-[#C8C8C8] rounded-[17.59px]';
const vplSurfaceStyle = {
  boxShadow: '7.54px 7.54px 67.85px 0px rgba(0, 0, 0, 0.05)',
  borderWidth: '1.31px',
};

const fieldInputClass =
  'px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors hover:border-gray-400';
const filterLabelClass = 'text-sm font-semibold text-gray-800 whitespace-nowrap';

const DEPARTMENTS = [
  { value: '', label: 'All departments' },
  { value: 'IT', label: 'IT' },
  { value: 'HR', label: 'HR' },
  { value: 'CMT', label: 'CMT' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Finance', label: 'Finance' },
  { value: 'QA', label: 'QA' },
];

function todayISODate() {
  return new Date().toISOString().split('T')[0];
}

function extractRows(payload) {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload.data !== undefined ? payload.data : payload;
  if (Array.isArray(root)) return root;
  if (!root || typeof root !== 'object') return [];
  const candidates = [
    root.rows,
    root.records,
    root.items,
    root.data,
    root.report,
    root.list,
    root.results,
    root.checkIns,
    root.checkins,
    root.hourlyCheckins,
    root.documents,
  ];
  for (const arr of candidates) {
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

function extractFiltersEcho(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.filters && typeof payload.filters === 'object') return payload.filters;
  if (payload.appliedFilters && typeof payload.appliedFilters === 'object') return payload.appliedFilters;
  const d = payload.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    return d.filters ?? d.appliedFilters ?? null;
  }
  return null;
}

/** meta on root or nested under non-array data */
function extractMetaFromReportResponse(res) {
  if (!res || typeof res !== 'object') return null;
  if (res.meta && typeof res.meta === 'object') return res.meta;
  const d = res.data;
  if (d && typeof d === 'object' && !Array.isArray(d) && d.meta && typeof d.meta === 'object') return d.meta;
  return null;
}

/** Hidden everywhere: main table, View modal, Excel — rejection paths only in View modal UI strip */
const EXCLUDED_COLUMN_KEYS = new Set([
  'employeeId',
  'employee_id',
  '_id',
  'id',
  'updatedAt',
  'updated_at',
  'hourBucketEnd',
  'hour_bucket_end',
  'employee',
  'rejectionAttachment',
  'rejection_attachment',
  'rejectionAttachments',
  'rejection_attachment_url',
  'rejectionAttachmentUrl',
  'rejectionFile',
  'rejection_file',
  'rejectionAttachmentPath',
  'rejectAttachment',
  'reject_attachment',
  'metrics',
  'metric',
]);

/** Hidden only in the View (hourly breakdown) modal — still shown in main listing & Excel */
const EXCLUDED_DETAIL_MODAL_KEYS = new Set([
  'empId',
  'employeeName',
  'employee_name',
  'department',
  /** CMT hourly payload; not shown in View per product request */
  'noOfCalls',
  'no_of_calls',
]);

/** Keys that may hold one path, comma-separated paths, or an array */
const REJECTION_ATTACHMENT_KEYS = [
  'rejectionAttachment',
  'rejection_attachment',
  'rejectionAttachments',
  'rejectionAttachmentUrl',
  'rejection_attachment_url',
  'rejectionFile',
  'rejection_file',
  'rejectionAttachmentPath',
  'rejectAttachment',
  'reject_attachment',
];

function pushAttachmentValueIntoList(v, out) {
  if (v == null || v === '') return;
  if (Array.isArray(v)) {
    v.forEach((item) => {
      if (typeof item === 'string' && item.trim()) out.push(item.trim());
      else if (item && typeof item === 'object') {
        const u = item.url ?? item.path ?? item.filename ?? item.file;
        if (u) out.push(String(u).trim());
      }
    });
    return;
  }
  if (typeof v === 'string') {
    const t = v.trim();
    if (t.startsWith('[')) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => {
            if (typeof p === 'string' && p.trim()) out.push(p.trim());
          });
          return;
        }
      } catch {
        /* treat as plain string */
      }
    }
    if (t.includes(',')) {
      t.split(',').forEach((s) => {
        const u = s.trim();
        if (u) out.push(u);
      });
    } else {
      out.push(t);
    }
  }
}

function collectRejectionAttachmentPaths(row) {
  if (!row || typeof row !== 'object') return [];
  const out = [];
  for (const key of REJECTION_ATTACHMENT_KEYS) {
    const v = row[key];
    if (v == null || v === '') continue;
    pushAttachmentValueIntoList(v, out);
  }
  for (const key of Object.keys(row)) {
    if (REJECTION_ATTACHMENT_KEYS.includes(key)) continue;
    if (!/rejection|reject/i.test(key) || !/attach|file/i.test(key)) continue;
    pushAttachmentValueIntoList(row[key], out);
  }
  return [...new Set(out)];
}

function hourBucketTime(row) {
  const h = row?.hourBucketStart ?? row?.hour_bucket_start;
  if (h == null) return NaN;
  return new Date(h).getTime();
}

/** Employee drill-down may omit rejection fields that exist on the main report — copy from list row */
function mergeRejectionFieldsFromMain(detailRow, mainRows, clickedRow) {
  if (!detailRow || typeof detailRow !== 'object') return detailRow;
  if (collectRejectionAttachmentPaths(detailRow).length > 0) return detailRow;
  const emp = getEmpIdFromRow(detailRow);
  const hb = hourBucketTime(detailRow);
  const did = detailRow._id ?? detailRow.id;
  const pickFrom = (src) => {
    if (!src || typeof src !== 'object') return null;
    if (getEmpIdFromRow(src) !== emp) return null;
    if (did != null && (src._id ?? src.id) != null && String(src._id ?? src.id) === String(did)) return src;
    if (!Number.isNaN(hb) && hourBucketTime(src) === hb) return src;
    return null;
  };
  const fromClicked = pickFrom(clickedRow);
  if (fromClicked) {
    const merged = { ...detailRow };
    for (const key of Object.keys(fromClicked)) {
      if (!/rejection|reject/i.test(key) || !/attach|file/i.test(key)) continue;
      if (merged[key] == null || merged[key] === '') merged[key] = fromClicked[key];
    }
    return merged;
  }
  if (!Array.isArray(mainRows)) return detailRow;
  const fromList = mainRows.find((r) => pickFrom(r));
  if (!fromList) return detailRow;
  const merged = { ...detailRow };
  for (const key of Object.keys(fromList)) {
    if (!/rejection|reject/i.test(key) || !/attach|file/i.test(key)) continue;
    if (merged[key] == null || merged[key] === '') merged[key] = fromList[key];
  }
  return merged;
}

function isNonWebFilePath(s) {
  const t = String(s ?? '').trim();
  return /^[a-zA-Z]:[\\/]/.test(t) || t.startsWith('\\\\');
}

/**
 * Where Express/static serves hourly rejection files. DB often stores
 * `hourlyCheckinRejections/...` but the server mounts uploads at `/uploads/...`
 * (root `/hourlyCheckinRejections/...` returns "Route not found" JSON).
 * Override if your API differs: VITE_HOURLY_REJECTION_FILES_PREFIX=/uploads
 */
function hourlyRejectionFilesPublicPrefix() {
  const p = import.meta.env?.VITE_HOURLY_REJECTION_FILES_PREFIX;
  if (p === '') return '';
  const norm = (typeof p === 'string' ? p : '/uploads').replace(/\/$/, '');
  return norm || '/uploads';
}

/** Build a browser URL for uploads / relative API paths; local dev paths return null */
function resolveHourlyAttachmentUrl(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s || s === '—' || s === '-') return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (isNonWebFilePath(s)) return null;
  let path = s.startsWith('/') ? s : `/${s.replace(/^\/+/, '')}`;
  const lower = path.toLowerCase();
  /** Already includes a common static mount */
  if (
    lower.startsWith('/uploads/') ||
    lower.startsWith('/public/') ||
    lower.startsWith('/api/')
  ) {
    return `${API_CONFIG.BASE_URL}${path}`;
  }
  /** Typical stored relative path → served under /uploads/... on API host */
  if (/hourlyCheckinRejections/i.test(path)) {
    const prefix = hourlyRejectionFilesPublicPrefix();
    return `${API_CONFIG.BASE_URL}${prefix}${path}`;
  }
  return `${API_CONFIG.BASE_URL}${path}`;
}

function isProbablyImagePath(url) {
  if (!url) return false;
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i.test(url);
}

/**
 * Full `https://` URLs (e.g. S3) are passed through unchanged from `resolveHourlyAttachmentUrl`.
 * S3 may block embeds when a Referer is sent — use no-referrer on img.
 */
function HourlyRejectionAttachmentBlock({ resolved, pathsLength, ai }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = isProbablyImagePath(resolved);
  return (
    <div className="flex flex-col gap-2 min-w-0 max-w-[280px] rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      {showImg && !imgFailed && (
        <a
          href={resolved}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-md bg-gray-100 min-h-[72px]"
        >
          <img
            src={resolved}
            alt="Rejection attachment"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="max-h-48 w-full object-contain"
            onError={() => setImgFailed(true)}
          />
        </a>
      )}
      {showImg && imgFailed && (
        <p className="text-xs text-amber-900 bg-amber-50 px-2 py-1.5 rounded border border-amber-200">
          Preview did not load (blocked or private file). Use &quot;Open attachment&quot; below.
        </p>
      )}
      <a
        href={resolved}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0078D4] hover:underline break-all"
      >
        <Paperclip className="h-3.5 w-3.5 shrink-0" />
        {pathsLength > 1 ? `Open attachment ${ai + 1}` : 'Open attachment'}
      </a>
    </div>
  );
}

/** Column keys that hold ISO / date values — show friendly local date & time in UI & Excel */
const DATETIME_KEYS = new Set([
  'hourBucketStart',
  'hour_bucket_start',
  'createdAt',
  'created_at',
  'submittedAt',
  'submitted_at',
]);

function isDateTimeColumn(key) {
  if (!key || key === '_id' || key === 'id') return false;
  return DATETIME_KEYS.has(key);
}

/** Readable local time, e.g. "31 Mar 2026, 6:00 pm" */
function formatDateTimeDisplay(val) {
  if (val == null || val === '') return '—';
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString('en-GB', {    
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatCell(val) {
  if (val == null) return '—';
  if (typeof val === 'object') {
    if (val.name != null) return String(val.name);
    if (val.empId != null) return String(val.empId);
    return JSON.stringify(val);
  }
  return String(val);
}

/** Table / export: format cell with optional column key for datetimes */
function formatCellForColumn(val, colKey) {
  if (colKey && isDateTimeColumn(colKey) && (typeof val === 'string' || typeof val === 'number' || val instanceof Date)) {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return formatDateTimeDisplay(val);
  }
  return formatCell(val);
}

/** Human-readable column title for table / Excel */
function labelFromKey(k) {
  if (!k) return '';
  if (k === '_cmtAssignReassignCount') return 'Assign / Reassign Count';
  if (k === '_cmtAssignReassignRefs') return 'Assign / Reassign Refs';
  if (k === '_salesNoOfCalls') return 'Sales — No. of calls';
  if (k === '_salesLoadPostedCount') return 'Sales — Load posted (count)';
  if (k === '_salesLoadPostedRefs') return 'Sales — Load posted (refs)';
  if (k === '_salesDeliveryOrderCount') return 'Sales — Delivery order (count)';
  if (k === '_salesDeliveryOrderRefs') return 'Sales — Delivery order (refs)';
  if (k === '_salesCustomerAdded') return 'Sales — Customers added';
  const spaced = k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

function rowToFlatExport(row, columns) {
  const out = {};
  columns.forEach((col) => {
    const header = labelFromKey(col);
    let v =
      row[col] !== undefined ? formatCellForColumn(row[col], col) : '';
    if (v != null && typeof v === 'object') v = JSON.stringify(v);
    out[header] = v === undefined || v === null ? '' : v;
  });
  return out;
}

function getEmpIdFromRow(row) {
  if (!row || typeof row !== 'object') return '';
  const v = row.empId ?? row?.employee?.empId;
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

function getEmployeeNameFromRow(row) {
  if (!row || typeof row !== 'object') return '';
  return (
    row.employeeName ??
    row?.employee?.name ??
    row?.employee?.employeeName ??
    ''
  );
}

function sortRowsByHourBucket(rowsIn) {
  return [...rowsIn].sort((a, b) => {
    const ta = new Date(a.hourBucketStart ?? a.hour_bucket_start ?? 0).getTime();
    const tb = new Date(b.hourBucketStart ?? b.hour_bucket_start ?? 0).getTime();
    return ta - tb;
  });
}

/** CMT metrics on a check-in row (same shape as hourly check-in payload). */
function getCmtMetrics(row) {
  const m = row?.metrics?.cmt ?? row?.metrics?.CMT ?? row?.cmtMetrics;
  return m && typeof m === 'object' ? m : null;
}

function getNoOfLoadAssignOrReassign(row) {
  const cmt = getCmtMetrics(row);
  const block =
    cmt?.noOfLoadAssignOrReassign ?? cmt?.no_of_load_assign_or_reassign ?? null;
  if (!block || typeof block !== 'object') return null;
  const count =
    typeof block.count === 'number' ? block.count : Number(block.count) || 0;
  const refs = Array.isArray(block.refs) ? block.refs : [];
  return { count, refs };
}

function getDepartmentFromRow(row) {
  if (!row || typeof row !== 'object') return '';
  const d = row.department ?? row.dept ?? row?.employee?.department;
  return d != null ? String(d).trim() : '';
}

function getSalesMetrics(row) {
  const m = row?.metrics?.sales ?? row?.metrics?.Sales;
  return m && typeof m === 'object' ? m : null;
}

function parseCountRefsBlock(block) {
  if (!block || typeof block !== 'object') return null;
  const count =
    typeof block.count === 'number' ? block.count : Number(block.count) || 0;
  const refs = Array.isArray(block.refs) ? block.refs : [];
  return { count, refs };
}

/** Show Sales metrics block when department is Sales or payload includes metrics.sales */
function shouldShowSalesMetricsInDetail(row) {
  if (getSalesMetrics(row)) return true;
  return /^sales$/i.test(getDepartmentFromRow(row));
}

/** Show CMT assign/reassign fields when department is CMT or payload includes metrics.cmt */
function shouldShowCmtMetricsInDetail(row) {
  if (getCmtMetrics(row)) return true;
  return /^cmt$/i.test(getDepartmentFromRow(row));
}

/** Flatten metrics.sales for the check-in detail grid (Sales dept). */
function enrichSalesDetailFields(row) {
  if (!shouldShowSalesMetricsInDetail(row)) return {};
  const s = getSalesMetrics(row);
  const posted = s ? parseCountRefsBlock(s.noOfLoadPosted ?? s.no_of_load_posted) : null;
  const delivery = s ? parseCountRefsBlock(s.noOfDeliveryOrder ?? s.no_of_delivery_order) : null;
  const calls =
    s && (typeof s.noOfCalls === 'number' || (s.noOfCalls != null && s.noOfCalls !== ''))
      ? String(s.noOfCalls)
      : '—';
  const customers =
    s && (typeof s.noOfCustomerAdded === 'number' || (s.noOfCustomerAdded != null && s.noOfCustomerAdded !== ''))
      ? String(s.noOfCustomerAdded)
      : '—';
  return {
    _salesNoOfCalls: calls,
    _salesLoadPostedCount: posted ? String(posted.count) : '—',
    _salesLoadPostedRefs: posted?.refs?.length ? posted.refs.join(', ') : '—',
    _salesDeliveryOrderCount: delivery ? String(delivery.count) : '—',
    _salesDeliveryOrderRefs: delivery?.refs?.length ? delivery.refs.join(', ') : '—',
    _salesCustomerAdded: customers,
  };
}

/** View modal: omit CMT noOfCalls (not shown per product request). */
function stripNoOfCallsFromCmtMetrics(row) {
  if (!row || typeof row !== 'object') return row;
  const m = row.metrics;
  if (!m || typeof m !== 'object') return row;
  const nextMetrics = { ...m };
  const strip = (block) => {
    if (!block || typeof block !== 'object') return block;
    const next = { ...block };
    delete next.noOfCalls;
    delete next.no_of_calls;
    return next;
  };
  if (m.cmt != null && typeof m.cmt === 'object') nextMetrics.cmt = strip(m.cmt);
  if (m.CMT != null && typeof m.CMT === 'object') nextMetrics.CMT = strip(m.CMT);
  return { ...row, metrics: nextMetrics };
}

function buildColumnKeysFromRows(rowList, { detailModal = false } = {}) {
  const excluded = new Set([
    ...EXCLUDED_COLUMN_KEYS,
    ...(detailModal ? EXCLUDED_DETAIL_MODAL_KEYS : []),
  ]);

  if (!rowList.length) {
    return detailModal
      ? ['hourBucketStart', 'responseText', 'createdAt']
      : ['hourBucketStart', 'empId', 'department'];
  }
  const keys = new Set();
  rowList.slice(0, 50).forEach((row) => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((k) => {
        if (k !== 'employee' && k !== '__v' && !excluded.has(k)) keys.add(k);
      });
    }
  });
  const preferred = [
    'hourBucketStart',
    'hour_bucket_start',
    'empId',
    'employeeName',
    'department',
    'responseText',
    ...(detailModal
      ? [
          '_salesNoOfCalls',
          '_salesLoadPostedCount',
          '_salesLoadPostedRefs',
          '_salesDeliveryOrderCount',
          '_salesDeliveryOrderRefs',
          '_salesCustomerAdded',
        ]
      : []),
    'status',
    'checkedIn',
    'checked_in',
    'note',
    'createdAt',
    'submittedAt',
    ...(detailModal ? ['_cmtAssignReassignCount', '_cmtAssignReassignRefs'] : []),
  ];
  const ordered = [];
  preferred.forEach((p) => {
    if (keys.has(p)) ordered.push(p);
  });
  keys.forEach((k) => {
    if (!ordered.includes(k) && !excluded.has(k)) ordered.push(k);
  });
  const visible = ordered.filter((k) => !excluded.has(k));
  return visible.length ? visible : ['_raw'];
}

/** View modal: long fields span both columns in the box grid */
const CHECKIN_DETAIL_FULL_WIDTH_KEYS = new Set([
  'responseText',
  'note',
  '_cmtAssignReassignRefs',
  '_salesLoadPostedRefs',
  '_salesDeliveryOrderRefs',
]);

function HourlyCheckinDetailFieldGrid({ row, columnKeys }) {
  if (!row || !columnKeys?.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {columnKeys.map((col) => {
        const raw = row[col];
        const display = raw !== undefined ? formatCellForColumn(raw, col) : '—';
        const fullWidth = CHECKIN_DETAIL_FULL_WIDTH_KEYS.has(col);
        return (
          <div
            key={col}
            className={
              fullWidth
                ? 'sm:col-span-2 bg-white rounded-xl p-4 border border-blue-100 shadow-sm'
                : 'bg-white rounded-xl p-4 border border-blue-100 shadow-sm'
            }
          >
            <p className="text-sm text-gray-600">{labelFromKey(col)}</p>
            <p
              className={`mt-1 font-semibold text-gray-900 text-sm break-words ${
                fullWidth ? 'whitespace-pre-wrap leading-relaxed' : ''
              }`}
            >
              {display}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function HourlyPerformanceReport() {
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);
  const [rows, setRows] = useState([]);
  const [dateMode, setDateMode] = useState('range');
  const [singleDate, setSingleDate] = useState(todayISODate());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(todayISODate());
  const [department, setDepartment] = useState('');
  /** Selected business empId from department-scoped dropdown; empty = all employees in scope */
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setSelectedEmpId('');
    if (!department) {
      setDeptEmployees([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setEmployeesLoading(true);
      try {
        const token =
          sessionStorage.getItem('authToken') ||
          localStorage.getItem('authToken') ||
          sessionStorage.getItem('token') ||
          localStorage.getItem('token');
        const res = await fetch(
          `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/${encodeURIComponent(department)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
          }
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data?.success && Array.isArray(data.data)) list = data.data;
        else if (Array.isArray(data?.employees)) list = data.employees;
        const byId = new Map();
        list.forEach((e) => {
          const id = e?.empId != null ? String(e.empId).trim() : '';
          if (!id) return;
          if (!byId.has(id)) byId.set(id, e);
        });
        const sorted = [...byId.values()].sort((a, b) => {
          const na = (a.employeeName || a.name || a.empName || '').toString().toLowerCase();
          const nb = (b.employeeName || b.name || b.empName || '').toString().toLowerCase();
          return na.localeCompare(nb);
        });
        setDeptEmployees(sorted);
      } catch {
        if (!cancelled) setDeptEmployees([]);
      } finally {
        if (!cancelled) setEmployeesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [department]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...(department && { department }),
        ...(selectedEmpId && { empId: selectedEmpId }),
      };
      if (dateMode === 'single') {
        params.date = singleDate;
      } else if (dateMode === 'range') {
        if (startDate && endDate) {
          if (startDate > endDate) {
            toast.error('Start date must be on or before end date.');
            setLoading(false);
            return;
          }
          params.startDate = startDate;
          params.endDate = endDate;
        }
      }

      // Match API default: newest hour buckets first; omit limit to receive full set (or unlimited)
      params.sortDir = 'desc';

      const res = await getHourlyCheckinReport(params);
      if (res && res.success === false) {
        toast.error(res.message || 'Report request was not successful.');
        setRows([]);
        setRawResponse(res);
        setPage(1);
        return;
      }
      setRawResponse(res);
      const extracted = extractRows(res);
      setRows(extracted);
      const meta = extractMetaFromReportResponse(res);
      if (
        extracted.length === 0 &&
        meta &&
        typeof meta.totalCount === 'number' &&
        meta.totalCount > 0
      ) {
        console.warn(
          '[HourlyPerformanceReport] API reports totalCount=%s but no rows were parsed; check response shape.',
          meta.totalCount
        );
        toast.warning(
          'Report returned a count but no rows could be read. Ask devs to confirm the JSON shape matches the UI parser.'
        );
      }
      setPage(1);
    } catch (err) {
      if (err.status === 403) {
        toast.error(
          err?.message || 'You do not have permission to access the Hourly Performance Report.'
        );
      } else if (err.status === 404) {
        toast.error(
          err?.message ||
            'Hourly Performance Report is unavailable. Ensure the module "Hourly Performance Report" exists, is active, and is assigned to your account (superadmin bypasses this).'
        );
      } else {
        toast.error(err?.message || 'Failed to load hourly check-in report');
      }
      setRows([]);
      setRawResponse(null);
    } finally {
      setLoading(false);
    }
  }, [dateMode, singleDate, startDate, endDate, department, selectedEmpId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filterEcho = useMemo(() => extractFiltersEcho(rawResponse), [rawResponse]);

  /** Omit noisy / redundant keys the backend echoes (UI uses Employee select + date mode instead). */
  const filterEchoEntries = useMemo(() => {
    if (!filterEcho || typeof filterEcho !== 'object') return [];
    const hidden = new Set(['empId', 'date']);
    return Object.entries(filterEcho).filter(([k]) => !hidden.has(k));
  }, [filterEcho]);

  const columns = useMemo(() => buildColumnKeysFromRows(rows), [rows]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRows, setDetailRows] = useState([]);
  /** Main-table row that opened View — used to merge rejection paths if drill-down API omits them */
  const [detailClickedRow, setDetailClickedRow] = useState(null);
  const [detailSubject, setDetailSubject] = useState({ empId: '', name: '' });

  const detailRowsEnriched = useMemo(
    () =>
      detailRows.map((drow) => {
        const merged = stripNoOfCallsFromCmtMetrics(
          mergeRejectionFieldsFromMain(drow, rows, detailClickedRow)
        );
        const ar = getNoOfLoadAssignOrReassign(merged);
        const cmtExtras = shouldShowCmtMetricsInDetail(merged)
          ? {
              _cmtAssignReassignCount: ar ? String(ar.count) : '—',
              _cmtAssignReassignRefs: ar?.refs?.length ? ar.refs.join(', ') : '—',
            }
          : {};
        return {
          ...merged,
          ...cmtExtras,
          ...enrichSalesDetailFields(merged),
        };
      }),
    [detailRows, rows, detailClickedRow]
  );

  const detailColumns = useMemo(
    () => buildColumnKeysFromRows(detailRowsEnriched, { detailModal: true }),
    [detailRowsEnriched]
  );

  /**
   * View: only the clicked row — GET /api/v1/hourly-checkin/:checkinId for that row’s _id
   * so metrics.cmt (e.g. noOfLoadAssignOrReassign) matches the detail API.
   */
  const openEmployeeHourlyDetail = useCallback(
    async (row) => {
      const checkinId = row?._id ?? row?.id;
      if (!checkinId) {
        toast.error('This row has no check-in id.');
        return;
      }
      const emp = getEmpIdFromRow(row);
      setDetailSubject({
        empId: emp || '—',
        name: getEmployeeNameFromRow(row) || '—',
      });
      setDetailClickedRow(row);
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailRows([]);

      try {
        const res = await getHourlyCheckinById(checkinId);
        const detail =
          res && typeof res === 'object' && res.data != null && typeof res.data === 'object'
            ? res.data
            : res;
        const merged =
          detail && typeof detail === 'object' && !Array.isArray(detail)
            ? { ...row, ...detail }
            : row;
        setDetailRows([mergeRejectionFieldsFromMain(merged, rows, row)]);
      } catch (e) {
        console.warn('[HourlyPerformanceReport] check-in detail fetch failed', checkinId, e);
        toast.error(e?.message || 'Failed to load check-in');
        setDetailRows([mergeRejectionFieldsFromMain(row, rows, row)]);
      } finally {
        setDetailLoading(false);
      }
    },
    [rows]
  );

  const exportToExcel = useCallback(() => {
    if (!rows.length) {
      toast.info('No rows to export.');
      return;
    }
    setExportLoading(true);
    try {
      const exportRows = rows.map((row) => rowToFlatExport(row, columns));
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hourly Check-in');
      const stamp = todayISODate();
      const filename = `Hourly_Performance_Report_${stamp}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Downloaded ${rows.length} row${rows.length === 1 ? '' : 's'}.`);
    } catch (e) {
      console.error('Hourly report Excel export:', e);
      toast.error('Could not export Excel. Please try again.');
    } finally {
      setExportLoading(false);
    }
  }, [rows, columns]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="p-4 md:p-6 font-poppins max-w-[1920px] mx-auto w-full min-h-[50vh] bg-[#F5F5F7]">
      {/* Page title + actions */}
      <div className={`mb-4 p-4 md:p-5 ${vplSurfaceClass}`} style={vplSurfaceStyle}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 min-w-0">
            <div className="h-14 w-14 rounded-2xl shrink-0 flex items-center justify-center bg-[#0078D4]/10 text-[#0078D4] border border-[#0078D4]/20">
              <BarChart3 className="w-7 h-7" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                Hourly Performance Report
              </h1>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Review hourly check-in activity.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchReport()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0078D4] text-white text-sm font-semibold hover:bg-[#106EBE] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportToExcel}
              disabled={exportLoading || loading || rows.length === 0}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              title="Download all loaded rows as .xlsx"
            >
              <Download className="w-4 h-4 shrink-0" />
              {exportLoading ? 'Exporting…' : 'Export Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className={`mb-4 p-4 md:p-5 ${vplSurfaceClass}`} style={vplSurfaceStyle}>
        <div className="w-full max-w-[360px] rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/80 px-5 py-4 min-h-[100px] flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-600">Total rows</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {loading ? '—' : rows.length}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`mb-4 p-4 md:p-5 ${vplSurfaceClass}`} style={vplSurfaceStyle}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-lg bg-[#0078D4]/10 flex items-center justify-center text-[#0078D4]">
            <Filter className="h-4 w-4" />
          </div>
          <span className={`${filterLabelClass} text-base`}>Filters</span>
        </div>

        <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
          <div className="shrink-0 min-w-[188px] max-w-[220px]">
            <label className={`${filterLabelClass} block mb-1.5`}>Date mode</label>
            <select
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value)}
              className={`${fieldInputClass} h-[42px] w-full pr-8 appearance-none`}
            >
              <option value="range">Date range (start / end)</option> 
              <option value="single">Single day</option>
              <option value="none">No date filter</option>
            </select>
          </div>

          {dateMode === 'single' && (
            <div className="shrink-0 min-w-[160px] max-w-[180px]">
              <label className={`${filterLabelClass} block mb-1.5 flex items-center gap-1`}>
                <Calendar className="h-3.5 w-3.5" /> Date
              </label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className={`${fieldInputClass} h-[42px] w-full`}
              />
            </div>
          )}

          {dateMode === 'range' && (
            <>
              <div className="shrink-0 min-w-[160px] max-w-[180px]">
                <label className={`${filterLabelClass} block mb-1.5`}>Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`${fieldInputClass} h-[42px] w-full`}
                />
              </div>
              <div className="shrink-0 min-w-[160px] max-w-[180px]">
                <label className={`${filterLabelClass} block mb-1.5`}>End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`${fieldInputClass} h-[42px] w-full`}
                />
              </div>
            </>
          )}

          <div className="shrink-0 min-w-[140px] max-w-[170px]">
            <label className={`${filterLabelClass} block mb-1.5 flex items-center gap-1`}>
              <Building2 className="h-3.5 w-3.5" /> Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={`${fieldInputClass} h-[42px] w-full pr-8 appearance-none`}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.value || 'all'} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="shrink-0 min-w-[200px] max-w-[260px]">
            <label className={`${filterLabelClass} block mb-1.5 flex items-center gap-1`}>
              <User className="h-3.5 w-3.5" /> Employee
            </label>
            <div className="relative">
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                disabled={!!department && employeesLoading}
                className={`${fieldInputClass} h-[42px] w-full pr-8 appearance-none disabled:opacity-60 disabled:cursor-wait`}
              >
                <option value="">
                  {!department
                    ? 'All employees'
                    : employeesLoading
                      ? 'Loading employees…'
                      : 'All employees in department'}
                </option>
                {department &&
                  !employeesLoading &&
                  deptEmployees.map((employee, index) => {
                    const value = employee.empId != null ? String(employee.empId).trim() : '';
                    if (!value) return null;
                    const label =
                      employee.employeeName || employee.name || employee.empName || 'Unknown';
                    return (
                      <option key={employee._id || `${value}-${index}`} value={value}>
                        {label}
                      </option>
                    );
                  })}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                ▾
              </span>
            </div>
            {!department && (
              <p className="mt-1 text-xs text-gray-500">Choose a department to list employees.</p>
            )}
          </div>
        </div>

        {filterEchoEntries.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-500 self-center">Server filters:</span>
            {filterEchoEntries.map(([k, v]) => {
              const display =
                k === 'department' && (v == null || v === '')
                  ? 'All departments'
                  : v == null || v === ''
                    ? '—'
                    : String(v);
              return (
                <span
                  key={k}
                  className="inline-flex items-center rounded-full bg-[#EEF4FF] text-[#3730A3] px-3 py-1 text-xs font-medium border border-[#C7D2FE]"
                >
                  {k}: {display}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Table */}
      <div className={`p-4 md:p-5 ${vplSurfaceClass}`} style={vplSurfaceStyle}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Clock className="h-4 w-4 text-[#0078D4]" />
            <span>{loading ? 'Loading…' : `${rows.length} row${rows.length === 1 ? '' : 's'}`}</span>
          </div>
          {rows.length > pageSize && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-gray-600 font-medium tabular-nums">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-[#0078D4] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 whitespace-nowrap">
                      {labelFromKey(col)}
                    </th>
                  ))}
                  <th className="px-4 py-3 whitespace-nowrap text-right w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={Math.max(columns.length, 1) + 1}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      <p className="font-medium text-gray-700">No data for the selected filters.</p>
                      <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                        Try a wider date range, set Department to &quot;All departments&quot;, or clear Employee ID.
                        If the API uses a new response shape, rows may fail to parse — check the browser console.
                      </p>
                    </td>
                  </tr>
                )}
                {pageRows.map((row, idx) => (
                  <tr
                    key={row._id ?? row.id ?? idx}
                    className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-4 py-2.5 text-gray-800 whitespace-nowrap max-w-[min(280px,40vw)] truncate"
                      >
                        {row[col] !== undefined
                          ? formatCellForColumn(row[col], col)
                          : '—'}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEmployeeHourlyDetail(row)}
                        disabled={!getEmpIdFromRow(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0078D4] text-white text-xs font-semibold hover:bg-[#106EBE] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Check-in view — layout aligned with Sales DeliveryOrder view modal */}
      {detailOpen && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hourly-detail-title"
            onClick={() => {
              setDetailOpen(false);
              setDetailClickedRow(null);
            }}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header — same pattern as DeliveryOrder.jsx Employee DO modal */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                      <Clock className="text-white" size={24} />
                    </div>
                    <div className="min-w-0">
                      <h2 id="hourly-detail-title" className="text-xl font-bold truncate">
                        Hourly check-in
                      </h2>
                      <p className="text-blue-100 truncate">
                        {detailSubject.name}
                        {detailSubject.empId && detailSubject.empId !== '—' ? (
                          <span className="text-white/90"> · {detailSubject.empId}</span>
                        ) : null}
                      </p>
                      <p className="text-blue-100/90 text-sm mt-1">Check-in detail</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailOpen(false);
                      setDetailClickedRow(null);
                    }}
                    className="text-white hover:text-gray-200 text-2xl font-bold leading-none shrink-0 ml-2"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {!detailLoading && detailRows.length === 0 && (
                  <p className="text-center text-gray-500 py-12">Nothing to show for this check-in.</p>
                )}

                {!detailLoading && detailRows.length > 0 && (
                  <div className="space-y-6">
                    {detailRowsEnriched.map((drow, dIdx) => {
                      const rowKey = drow._id ?? drow.id ?? dIdx;
                      const paths = collectRejectionAttachmentPaths(drow);
                      return (
                        <Fragment key={rowKey}>
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <BarChart3 className="text-blue-600" size={20} />
                              <h3 className="text-lg font-bold text-gray-800">Check-in data</h3>
                            </div>
                            <HourlyCheckinDetailFieldGrid row={drow} columnKeys={detailColumns} />
                          </div>
                          {paths.length > 0 && (
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                              <div className="flex items-center gap-2 mb-4">
                                <Paperclip className="text-slate-600" size={20} />
                                <h3 className="text-lg font-bold text-gray-800">Rejection attachments</h3>
                              </div>
                              <div className="flex flex-wrap gap-4 min-w-0">
                                {paths.map((raw, ai) => {
                                  const resolved = resolveHourlyAttachmentUrl(raw);
                                  if (isNonWebFilePath(raw)) {
                                    return (
                                      <div
                                        key={`${rowKey}-p-${ai}`}
                                        className="text-xs text-amber-900 bg-white rounded-xl px-4 py-3 border border-amber-200 shadow-sm max-w-lg"
                                      >
                                        <span className="font-semibold block mb-1">
                                          Path not previewable in browser
                                        </span>
                                        <code className="break-all text-[11px] leading-snug">{raw}</code>
                                      </div>
                                    );
                                  }
                                  if (!resolved) {
                                    return (
                                      <span
                                        key={`${rowKey}-p-${ai}`}
                                        className="text-xs text-gray-700 bg-white rounded-xl px-4 py-3 border border-slate-200 break-all shadow-sm"
                                      >
                                        {raw}
                                      </span>
                                    );
                                  }
                                  return (
                                    <HourlyRejectionAttachmentBlock
                                      key={`${rowKey}-p-${ai}`}
                                      resolved={resolved}
                                      pathsLength={paths.length}
                                      ai={ai}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {detailLoading && (
            <div
              className="fixed inset-0 backdrop-blur-sm bg-black/30 z-[60] flex justify-center items-center"
              role="status"
              aria-live="polite"
            >
              <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-lg font-semibold text-gray-800">Loading check-in…</p>
                <p className="text-sm text-gray-600">Please wait while we fetch the complete data</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
