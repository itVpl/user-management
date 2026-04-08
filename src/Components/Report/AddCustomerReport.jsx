import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-toastify";
import API_CONFIG from "../../config/api";

const DEFAULT_LIMIT = 10;
const LIMIT_OPTIONS = [10, 20, 50, 100];
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "blacklist", label: "Blacklist" },
];
const CREATED_BY_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "employee", label: "Employee" },
  { value: "self_registered", label: "Self Registered" },
];

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

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const toDetailsObject = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload;
};

const readValue = (...values) => {
  for (const value of values) {
    if (value === 0) return 0;
    if (value !== null && value !== undefined && String(value).trim() !== "")
      return value;
  }
  return "-";
};

const extractLoadAddedDateTimes = (payload, rowMetrics) => {
  const details = toDetailsObject(payload);
  const out = [];

  const pushDate = (raw) => {
    const normalized = formatDateTime(raw);
    if (normalized !== "-") out.push(normalized);
  };

  // Always include report-row metrics if present.
  pushDate(rowMetrics?.firstLoadAddedAt);
  pushDate(rowMetrics?.latestLoadAddedAt);

  if (!details || typeof details !== "object") {
    return Array.from(new Set(out));
  }

  const buckets = [
    details.loads,
    details.loadDetails,
    details.shipperLoads,
    details.deliveryOrders,
    details.orders,
    details.laneDetails,
    details.prospectDetails,
    details.data?.loads,
    details.data?.loadDetails,
    details.data?.deliveryOrders,
    details.data?.orders,
  ].filter(Array.isArray);

  buckets.forEach((arr) => {
    arr.forEach((item) => {
      const raw =
        item?.latestLoadAddedAt ||
        item?.firstLoadAddedAt ||
        item?.createdAt ||
        item?.loadAddedAt ||
        item?.addedAt ||
        item?.createdOn ||
        item?.createdDate;
      const normalized = formatDateTime(raw);
      if (normalized !== "-") out.push(normalized);
    });
  });

  return Array.from(new Set(out));
};

const toAbsoluteApiUrl = (pathOrUrl) => {
  if (!pathOrUrl) return null;
  const v = String(pathOrUrl).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `${API_CONFIG.BASE_URL}${v.startsWith("/") ? v : `/${v}`}`;
};

export default function AddCustomerReport() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    createdByType: "",
    addedByEmpId: "",
  });
  const [_reportMeta, setReportMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    payload: null,
    row: null,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 1,
  });

  const [statusDdOpen, setStatusDdOpen] = useState(false);
  const [statusDdQuery, setStatusDdQuery] = useState("");
  const statusDdRef = useRef(null);
  const statusBtnRef = useRef(null);
  const statusInputRef = useRef(null);
  const [statusMenuPos, setStatusMenuPos] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    placement: "bottom",
  });

  const [createdByDdOpen, setCreatedByDdOpen] = useState(false);
  const [createdByDdQuery, setCreatedByDdQuery] = useState("");
  const createdByDdRef = useRef(null);
  const createdByBtnRef = useRef(null);
  const createdByInputRef = useRef(null);
  const [createdByMenuPos, setCreatedByMenuPos] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    placement: "bottom",
  });

  const [addedByDdOpen, setAddedByDdOpen] = useState(false);
  const [addedByDdQuery, setAddedByDdQuery] = useState("");
  const addedByDdRef = useRef(null);
  const addedByBtnRef = useRef(null);
  const addedByInputRef = useRef(null);
  const [addedByMenuPos, setAddedByMenuPos] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    placement: "bottom",
  });

  const [limitDdOpen, setLimitDdOpen] = useState(false);
  const limitDdRef = useRef(null);
  const limitBtnRef = useRef(null);
  const [limitMenuPos, setLimitMenuPos] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    placement: "bottom",
  });

  const calcMenuPos = useCallback((el) => {
    const r = el.getBoundingClientRect();
    const width = r.width;
    const left = Math.min(r.left, Math.max(8, window.innerWidth - width - 8));
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    if (openUp) {
      const bottom = window.innerHeight - r.top + 8;
      return { top: 0, bottom, left, width, placement: "top" };
    }
    const top = r.bottom + 8;
    return { top, bottom: 0, left, width, placement: "bottom" };
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (statusDdRef.current && !statusDdRef.current.contains(e.target)) {
        setStatusDdOpen(false);
      }
      if (
        createdByDdRef.current &&
        !createdByDdRef.current.contains(e.target)
      ) {
        setCreatedByDdOpen(false);
      }
      if (addedByDdRef.current && !addedByDdRef.current.contains(e.target)) {
        setAddedByDdOpen(false);
      }
      if (limitDdRef.current && !limitDdRef.current.contains(e.target)) {
        setLimitDdOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (statusDdOpen && statusInputRef.current) statusInputRef.current.focus();
  }, [statusDdOpen]);

  useEffect(() => {
    if (createdByDdOpen && createdByInputRef.current)
      createdByInputRef.current.focus();
  }, [createdByDdOpen]);

  useEffect(() => {
    if (addedByDdOpen && addedByInputRef.current)
      addedByInputRef.current.focus();
  }, [addedByDdOpen]);

  useEffect(() => {
    if (!statusDdOpen && !createdByDdOpen && !addedByDdOpen && !limitDdOpen)
      return;
    function update() {
      if (statusDdOpen && statusBtnRef.current) {
        setStatusMenuPos(calcMenuPos(statusBtnRef.current));
      }
      if (createdByDdOpen && createdByBtnRef.current) {
        setCreatedByMenuPos(calcMenuPos(createdByBtnRef.current));
      }
      if (addedByDdOpen && addedByBtnRef.current) {
        setAddedByMenuPos(calcMenuPos(addedByBtnRef.current));
      }
      if (limitDdOpen && limitBtnRef.current) {
        setLimitMenuPos(calcMenuPos(limitBtnRef.current));
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [addedByDdOpen, calcMenuPos, createdByDdOpen, limitDdOpen, statusDdOpen]);

  const handleApiError = useCallback(
    (error, fallbackMessage) => {
      const status = error?.response?.status;
      if (status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return true;
      }
      if (status === 403) {
        toast.error("You are not allowed to view this report.");
        return true;
      }
      if (status >= 500) {
        toast.error("Server error. Please try again.");
        return true;
      }
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          fallbackMessage,
      );
      return false;
    },
    [navigate],
  );

  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/Sales`,
        getAuthConfig(),
      );
      const list =
        (Array.isArray(res?.data) && res.data) ||
        (Array.isArray(res?.data?.data) && res.data.data) ||
        (Array.isArray(res?.data?.employees) && res.data.employees) ||
        [];
      const options = list
        .map((emp) => ({
          label: `${emp?.employeeName || emp?.name || "Unknown"} (${emp?.empId || "-"})`,
          value: emp?.empId || "",
        }))
        .filter((x) => x.value);
      setEmployeeOptions(options);
    } catch (error) {
      setEmployeeOptions([]);
      handleApiError(error, "Failed to load employees");
    } finally {
      setLoadingEmployees(false);
    }
  }, [handleApiError]);

  const fetchReport = useCallback(
    async (page = 1, limit = pagination.limit) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit,
          sortBy: "createdAt",
          sortOrder: "desc",
        };
        if (filters.search.trim()) params.search = filters.search.trim();
        if (filters.status) params.status = filters.status;
        if (filters.createdByType) params.createdByType = filters.createdByType;
        if (filters.addedByEmpId) params.addedByEmpId = filters.addedByEmpId;

        const res = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/reports/add-customer`,
          {
            ...getAuthConfig(),
            params,
          },
        );

        const payload = res?.data;
        const data = payload?.data || {};
        const p = data?.pagination || {};
        setRows(Array.isArray(data?.rows) ? data.rows : []);
        setReportMeta({
          reportName: data?.reportName || "Add Customer Report",
          generatedBy: data?.generatedBy || null,
          module: payload?.module || null,
        });
        const nextPage = Number(page) || 1;
        const nextLimit = Number(p.limit ?? limit) || DEFAULT_LIMIT;
        const nextTotal = Number(p.total ?? 0) || 0;
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / nextLimit));
        setPagination({
          page: Math.min(nextPage, nextTotalPages),
          limit: nextLimit,
          total: nextTotal,
          totalPages: nextTotalPages,
        });
      } catch (error) {
        setRows([]);
        handleApiError(error, "Failed to load add customer report");
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit, handleApiError],
  );

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    fetchReport(1, pagination.limit);
  }, [fetchReport, pagination.limit]);

  const onFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      createdByType: "",
      addedByEmpId: "",
    });
    setStatusDdQuery("");
    setStatusDdOpen(false);
    setCreatedByDdQuery("");
    setCreatedByDdOpen(false);
    setAddedByDdQuery("");
    setAddedByDdOpen(false);
    setLimitDdOpen(false);
  };

  const openDetails = async (row) => {
    const shipperId = row?.shipperId;
    const directApi = toAbsoluteApiUrl(row?.actions?.viewDetailsApi);
    if (!shipperId && !directApi) return;
    setDetailsLoading(true);
    setDetailsModal({ open: true, payload: null, row });
    try {
      const detailsUrl =
        directApi ||
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${shipperId}`;
      const res = await axios.get(detailsUrl, getAuthConfig());
      setDetailsModal({ open: true, payload: res?.data || null, row });
    } catch (error) {
      setDetailsModal({ open: false, payload: null, row: null });
      handleApiError(error, "Failed to load shipper details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const _totalLabel = useMemo(
    () =>
      `Page ${pagination.page} of ${pagination.totalPages} · ${pagination.total} total`,
    [pagination.page, pagination.total, pagination.totalPages],
  );
  const allLoadAddedDateTimes = useMemo(
    () =>
      extractLoadAddedDateTimes(
        detailsModal.payload,
        detailsModal.row?.metrics,
      ),
    [detailsModal.payload, detailsModal.row?.metrics],
  );
  const detailData = useMemo(
    () => toDetailsObject(detailsModal.payload),
    [detailsModal.payload],
  );
  const statusSelectedLabel = useMemo(() => {
    const found = STATUS_OPTIONS.find((o) => o.value === filters.status);
    return found?.label || "All";
  }, [filters.status]);
  const statusFilteredOptions = useMemo(() => {
    const q = statusDdQuery.trim().toLowerCase();
    if (!q) return STATUS_OPTIONS;
    return STATUS_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [statusDdQuery]);
  const createdBySelectedLabel = useMemo(() => {
    const found = CREATED_BY_TYPE_OPTIONS.find(
      (o) => o.value === filters.createdByType,
    );
    return found?.label || "All";
  }, [filters.createdByType]);
  const createdByFilteredOptions = useMemo(() => {
    const q = createdByDdQuery.trim().toLowerCase();
    if (!q) return CREATED_BY_TYPE_OPTIONS;
    return CREATED_BY_TYPE_OPTIONS.filter((opt) =>
      opt.label.toLowerCase().includes(q),
    );
  }, [createdByDdQuery]);
  const addedBySelectedLabel = useMemo(() => {
    if (!filters.addedByEmpId) return "All";
    const found = employeeOptions.find(
      (o) => String(o.value) === String(filters.addedByEmpId),
    );
    return found?.label || filters.addedByEmpId;
  }, [employeeOptions, filters.addedByEmpId]);
  const addedByFilteredOptions = useMemo(() => {
    const q = addedByDdQuery.trim().toLowerCase();
    if (!q) return employeeOptions;
    return employeeOptions.filter((opt) =>
      String(opt.label).toLowerCase().includes(q),
    );
  }, [addedByDdQuery, employeeOptions]);
  const limitSelectedLabel = useMemo(() => {
    const found = LIMIT_OPTIONS.find(
      (n) => Number(n) === Number(pagination.limit),
    );
    return `${found ?? pagination.limit} / page`;
  }, [pagination.limit]);
  const pageItems = useMemo(() => {
    const total = Number(pagination.totalPages) || 1;
    const current = Math.min(Math.max(1, Number(pagination.page) || 1), total);
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 2)
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
  }, [pagination.page, pagination.totalPages]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-4 md:py-6 font-poppins">
      <div className="max-w-[1920px] mx-auto w-full">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="w-full sm:w-72 bg-white rounded-xl border border-gray-200 px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className="w-15 h-14 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-indigo-700 tabular-nums">
                      {pagination.total}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-700 flex-1 text-center">
                    Total Customers
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl w-full">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 min-w-0">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      value={filters.search}
                      onChange={(e) => onFilterChange("search", e.target.value)}
                      placeholder="Search by company, email, phone, userId, mcDot"
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-0 focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-gray-700">
                {reportMeta?.reportName || "Add Customer Report"}
              </p>
              {reportMeta?.module?.label ? (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {reportMeta.module.label}
                </span>
              ) : null}
              {reportMeta?.module?.isActive === true ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Active
                </span>
              ) : null}
            </div> */}
            {/* <p className="text-sm text-gray-600">{totalLabel}</p> */}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <div className="flex items-end justify-between gap-4">
            <div
              className="flex items-end gap-3 overflow-x-auto flex-nowrap w-full pb-1"
              onScroll={() => {
                setStatusDdOpen(false);
                setCreatedByDdOpen(false);
                setAddedByDdOpen(false);
              }}
            >
              <div ref={statusDdRef} className="min-w-[170px] relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Status
                </label>
                <button
                  ref={statusBtnRef}
                  type="button"
                  onClick={() =>
                    setStatusDdOpen((v) => {
                      const next = !v;
                      if (next) {
                        setCreatedByDdOpen(false);
                        setAddedByDdOpen(false);
                        setLimitDdOpen(false);
                        if (statusBtnRef.current) {
                          setStatusMenuPos(calcMenuPos(statusBtnRef.current));
                        }
                      } else {
                        setStatusDdQuery("");
                      }
                      return next;
                    })
                  }
                  aria-haspopup="listbox"
                  aria-expanded={statusDdOpen}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className="min-w-0 truncate text-gray-700">
                    {statusSelectedLabel}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${statusDdOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  style={{
                    top:
                      statusMenuPos.placement === "bottom"
                        ? statusMenuPos.top
                        : undefined,
                    bottom:
                      statusMenuPos.placement === "top"
                        ? statusMenuPos.bottom
                        : undefined,
                    left: statusMenuPos.left,
                    width: statusMenuPos.width || undefined,
                  }}
                  className={`fixed z-50 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-200 ${statusMenuPos.placement === "top" ? "origin-bottom" : "origin-top"} ${statusDdOpen ? "opacity-100 translate-y-0 scale-100 max-h-[420px]" : `pointer-events-none opacity-0 ${statusMenuPos.placement === "top" ? "translate-y-1" : "-translate-y-1"} scale-95 max-h-0`}`}
                  role="listbox"
                >
                  <div className="px-3 pt-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        ref={statusInputRef}
                        type="text"
                        value={statusDdQuery}
                        onChange={(e) => setStatusDdQuery(e.target.value)}
                        placeholder="Search status…"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-0 focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto py-2">
                    {statusFilteredOptions.map((opt) => {
                      const selected =
                        String(filters.status) === String(opt.value);
                      return (
                        <button
                          key={opt.value || "all"}
                          type="button"
                          onClick={() => {
                            onFilterChange("status", opt.value);
                            setStatusDdOpen(false);
                            setStatusDdQuery("");
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer ${selected ? "bg-indigo-50/60 text-indigo-700" : "text-gray-700"}`}
                          role="option"
                          aria-selected={selected}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div ref={createdByDdRef} className="min-w-[210px] relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Created By Type
                </label>
                <button
                  ref={createdByBtnRef}
                  type="button"
                  onClick={() =>
                    setCreatedByDdOpen((v) => {
                      const next = !v;
                      if (next) {
                        setStatusDdOpen(false);
                        setAddedByDdOpen(false);
                        setLimitDdOpen(false);
                        if (createdByBtnRef.current) {
                          setCreatedByMenuPos(
                            calcMenuPos(createdByBtnRef.current),
                          );
                        }
                      } else {
                        setCreatedByDdQuery("");
                      }
                      return next;
                    })
                  }
                  aria-haspopup="listbox"
                  aria-expanded={createdByDdOpen}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className="min-w-0 truncate text-gray-700">
                    {createdBySelectedLabel}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${createdByDdOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  style={{
                    top:
                      createdByMenuPos.placement === "bottom"
                        ? createdByMenuPos.top
                        : undefined,
                    bottom:
                      createdByMenuPos.placement === "top"
                        ? createdByMenuPos.bottom
                        : undefined,
                    left: createdByMenuPos.left,
                    width: createdByMenuPos.width || undefined,
                  }}
                  className={`fixed z-50 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-200 ${createdByMenuPos.placement === "top" ? "origin-bottom" : "origin-top"} ${createdByDdOpen ? "opacity-100 translate-y-0 scale-100 max-h-[420px]" : `pointer-events-none opacity-0 ${createdByMenuPos.placement === "top" ? "translate-y-1" : "-translate-y-1"} scale-95 max-h-0`}`}
                  role="listbox"
                >
                  <div className="px-3 pt-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        ref={createdByInputRef}
                        type="text"
                        value={createdByDdQuery}
                        onChange={(e) => setCreatedByDdQuery(e.target.value)}
                        placeholder="Search type…"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-0 focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto py-2">
                    {createdByFilteredOptions.map((opt) => {
                      const selected =
                        String(filters.createdByType) === String(opt.value);
                      return (
                        <button
                          key={opt.value || "all"}
                          type="button"
                          onClick={() => {
                            onFilterChange("createdByType", opt.value);
                            setCreatedByDdOpen(false);
                            setCreatedByDdQuery("");
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer ${selected ? "bg-indigo-50/60 text-indigo-700" : "text-gray-700"}`}
                          role="option"
                          aria-selected={selected}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div ref={addedByDdRef} className="min-w-[280px] relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Added By Employee
                </label>
                <button
                  ref={addedByBtnRef}
                  type="button"
                  onClick={() =>
                    setAddedByDdOpen((v) => {
                      const next = !v;
                      if (next) {
                        setStatusDdOpen(false);
                        setCreatedByDdOpen(false);
                        setLimitDdOpen(false);
                        if (addedByBtnRef.current) {
                          setAddedByMenuPos(calcMenuPos(addedByBtnRef.current));
                        }
                      }
                      if (!next) setAddedByDdQuery("");
                      return next;
                    })
                  }
                  aria-haspopup="listbox"
                  aria-expanded={addedByDdOpen}
                  disabled={loadingEmployees}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="min-w-0 truncate text-gray-700">
                    {addedBySelectedLabel}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${addedByDdOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  style={{
                    top:
                      addedByMenuPos.placement === "bottom"
                        ? addedByMenuPos.top
                        : undefined,
                    bottom:
                      addedByMenuPos.placement === "top"
                        ? addedByMenuPos.bottom
                        : undefined,
                    left: addedByMenuPos.left,
                    width: addedByMenuPos.width || undefined,
                  }}
                  className={`fixed z-50 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-200 ${addedByMenuPos.placement === "top" ? "origin-bottom" : "origin-top"} ${addedByDdOpen ? "opacity-100 translate-y-0 scale-100 max-h-[420px]" : `pointer-events-none opacity-0 ${addedByMenuPos.placement === "top" ? "translate-y-1" : "-translate-y-1"} scale-95 max-h-0`}`}
                  role="listbox"
                >
                  <div className="px-3 pt-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        ref={addedByInputRef}
                        type="text"
                        value={addedByDdQuery}
                        onChange={(e) => setAddedByDdQuery(e.target.value)}
                        placeholder="Search employee…"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-0 focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto py-2">
                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange("addedByEmpId", "");
                        setAddedByDdOpen(false);
                        setAddedByDdQuery("");
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-700 cursor-pointer"
                      role="option"
                      aria-selected={!filters.addedByEmpId}
                    >
                      All
                    </button>
                    {addedByFilteredOptions.map((opt) => {
                      const selected =
                        String(filters.addedByEmpId) === String(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onFilterChange("addedByEmpId", opt.value);
                            setAddedByDdOpen(false);
                            setAddedByDdQuery("");
                          }}
                          className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 cursor-pointer ${selected ? "bg-indigo-50/60 text-indigo-700" : "text-gray-700"}`}
                          role="option"
                          aria-selected={selected}
                        >
                          <span className="truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                    {!loadingEmployees && employeeOptions.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No employees
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-semibold"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16 text-gray-500">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No records found
            </div>
          ) : (
            <div className="overflow-x-auto p-4">
              <table className="min-w-full text-base text-gray-700 border-separate border-spacing-y-3">
                <thead>
                  <tr className="bg-gray-50">
                    {[
                      "Company Name",
                      "MC/DOT",
                      "Email",
                      "Phone",
                      "Added By",
                      "Total DOs",
                      "Total RR",
                      "Created Date",
                      "Action",
                    ].map((h, idx, arr) => (
                      <th
                        key={h}
                        className={[
                          "py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wide border-y border-gray-200 whitespace-nowrap",
                          idx === 0 ? "border-l rounded-l-xl" : "",
                          idx === arr.length - 1
                            ? "border-r rounded-r-xl text-center"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={`${row.shipperId || idx}`}
                      className="group transition-colors"
                    >
                      <td className="py-4 px-4 border-y border-l border-gray-200 rounded-l-xl bg-white group-hover:bg-gray-50 align-middle font-medium text-gray-700">
                        <div className="relative group/tooltip max-w-[150px]">
                          {/* Truncated Text */}
                          <span className="block truncate">
                            {row.companyName || "-"}
                          </span>

                          {/* Tooltip */}
                          {row.companyName && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover/tooltip:block pointer-events-none
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
                      </td>
                      <td className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle font-medium text-gray-700 whitespace-nowrap">
                        {row.mcDotNo || "-"}
                      </td>
                      <td className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle font-medium text-gray-700">
                        <div className="relative group/tooltip max-w-[150px]">
                          {/* Truncated Text */}
                          <span className="block truncate">
                            {row.email || "-"}
                          </span>

                          {/* Tooltip */}
                          {row.email && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover/tooltip:block pointer-events-none
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
                      </td>
                      <td className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle font-medium text-gray-700 whitespace-nowrap">
                        {row.phoneNo || "-"}
                      </td>
                      <td
                        className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle font-medium text-gray-700 max-w-[220px] truncate"
                        title={row?.addedBy?.employeeName}
                      >
                        {row?.addedBy?.employeeName || "-"}
                      </td>
                      <td className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle tabular-nums font-medium text-gray-700 whitespace-nowrap">
                        {row?.metrics?.totalDOs ?? "-"}
                      </td>
                      <td className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle tabular-nums font-medium text-gray-700 whitespace-nowrap">
                        {row?.metrics?.totalLoads ?? "-"}
                      </td>
                      <td className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle font-medium text-gray-700">
                        <div className="relative group/tooltip max-w-[110px]">
                          {/* Truncated Text */}
                          <span className="block truncate whitespace-nowrap">
                            {formatDateTime(row.createdAt) || "-"}
                          </span>

                          {/* Tooltip */}
                          {row.createdAt && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover/tooltip:block pointer-events-none
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[160px]
                      break-words
                      z-50"
                            >
                              {formatDateTime(row.createdAt)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 border-y border-r border-gray-200 rounded-r-xl bg-white group-hover:bg-gray-50 align-middle">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => openDetails(row)}
                            disabled={!row?.shipperId}
                            className="cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 transition-colors text-base font-medium"
                          >
                            {/* <Eye className="w-4 h-4" /> */}
                            {row?.actions?.viewLabel || "View"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && pagination.total > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold text-gray-700 tabular-nums">
                {pagination.total === 0
                  ? 0
                  : (pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-gray-700 tabular-nums">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-700 tabular-nums">
                {pagination.total}
              </span>{" "}
              customers
            </div>

            <div className="flex items-center justify-end gap-2">
              <div ref={limitDdRef} className="relative">
                <button
                  ref={limitBtnRef}
                  type="button"
                  onClick={() =>
                    setLimitDdOpen((v) => {
                      const next = !v;
                      if (next) {
                        setStatusDdOpen(false);
                        setCreatedByDdOpen(false);
                        setAddedByDdOpen(false);
                        if (limitBtnRef.current) {
                          setLimitMenuPos(calcMenuPos(limitBtnRef.current));
                        }
                      }
                      return next;
                    })
                  }
                  aria-haspopup="listbox"
                  aria-expanded={limitDdOpen}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors cursor-pointer min-w-[130px]"
                >
                  <span className="min-w-0 truncate text-gray-700">
                    {limitSelectedLabel}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${limitDdOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div
                  style={{
                    top:
                      limitMenuPos.placement === "bottom"
                        ? limitMenuPos.top
                        : undefined,
                    bottom:
                      limitMenuPos.placement === "top"
                        ? limitMenuPos.bottom
                        : undefined,
                    left: limitMenuPos.left,
                    width: limitMenuPos.width || undefined,
                  }}
                  className={`fixed z-50 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-200 ${limitMenuPos.placement === "top" ? "origin-bottom" : "origin-top"} ${limitDdOpen ? "opacity-100 translate-y-0 scale-100 max-h-[420px]" : `pointer-events-none opacity-0 ${limitMenuPos.placement === "top" ? "translate-y-1" : "-translate-y-1"} scale-95 max-h-0`}`}
                  role="listbox"
                >
                  <div className="max-h-64 overflow-auto py-2">
                    {LIMIT_OPTIONS.map((opt) => {
                      const selected = Number(pagination.limit) === Number(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setPagination((p) => ({
                              ...p,
                              limit: Number(opt),
                            }));
                            setLimitDdOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer ${selected ? "bg-indigo-50/60 text-indigo-700" : "text-gray-700"}`}
                          role="option"
                          aria-selected={selected}
                        >
                          {opt} / page
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  fetchReport(
                    Math.max(1, pagination.page - 1),
                    pagination.limit,
                  )
                }
                disabled={pagination.page <= 1 || loading}
                className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-semibold text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {pageItems.map((item, idx) => {
                  if (item === "...") {
                    return (
                      <span
                        key={`dots-${idx}`}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 text-base font-semibold select-none"
                      >
                        …
                      </span>
                    );
                  }
                  const pageNumber = Number(item);
                  const active = pageNumber === pagination.page;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => fetchReport(pageNumber, pagination.limit)}
                      disabled={loading || active}
                      className={[
                        "cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg text-base font-semibold tabular-nums transition-colors",
                        active
                          ? "border border-gray-900 text-gray-900 bg-white"
                          : "border border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        loading ? "opacity-50 cursor-not-allowed" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-current={active ? "page" : undefined}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  fetchReport(
                    Math.min(pagination.totalPages, pagination.page + 1),
                    pagination.limit,
                  )
                }
                disabled={pagination.page >= pagination.totalPages || loading}
                className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-semibold text-gray-600 hover:text-gray-900"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {detailsModal.open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() =>
              setDetailsModal({ open: false, payload: null, row: null })
            }
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-bold leading-tight truncate">
                      Shipper Details
                    </h2>
                    <p className="text-sm text-white/80 truncate">
                      {readValue(
                        detailData?.compName,
                        detailData?.companyName,
                        detailsModal.row?.companyName,
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDetailsModal({ open: false, payload: null, row: null })
                    }
                    className="shrink-0 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto p-6 space-y-5">
                {detailsLoading ? (
                  <div className="flex justify-center py-16 text-gray-500">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="bg-blue-50/70 rounded-2xl p-5 border border-blue-100">
                      <div className="text-sm font-bold text-blue-700 mb-4">
                        Customer Details
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex gap-2">
                          <span className="text-gray-500 shrink-0">
                            Company:
                          </span>
                          <span className="text-gray-800 font-medium min-w-0 truncate">
                            {readValue(
                              detailData?.compName,
                              detailData?.companyName,
                              detailsModal.row?.companyName,
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500 shrink-0">
                            MC/DOT:
                          </span>
                          <span className="text-gray-800 font-medium min-w-0 truncate">
                            {readValue(
                              detailData?.mc_dot,
                              detailData?.mcDotNo,
                              detailsModal.row?.mcDotNo,
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500 shrink-0">Email:</span>
                          <span className="text-gray-800 font-medium min-w-0 truncate">
                            {readValue(
                              detailData?.email,
                              detailsModal.row?.email,
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500 shrink-0">Phone:</span>
                          <span className="text-gray-800 font-medium min-w-0 truncate">
                            {readValue(
                              detailData?.phoneNo,
                              detailData?.phone,
                              detailsModal.row?.phoneNo,
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500 shrink-0">
                            Added Date:
                          </span>
                          <span className="text-gray-800 font-medium min-w-0 truncate">
                            {formatDateTime(
                              readValue(
                                detailData?.createdAt,
                                detailsModal.row?.createdAt,
                              ),
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500 shrink-0">
                            Total DOs:
                          </span>
                          <span className="text-gray-800 font-medium tabular-nums">
                            {readValue(
                              detailData?.metrics?.totalDOs,
                              detailsModal.row?.metrics?.totalDOs,
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500 shrink-0">
                            Total RR:
                          </span>
                          <span className="text-gray-800 font-medium tabular-nums">
                            {readValue(
                              detailData?.metrics?.totalLoads,
                              detailsModal.row?.metrics?.totalLoads,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-gray-200">
                      <div className="text-sm font-bold text-gray-700 mb-4">
                        All RR Added Date/Time
                      </div>
                      {allLoadAddedDateTimes.length > 0 ? (
                        <ul className="space-y-2 text-sm text-gray-700">
                          {allLoadAddedDateTimes.map((dt, idx) => (
                            <li
                              key={`${dt}-${idx}`}
                              className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200"
                            >
                              {dt}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No load added date/time found in details response.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
