import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  BarChart3,
  Users,
  Loader2,
  RefreshCw,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-toastify";
import API_CONFIG from "../../config/api";

const DEFAULT_LIMIT = 10;
const LIMIT_OPTIONS = [10, 20, 50, 100];
const SORT_FIELDS = [
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
  { value: "personName", label: "Person" },
  { value: "companyName", label: "Company" },
  { value: "sourceType", label: "Source" },
];
/** URL/API: omit or `all` = manual + import; `manual`|`upcoming_event`; `import`|`sales_day_import` */
const SOURCE_OPTIONS = [
  { value: "", label: "Manual + import (all)" },
  { value: "manual", label: "Manual / event adds only" },
  { value: "import", label: "CSV import only" },
];

const DAY_SHIFT_SALES_URL = `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/reports/add-agent/day-shift-sales`;

/** Normalize URL sourceType to a select value: "" | "manual" | "import". */
const urlSourceTypeToSelectValue = (raw) => {
  const t = String(raw || "").trim().toLowerCase();
  if (!t || t === "all") return "";
  if (t === "upcoming_event" || t === "manual") return "manual";
  if (t === "sales_day_import" || t === "import") return "import";
  return "";
};

/** Map select back to API query (prefer canonical tokens). */
const selectValueToSourceTypeParam = (selectVal) => {
  if (!selectVal) return null;
  if (selectVal === "manual") return "manual";
  if (selectVal === "import") return "import";
  return null;
};

const extractCreatorArray = (payload) => {
  if (!payload || typeof payload !== "object") return [];
  const root = payload?.data !== undefined ? payload.data : payload;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.eligibleCreators)) return root.eligibleCreators;
  if (Array.isArray(root?.employees)) return root.employees;
  if (Array.isArray(root?.rows)) return root.rows;
  if (Array.isArray(payload?.eligibleCreators)) return payload.eligibleCreators;
  return [];
};

const creatorsToOptions = (list) =>
  list
    .map((e) => ({
      label: `${e?.employeeName || e?.name || "Unknown"} (${e?.empId || "-"})`,
      value: String(e?.empId || "").trim(),
    }))
    .filter((x) => x.value);

const mergeCreatorOptions = (a, b) => {
  const m = new Map();
  [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach(
    (o) => {
      if (o?.value) m.set(o.value, o);
    },
  );
  return Array.from(m.values()).sort((x, y) =>
    String(x.label).localeCompare(String(y.label)),
  );
};

const getToken = () =>
  sessionStorage.getItem("authToken") ||
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

const getAuthConfig = () => {
  const token = getToken();
  return {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
};

const toAbsoluteApiUrl = (pathOrUrl) => {
  if (!pathOrUrl) return null;
  const v = String(pathOrUrl).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `${API_CONFIG.BASE_URL}${v.startsWith("/") ? v : `/${v}`}`;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const clampLimit = (n) => {
  const x = Number(n) || DEFAULT_LIMIT;
  return Math.min(100, Math.max(1, x));
};

/** Shared field styles — matches Sales / report screens (indigo focus). */
const FIELD_INPUT =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 transition-colors hover:border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500";
const FIELD_SELECT =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 disabled:opacity-55 disabled:cursor-not-allowed";

/** Match `SalesDayAgentWorkspace.jsx` Review &amp; filter — table + pagination shell. */
const TABLE_STYLE = {
  /** `overflow-x-auto` only — avoid `do-report-scroll-x` (always-visible scrollbar). */
  shell:
    "overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50 p-3",
  table: "min-w-full border-separate border-spacing-y-2.5 text-[13px] font-sans",
  head: "text-left",
  th: "px-4 py-3 text-[14px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap bg-white border-y border-gray-200",
  row: "bg-white",
  td: "px-4 py-3 text-[16px] font-medium text-gray-700 align-middle bg-white border-y border-gray-200",
  tdStart: "rounded-l-xl border-l border-gray-200",
  tdEnd: "rounded-r-xl border-r border-gray-200",
};

const PAGINATION_STYLE = {
  wrap: "mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3",
  meta: "text-base text-gray-500",
  nav: "flex items-center gap-1 gap-x-2",
  link: "cursor-pointer px-2 py-0.5 text-base font-medium text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
  pageBtn:
    "cursor-pointer min-w-8 h-8 px-1.5 inline-flex items-center justify-center rounded-md text-base font-semibold tabular-nums transition-colors box-border leading-none",
  pageInactive: "border-2 border-transparent text-gray-800 hover:bg-gray-100",
  pageActive: "border-1 border-black text-black font-bold bg-gray-50/90 hover:bg-gray-100",
  dots: "px-0.5 text-gray-500 select-none text-base font-medium",
};

function paginationPageNum(v, fallback = 1) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/** Local calendar date as `YYYY-MM-DD` (no UTC shift). */
const toYmd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addCalendarDays = (d, delta) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);

const REPORT_DATE_PRESETS = [
  { key: "all", label: "All dates" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
];

function getReportPresetRange(key) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (key === "all") return { from: "", to: "" };
  if (key === "today") {
    const y = toYmd(today);
    return { from: y, to: y };
  }
  if (key === "yesterday") {
    const y = toYmd(addCalendarDays(today, -1));
    return { from: y, to: y };
  }
  if (key === "last7") {
    return { from: toYmd(addCalendarDays(today, -6)), to: toYmd(today) };
  }
  if (key === "last30") {
    return { from: toYmd(addCalendarDays(today, -29)), to: toYmd(today) };
  }
  if (key === "thisMonth") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: toYmd(from), to: toYmd(to) };
  }
  if (key === "lastMonth") {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toYmd(from), to: toYmd(to) };
  }
  return { from: "", to: "" };
}

/** Map current URL query to a preset key for highlighting (`custom` = anything else). */
function inferReportDatePreset(q) {
  const dateOnly = (q.date || "").trim();
  const from = (q.startDate || "").trim();
  const to = (q.endDate || "").trim();
  if (!dateOnly && !from && !to) return "all";
  if (!dateOnly && from && !to) return "custom";
  if (!dateOnly && !from && to) return "custom";
  const effFrom = dateOnly || from;
  const effTo = (dateOnly || to || from || "").trim();
  if (!effFrom || !effTo) return "custom";
  const presetKeys = [
    "today",
    "yesterday",
    "last7",
    "last30",
    "thisMonth",
    "lastMonth",
  ];
  for (const k of presetKeys) {
    const r = getReportPresetRange(k);
    if (r.from === effFrom && r.to === effTo) return k;
  }
  return "custom";
}

/** Short label for the date-range dropdown trigger. */
function reportDateRangeSummary(q) {
  const key = inferReportDatePreset(q);
  if (key === "all") return "All dates";
  const preset = REPORT_DATE_PRESETS.find((p) => p.key === key);
  if (preset) return preset.label;
  const from = (q.startDate || q.date || "").trim();
  const to = (q.endDate || q.date || "").trim();
  if (from && to && from !== to) return `${from} → ${to}`;
  if (from) return from;
  return "Custom range";
}

const FILTER_CONTROL =
  "w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400";

const rowToEditForm = (row) => {
  const loc = row?.location || {};
  return {
    companyName: row?.companyName ?? "",
    personName: row?.personName ?? "",
    linkedin: row?.linkedin ?? "",
    contactNumber: row?.contactNumber ?? "",
    email: row?.email ?? "",
    whatsappNumber: row?.whatsappNumber ?? "",
    commodity: row?.commodity ?? "",
    companyAddress: row?.companyAddress ?? "",
    city: loc?.city ?? "",
    state: loc?.state ?? "",
    country: loc?.country ?? "",
    zipcode: loc?.zipcode ?? "",
    shippingTo: row?.shippingTo ?? "",
  };
};

export default function AddAgentReport() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(() => {
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = clampLimit(searchParams.get("limit") || DEFAULT_LIMIT);
    const search = (searchParams.get("search") || "").trim();
    const addedByEmpId = (searchParams.get("addedByEmpId") || "").trim();
    const sourceType = (searchParams.get("sourceType") || "").trim();
    const sortByRaw = (searchParams.get("sortBy") || "createdAt").trim();
    const sortOrderRaw = (searchParams.get("sortOrder") || "desc").toLowerCase();
    const sortBy = SORT_FIELDS.some((s) => s.value === sortByRaw)
      ? sortByRaw
      : "createdAt";
    const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";
    const date = (searchParams.get("date") || "").trim();
    const startDate = (searchParams.get("startDate") || "").trim();
    const endDate = (searchParams.get("endDate") || "").trim();
    return {
      page,
      limit,
      search,
      addedByEmpId,
      sourceType,
      sortBy,
      sortOrder,
      date,
      startDate,
      endDate,
    };
  }, [searchParams]);

  const [searchDraft, setSearchDraft] = useState(query.search);
  useEffect(() => {
    setSearchDraft(query.search);
  }, [query.search]);

  const [reportMeta, setReportMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const dateRangeRef = useRef(null);

  useEffect(() => {
    if (!dateRangeOpen) return;
    const onPointerDown = (e) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(e.target)) {
        setDateRangeOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setDateRangeOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [dateRangeOpen]);

  const handleApiError = useCallback(
    (error, fallbackMessage) => {
      const status = error?.response?.status;
      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          fallbackMessage,
      );
    },
    [navigate],
  );

  const patchSearchParams = useCallback(
    (updates) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") next.delete(k);
        else next.set(k, String(v));
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  /** Day-shift Sales creators only (same list as `eligibleCreators` on the report). */
  const loadDayShiftSalesCreators = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const res = await axios.get(DAY_SHIFT_SALES_URL, getAuthConfig());
      const list = extractCreatorArray(res?.data);
      const options = creatorsToOptions(list);
      setEmployeeOptions(options);
    } catch (error) { 
      setEmployeeOptions([]);
      handleApiError(
        error,
        "Failed to load day-shift Sales creators for filter",
      );
    } finally {
      setLoadingEmployees(false);
    }
  }, [handleApiError]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };
      if (query.search) params.search = query.search;
      if (query.addedByEmpId) params.addedByEmpId = query.addedByEmpId;
      const st = String(query.sourceType || "").trim();
      const stLower = st.toLowerCase();
      const allowedSource = new Set([
        "manual",
        "import",
        "upcoming_event",
        "sales_day_import",
      ]);
      if (st && stLower !== "all" && allowedSource.has(stLower)) {
        params.sourceType = st;
      }
      if (query.date) {
        params.date = query.date;
      } else {
        if (query.startDate) params.startDate = query.startDate;
        if (query.endDate) params.endDate = query.endDate;
      }

        const res = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/reports/add-agent`,
          { ...getAuthConfig(), params },
        );

        const payload = res?.data;
        const data = payload?.data || {};
        const p = data?.pagination || {};
        const rawRows = Array.isArray(data?.rows) ? data.rows : [];

        setReportMeta({
          reportName: data?.reportName || "Add Agent Report",
          generatedBy: data?.generatedBy || null,
        module: payload?.module || null,
        filters: data?.filters || null,
        eligibleCreators: Array.isArray(data?.eligibleCreators)
          ? data.eligibleCreators
          : [],
      });
      setRows(rawRows);

      const fromReport = creatorsToOptions(
        Array.isArray(data?.eligibleCreators) ? data.eligibleCreators : [],
      );
      if (fromReport.length) {
        setEmployeeOptions((prev) => mergeCreatorOptions(prev, fromReport));
      }
      setPagination({
        page: Math.max(1, Number(p.page ?? query.page) || 1),
        limit: clampLimit(p.limit ?? query.limit),
        total: Number(p.total ?? 0) || 0,
        totalPages: Math.max(1, Number(p.totalPages) || 1),
      });
    } catch (error) {
      setRows([]);
      handleApiError(error, "Failed to load add agent report");
    } finally {
      setLoading(false);
    }
  }, [query, handleApiError]);

  useEffect(() => {
    loadDayShiftSalesCreators();
  }, [loadDayShiftSalesCreators]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const openEdit = (row) => {
    const api = row?.actions?.updateApi;
    const method = (row?.actions?.updateMethod || "PATCH").toUpperCase();
    if (!api || method !== "PATCH") {
      toast.error("This row has no edit action.");
      return;
    }
    setEditRow(row);
    setEditForm(rowToEditForm(row));
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditRow(null);
    setEditForm(null);
  };

  const onEditChange = (ev) => {
    const { name, value } = ev.target;
    setEditForm((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const saveEdit = async () => {
    if (!editRow?.actions?.updateApi || !editForm) return;
    setEditSaving(true);
    try {
      const url = toAbsoluteApiUrl(editRow.actions.updateApi);
      const body = {
        companyName: editForm.companyName.trim(),
        personName: editForm.personName.trim(),
        linkedin: editForm.linkedin.trim(),
        contactNumber: editForm.contactNumber.trim(),
        email: editForm.email.trim(),
        whatsappNumber: editForm.whatsappNumber.trim(),
        commodity: editForm.commodity.trim(),
        companyAddress: editForm.companyAddress.trim(),
        city: editForm.city.trim(),
        state: editForm.state.trim(),
        country: editForm.country.trim(),
        zipcode: editForm.zipcode.trim(),
        shippingTo: editForm.shippingTo.trim(),
      };
      const res = await axios.patch(url, body, getAuthConfig());
      if (res?.data?.success === false) {
        toast.error(res?.data?.message || "Update failed");
        return;
      }
      toast.success(res?.data?.message || "Updated successfully");
      closeEdit();
      fetchReport();
    } catch (error) {
      handleApiError(error, "Update failed");
    } finally {
      setEditSaving(false);
    }
  };

  const pageItems = useMemo(() => {
    const total = Number(pagination.totalPages) || 1;
    const current = Math.min(
      Math.max(1, Number(pagination.page) || 1),
      total,
    );
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 2)
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
  }, [pagination.page, pagination.totalPages]);

  const { visibleFrom, visibleTo } = useMemo(() => {
    const pageNum = paginationPageNum(pagination.page, 1);
    const lim = Number(pagination.limit) || DEFAULT_LIMIT;
    if (!rows.length) {
      return { visibleFrom: 0, visibleTo: 0 };
    }
    return {
      visibleFrom: (pageNum - 1) * lim + 1,
      visibleTo: (pageNum - 1) * lim + rows.length,
    };
  }, [pagination.page, pagination.limit, rows.length]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100/90 px-4 md:px-6 py-5 md:py-8 font-poppins text-gray-900">
      <div className="max-w-[1920px] mx-auto w-full space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/70 border-b border-gray-100">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
                {reportMeta?.reportName || "Add Agent Report"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {reportMeta?.module?.label ? (
                  <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-gray-200">
                    {reportMeta.module.label}
                  </span>
                ) : null}
                {reportMeta?.module?.isActive === true ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                    Active
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-start gap-3 min-w-0">
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <BarChart3 className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-base text-gray-600 leading-relaxed max-w-2xl">
                  Manual agent customers and sales-day CSV imports from day-shift
                  Sales. Filters and pagination stay in the URL so you can bookmark
                  or share this view.
                </p>
                {reportMeta?.generatedBy?.employeeName ? (
                  <p className="mt-3 inline-flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>
                      <span className="text-gray-500">Viewing as</span>{" "}
                      <span className="font-semibold text-gray-800">
                        {reportMeta.generatedBy.employeeName}
                      </span>
                      {reportMeta.generatedBy.empId
                        ? ` · ${reportMeta.generatedBy.empId}`
                        : ""}
                      {reportMeta.generatedBy?.department
                        ? ` · ${reportMeta.generatedBy.department}`
                        : ""}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-stretch gap-3 lg:justify-end shrink-0">
              <div className="flex min-w-[11rem] flex-1 sm:flex-initial items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-900">
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                  ) : (
                    <span className="text-lg font-bold tabular-nums leading-none text-gray-900">
                      {pagination.total}
                    </span>
                  )}
                </div>
                <div className="pr-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Records
                  </p>
                  <p className="text-base font-medium text-gray-700 truncate">
                    Matching filters
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-visible">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/70 border-b border-gray-100">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-semibold text-slate-800">Filters</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-sm font-medium text-gray-600">Search</span>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      value={searchDraft}
                      onChange={(e) => setSearchDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          patchSearchParams({
                            search: searchDraft.trim(),
                            page: 1,
                          });
                        }
                      }}
                      placeholder="Name, company, email, phone, location, customer id, import batch id…"
                      className={`${FILTER_CONTROL} pl-10`}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-600">
                    Added by (day-shift Sales)
                  </span>
                  <select
                    value={query.addedByEmpId}
                    disabled={loadingEmployees}
                    onChange={(e) =>
                      patchSearchParams({
                        addedByEmpId: e.target.value,
                        page: 1,
                      })
                    }
                    className={`${FILTER_CONTROL} disabled:opacity-55 disabled:cursor-not-allowed`}
                  >
                    <option value="">All creators</option>
                    {employeeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-600">
                    Source type
                  </span>
                  <select
                    value={urlSourceTypeToSelectValue(query.sourceType)}
                    onChange={(e) => {
                      const v = e.target.value;
                      patchSearchParams({
                        sourceType: v ? selectValueToSourceTypeParam(v) : "",
                        page: 1,
                      });
                    }}
                    className={FILTER_CONTROL}
                  >
                    {SOURCE_OPTIONS.map((o) => (
                      <option key={o.value || "all-sources"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-600">Sort by</span>
                  <select
                    value={query.sortBy}
                    onChange={(e) =>
                      patchSearchParams({ sortBy: e.target.value, page: 1 })
                    }
                    className={FILTER_CONTROL}
                  >
                    {SORT_FIELDS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-600">Order</span>
                  <select
                    value={query.sortOrder}
                    onChange={(e) =>
                      patchSearchParams({ sortOrder: e.target.value, page: 1 })
                    }
                    className={FILTER_CONTROL}
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </div>
                <div
                  className="relative z-20 flex flex-col gap-1 sm:col-span-2 lg:col-span-2"
                  ref={dateRangeRef}
                >
                  <span className="text-sm font-medium text-gray-600">
                    Date range
                  </span>
                  <button
                    type="button"
                    aria-expanded={dateRangeOpen}
                    aria-haspopup="dialog"
                    aria-controls="add-agent-report-date-range-panel"
                    id="add-agent-report-date-range-trigger"
                    onClick={() => setDateRangeOpen((o) => !o)}
                    className={`${FILTER_CONTROL} flex cursor-pointer items-center justify-between gap-2 text-left`}
                  >
                    <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                      <Calendar
                        size={18}
                        className="shrink-0 text-gray-400"
                        aria-hidden
                      />
                      <span className="truncate font-medium text-gray-900">
                        {reportDateRangeSummary(query)}
                      </span>
                    </span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-gray-500 transition-transform ${dateRangeOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {dateRangeOpen ? (
                    <div
                      id="add-agent-report-date-range-panel"
                      role="dialog"
                      aria-labelledby="add-agent-report-date-range-trigger"
                      className="absolute left-0 top-full z-40 mt-1 w-[min(100%,22rem)] max-w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
                    >
                      <p className="mb-3 text-xs font-medium text-gray-500">
                        Quick presets
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {REPORT_DATE_PRESETS.map(({ key, label }) => {
                          const active = inferReportDatePreset(query) === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                if (key === "all") {
                                  patchSearchParams({
                                    date: "",
                                    startDate: "",
                                    endDate: "",
                                    page: 1,
                                  });
                                } else {
                                  const { from, to } = getReportPresetRange(key);
                                  patchSearchParams({
                                    date: "",
                                    startDate: from,
                                    endDate: to,
                                    page: 1,
                                  });
                                }
                                setDateRangeOpen(false);
                              }}
                              className={`cursor-pointer shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                                active
                                  ? "bg-slate-900 text-white"
                                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <p className="mb-2 text-xs font-medium text-gray-500">
                          Custom range
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="text-xs font-medium text-gray-500">
                              From
                            </span>
                            <input
                              type="date"
                              value={query.startDate || query.date || ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                const prevEnd = (
                                  query.endDate ||
                                  query.date ||
                                  ""
                                ).trim();
                                patchSearchParams({
                                  date: "",
                                  startDate: v,
                                  endDate:
                                    prevEnd && prevEnd >= v ? prevEnd : v,
                                  page: 1,
                                });
                              }}
                              className={FILTER_CONTROL}
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="text-xs font-medium text-gray-500">
                              To
                            </span>
                            <input
                              type="date"
                              value={query.endDate || query.date || ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                const prevStart = (
                                  query.startDate ||
                                  query.date ||
                                  ""
                                ).trim();
                                patchSearchParams({
                                  date: "",
                                  endDate: v,
                                  startDate:
                                    prevStart && prevStart <= v
                                      ? prevStart
                                      : v,
                                  page: 1,
                                });
                              }}
                              className={FILTER_CONTROL}
                            />
                          </div>
                        </div>
                        {inferReportDatePreset(query) === "custom" ? (
                          <p className="mt-2 text-xs text-gray-500">
                            Range updates the URL as you change dates.
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="mt-4 w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-100"
                        onClick={() => setDateRangeOpen(false)}
                      >
                        Done
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-600">
                    Rows / page
                  </span>
                  <select
                    value={String(query.limit)}
                    onChange={(e) =>
                      patchSearchParams({ limit: e.target.value, page: 1 })
                    }
                    className={FILTER_CONTROL}
                  >
                    {LIMIT_OPTIONS.map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200/80 pt-4">
                <button
                  type="button"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                  onClick={() =>
                    patchSearchParams({ search: searchDraft.trim(), page: 1 })
                  }
                >
                  <RefreshCw size={16} />
                  Apply search
                </button>
                
                <button
                  type="button"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setSearchDraft("");
                    setDateRangeOpen(false);
                    setSearchParams(new URLSearchParams(), { replace: true });
                  }}
                >
                  Clear filters
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => fetchReport()}
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
                <span className="ml-auto text-xs text-gray-500 font-medium">
                  Rows found: {pagination.total}
                </span>
              </div>
            </div>
          </div>

          {loading && (
            <p className="text-sm text-gray-500">Loading…</p>
          )}

          {!loading && rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-800">No rows to show</p>
              <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
                Either no records match these filters, or nothing has been added yet.
                Try clearing search, widening the date range, or choosing &ldquo;All
                creators&rdquo; if a creator filter is too narrow.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchDraft("");
                  setSearchParams(new URLSearchParams(), { replace: true });
                }}
                className="mt-5 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Clear filters
              </button>
            </div>
          ) : !loading ? (
            <>
              <div className={TABLE_STYLE.shell}>
                <table className={TABLE_STYLE.table}>
                  <thead className={`${TABLE_STYLE.head} sticky top-0 z-10`}>
                    <tr>
                      <th
                        scope="col"
                        className={`${TABLE_STYLE.th} ${TABLE_STYLE.tdStart}`}
                      >
                        Person / Company
                      </th>
                      <th scope="col" className={TABLE_STYLE.th}>
                        Source
                      </th>
                      <th scope="col" className={TABLE_STYLE.th}>
                        Event
                      </th>
                      <th scope="col" className={TABLE_STYLE.th}>
                        Contact
                      </th>
                      <th scope="col" className={TABLE_STYLE.th}>
                        Created by
                      </th>
                      <th scope="col" className={TABLE_STYLE.th}>
                        Created
                      </th>
                      <th
                        scope="col"
                        className={`${TABLE_STYLE.th} ${TABLE_STYLE.tdEnd} text-right`}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIdx) => (
                      <tr
                        key={
                          row.agentCustomerId ||
                          row.customerId ||
                          `row-${rowIdx}`
                        }
                        className={`${TABLE_STYLE.row} hover:bg-blue-50/50 transition-colors`}
                      >
                        <td
                          className={`${TABLE_STYLE.td} ${TABLE_STYLE.tdStart} align-top`}
                        >
                          <div className="font-semibold text-gray-900">
                            {row.personName || "—"}
                          </div>
                          <div className="text-gray-600 text-sm mt-1">
                            {row.companyName || "—"}
                          </div>
                          {/* {row.customerId ? (
                            <div className="text-gray-400 text-sm mt-1.5 font-mono tracking-tight">
                              {row.customerId}
                            </div>
                          ) : null} */}
                        </td>
                        <td className={`${TABLE_STYLE.td} align-top`}>
                          <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200/80">
                            {row.sourceType || "—"}
                          </span>
                          {row.recordType ? (
                            <div className="text-sm text-gray-500 mt-1.5">
                              {row.recordType}
                            </div>
                          ) : null}
                          {/* {row.importBatchId ? (
                            <div className="text-sm text-gray-500 mt-1.5 font-mono">
                              Batch: {row.importBatchId}
                            </div>
                          ) : null} */}
                          {row.salesDayDisposition != null &&
                          String(row.salesDayDisposition).trim() !== "" ? (
                            <div className="text-sm text-amber-900 mt-1.5 rounded-md bg-amber-50 px-2 py-1 ring-1 ring-amber-100 inline-block max-w-[220px]">
                              {String(row.salesDayDisposition)}
                            </div>
                          ) : null}
                        </td>
                        <td
                          className={`${TABLE_STYLE.td} align-top max-w-[220px]`}
                        >
                          {row.event?.eventName ? (
                            <>
                              <div className="font-medium text-gray-900 truncate">
                                {row.event.eventName}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {formatDateTime(row.event.eventDateTime)}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className={`${TABLE_STYLE.td} align-top`}>
                          <div className="tabular-nums">
                            {row.contactNumber || "—"}
                          </div>
                          <div className="relative group max-w-[160px] mt-1">

  {/* Truncated Email */}
  <div className="text-sm text-gray-500 truncate block">
    {row.email || "—"}
  </div>

  {/* Tooltip */}
  {row.email && (
    <div className="absolute left-0 top-full mt-2 hidden group-hover:block
                    bg-gray-900 text-white text-sm
                    px-3 py-2.5
                    rounded-lg shadow-xl
                    max-w-[170px]
                    break-words
                    z-50">
      {row.email}
    </div>
  )}

</div>
                        </td>
                        <td className={`${TABLE_STYLE.td} align-top`}>
                          <span className="font-medium text-gray-900">
                            {row.createdBy?.employeeName || "—"}
                          </span>
                          {row.createdBy?.empId ? (
                            <div className="text-sm text-gray-500 mt-0.5 font-mono">
                              {row.createdBy.empId}
                            </div>
                          ) : null}
                        </td>
                        <td
                          className={`${TABLE_STYLE.td} align-top text-sm whitespace-nowrap`}
                        >
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td
                          className={`${TABLE_STYLE.td} ${TABLE_STYLE.tdEnd} align-top text-right`}
                        >
                          {row.actions?.updateApi &&
                          String(row.actions?.updateMethod || "PATCH")
                            .toUpperCase() === "PATCH" ? (
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="cursor-pointer inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              {row.actions?.viewLabel || "View / Edit"}
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rows.length > 0 && (
                <div
                  className={`${PAGINATION_STYLE.wrap} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}
                >
                  <span className={PAGINATION_STYLE.meta}>
                    Showing {visibleFrom} to {visibleTo} of {pagination.total}{" "}
                    records
                  </span>
                  <div className={PAGINATION_STYLE.nav}>
                    <button
                      type="button"
                      disabled={
                        loading ||
                        paginationPageNum(pagination.page, 1) <= 1
                      }
                      className={PAGINATION_STYLE.link}
                      onClick={() =>
                        patchSearchParams({
                          page: String(
                            Math.max(
                              1,
                              paginationPageNum(pagination.page, 1) - 1,
                            ),
                          ),
                        })
                      }
                    >
                      Previous
                    </button>
                    {pageItems.map((item, idx) =>
                      item === "..." ? (
                        <span key={`e-${idx}`} className={PAGINATION_STYLE.dots}>
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            patchSearchParams({ page: String(item) })
                          }
                          aria-current={
                            paginationPageNum(item, 1) ===
                            paginationPageNum(pagination.page, 1)
                              ? "page"
                              : undefined
                          }
                          className={`${PAGINATION_STYLE.pageBtn} ${
                            paginationPageNum(item, 1) ===
                            paginationPageNum(pagination.page, 1)
                              ? PAGINATION_STYLE.pageActive
                              : PAGINATION_STYLE.pageInactive
                          }`}
                        >
                          {item}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      disabled={
                        loading ||
                        paginationPageNum(pagination.page, 1) >=
                          paginationPageNum(pagination.totalPages, 1)
                      }
                      className={PAGINATION_STYLE.link}
                      onClick={() =>
                        patchSearchParams({
                          page: String(
                            Math.min(
                              paginationPageNum(
                                pagination.totalPages,
                                1,
                              ),
                              paginationPageNum(pagination.page, 1) + 1,
                            ),
                          ),
                        })
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {editOpen && editForm ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-[2px]"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div
            className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl shadow-indigo-900/10 ring-1 ring-gray-200/80 max-h-[92vh] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-agent-report-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white">
              <div className="min-w-0 pt-0.5">
                <h2
                  id="add-agent-report-edit-title"
                  className="text-lg font-bold tracking-tight"
                >
                  {editRow?.actions?.viewLabel || "Edit record"}
                </h2>
                <p className="text-xs text-indigo-100/95 mt-1 leading-relaxed max-w-xl">
                  <code className="rounded bg-white/15 px-1 py-0.5 text-[11px]">
                    PATCH
                  </code>{" "}
                  — manual rows use{" "}
                  <span className="font-mono text-[11px]">event-customer</span>;
                  imports use{" "}
                  <span className="font-mono text-[11px]">sales-day-agent</span>{" "}
                  (day shift required on server).
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="p-2 rounded-xl hover:bg-white/15 text-white transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 md:p-6 bg-gray-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ["personName", "Person name"],
                  ["companyName", "Company name"],
                  ["email", "Email"],
                  ["contactNumber", "Contact number"],
                  ["whatsappNumber", "WhatsApp"],
                  ["linkedin", "LinkedIn"],
                  ["commodity", "Commodity"],
                  ["companyAddress", "Company address"],
                  ["city", "City"],
                  ["state", "State"],
                  ["country", "Country"],
                  ["zipcode", "Zip / postal"],
                  ["shippingTo", "Shipping to"],
                ].map(([name, label]) => (
                  <div
                    key={name}
                    className={
                      name === "companyAddress" ? "sm:col-span-2" : undefined
                    }
                  >
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                      {label}
                    </label>
                    <input
                      name={name}
                      value={editForm[name] || ""}
                      onChange={onEditChange}
                      className={FIELD_INPUT}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0 flex gap-3 justify-end px-5 py-4 border-t border-gray-200 bg-white">
              <button
                type="button"
                onClick={closeEdit}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={saveEdit}
                className="inline-flex items-center justify-center min-w-[7rem] px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold shadow-md shadow-indigo-500/25 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-55 transition-all"
              >
                {editSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
