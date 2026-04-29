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
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  User,
  Mail,
  Phone,
  FileText,
  Truck,
  Calendar,
} from "lucide-react";
import { toast } from "react-toastify";
import { addDays, format } from "date-fns";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import API_CONFIG from "../../config/api";

const DEFAULT_LIMIT = 10;
const LIMIT_OPTIONS = [10, 20, 50, 100];

const getToken = () =>
  sessionStorage.getItem("authToken") ||
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

const getLoggedInEmpId = () =>
  sessionStorage.getItem("empId") || localStorage.getItem("empId") || "";

const MT_POCONO_COMPANY = "MT. POCONO TRANSPORTATION INC";
const ONBOARD_COMPANY_OPTIONS = [
  "V Power Logistics",
  "IDENTIFICA LLC",
  MT_POCONO_COMPANY,
];

const normalizeCompany = (value) => String(value || "").trim().toLowerCase();

const readCompanyField = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const readOnboardCompany = (obj) =>
  readCompanyField(
    obj?.onboardCompany,
    obj?.onBoardCompany,
    obj?.onboard_company,
    obj?.onboardingCompany,
    obj?.companyOnboard,
  );

const readAssignedCompany = (obj) =>
  readCompanyField(
    obj?.assignedCompany,
    obj?.assigned_company,
    obj?.companyAssigned,
    obj?.assignCompany,
  );

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

/** One API entry: ISO string, or object with date + ref fields. */
const normalizeAddedDateEntry = (entry) => {
  if (entry == null) {
    return { label: "", display: "-", raw: null };
  }
  if (typeof entry === "object" && !Array.isArray(entry)) {
    const raw =
      entry.addedAt ??
      entry.addedDate ??
      entry.date ??
      entry.createdAt ??
      entry.timestamp ??
      "";
    const label =
      entry.doNo ??
      entry.doNumber ??
      entry.doLoadNo ??
      entry.loadNo ??
      entry.loadRef ??
      entry.ref ??
      entry.reference ??
      entry.loadReference ??
      entry.id ??
      "";
    return {
      label: String(label || "").trim(),
      display: raw ? formatDateTime(raw) : "-",
      raw,
    };
  }
  const raw = String(entry).trim();
  return {
    label: "",
    display: raw ? formatDateTime(raw) : "-",
    raw,
  };
};

const metricsListToArray = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((x) => (x == null ? "" : String(x).trim())).filter(Boolean);
  }
  const s = String(value).trim();
  if (!s) return [];
  return s.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
};

const zipLabelsWithAddedDates = (labelsField, datesArr) => {
  const labels = metricsListToArray(labelsField);
  const list = Array.isArray(datesArr) ? datesArr : [];
  const dates = list.map(normalizeAddedDateEntry);
  const n = Math.max(labels.length, dates.length);
  if (n === 0) return [];
  return Array.from({ length: n }, (_, i) => ({
    label: labels[i] || dates[i]?.label || "—",
    addedDisplay: dates[i]?.display ?? "-",
  }));
};

const toAbsoluteApiUrl = (pathOrUrl) => {
  if (!pathOrUrl) return null;
  const v = String(pathOrUrl).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `${API_CONFIG.BASE_URL}${v.startsWith("/") ? v : `/${v}`}`;
};

const metricTsToYmd = (value) => {
  if (value == null) return "";
  const s = String(value).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : "";
};

/** Inclusive YYYY-MM-DD range on ISO timestamps in arrays (doAddedDates / loadAddedDates). */
const filterRowsByMetricDates = (rows, md) => {
  const doFrom = md.doAddedFrom?.trim() || "";
  const doTo = md.doAddedTo?.trim() || "";
  const loadFrom = md.loadAddedFrom?.trim() || "";
  const loadTo = md.loadAddedTo?.trim() || "";
  const hasDo = Boolean(doFrom || doTo);
  const hasLoad = Boolean(loadFrom || loadTo);
  if (!hasDo && !hasLoad) return rows;

  const listHits = (arr, from, to) => {
    if (!from && !to) return true;
    const list = Array.isArray(arr) ? arr : [];
    if (list.length === 0) return false;
    const fromY = from || "0000-01-01";
    const toY = to || "9999-12-31";
    return list.some((d) => {
      const y = metricTsToYmd(d);
      return y && y >= fromY && y <= toY;
    });
  };

  return rows.filter((row) => {
    const m = row?.metrics;
    const okDo = listHits(m?.doAddedDates, doFrom, doTo);
    const okLoad = listHits(m?.loadAddedDates, loadFrom, loadTo);
    return okDo && okLoad;
  });
};

const METRIC_RANGE_EMPTY = {
  startDate: null,
  endDate: null,
  key: "selection",
};

export default function AddCustomerReport() {
  const navigate = useNavigate();
  const loggedInEmpId = (getLoggedInEmpId() || "").trim().toUpperCase();
  const isVpl077User = loggedInEmpId === "VPL077";
  const [filters, setFilters] = useState({
    search: "",
    addedByEmpId: "",
    onboardCompany: isVpl077User ? MT_POCONO_COMPANY : "",
    assignedCompany: "",
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

  const [rangeDo, setRangeDo] = useState({ ...METRIC_RANGE_EMPTY });
  const [rangeLoad, setRangeLoad] = useState({ ...METRIC_RANGE_EMPTY });
  const [showPresetMenuDo, setShowPresetMenuDo] = useState(false);
  const [showPresetMenuLoad, setShowPresetMenuLoad] = useState(false);
  const [showCustomMetric, setShowCustomMetric] = useState(null);
  const datePresetDoRef = useRef(null);
  const datePresetLoadRef = useRef(null);
  const metricDoBtnRef = useRef(null);
  const metricLoadBtnRef = useRef(null);
  const [metricDoMenuPos, setMetricDoMenuPos] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    placement: "bottom",
  });
  const [metricLoadMenuPos, setMetricLoadMenuPos] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    placement: "bottom",
  });
  const [metricFilteredRows, setMetricFilteredRows] = useState(null);

  const metricRangePresets = useMemo(
    () => ({
      Today: [new Date(), new Date()],
      Yesterday: [addDays(new Date(), -1), addDays(new Date(), -1)],
      "Last 7 Days": [addDays(new Date(), -6), new Date()],
      "Last 30 Days": [addDays(new Date(), -29), new Date()],
      "This Month": [
        new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
      ],
      "Last Month": [
        new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
        new Date(new Date().getFullYear(), new Date().getMonth(), 0),
      ],
    }),
    [],
  );

  const applyMetricPreset = useCallback(
    (which, label) => {
      const pair = metricRangePresets[label];
      if (!pair) return;
      const [s, e] = pair;
      const next = { startDate: s, endDate: e, key: "selection" };
      if (which === "do") {
        setRangeDo(next);
        setShowPresetMenuDo(false);
      } else {
        setRangeLoad(next);
        setShowPresetMenuLoad(false);
      }
    },
    [metricRangePresets],
  );

  const metricDates = useMemo(() => {
    const pack = (r) =>
      r?.startDate && r?.endDate
        ? {
            from: format(r.startDate, "yyyy-MM-dd"),
            to: format(r.endDate, "yyyy-MM-dd"),
          }
        : { from: "", to: "" };
    const d = pack(rangeDo);
    const l = pack(rangeLoad);
    return {
      doAddedFrom: d.from,
      doAddedTo: d.to,
      loadAddedFrom: l.from,
      loadAddedTo: l.to,
    };
  }, [rangeDo, rangeLoad]);

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
      if (addedByDdRef.current && !addedByDdRef.current.contains(e.target)) {
        setAddedByDdOpen(false);
      }
      if (limitDdRef.current && !limitDdRef.current.contains(e.target)) {
        setLimitDdOpen(false);
      }
      if (
        datePresetDoRef.current &&
        !datePresetDoRef.current.contains(e.target)
      ) {
        setShowPresetMenuDo(false);
      }
      if (
        datePresetLoadRef.current &&
        !datePresetLoadRef.current.contains(e.target)
      ) {
        setShowPresetMenuLoad(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (addedByDdOpen && addedByInputRef.current)
      addedByInputRef.current.focus();
  }, [addedByDdOpen]);

  useEffect(() => {
    if (
      !addedByDdOpen &&
      !limitDdOpen &&
      !showPresetMenuDo &&
      !showPresetMenuLoad
    )
      return;
    function update() {
      if (addedByDdOpen && addedByBtnRef.current) {
        setAddedByMenuPos(calcMenuPos(addedByBtnRef.current));
      }
      if (limitDdOpen && limitBtnRef.current) {
        setLimitMenuPos(calcMenuPos(limitBtnRef.current));
      }
      if (showPresetMenuDo && metricDoBtnRef.current) {
        setMetricDoMenuPos(calcMenuPos(metricDoBtnRef.current));
      }
      if (showPresetMenuLoad && metricLoadBtnRef.current) {
        setMetricLoadMenuPos(calcMenuPos(metricLoadBtnRef.current));
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [addedByDdOpen, calcMenuPos, limitDdOpen, showPresetMenuDo, showPresetMenuLoad]);

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
        .filter(
          (x) =>
            x.value &&
            !(
              isVpl077User &&
              normalizeCompany(x.label).includes(normalizeCompany("Rishi Jyoti"))
            ),
        );
      setEmployeeOptions(options);
    } catch (error) {
      setEmployeeOptions([]);
      handleApiError(error, "Failed to load employees");
    } finally {
      setLoadingEmployees(false);
    }
  }, [handleApiError, isVpl077User]);

  const hasMetricDateFilter = useMemo(
    () =>
      Boolean(
        metricDates.doAddedFrom?.trim() ||
          metricDates.doAddedTo?.trim() ||
          metricDates.loadAddedFrom?.trim() ||
          metricDates.loadAddedTo?.trim(),
      ),
    [
      metricDates.doAddedFrom,
      metricDates.doAddedTo,
      metricDates.loadAddedFrom,
      metricDates.loadAddedTo,
    ],
  );

  const fetchReport = useCallback(
    async (page = 1, limit = pagination.limit) => {
      setLoading(true);
      const useClientMetric = hasMetricDateFilter;
      const apiPage = useClientMetric ? 1 : page;
      const apiLimit = useClientMetric ? 2000 : limit;
      try {
        const params = {
          page: apiPage,
          limit: apiLimit,
          sortBy: "createdAt",
          sortOrder: "desc",
        };
        if (filters.search.trim()) params.search = filters.search.trim();
        if (filters.addedByEmpId) params.addedByEmpId = filters.addedByEmpId;
        if (filters.assignedCompany) params.assignedCompany = filters.assignedCompany;
        if (isVpl077User) params.onboardCompany = MT_POCONO_COMPANY;
        else if (filters.onboardCompany) params.onboardCompany = filters.onboardCompany;

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
        const rawRows = Array.isArray(data?.rows) ? data.rows : [];
        const scopedRows = rawRows.filter((row) => {
          if (
            filters.onboardCompany &&
            normalizeCompany(readOnboardCompany(row)) !==
              normalizeCompany(filters.onboardCompany)
          ) {
            return false;
          }
          if (
            isVpl077User &&
            normalizeCompany(readOnboardCompany(row)) !== normalizeCompany(MT_POCONO_COMPANY)
          ) {
            return false;
          }
          if (
            filters.assignedCompany &&
            normalizeCompany(readAssignedCompany(row)) !== normalizeCompany(filters.assignedCompany)
          ) {
            return false;
          }
          return true;
        });
        setReportMeta({
          reportName: data?.reportName || "Add Customer Report",
          generatedBy: data?.generatedBy || null,
          module: payload?.module || null,
        });

        if (useClientMetric) {
          const filtered = filterRowsByMetricDates(scopedRows, metricDates);
          setMetricFilteredRows(filtered);
          setRows([]);
          const nextLimit = Number(limit) || DEFAULT_LIMIT;
          const nextTotal = filtered.length;
          const nextTotalPages = Math.max(1, Math.ceil(nextTotal / nextLimit));
          const requestedPage = Number(page) || 1;
          const nextPage = Math.min(requestedPage, nextTotalPages);
          setPagination({
            page: nextPage,
            limit: nextLimit,
            total: nextTotal,
            totalPages: nextTotalPages,
          });
        } else {
          setMetricFilteredRows(null);
          setRows(scopedRows);
          const nextPage = Number(page) || 1;
          const nextLimit = Number(p.limit ?? limit) || DEFAULT_LIMIT;
          const nextTotal = scopedRows.length;
          const nextTotalPages = Math.max(1, Math.ceil(nextTotal / nextLimit));
          setPagination({
            page: Math.min(nextPage, nextTotalPages),
            limit: nextLimit,
            total: nextTotal,
            totalPages: nextTotalPages,
          });
        }
      } catch (error) {
        setRows([]);
        setMetricFilteredRows(null);
        handleApiError(error, "Failed to load add customer report");
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit, handleApiError, hasMetricDateFilter, metricDates, isVpl077User],
  );

  const isClientMetricMode = metricFilteredRows != null;

  const navigateReportPage = useCallback(
    (targetPage) => {
      if (isClientMetricMode) {
        const lim = Number(pagination.limit) || DEFAULT_LIMIT;
        const total = metricFilteredRows.length;
        const totalPages = Math.max(1, Math.ceil(total / lim));
        const safe = Math.min(
          Math.max(1, Number(targetPage) || 1),
          totalPages,
        );
        setPagination((prev) => ({
          ...prev,
          page: safe,
          total,
          totalPages,
        }));
        return;
      }
      fetchReport(targetPage, pagination.limit);
    },
    [
      isClientMetricMode,
      metricFilteredRows,
      pagination.limit,
      fetchReport,
    ],
  );

  const tableRows = useMemo(() => {
    if (hasMetricDateFilter && loading) return [];
    if (metricFilteredRows != null) {
      const page = Math.max(1, Number(pagination.page) || 1);
      const lim = Number(pagination.limit) || DEFAULT_LIMIT;
      const start = (page - 1) * lim;
      return metricFilteredRows.slice(start, start + lim);
    }
    return rows;
  }, [
    hasMetricDateFilter,
    loading,
    metricFilteredRows,
    rows,
    pagination.page,
    pagination.limit,
  ]);

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
      addedByEmpId: "",
      onboardCompany: isVpl077User ? MT_POCONO_COMPANY : "",
      assignedCompany: "",
    });
    setAddedByDdQuery("");
    setAddedByDdOpen(false);
    setLimitDdOpen(false);
    setRangeDo({ ...METRIC_RANGE_EMPTY });
    setRangeLoad({ ...METRIC_RANGE_EMPTY });
    setShowPresetMenuDo(false);
    setShowPresetMenuLoad(false);
    setShowCustomMetric(null);
    setMetricFilteredRows(null);
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
  const detailData = useMemo(
    () => toDetailsObject(detailsModal.payload),
    [detailsModal.payload],
  );
  const mergedDetailMetrics = useMemo(() => {
    const fromRow = detailsModal.row?.metrics;
    const fromApi = detailData?.metrics;
    return { ...(fromRow || {}), ...(fromApi || {}) };
  }, [detailData?.metrics, detailsModal.row?.metrics]);
  const detailDoAddedRows = useMemo(
    () =>
      zipLabelsWithAddedDates(
        mergedDetailMetrics.doLoadNos,
        mergedDetailMetrics.doAddedDates,
      ),
    [mergedDetailMetrics.doAddedDates, mergedDetailMetrics.doLoadNos],
  );
  const detailRrAddedRows = useMemo(
    () =>
      zipLabelsWithAddedDates(
        mergedDetailMetrics.loadRefs,
        mergedDetailMetrics.loadAddedDates,
      ),
    [mergedDetailMetrics.loadAddedDates, mergedDetailMetrics.loadRefs],
  );
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
  const onboardCompanyOptions = useMemo(() => {
    if (isVpl077User) return [MT_POCONO_COMPANY];
    return ONBOARD_COMPANY_OPTIONS;
  }, [isVpl077User]);
  const assignedCompanyOptions = useMemo(() => {
    const sourceRows = metricFilteredRows ?? rows;
    const unique = Array.from(
      new Set(
        sourceRows
          .map((r) => readAssignedCompany(r))
          .filter((x) => x && x !== "-"),
      ),
    );
    return unique.sort((a, b) => String(a).localeCompare(String(b)));
  }, [metricFilteredRows, rows]);
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

  const customMetricRange =
    showCustomMetric === "do"
      ? rangeDo
      : showCustomMetric === "load"
        ? rangeLoad
        : null;

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
                setAddedByDdOpen(false);
                setShowPresetMenuDo(false);
                setShowPresetMenuLoad(false);
              }}
            >
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
                        setLimitDdOpen(false);
                        setShowPresetMenuDo(false);
                        setShowPresetMenuLoad(false);
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

              <div className="min-w-[220px] max-w-[280px] shrink-0 relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  OnBoard Company
                </label>
                <select
                  value={filters.onboardCompany}
                  onChange={(e) => onFilterChange("onboardCompany", e.target.value)}
                  disabled={isVpl077User}
                  className="w-full px-4 h-[45px] border border-gray-200 rounded-lg bg-white text-gray-700 font-medium hover:border-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  {!isVpl077User && <option value="">All Companies</option>}
                  {onboardCompanyOptions.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[220px] max-w-[280px] shrink-0 relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assigned Company
                </label>
                <select
                  value={filters.assignedCompany}
                  onChange={(e) =>
                    onFilterChange("assignedCompany", e.target.value)
                  }
                  className="w-full px-4 h-[45px] border border-gray-200 rounded-lg bg-white text-gray-700 font-medium hover:border-gray-300 transition-colors cursor-pointer"
                >
                  <option value="">All Companies</option>
                  {assignedCompanyOptions.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>

              <div
                ref={datePresetDoRef}
                className="min-w-[220px] max-w-[280px] shrink-0 relative"
              >
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  DO added dates
                </label>
                <button
                  ref={metricDoBtnRef}
                  type="button"
                  onClick={() =>
                    setShowPresetMenuDo((v) => {
                      const next = !v;
                      if (next) {
                        setShowPresetMenuLoad(false);
                        setAddedByDdOpen(false);
                        setLimitDdOpen(false);
                        if (metricDoBtnRef.current) {
                          setMetricDoMenuPos(
                            calcMenuPos(metricDoBtnRef.current),
                          );
                        }
                      }
                      return next;
                    })
                  }
                  className="w-full text-left px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors cursor-pointer"
                >
                  <span className="text-gray-800 truncate text-sm min-w-0">
                    {rangeDo.startDate && rangeDo.endDate
                      ? `${format(rangeDo.startDate, "MMM dd, yyyy")} - ${format(rangeDo.endDate, "MMM dd, yyyy")}`
                      : "Select date range"}
                  </span>
                  <span className="ml-3 text-gray-400 shrink-0">▼</span>
                </button>
                {showPresetMenuDo && (
                  <div
                    style={{
                      top:
                        metricDoMenuPos.placement === "bottom"
                          ? metricDoMenuPos.top
                          : undefined,
                      bottom:
                        metricDoMenuPos.placement === "top"
                          ? metricDoMenuPos.bottom
                          : undefined,
                      left: metricDoMenuPos.left,
                      width: metricDoMenuPos.width || undefined,
                    }}
                    className="fixed z-[60] max-h-80 overflow-y-auto rounded-lg border border-gray-100 bg-white py-1 shadow-lg"
                    role="listbox"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setRangeDo({ ...METRIC_RANGE_EMPTY });
                        setShowPresetMenuDo(false);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer"
                    >
                      Clear filter
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    {Object.keys(metricRangePresets).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => applyMetricPreset("do", lbl)}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 cursor-pointer"
                      >
                        {lbl}
                      </button>
                    ))}
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowPresetMenuDo(false);
                        setShowCustomMetric("do");
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 cursor-pointer"
                    >
                      Custom range
                    </button>
                  </div>
                )}
              </div>

              <div
                ref={datePresetLoadRef}
                className="min-w-[220px] max-w-[280px] shrink-0 relative"
              >
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  RR added dates
                </label>
                <button
                  ref={metricLoadBtnRef}
                  type="button"
                  onClick={() =>
                    setShowPresetMenuLoad((v) => {
                      const next = !v;
                      if (next) {
                        setShowPresetMenuDo(false);
                        setAddedByDdOpen(false);
                        setLimitDdOpen(false);
                        if (metricLoadBtnRef.current) {
                          setMetricLoadMenuPos(
                            calcMenuPos(metricLoadBtnRef.current),
                          );
                        }
                      }
                      return next;
                    })
                  }
                  className="w-full text-left px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors cursor-pointer"
                >
                  <span className="text-gray-800 truncate text-sm min-w-0">
                    {rangeLoad.startDate && rangeLoad.endDate
                      ? `${format(rangeLoad.startDate, "MMM dd, yyyy")} - ${format(rangeLoad.endDate, "MMM dd, yyyy")}`
                      : "Select date range"}
                  </span>
                  <span className="ml-3 text-gray-400 shrink-0">▼</span>
                </button>
                {showPresetMenuLoad && (
                  <div
                    style={{
                      top:
                        metricLoadMenuPos.placement === "bottom"
                          ? metricLoadMenuPos.top
                          : undefined,
                      bottom:
                        metricLoadMenuPos.placement === "top"
                          ? metricLoadMenuPos.bottom
                          : undefined,
                      left: metricLoadMenuPos.left,
                      width: metricLoadMenuPos.width || undefined,
                    }}
                    className="fixed z-[60] max-h-80 overflow-y-auto rounded-lg border border-gray-100 bg-white py-1 shadow-lg"
                    role="listbox"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setRangeLoad({ ...METRIC_RANGE_EMPTY });
                        setShowPresetMenuLoad(false);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer"
                    >
                      Clear filter
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    {Object.keys(metricRangePresets).map((lbl) => (
                      <button
                        key={`load-${lbl}`}
                        type="button"
                        onClick={() => applyMetricPreset("load", lbl)}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 cursor-pointer"
                      >
                        {lbl}
                      </button>
                    ))}
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowPresetMenuLoad(false);
                        setShowCustomMetric("load");
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 cursor-pointer"
                    >
                      Custom range
                    </button>
                  </div>
                )}
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

          {hasMetricDateFilter && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Showing matches from the latest {2000} report rows for these date
              filters. Clear filters to use normal paging from the server.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16 text-gray-500">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tableRows.length === 0 ? (
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
                  {tableRows.map((row, idx) => (
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
                        setAddedByDdOpen(false);
                        setShowPresetMenuDo(false);
                        setShowPresetMenuLoad(false);
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
                  navigateReportPage(Math.max(1, pagination.page - 1))
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
                      onClick={() => navigateReportPage(pageNumber)}
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
                  navigateReportPage(
                    Math.min(pagination.totalPages, pagination.page + 1),
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

        {showCustomMetric && customMetricRange && (
          <div
            className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4"
            onClick={() => setShowCustomMetric(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <DateRange
                ranges={[
                  customMetricRange.startDate && customMetricRange.endDate
                    ? customMetricRange
                    : {
                        startDate: new Date(),
                        endDate: new Date(),
                        key: "selection",
                      },
                ]}
                onChange={(item) => {
                  const sel = item?.selection;
                  if (sel?.startDate && sel?.endDate) {
                    const next = {
                      startDate: sel.startDate,
                      endDate: sel.endDate,
                      key: "selection",
                    };
                    if (showCustomMetric === "do") setRangeDo(next);
                    else setRangeLoad(next);
                  }
                }}
                moveRangeOnFirstSelection={false}
                months={2}
                direction="horizontal"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (showCustomMetric === "do") setRangeDo({ ...METRIC_RANGE_EMPTY });
                    else setRangeLoad({ ...METRIC_RANGE_EMPTY });
                    setShowCustomMetric(null);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomMetric(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      customMetricRange.startDate &&
                      customMetricRange.endDate
                    ) {
                      setShowCustomMetric(null);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg ${
                    customMetricRange.startDate && customMetricRange.endDate
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  disabled={
                    !(
                      customMetricRange.startDate &&
                      customMetricRange.endDate
                    )
                  }
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {detailsModal.open && (
          <>
            {detailsLoading && (
              <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center">
                <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-lg font-semibold text-gray-800">
                    Loading customer details…
                  </p>
                  <p className="text-sm text-gray-600">
                    Please wait while we fetch the complete data
                  </p>
                </div>
              </div>
            )}

            {!detailsLoading && (
              <div
                className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
                onClick={() =>
                  setDetailsModal({ open: false, payload: null, row: null })
                }
              >
                <div
                  className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                          <Truck className="text-white" size={24} />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-xl font-bold truncate">
                            Customer data
                          </h2>
                          <p className="text-blue-100 text-sm truncate">
                            {readValue(
                              detailData?.compName,
                              detailData?.companyName,
                              detailsModal.row?.companyName,
                            )}
                          </p>
                          <p className="text-blue-100/90 text-xs truncate">
                            Shipper account details
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDetailsModal({
                            open: false,
                            payload: null,
                            row: null,
                          })
                        }
                        className="text-white hover:text-gray-200 text-2xl font-bold leading-none shrink-0 ml-2"
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <User className="text-green-600" size={20} />
                        <h3 className="text-lg font-bold text-gray-800">
                          Customer information
                        </h3>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-green-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Company</p>
                            <p className="font-medium text-gray-800 break-words">
                              {readValue(
                                detailData?.compName,
                                detailData?.companyName,
                                detailsModal.row?.companyName,
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">MC/DOT</p>
                            <p className="font-medium text-gray-800">
                              {readValue(
                                detailData?.mc_dot,
                                detailData?.mcDotNo,
                                detailsModal.row?.mcDotNo,
                              )}
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Mail
                              className="text-gray-400 shrink-0 mt-0.5"
                              size={16}
                            />
                            <div className="min-w-0">
                              <p className="text-sm text-gray-600">Email</p>
                              <p className="font-medium text-gray-800 break-all">
                                {readValue(
                                  detailData?.email,
                                  detailsModal.row?.email,
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Phone
                              className="text-gray-400 shrink-0 mt-0.5"
                              size={16}
                            />
                            <div className="min-w-0">
                              <p className="text-sm text-gray-600">Phone</p>
                              <p className="font-medium text-gray-800">
                                {readValue(
                                  detailData?.phoneNo,
                                  detailData?.phone,
                                  detailsModal.row?.phoneNo,
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 sm:col-span-2">
                            <Calendar
                              className="text-gray-400 shrink-0 mt-0.5"
                              size={16}
                            />
                            <div>
                              <p className="text-sm text-gray-600">Added date</p>
                              <p className="font-medium text-gray-800">
                                {formatDateTime(
                                  readValue(
                                    detailData?.createdAt,
                                    detailsModal.row?.createdAt,
                                  ),
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-sm text-gray-600">On Board Company</p>
                            <p className="font-medium text-gray-800 break-words">
                              {readValue(
                                detailData?.onboardCompany,
                                detailData?.onBoardCompany,
                                detailData?.onboard_company,
                                detailData?.onboardingCompany,
                                detailsModal.row?.onboardCompany,
                                detailsModal.row?.onBoardCompany,
                                detailsModal.row?.onboard_company,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Truck className="text-purple-600" size={20} />
                        <h3 className="text-lg font-bold text-gray-800">
                          {"Metrics & loads"}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <FileText className="text-purple-600" size={16} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total DOs</p>
                            <p className="font-semibold text-gray-800 tabular-nums">
                              {readValue(mergedDetailMetrics.totalDOs)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                            <Truck className="text-pink-600" size={16} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total RR</p>
                            <p className="font-semibold text-gray-800 tabular-nums">
                              {readValue(mergedDetailMetrics.totalLoads)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-3 border border-purple-200 overflow-x-auto">
                          <p className="text-sm text-gray-600 mb-2 font-medium">
                            DO — added on
                          </p>
                          {detailDoAddedRows.length === 0 ? (
                            <p className="text-sm text-gray-500">No data</p>
                          ) : (
                            <table className="w-full text-sm text-left border-collapse min-w-[280px]">
                              <thead>
                                <tr className="border-b border-gray-200 text-gray-600">
                                  <th className="py-2 pr-3 font-medium">
                                    Load no.
                                  </th>
                                  <th className="py-2 font-medium whitespace-nowrap">
                                    Added on
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailDoAddedRows.map((r, i) => (
                                  <tr
                                    key={`do-added-${i}-${r.label}-${r.addedDisplay}`}
                                    className="border-b border-gray-100 last:border-0"
                                  >
                                    <td className="py-2 pr-3 font-medium text-gray-800 break-all">
                                      {r.label}
                                    </td>
                                    <td className="py-2 text-gray-700 whitespace-nowrap">
                                      {r.addedDisplay}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-purple-200 overflow-x-auto">
                          <p className="text-sm text-gray-600 mb-2 font-medium">
                            RR — added on
                          </p>
                          {detailRrAddedRows.length === 0 ? (
                            <p className="text-sm text-gray-500">No data</p>
                          ) : (
                            <table className="w-full text-sm text-left border-collapse min-w-[280px]">
                              <thead>
                                <tr className="border-b border-gray-200 text-gray-600">
                                  <th className="py-2 pr-3 font-medium">
                                    Load ref
                                  </th>
                                  <th className="py-2 font-medium whitespace-nowrap">
                                    Added on
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailRrAddedRows.map((r, i) => (
                                  <tr
                                    key={`rr-added-${i}-${r.label}-${r.addedDisplay}`}
                                    className="border-b border-gray-100 last:border-0"
                                  >
                                    <td className="py-2 pr-3 font-medium text-gray-800 break-all">
                                      {r.label}
                                    </td>
                                    <td className="py-2 text-gray-700 whitespace-nowrap">
                                      {r.addedDisplay}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
