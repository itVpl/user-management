import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  Pencil,
  Calendar,
  BarChart3,
  Users,
  Filter,
  Loader2,
  Inbox,
  RefreshCw,
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

/** GET add-agent / list / today: `remark=NEW` | `remark=OLD`; omit = all */
const REMARK_FILTER_OPTIONS = [
  { value: "", label: "All remarks" },
  { value: "NEW", label: "NEW" },
  { value: "OLD", label: "Follow Up" },
];

const normalizeRemarkFilter = (raw) => {
  const t = String(raw || "")
    .trim()
    .toUpperCase();
  if (t === "NEW" || t === "OLD") return t;
  return "";
};

/** Import remark for table badges: only explicit OLD vs everything else shown as NEW or absent */
const isImportRemarkOld = (v) =>
  String(v || "")
    .trim()
    .toUpperCase() === "OLD";

const isSalesDayAgentUpdateUrl = (api) =>
  /sales-day-agent/i.test(String(api || ""));

const isEventCustomerUpdateUrl = (api) =>
  /event-customer/i.test(String(api || ""));

const DAY_SHIFT_SALES_URL = `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/reports/add-agent/day-shift-sales`;

/** Normalize URL sourceType to a select value: "" | "manual" | "import". */
const urlSourceTypeToSelectValue = (raw) => {
  const t = String(raw || "")
    .trim()
    .toLowerCase();
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
  if (!Number.isFinite(x) || x <= 0) return DEFAULT_LIMIT;
  if (LIMIT_OPTIONS.includes(x)) return x;
  return DEFAULT_LIMIT;
};

/** Shared field styles — matches Sales / report screens (indigo focus). */
const FIELD_INPUT =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 transition-colors hover:border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500";
const FIELD_SELECT =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 disabled:opacity-55 disabled:cursor-not-allowed";

const FILTER_LABEL = "text-sm font-medium text-gray-600";
const FILTER_INPUT =
  "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 cursor-text";
const FILTER_SELECT =
  "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer pr-10 appearance-none";

const TABLE_STYLE = {
  shell:
    "do-report-scroll-x overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50 p-3",
  table:
    "min-w-full border-separate border-spacing-y-2.5 text-[13px] font-sans",
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
  link: "cursor-pointer px-2 py-0.5 text-base font-medium text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed",
  pageBtn:
    "cursor-pointer min-w-8 h-8 px-1.5 inline-flex items-center justify-center rounded-md text-base font-semibold tabular-nums transition-colors box-border leading-none disabled:cursor-not-allowed disabled:opacity-60",
  pageInactive: "border-2 border-transparent text-gray-800 hover:bg-gray-100",
  pageActive:
    "border-1 border-black text-black font-bold bg-gray-50/90 hover:bg-gray-100",
  dots: "px-0.5 text-gray-500 select-none text-base font-medium",
};

function paginationPageNum(v, fallback = 1) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function TruncTd({ children, title }) {
  const t = typeof title === "string" ? title.trim() : title;
  return (
    <span
      className="block min-w-0 max-w-full truncate"
      title={t ? t : undefined}
    >
      {children}
    </span>
  );
}

function dateToInputValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inferDatePreset({ date, startDate, endDate }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = dateToInputValue(today);
  const yesterdayStr = dateToInputValue(addDays(today, -1));
  const thisWeekStartStr = dateToInputValue(startOfWeekMonday(today));
  const last7StartStr = dateToInputValue(addDays(today, -6));
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthStartStr = dateToInputValue(thisMonthStart);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const lastMonthStartStr = dateToInputValue(lastMonthStart);
  const lastMonthEndStr = dateToInputValue(lastMonthEnd);
  const lastWeekStart = addDays(startOfWeekMonday(today), -7);
  const lastWeekEnd = addDays(startOfWeekMonday(today), -1);
  const lastWeekStartStr = dateToInputValue(lastWeekStart);
  const lastWeekEndStr = dateToInputValue(lastWeekEnd);

  const d = String(date || "").trim();
  const s = String(startDate || "").trim();
  const e = String(endDate || "").trim();
  if (!d && !s && !e) return "";
  if (d === todayStr) return "today";
  if (d === yesterdayStr) return "yesterday";
  if (!d && s === last7StartStr && e === todayStr) return "last7";
  if (!d && s === thisWeekStartStr && e === todayStr) return "thisWeek";
  if (!d && s === lastWeekStartStr && e === lastWeekEndStr) return "lastWeek";
  if (!d && s === thisMonthStartStr && e === todayStr) return "thisMonth";
  if (!d && s === lastMonthStartStr && e === lastMonthEndStr)
    return "lastMonth";
  return "custom";
}

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
    shipmentType: row?.shipmentType ?? "",
    remark: isImportRemarkOld(row?.remark) ? "OLD" : "NEW",
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
    const sortOrderRaw = (
      searchParams.get("sortOrder") || "desc"
    ).toLowerCase();
    const sortBy = SORT_FIELDS.some((s) => s.value === sortByRaw)
      ? sortByRaw
      : "createdAt";
    const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";
    const date = (searchParams.get("date") || "").trim();
    const startDate = (searchParams.get("startDate") || "").trim();
    const endDate = (searchParams.get("endDate") || "").trim();
    const remark = normalizeRemarkFilter(searchParams.get("remark"));
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
      remark,
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
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customRangeDraft, setCustomRangeDraft] = useState({
    startDate: "",
    endDate: "",
  });
  const [customRangeRestore, setCustomRangeRestore] = useState({
    date: "",
    startDate: "",
    endDate: "",
  });

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
      if (query.remark) params.remark = query.remark;

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
        shipmentType: editForm.shipmentType.trim(),
      };
      if (
        isSalesDayAgentUpdateUrl(editRow.actions.updateApi) ||
        isEventCustomerUpdateUrl(editRow.actions.updateApi)
      ) {
        body.remark =
          String(editForm.remark || "").toUpperCase() === "OLD" ? "OLD" : "NEW";
      }
      const res = await axios.patch(url, body, getAuthConfig());
      if (res?.data?.success === false) {
        toast.error(res?.data?.message || "Update failed");
        return;
      }
      toast.success(res?.data?.message || "Updated successfully");
      closeEdit();
      fetchReport();
    } catch (error) {
      const status = error?.response?.status;
      if (status === 409) {
        toast.error(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Duplicate company for NEW remark. Switch to OLD or use a unique company name.",
        );
      } else {
        handleApiError(error, "Update failed");
      }
    } finally {
      setEditSaving(false);
    }
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (query.search) n += 1;
    if (query.addedByEmpId) n += 1;
    if (urlSourceTypeToSelectValue(query.sourceType)) n += 1;
    if (query.date || query.startDate || query.endDate) n += 1;
    if (query.remark) n += 1;
    return n;
  }, [query]);

  const datePreset = useMemo(
    () =>
      inferDatePreset({
        date: query.date,
        startDate: query.startDate,
        endDate: query.endDate,
      }),
    [query.date, query.startDate, query.endDate],
  );

  const currentPage = paginationPageNum(pagination.page ?? query.page, 1);
  const totalPages = paginationPageNum(pagination.totalPages, 1) || 1;
  const totalRows = pagination.total || rows.length;
  const fromRow =
    totalRows > 0
      ? (currentPage - 1) *
          paginationPageNum(
            pagination.limit ?? query.limit ?? DEFAULT_LIMIT,
            DEFAULT_LIMIT,
          ) +
        1
      : 0;
  const toRow = Math.min(
    currentPage *
      paginationPageNum(
        pagination.limit ?? query.limit ?? DEFAULT_LIMIT,
        DEFAULT_LIMIT,
      ),
    totalRows,
  );
  const pageButtons = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages = new Set([
      1,
      totalPages,
      currentPage - 1,
      currentPage,
      currentPage + 1,
    ]);
    return [...pages]
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b);
  }, [currentPage, totalPages]);
  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100/90 px-4 md:px-6 py-5 md:py-8 font-sans text-gray-900">
      <div className="max-w-[1920px] mx-auto w-full space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30">
                <BarChart3 className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <h1 className="text-2xl md:text-[1.65rem] font-bold tracking-tight text-gray-900">
                    {reportMeta?.reportName || "Add Agent Report"}
                  </h1>
                  {reportMeta?.module?.label ? (
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-100/80">
                      {reportMeta.module.label}
                    </span>
                  ) : null}
                  {reportMeta?.module?.isActive === true ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm text-gray-600 leading-relaxed max-w-2xl">
                  Manual agent customers + sales-day CSV imports (day-shift
                  Sales).
                </p>
                {reportMeta?.generatedBy?.employeeName ? (
                  <p className="mt-2 inline-flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Users className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span>
                      <span className="text-gray-400">Viewing as</span>{" "}
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

            <div className="w-full lg:w-auto">
              <div className="rounded-2xl border border-gray-200 bg-white px-6 py-4 flex items-center gap-4 min-w-[18rem]">
                <div className="h-16 w-30 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-2xl font-bold tabular-nums">
                  {loading ? "…" : totalRows}
                </div>
                <div className="flex-1 text-center">
                  <p className="text-xl font-semibold text-gray-700">
                    Total Records
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/70 border-b border-gray-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100/80">
                  <Filter className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-800">
                    Filters
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeFilterCount > 0
                      ? `${activeFilterCount} active`
                      : "Refine rows"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-end gap-2.5">
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <span className={FILTER_LABEL}>Search</span>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <input
                      className={`${FILTER_INPUT} pl-10`}
                      value={searchDraft}
                      onChange={(e) => setSearchDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          patchSearchParams({
                            search: searchDraft.trim(),
                            page: 1,
                          });
                      }}
                      placeholder="Name, company, email, phone, remark, shipment type, location, customer id, import batch…"
                    />
                  </div>
                </div>

                <div className="w-full lg:w-[22rem] flex flex-col gap-1">
                  <span className={FILTER_LABEL}>Added by</span>
                  <div className="relative">
                    <select
                      className={FILTER_SELECT}
                      value={query.addedByEmpId}
                      disabled={loadingEmployees}
                      onChange={(e) =>
                        patchSearchParams({
                          addedByEmpId: e.target.value,
                          page: 1,
                        })
                      }
                    >
                      <option value="">All creators</option>
                      {employeeOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-2.5 overflow-x-auto pb-1">
                <div className="min-w-[16rem] flex flex-col gap-1">
                  <span className={FILTER_LABEL}>Source type</span>
                  <div className="relative">
                    <select
                      className={FILTER_SELECT}
                      value={urlSourceTypeToSelectValue(query.sourceType)}
                      onChange={(e) => {
                        const v = e.target.value;
                        patchSearchParams({
                          sourceType: v ? selectValueToSourceTypeParam(v) : "",
                          page: 1,
                        });
                      }}
                    >
                      {SOURCE_OPTIONS.map((o) => (
                        <option key={o.value || "all-sources"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="min-w-[15rem] flex flex-col gap-1">
                  <span className={FILTER_LABEL}>Import remark</span>
                  <div className="relative">
                    <select
                      className={FILTER_SELECT}
                      value={query.remark}
                      onChange={(e) =>
                        patchSearchParams({ remark: e.target.value, page: 1 })
                      }
                    >
                      {REMARK_FILTER_OPTIONS.map((o) => (
                        <option key={o.value || "remark-all"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="min-w-[13rem] flex flex-col gap-1">
                  <span
                    className={`${FILTER_LABEL} inline-flex items-center justify-between gap-2`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Date range
                    </span>
                    {datePreset === "custom" ? (
                      <button
                        type="button"
                        className="cursor-pointer text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                        onClick={() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const todayStr = dateToInputValue(today);
                          const start =
                            String(query.startDate || "").trim() || todayStr;
                          const end =
                            String(query.endDate || "").trim() || todayStr;
                          setCustomRangeDraft({
                            startDate: start,
                            endDate: end,
                          });
                          setCustomRangeRestore({
                            date: query.date || "",
                            startDate: query.startDate || "",
                            endDate: query.endDate || "",
                          });
                          setCustomRangeOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    ) : null}
                  </span>
                  <div className="relative">
                    <select
                      className={FILTER_SELECT}
                      value={datePreset}
                      onChange={(e) => {
                        const v = e.target.value;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const todayStr = dateToInputValue(today);
                        const yesterdayStr = dateToInputValue(
                          addDays(today, -1),
                        );
                        const thisWeekStartStr = dateToInputValue(
                          startOfWeekMonday(today),
                        );
                        const last7StartStr = dateToInputValue(
                          addDays(today, -6),
                        );
                        const thisMonthStartStr = dateToInputValue(
                          new Date(today.getFullYear(), today.getMonth(), 1),
                        );
                        const lastMonthStart = new Date(
                          today.getFullYear(),
                          today.getMonth() - 1,
                          1,
                        );
                        const lastMonthEnd = new Date(
                          today.getFullYear(),
                          today.getMonth(),
                          0,
                        );
                        const lastMonthStartStr =
                          dateToInputValue(lastMonthStart);
                        const lastMonthEndStr = dateToInputValue(lastMonthEnd);
                        const lastWeekStart = addDays(
                          startOfWeekMonday(today),
                          -7,
                        );
                        const lastWeekEnd = addDays(
                          startOfWeekMonday(today),
                          -1,
                        );
                        const lastWeekStartStr =
                          dateToInputValue(lastWeekStart);
                        const lastWeekEndStr = dateToInputValue(lastWeekEnd);

                        if (!v) {
                          patchSearchParams({
                            date: "",
                            startDate: "",
                            endDate: "",
                            page: 1,
                          });
                          return;
                        }
                        if (v === "today") {
                          patchSearchParams({
                            date: todayStr,
                            startDate: "",
                            endDate: "",
                            page: 1,
                          });
                          return;
                        }
                        if (v === "yesterday") {
                          patchSearchParams({
                            date: yesterdayStr,
                            startDate: "",
                            endDate: "",
                            page: 1,
                          });
                          return;
                        }
                        if (v === "last7") {
                          patchSearchParams({
                            date: "",
                            startDate: last7StartStr,
                            endDate: todayStr,
                            page: 1,
                          });
                          return;
                        }
                        if (v === "thisWeek") {
                          patchSearchParams({
                            date: "",
                            startDate: thisWeekStartStr,
                            endDate: todayStr,
                            page: 1,
                          });
                          return;
                        }
                        if (v === "lastWeek") {
                          patchSearchParams({
                            date: "",
                            startDate: lastWeekStartStr,
                            endDate: lastWeekEndStr,
                            page: 1,
                          });
                          return;
                        }
                        if (v === "thisMonth") {
                          patchSearchParams({
                            date: "",
                            startDate: thisMonthStartStr,
                            endDate: todayStr,
                            page: 1,
                          });
                          return;
                        }
                        if (v === "lastMonth") {
                          patchSearchParams({
                            date: "",
                            startDate: lastMonthStartStr,
                            endDate: lastMonthEndStr,
                            page: 1,
                          });
                          return;
                        }
                        if (v === "custom") {
                          const start =
                            String(query.startDate || "").trim() || todayStr;
                          const end =
                            String(query.endDate || "").trim() || todayStr;
                          setCustomRangeDraft({
                            startDate: start,
                            endDate: end,
                          });
                          setCustomRangeRestore({
                            date: query.date || "",
                            startDate: query.startDate || "",
                            endDate: query.endDate || "",
                          });
                          patchSearchParams({
                            date: "",
                            startDate: start,
                            endDate: end,
                            page: 1,
                          });
                          setCustomRangeOpen(true);
                        }
                      }}
                    >
                      <option value="">All time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7">Last 7 days</option>
                      <option value="thisWeek">This week</option>
                      <option value="lastWeek">Last week</option>
                      <option value="thisMonth">This month</option>
                      <option value="lastMonth">Last month</option>
                      <option value="custom">Custom range</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="min-w-[10.5rem] flex flex-col gap-1">
                  <span className={FILTER_LABEL}>Sort by</span>
                  <div className="relative">
                    <select
                      className={FILTER_SELECT}
                      value={query.sortBy}
                      onChange={(e) =>
                        patchSearchParams({ sortBy: e.target.value, page: 1 })
                      }
                    >
                      {SORT_FIELDS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="min-w-[9.5rem] flex flex-col gap-1">
                  <span className={FILTER_LABEL}>Order</span>
                  <div className="relative">
                    <select
                      className={FILTER_SELECT}
                      value={query.sortOrder}
                      onChange={(e) =>
                        patchSearchParams({
                          sortOrder: e.target.value,
                          page: 1,
                        })
                      }
                    >
                      <option value="desc">Newest first</option>
                      <option value="asc">Oldest first</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="min-w-[8.5rem] flex flex-col gap-1">
                  <span className={FILTER_LABEL}>Rows / page</span>
                  <div className="relative">
                    <select
                      className={FILTER_SELECT}
                      value={String(query.limit)}
                      onChange={(e) =>
                        patchSearchParams({ limit: e.target.value, page: 1 })
                      }
                    >
                      {LIMIT_OPTIONS.map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-start gap-2">
                <button
                  type="button"
                  onClick={() =>
                    patchSearchParams({ search: searchDraft.trim(), page: 1 })
                  }
                  className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  Apply filters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft("");
                    setSearchParams(new URLSearchParams(), { replace: true });
                  }}
                  className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Clear filters
                </button>
                <button
                  type="button"
                  onClick={() => fetchReport()}
                  disabled={loading}
                  className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className={TABLE_STYLE.shell}>
            <table className={TABLE_STYLE.table}>
              <thead className={TABLE_STYLE.head}>
                <tr>
                  <th className={`${TABLE_STYLE.th} ${TABLE_STYLE.tdStart}`}>
                    Person / Company
                  </th>
                  <th className={TABLE_STYLE.th}>Source</th>
                  <th className={TABLE_STYLE.th}>Event</th>
                  <th className={TABLE_STYLE.th}>Contact</th>
                  <th className={TABLE_STYLE.th}>Shipment type</th>
                  {/* <th className={TABLE_STYLE.th}>Remark</th> */}
                  <th className={TABLE_STYLE.th}>Created by</th>
                  <th className={TABLE_STYLE.th}>Created</th>
                  <th
                    className={`${TABLE_STYLE.th} ${TABLE_STYLE.tdEnd} text-center`}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className={TABLE_STYLE.row}>
                    <td
                      colSpan={9}
                      className={`${TABLE_STYLE.td} ${TABLE_STYLE.tdStart} ${TABLE_STYLE.tdEnd} py-10 text-center text-sm text-gray-500`}
                    >
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                        <p className="text-sm font-medium text-gray-600">
                          Loading report…
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr className={TABLE_STYLE.row}>
                    <td
                      colSpan={9}
                      className={`${TABLE_STYLE.td} ${TABLE_STYLE.tdStart} ${TABLE_STYLE.tdEnd} py-10 text-center text-sm text-gray-500`}
                    >
                      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
                        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 ring-1 ring-gray-200/80">
                          <Inbox className="h-8 w-8" strokeWidth={1.5} />
                        </span>
                        <div>
                          <p className="text-base font-semibold text-gray-800">
                            No rows match your filters
                          </p>
                          <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                            Try clearing search, widening the date range, or
                            choosing “All creators”.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchDraft("");
                            setSearchParams(new URLSearchParams(), {
                              replace: true,
                            });
                          }}
                          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rowIdx) => (
                    <tr
                      key={
                        row.agentCustomerId || row.customerId || `row-${rowIdx}`
                      }
                      className={`${TABLE_STYLE.row} hover:bg-blue-50/50 transition-colors`}
                    >
                      <td
                        className={`${TABLE_STYLE.td} ${TABLE_STYLE.tdStart} max-w-[16rem] align-top`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">
                            <div className="relative group max-w-[140px]">
                              {/* Truncated Text */}
                              <span className="block truncate">
                                {row.personName || "—"}
                              </span>

                              {/* Tooltip */}
                              {row.personName && (
                                <div
                                  className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[180px]
                      break-words
                      z-50"
                                >
                                  {row.personName}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-gray-600 text-sm mt-1 min-w-0">
                            <div className="relative group max-w-[140px]">
                              {/* Truncated Text */}
                              <span className="block truncate">
                                {row.companyName || "—"}
                              </span>

                              {/* Tooltip */}
                              {row.companyName && (
                                <div
                                  className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[180px]
                      break-words
                      z-50"
                                >
                                  {row.companyName}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* {row.customerId ? (
                            <div className="text-gray-400 text-[12px] mt-1.5 font-mono tracking-tight">
                              <TruncTd title={row.customerId}>{row.customerId}</TruncTd>
                            </div>
                          ) : null} */}
                        </div>
                      </td>

                      <td
                        className={`${TABLE_STYLE.td} max-w-[14rem] align-top`}
                      >
                        <div className="min-w-0">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200/80">
                            <TruncTd title={row.sourceType}>
                              {row.sourceType || "—"}
                            </TruncTd>
                          </span>
                          {row.recordType ? (
                            <div className="text-sm text-gray-500 mt-1.5 min-w-0">
                              <TruncTd title={row.recordType}>
                                {row.recordType}
                              </TruncTd>
                            </div>
                          ) : null}
                          {/* {row.importBatchId ? (
                            <div className="text-[12px] text-gray-500 mt-1.5 font-mono min-w-0">
                              <TruncTd title={row.importBatchId}>Batch: {row.importBatchId}</TruncTd>
                            </div>
                          ) : null} */}
                          {row.salesDayDisposition != null &&
                          String(row.salesDayDisposition).trim() !== "" ? (
                            <div className="text-sm text-amber-900 mt-1.5 rounded-md bg-amber-50 px-2 py-1 ring-1 ring-amber-100 inline-block max-w-[240px] min-w-0">
                              <TruncTd title={String(row.salesDayDisposition)}>
                                {String(row.salesDayDisposition)}
                              </TruncTd>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td
                        className={`${TABLE_STYLE.td} max-w-[16rem] align-top`}
                      >
                        {row.event?.eventName ? (
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 min-w-0">
                              <TruncTd title={row.event.eventName}>
                                {row.event.eventName}
                              </TruncTd>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              <div className="relative group max-w-[90px]">
                                {/* Truncated DateTime */}
                                <span className="block truncate whitespace-nowrap">
                                  {formatDateTime(row.event.eventDateTime) ||
                                    "—"}
                                </span>

                                {/* Tooltip */}
                                {row.event.eventDateTime && (
                                  <div
                                    className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[220px]
                      break-words
                      z-50"
                                  >
                                    {formatDateTime(row.event.eventDateTime)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td
                        className={`${TABLE_STYLE.td} max-w-[16rem] align-top`}
                      >
                        <div className="relative group max-w-[90px]">
                          {/* Truncated Contact Number */}
                          <div className="tabular-nums whitespace-nowrap block truncate">
                            {row.contactNumber || "—"}
                          </div>

                          {/* Tooltip */}
                          {row.contactNumber && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover:block
                    bg-gray-900 text-white text-sm
                    px-3 py-2.5
                    rounded-lg shadow-xl
                    max-w-[180px]
                    break-words
                    z-50"
                            >
                              {row.contactNumber}
                            </div>
                          )}
                        </div>

                        <div className="text-sm text-gray-500 mt-1 min-w-0">
                          <div className="relative group max-w-[130px]">
                            {/* Truncated Email */}
                            <span className="block truncate">
                              {row.email || "—"}
                            </span>

                            {/* Tooltip */}
                            {row.email && (
                              <div
                                className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[200px]
                      break-words
                      z-50"
                              >
                                {row.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td
                        className={`${TABLE_STYLE.td} max-w-[10rem] align-top`}
                      >
                        <div className="min-w-0">
                          <TruncTd title={row.shipmentType}>
                            {row.shipmentType || "—"}
                          </TruncTd>
                        </div>
                      </td>

                      {/* <td
                        className={`${TABLE_STYLE.td} align-top whitespace-nowrap`}
                      >
                        {row.remark != null &&
                        String(row.remark).trim() !== "" ? (
                          isImportRemarkOld(row.remark) ? (
                            <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/90">
                              OLD
                            </span>
                          ) : (
                            <span className="inline-flex rounded-lg bg-indigo-50 px-2 py-0.5 text-sm font-semibold text-indigo-800 ring-1 ring-indigo-100/90">
                              NEW
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td> */}

                      <td
                        className={`${TABLE_STYLE.td} max-w-[12rem] align-top`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 min-w-0">
                            <TruncTd title={row.createdBy?.employeeName}>
                              {row.createdBy?.employeeName || "—"}
                            </TruncTd>
                          </div>
                          {row.createdBy?.empId ? (
                            <div className="text-[12px] text-gray-500 mt-0.5 font-mono whitespace-nowrap">
                              {row.createdBy.empId}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td
                        className={`${TABLE_STYLE.td} align-top whitespace-nowrap`}
                      >
                        <div className="relative group max-w-[90px]">
                          {/* Truncated Date */}
                          <span className="text-sm text-gray-600 block truncate">
                            {formatDateTime(row.createdAt) || "—"}
                          </span>

                          {/* Tooltip */}
                          {row.createdAt && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover:block
                    bg-gray-900 text-white text-sm
                    px-3 py-2.5
                    rounded-lg shadow-xl
                    max-w-[200px]
                    break-words
                    z-50"
                            >
                              {formatDateTime(row.createdAt)}
                            </div>
                          )}
                        </div>
                      </td>

                      <td
                        className={`${TABLE_STYLE.td} ${TABLE_STYLE.tdEnd} text-center align-top`}
                      >
                        {row.actions?.updateApi &&
                        String(
                          row.actions?.updateMethod || "PATCH",
                        ).toUpperCase() === "PATCH" ? (
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="cursor-pointer px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[15px] font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center gap-2"
                          >
                            {/* <Pencil className="w-4 h-4 shrink-0" /> */}
                            {row.actions?.viewLabel || "View / Edit"}
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div
            className={`${PAGINATION_STYLE.wrap} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}
          >
            <span className={PAGINATION_STYLE.meta}>
              Showing {fromRow} to {toRow} of {totalRows} rows
            </span>
            <div className={PAGINATION_STYLE.nav}>
              <button
                type="button"
                disabled={!hasPrevPage || loading}
                className={PAGINATION_STYLE.link}
                onClick={() => {
                  if (!hasPrevPage || loading) return;
                  patchSearchParams({
                    page: String(Math.max(1, currentPage - 1)),
                  });
                }}
              >
                Previous
              </button>
              {pageButtons.map((p, idx) => (
                <React.Fragment key={p}>
                  {idx > 0 && p - pageButtons[idx - 1] > 1 && (
                    <span className={PAGINATION_STYLE.dots}>...</span>
                  )}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => patchSearchParams({ page: String(p) })}
                    aria-current={
                      paginationPageNum(p, 1) === currentPage
                        ? "page"
                        : undefined
                    }
                    className={`${PAGINATION_STYLE.pageBtn} ${
                      paginationPageNum(p, 1) === currentPage
                        ? PAGINATION_STYLE.pageActive
                        : PAGINATION_STYLE.pageInactive
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
              <button
                type="button"
                disabled={!hasNextPage || loading}
                className={PAGINATION_STYLE.link}
                onClick={() => {
                  if (!hasNextPage || loading) return;
                  patchSearchParams({ page: String(currentPage + 1) });
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {customRangeOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            setCustomRangeOpen(false);
            patchSearchParams({
              date: customRangeRestore.date,
              startDate: customRangeRestore.startDate,
              endDate: customRangeRestore.endDate,
            });
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50/60">
              <h3 className="text-base font-semibold text-gray-800">
                Custom date range
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className={FILTER_LABEL}>Start</span>
                  <input
                    type="date"
                    className={FILTER_INPUT}
                    value={customRangeDraft.startDate}
                    onChange={(e) =>
                      setCustomRangeDraft((d) => ({
                        ...d,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={FILTER_LABEL}>End</span>
                  <input
                    type="date"
                    className={FILTER_INPUT}
                    value={customRangeDraft.endDate}
                    onChange={(e) =>
                      setCustomRangeDraft((d) => ({
                        ...d,
                        endDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setCustomRangeOpen(false);
                    patchSearchParams({
                      date: customRangeRestore.date,
                      startDate: customRangeRestore.startDate,
                      endDate: customRangeRestore.endDate,
                    });
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                  onClick={() => {
                    setCustomRangeOpen(false);
                    patchSearchParams({
                      date: "",
                      startDate: customRangeDraft.startDate,
                      endDate: customRangeDraft.endDate,
                      page: 1,
                    });
                  }}
                >
                  Apply range
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
                  (day shift required on server). Import remark{" "}
                  <span className="font-mono text-[11px]">NEW</span> /{" "}
                  <span className="font-mono text-[11px]">OLD</span> can be
                  updated here for{" "}
                  <span className="font-mono text-[11px]">sales-day-agent</span>{" "}
                  (imports) and{" "}
                  <span className="font-mono text-[11px]">event-customer</span>{" "}
                  (manual / event adds).
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
                  ["shipmentType", "Shipment type"],
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
                {isSalesDayAgentUpdateUrl(editRow?.actions?.updateApi) ||
                isEventCustomerUpdateUrl(editRow?.actions?.updateApi) ? (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                      Import remark
                    </label>
                    <select
                      name="remark"
                      value={editForm.remark || "NEW"}
                      onChange={onEditChange}
                      className={FIELD_SELECT}
                    >
                      <option value="NEW">NEW (dedupe on company name)</option>
                      <option value="OLD">OLD (allow duplicate company)</option>
                    </select>
                    <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                      Setting NEW runs the duplicate check against other non-OLD
                      imports. The server may return 409 if the company already
                      exists.
                    </p>
                  </div>
                ) : null}
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
