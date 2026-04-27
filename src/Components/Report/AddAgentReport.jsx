import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Calendar,
  BarChart3,
  Users,
  Filter,
  Loader2,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import API_CONFIG from "../../config/api";

const DEFAULT_LIMIT = 20;
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

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (query.search) n += 1;
    if (query.addedByEmpId) n += 1;
    if (urlSourceTypeToSelectValue(query.sourceType)) n += 1;
    if (query.date || query.startDate || query.endDate) n += 1;
    return n;
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100/90 px-4 md:px-6 py-5 md:py-8 font-poppins text-gray-900">
      <div className="max-w-[1920px] mx-auto w-full space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm shadow-gray-200/50">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500"
            aria-hidden
          />
          <div className="p-5 md:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30">
                <BarChart3 className="h-7 w-7" strokeWidth={1.75} />
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
                <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-2xl">
                  Manual agent customers and sales-day CSV imports from day-shift
                  Sales. Filters and pagination stay in the URL so you can bookmark
                  or share this view.
                </p>
                {reportMeta?.generatedBy?.employeeName ? (
                  <p className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs text-gray-500">
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
            <div className="flex flex-wrap items-stretch gap-3 lg:justify-end">
              <div className="flex min-w-[11rem] flex-1 sm:flex-initial items-center gap-3 rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-indigo-50/95 to-white px-4 py-3.5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  ) : (
                    <span className="text-xl font-bold tabular-nums leading-none">
                      {pagination.total}
                    </span>
                  )}
                </div>
                <div className="pr-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600/90">
                    Records
                  </p>
                  <p className="text-sm font-medium text-gray-700 truncate">
                    Matching filters
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/90 bg-white p-5 md:p-6 shadow-sm shadow-gray-200/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100/80">
                <Filter className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Filters
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} active · URL updates when you change filters`
                    : "Refine rows · query string syncs to the address bar"}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => fetchReport()}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 text-gray-500 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 pt-5">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Search
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={18}
                />
                <input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      patchSearchParams({ search: searchDraft.trim(), page: 1 });
                    }
                  }}
                  placeholder="Name, company, email, phone, location, customer id, import batch id…"
                  className={`${FIELD_INPUT} pl-10`}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Added by{" "}
                <span className="font-normal normal-case text-gray-400">
                  (day-shift Sales)
                </span>
              </label>
              <select
                value={query.addedByEmpId}
                disabled={loadingEmployees}
                onChange={(e) =>
                  patchSearchParams({
                    addedByEmpId: e.target.value,
                    page: 1,
                  })
                }
                className={FIELD_SELECT}
              >
                <option value="">All creators</option>
                {employeeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Source type
              </label>
              <select
                value={urlSourceTypeToSelectValue(query.sourceType)}
                onChange={(e) => {
                  const v = e.target.value;
                  patchSearchParams({
                    sourceType: v ? selectValueToSourceTypeParam(v) : "",
                    page: 1,
                  });
                }}
                className={FIELD_SELECT}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value || "all-sources"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Sort by
              </label>
              <select
                value={query.sortBy}
                onChange={(e) =>
                  patchSearchParams({ sortBy: e.target.value, page: 1 })
                }
                className={FIELD_SELECT}
              >
                {SORT_FIELDS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Order
              </label>
              <select
                value={query.sortOrder}
                onChange={(e) =>
                  patchSearchParams({ sortOrder: e.target.value, page: 1 })
                }
                className={FIELD_SELECT}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Exact date
              </label>
              <input
                type="date"
                value={query.date}
                onChange={(e) => {
                  const v = e.target.value;
                  patchSearchParams({
                    date: v,
                    startDate: "",
                    endDate: "",
                    page: 1,
                  });
                }}
                className={FIELD_INPUT}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Range start
              </label>
              <input
                type="date"
                value={query.startDate}
                disabled={Boolean(query.date)}
                onChange={(e) =>
                  patchSearchParams({
                    startDate: e.target.value,
                    date: "",
                    page: 1,
                  })
                }
                className={`${FIELD_INPUT} disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Range end
              </label>
              <input
                type="date"
                value={query.endDate}
                disabled={Boolean(query.date)}
                onChange={(e) =>
                  patchSearchParams({
                    endDate: e.target.value,
                    date: "",
                    page: 1,
                  })
                }
                className={`${FIELD_INPUT} disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Rows / page
              </label>
              <select
                value={String(query.limit)}
                onChange={(e) =>
                  patchSearchParams({ limit: e.target.value, page: 1 })
                }
                className={FIELD_SELECT}
              >
                {LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-5 mt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={() =>
                patchSearchParams({ search: searchDraft.trim(), page: 1 })
              }
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 hover:from-indigo-700 hover:to-blue-700 transition-all"
            >
              Apply search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchDraft("");
                setSearchParams(new URLSearchParams(), { replace: true });
              }}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/90 bg-white shadow-sm shadow-gray-200/40 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 md:px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-slate-50/90 to-indigo-50/40">
            <h3 className="text-sm font-semibold text-gray-800">
              Report rows
            </h3>
            <p className="text-xs text-gray-500">
              {loading
                ? "Loading data…"
                : `${pagination.total} row${pagination.total !== 1 ? "s" : ""} · page ${pagination.page} of ${pagination.totalPages}`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <th className="text-left px-4 md:px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Person / Company
                  </th>
                  <th className="text-left px-4 md:px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Source
                  </th>
                  <th className="text-left px-4 md:px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Event
                  </th>
                  <th className="text-left px-4 md:px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Contact
                  </th>
                  <th className="text-left px-4 md:px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Created by
                  </th>
                  <th className="text-left px-4 md:px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Created
                  </th>
                  <th className="text-right px-4 md:px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                        <p className="text-sm font-medium text-gray-600">
                          Loading report…
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
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
                            choosing &ldquo;All creators&rdquo; if a creator filter
                            is too narrow.
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
                          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 transition-colors"
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
                        row.agentCustomerId ||
                        row.customerId ||
                        `row-${rowIdx}`
                      }
                      className="bg-white hover:bg-indigo-50/40 transition-colors"
                    >
                      <td className="px-4 md:px-5 py-3.5 align-top">
                        <div className="font-semibold text-gray-900">
                          {row.personName || "—"}
                        </div>
                        <div className="text-gray-600 text-xs mt-1">
                          {row.companyName || "—"}
                        </div>
                        {row.customerId ? (
                          <div className="text-gray-400 text-[11px] mt-1.5 font-mono tracking-tight">
                            {row.customerId}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 md:px-5 py-3.5 align-top text-gray-700">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/80">
                          {row.sourceType || "—"}
                        </span>
                        {row.recordType ? (
                          <div className="text-xs text-gray-500 mt-1.5">
                            {row.recordType}
                          </div>
                        ) : null}
                        {row.importBatchId ? (
                          <div className="text-[11px] text-gray-500 mt-1.5 font-mono">
                            Batch: {row.importBatchId}
                          </div>
                        ) : null}
                        {row.salesDayDisposition != null &&
                        String(row.salesDayDisposition).trim() !== "" ? (
                          <div className="text-xs text-amber-900 mt-1.5 rounded-md bg-amber-50 px-2 py-1 ring-1 ring-amber-100 inline-block max-w-[220px]">
                            {String(row.salesDayDisposition)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 md:px-5 py-3.5 align-top text-gray-700 max-w-[220px]">
                        {row.event?.eventName ? (
                          <>
                            <div className="font-medium text-gray-900 truncate">
                              {row.event.eventName}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDateTime(row.event.eventDateTime)}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 md:px-5 py-3.5 align-top text-gray-700">
                        <div className="tabular-nums">{row.contactNumber || "—"}</div>
                        <div className="text-xs text-gray-500 break-all mt-1">
                          {row.email || "—"}
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3.5 align-top text-gray-700">
                        <span className="font-medium text-gray-900">
                          {row.createdBy?.employeeName || "—"}
                        </span>
                        {row.createdBy?.empId ? (
                          <div className="text-xs text-gray-500 mt-0.5 font-mono">
                            {row.createdBy.empId}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 md:px-5 py-3.5 align-top text-gray-600 text-xs whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-4 md:px-5 py-3.5 align-top text-right">
                        {row.actions?.updateApi &&
                        String(row.actions?.updateMethod || "PATCH")
                          .toUpperCase() === "PATCH" ? (
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white px-3 py-2 text-xs font-semibold text-indigo-900 shadow-sm hover:border-indigo-300 hover:from-indigo-100 transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5 shrink-0" />
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

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-t border-gray-100 bg-gradient-to-r from-gray-50/90 to-slate-50/80">
            <p className="text-xs font-medium text-gray-600">
              Page{" "}
              <span className="tabular-nums text-gray-900">
                {pagination.page}
              </span>{" "}
              of{" "}
              <span className="tabular-nums text-gray-900">
                {pagination.totalPages}
              </span>
              <span className="text-gray-400 mx-1.5">·</span>
              <span className="tabular-nums text-gray-900">
                {pagination.total}
              </span>{" "}
              total
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() =>
                  patchSearchParams({ page: String(pagination.page - 1) })
                }
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pageItems.map((item, idx) =>
                item === "..." ? (
                  <span key={`e-${idx}`} className="px-2 text-gray-400 text-sm">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      patchSearchParams({ page: String(item) })
                    }
                    className={`min-w-[2.25rem] px-2 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      item === pagination.page
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={
                  pagination.page >= pagination.totalPages || loading
                }
                onClick={() =>
                  patchSearchParams({ page: String(pagination.page + 1) })
                }
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
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
