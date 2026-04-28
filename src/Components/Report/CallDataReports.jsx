import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import API_CONFIG from "../../config/api";
import {
  CMT_CUSTOM_EDIT_DISPOSITION,
  CMT_ADD_LOAD_REFERENCE_DISPOSITION,
} from "../../constants/cmtCallDispositionLabels";

const REPORT_BASE = `${API_CONFIG.BASE_URL}/api/v1/analytics/8x8`;

/** Caller names shown in “All caller aliases” even if not returned from active employees (e.g. Triton line). */
const STATIC_REPORT_CALLER_ALIASES = [
  {
    label: "Identifica LLC",
    value: "Identifica LLC",
    empId: "static-identifica-llc",
    mobileNo: "",
  },
];

const mergeStaticReportCallerAliases = (fromApi) => {
  const byKey = new Map();
  for (const o of fromApi) {
    if (o?.value) byKey.set(String(o.value).toLowerCase(), o);
  }
  for (const s of STATIC_REPORT_CALLER_ALIASES) {
    byKey.set(String(s.value).toLowerCase(), s);
  }
  return Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label));
};
/**
 * 1-1 feedback (not under 8x8 analytics base).
 * GET by document id: GET /api/v1/one-on-one-feedback/:id
 * e.g. http://localhost:4000/api/v1/one-on-one-feedback/69c2d0bf6305d4954f40d72d
 * POST create/update: POST /api/v1/one-on-one-feedback
 */
const ONE_ON_ONE_FEEDBACK_API = `${API_CONFIG.BASE_URL}/api/v1/one-on-one-feedback`;

/** Accepts common GET shapes: { success, data }, { data }, or the document at root. */
const extractOneOnOneDocFromGetResponse = (res) => {
  const d = res?.data;
  if (!d || typeof d !== "object") return null;
  if (d.success === false) return null;

  if (d.data !== undefined && d.data !== null) {
    let item = d.data;
    if (Array.isArray(item)) item = item.find((x) => x && typeof x === "object") ?? item[0];
    if (item && typeof item === "object") return item;
  }

  if (d._id != null || d.callId != null || typeof d.feedback === "string") {
    return d;
  }
  return null;
};

const formatOneOnOneFieldValue = (key, value) => {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (
    (key === "createdAt" || key === "updatedAt" || /At$/i.test(key)) &&
    (typeof value === "string" || typeof value === "number")
  ) {
    const t = new Date(value);
    if (!Number.isNaN(t.getTime())) return t.toLocaleString();
  }
  return String(value);
};

const EMPTY_DETAILS = {
  customerName: "",
  contactNumber: "",
  emailAddress: "",
  address: "",
  contactPerson: "",
  followUpNotes: "",
  remark: "",
};

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayRange = () => {
  const now = toDateInputValue(new Date());
  return {
    from: now,
    to: now,
  };
};

const getMonthRange = (year, monthIndex) => {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  return {
    from: toDateInputValue(firstDay),
    to: toDateInputValue(lastDay),
  };
};

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7Days", label: "Last 7 Days" },
  { value: "last30Days", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "customRange", label: "Custom" },
];

const getDateRangeFromPreset = (preset, customRangeValue) => {
  const today = new Date();

  if (preset === "yesterday") {
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const value = toDateInputValue(yesterday);
    return { from: value, to: value };
  }

  if (preset === "last7Days") {
    const fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    return { from: toDateInputValue(fromDate), to: toDateInputValue(today) };
  }

  if (preset === "last30Days") {
    const fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
    return { from: toDateInputValue(fromDate), to: toDateInputValue(today) };
  }

  if (preset === "thisMonth") {
    return getMonthRange(today.getFullYear(), today.getMonth());
  }

  if (preset === "lastMonth") {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return getMonthRange(monthDate.getFullYear(), monthDate.getMonth());
  }

  if (preset === "customRange") {
    const from = String(customRangeValue?.from || "").trim();
    const to = String(customRangeValue?.to || "").trim();
    if (from && to) {
      return from <= to ? { from, to } : { from: to, to: from };
    }
    return getTodayRange();
  }

  return getTodayRange();
};

const getAuthConfig = () => {
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("authToken");
  return {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
};

const toBool = (val) => val === true || val === "true";
const toMinutes = (ms) => (Number(ms || 0) / 60000).toFixed(2);
const toHoursFromMinutes = (minutes) => (Number(minutes || 0) / 60).toFixed(2);

/** Normalized receiver line from report row (matches backend: calleeNumber / receiverNumber or callee.phoneNumber). */
const getCalleeReceiverNumber = (record) =>
  record?.receiverNumber ??
  record?.calleeNumber ??
  record?.callee?.phoneNumber ??
  null;

/** Call No column / payload: same callee line as the Callee column (name + number). */
const getCallNoFromCallee = (record) => {
  const name = (record?.calleeName || record?.callee?.name || "").trim();
  const num = getCalleeReceiverNumber(record);
  if (name && num) return `${name} · ${num}`;
  if (name) return name;
  if (num != null && String(num).trim() !== "") return String(num);
  return "";
};

const CallDataReports = () => {
  const [state, setState] = useState(() => ({
    loading: false,
    filters: {
      ...getTodayRange(),
      callerName: "",
      callerMobileNo: "",
      callerEmpId: "",
      category: "",
      page: 1,
      limit: 10,
    },
    /** Echoed from GET /call-records/report `filters` (callerName, calleeName, resolvedEmployee, etc.) */
    reportFilters: null,
    categoryOptions: [],
    summary: null,
    employeeSummary: [],
    records: [],
    error: null,
  }));
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [followUpModal, setFollowUpModal] = useState({ open: false, callId: null });
  const [oneOnOneModal, setOneOnOneModal] = useState({ open: false, record: null });
  const [oneOnOneFeedbackText, setOneOnOneFeedbackText] = useState("");
  const [submittingOneOnOne, setSubmittingOneOnOne] = useState(false);
  const [loadingOneOnOneFetch, setLoadingOneOnOneFetch] = useState(false);
  /** Full object from GET /one-on-one-feedback/:id — shown in modal */
  const [oneOnOneServerData, setOneOnOneServerData] = useState(null);
  const [activeSectionTab, setActiveSectionTab] = useState("employeeSummary");
  const [datePreset, setDatePreset] = useState("today");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState(() => getTodayRange());
  const previousDatePresetRef = useRef("today");
  const [callerDropdownOpen, setCallerDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [callerSearchText, setCallerSearchText] = useState("");
  const [tableSearchText, setTableSearchText] = useState("");
  const dateDropdownRef = useRef(null);
  const callerDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const activeReportAbortRef = useRef(null);
  const latestReportRequestRef = useRef(0);

  const activeRecord = useMemo(
    () => state.records.find((r) => r.callId === followUpModal.callId) || null,
    [state.records, followUpModal.callId]
  );

  const mergeDraft = (record) => {
    const draft = drafts[record.callId];
    if (!draft) return record;
    return {
      ...record,
      ...draft,
      followUpDetails: {
        ...(record.followUpDetails || {}),
        ...(draft.followUpDetails || {}),
      },
    };
  };

  const fetchCategoryOptions = async () => {
    try {
      let storedUser = null;
      try {
        const raw =
          sessionStorage.getItem("user") || localStorage.getItem("user");
        if (raw) storedUser = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      const isCmt =
        String(storedUser?.department || "")
          .trim()
          .toLowerCase() === "cmt";

      const res = await axios.get(`${REPORT_BASE}/call-records/category-options`, getAuthConfig());
      let options = res?.data?.data || res?.data?.options || [];
      if (!Array.isArray(options)) options = [];
      if (isCmt && options.length > 0) {
        if (!options.includes(CMT_ADD_LOAD_REFERENCE_DISPOSITION)) {
          options = [...options, CMT_ADD_LOAD_REFERENCE_DISPOSITION];
        }
        if (!options.includes(CMT_CUSTOM_EDIT_DISPOSITION)) {
          options = [...options, CMT_CUSTOM_EDIT_DISPOSITION];
        }
      }
      setState((prev) => ({
        ...prev,
        categoryOptions: options,
      }));
    } catch (error) {
      console.error("Category options fetch failed:", error);
      toast.error("Failed to load category options");
    }
  };

  const fetchActiveEmployees = async () => {
    const toEmployeeOptions = (employees) =>
      employees
        .map((emp) => {
          const display = (emp?.aliasName || emp?.employeeName || emp?.empName || "").trim();
          return {
            label: display,
            value: display,
            empId: emp?.empId || emp?._id || "",
            mobileNo: emp?.mobileNo || emp?.phoneNo || emp?.phone || "",
          };
        })
        .filter((item) => item.value)
        .filter((item, idx, arr) => arr.findIndex((x) => x.value === item.value) === idx)
        .sort((a, b) => a.label.localeCompare(b.label));

    const extractEmployees = (payload) => {
      if (!payload || typeof payload !== "object") return [];
      if (Array.isArray(payload)) return payload;

      const directKeys = ["employees", "users", "data", "results", "docs", "items"];
      for (const key of directKeys) {
        if (Array.isArray(payload[key])) return payload[key];
      }

      // Handle nested payloads like { data: { employees: [...] } }
      for (const key of Object.keys(payload)) {
        const value = payload[key];
        if (value && typeof value === "object" && !Array.isArray(value)) {
          for (const nestedKey of directKeys) {
            if (Array.isArray(value[nestedKey])) return value[nestedKey];
          }
        }
      }
      return [];
    };

    try {
      const activeRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/active`, getAuthConfig());
      let employees = extractEmployees(activeRes?.data);
      let options = toEmployeeOptions(employees);

      // Fallback for deployments where /active shape differs or returns empty.
      if (!options.length) {
        const allUsersRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser`, getAuthConfig());
        employees = extractEmployees(allUsersRes?.data);
        const filteredActive = employees.filter((emp) => {
          if (typeof emp?.isActive === "boolean") return emp.isActive;
          if (typeof emp?.status === "string") return emp.status.toLowerCase() === "active";
          return true;
        });
        options = toEmployeeOptions(filteredActive);
      }

      setEmployeeOptions(mergeStaticReportCallerAliases(options));
    } catch (error) {
      console.error("Active employees fetch failed:", error);
      toast.error("Failed to load active employee aliases");
    }
  };

  const fetchReport = async (incomingFilters) => {
    if (activeReportAbortRef.current) {
      activeReportAbortRef.current.abort();
    }
    const controller = new AbortController();
    activeReportAbortRef.current = controller;
    const requestId = latestReportRequestRef.current + 1;
    latestReportRequestRef.current = requestId;
    const filters = incomingFilters || state.filters;
    const page = Math.max(1, Number(filters.page || 1));
    const limit = 10;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const buildParams = (requestedPage, requestedLimit) => {
        const params = new URLSearchParams();
        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);
        if (filters.callerName?.trim()) params.set("callerName", filters.callerName.trim());
        if (filters.callerMobileNo?.trim()) params.set("mobileNo", filters.callerMobileNo.trim());
        if (filters.callerEmpId?.trim()) params.set("empId", filters.callerEmpId.trim());
        if (filters.category?.trim()) params.set("category", filters.category.trim());
        params.set("pageSize", String(requestedLimit));
        params.set("page", String(requestedPage));
        params.set("limit", String(requestedLimit));
        return params;
      };

      const requestPayload = async (requestedPage, requestedLimit) => {
        const params = buildParams(requestedPage, requestedLimit);
        try {
          const reportRes = await axios.get(`${REPORT_BASE}/call-records/report?${params.toString()}`, {
            ...getAuthConfig(),
            signal: controller.signal,
          });
          return reportRes?.data || {};
        } catch (primaryErr) {
          if (primaryErr?.code === "ERR_CANCELED") throw primaryErr;
          if (primaryErr?.response?.status === 404) throw primaryErr;
          console.warn("Primary report API failed, trying filter API:", primaryErr);
          const filterRes = await axios.get(`${REPORT_BASE}/call-records/filter?${params.toString()}`, {
            ...getAuthConfig(),
            signal: controller.signal,
          });
          return filterRes?.data || {};
        }
      };

      const firstPayload = await requestPayload(1, 1500);
      if (!firstPayload?.success) {
        throw new Error(firstPayload?.message || "Failed to load call report");
      }

      const firstPageRecords = Array.isArray(firstPayload.data)
        ? firstPayload.data
        : Array.isArray(firstPayload.records)
          ? firstPayload.records
          : [];

      let nextRecords = [...firstPageRecords];
      const totalFromApi = Number(
        firstPayload?.pagination?.total ??
        firstPayload?.pagination?.totalRecords ??
        firstPayload?.total ??
        nextRecords.length
      ) || nextRecords.length;
      const totalPagesFromApi = Number(firstPayload?.pagination?.totalPages || 0);
      const apiLimit = Number(
        firstPayload?.pagination?.limit ??
        firstPayload?.pagination?.pageSize ??
        nextRecords.length
      ) || 0;
      if (totalPagesFromApi > 1 && totalFromApi > nextRecords.length) {
        const pageFetchLimit = apiLimit > 0 ? apiLimit : 100;
        const pageNumbers = [];
        for (let p = 2; p <= totalPagesFromApi; p += 1) pageNumbers.push(p);
        const pagePayloads = await Promise.all(
          pageNumbers.map(async (p) => ({
            page: p,
            payload: await requestPayload(p, pageFetchLimit),
          }))
        );
        pagePayloads
          .sort((a, b) => a.page - b.page)
          .forEach(({ payload }) => {
            const pageRecords = Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.records)
                ? payload.records
                : [];
            if (pageRecords.length) nextRecords = [...nextRecords, ...pageRecords];
          });
        if (nextRecords.length > totalFromApi) {
          nextRecords = nextRecords.slice(0, totalFromApi);
        }
      }
      const computedSummary = {
        totalEmployees: new Set(
          nextRecords.map((r) => r.callerName || r.calleeName || "").filter(Boolean)
        ).size,
        totalCalls: nextRecords.length,
        answeredCalls: nextRecords.filter((r) => String(r.answered || "").toLowerCase() === "answered").length,
        missedCalls: nextRecords.filter((r) => String(r.answered || "").toLowerCase() !== "answered").length,
        totalTalkTimeMS: nextRecords.reduce((sum, r) => sum + Number(r.talkTimeMS || 0), 0),
        totalTalkTimeMinutes: Math.floor(
          nextRecords.reduce((sum, r) => sum + Number(r.talkTimeMS || 0), 0) / 60000
        ),
        followUpCount: nextRecords.filter((r) => toBool(r.followUp)).length,
        categorizedCalls: nextRecords.filter((r) => Boolean(String(r.category || "").trim())).length,
      };

      const computedEmployeeSummary = Object.values(
        nextRecords.reduce((acc, record) => {
          const employeeName = record.callerName || record.calleeName || "Unknown";
          if (!acc[employeeName]) {
            acc[employeeName] = {
              employeeName,
              totalCalls: 0,
              answeredCalls: 0,
              missedCalls: 0,
              totalTalkTimeMS: 0,
              totalTalkTimeMinutes: 0,
              followUpCount: 0,
              categorizedCalls: 0,
            };
          }
          const row = acc[employeeName];
          row.totalCalls += 1;
          row.totalTalkTimeMS += Number(record.talkTimeMS || 0);
          row.totalTalkTimeMinutes = Math.floor(row.totalTalkTimeMS / 60000);
          if (String(record.answered || "").toLowerCase() === "answered") row.answeredCalls += 1;
          else row.missedCalls += 1;
          if (toBool(record.followUp)) row.followUpCount += 1;
          if (String(record.category || "").trim()) row.categorizedCalls += 1;
          return acc;
        }, {})
      );

      if (requestId !== latestReportRequestRef.current || controller.signal.aborted) {
        return;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        filters: {
          ...filters,
          page,
          limit,
        },
        reportFilters: firstPayload.filters ?? null,
        summary: firstPayload.summary || computedSummary,
        employeeSummary: Array.isArray(firstPayload.employeeSummary) && firstPayload.employeeSummary.length
          ? firstPayload.employeeSummary
          : computedEmployeeSummary,
        records: nextRecords,
        error: null,
      }));
      setDrafts({});
    } catch (error) {
      if (error?.code === "ERR_CANCELED" || controller.signal.aborted) {
        return;
      }
      if (requestId !== latestReportRequestRef.current) {
        return;
      }
      console.error("Call report fetch failed:", error);
      const status = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      if (status === 404) {
        toast.error(apiMessage || "No employee found for this mobile number");
        setState((prev) => ({
          ...prev,
          loading: false,
          filters,
          reportFilters: null,
          records: [],
          employeeSummary: [],
          summary: null,
          error: null,
        }));
        return;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        filters,
        error: "Failed to load call report",
      }));
      toast.error("Failed to load call report");
    } finally {
      if (activeReportAbortRef.current === controller) {
        activeReportAbortRef.current = null;
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchActiveEmployees();
      await fetchCategoryOptions();
      await fetchReport();
    };
    init();
  }, []);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
        setDateDropdownOpen(false);
      }
      if (callerDropdownRef.current && !callerDropdownRef.current.contains(event.target)) {
        setCallerDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const applyDatePreset = (preset, customValue = customDateRange) => {
    const dateRange = getDateRangeFromPreset(preset, customValue);
    const next = {
      ...state.filters,
      ...dateRange,
      page: 1,
    };
    setDatePreset(preset);
    setState((prev) => ({
      ...prev,
      filters: next,
    }));
    fetchReport(next);
  };

  const updateFilter = (key, value) => {
    const next = {
      ...state.filters,
      [key]: value,
      page: 1,
    };
    setState((prev) => ({
      ...prev,
      filters: next,
    }));
    fetchReport(next);
  };

  const updateDraft = (callId, updates) => {
    setDrafts((prev) => ({
      ...prev,
      [callId]: {
        ...(prev[callId] || {}),
        ...updates,
      },
    }));
  };

  const updateDraftDetails = (callId, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [callId]: {
        ...(prev[callId] || {}),
        followUpDetails: {
          ...EMPTY_DETAILS,
          ...(prev[callId]?.followUpDetails || {}),
          [key]: value,
        },
      },
    }));
  };

  const handleReset = async () => {
    const defaults = {
      ...getTodayRange(),
      callerName: "",
      callerMobileNo: "",
      callerEmpId: "",
      category: "",
      page: 1,
      limit: 10,
    };
    setDatePreset("today");
    setTableSearchText("");
    setState((prev) => ({ ...prev, filters: defaults }));
    await fetchReport(defaults);
  };

  const pageSize = 10;
  const filteredCallerOptions = employeeOptions.filter((option) =>
    option.label.toLowerCase().includes(callerSearchText.trim().toLowerCase())
  );
  const normalizedTableSearch = tableSearchText.trim().toLowerCase();
  const filteredEmployeeSummary = normalizedTableSearch
    ? state.employeeSummary.filter((emp) => (
      [
        emp.employeeName,
        emp.empId,
        emp.mobileNo,
        emp.totalCalls,
        emp.answeredCalls,
        emp.missedCalls,
        emp.totalTalkTimeMinutes,
        emp.categorizedCalls,
        emp.followUpCount,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ")
        .includes(normalizedTableSearch)
    ))
    : state.employeeSummary;
  const filteredDetailedCalls = normalizedTableSearch
    ? state.records.filter((record) => {
      const merged = mergeDraft(record);
      const calleeReceiver = getCalleeReceiverNumber(merged);
      const callNoLine = getCallNoFromCallee(merged);
      return [
        record.startTime ? new Date(record.startTime).toLocaleString() : "",
        record.callId,
        record.callerName,
        record.direction,
        record.answered,
        toMinutes(record.talkTimeMS),
        merged.category,
        toBool(merged.followUp) ? "yes true follow up" : "no false",
        record.employee?.empId,
        record.employee?.aliasName,
        record.employee?.mobileNo,
        merged.calleeName,
        merged.callee?.name,
        calleeReceiver,
        callNoLine,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ")
        .includes(normalizedTableSearch);
    })
    : state.records;
  const activeRows = activeSectionTab === "employeeSummary" ? filteredEmployeeSummary : filteredDetailedCalls;
  const totalRecords = activeRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(Math.max(1, Number(state.filters.page || 1)), totalPages);
  const showingFrom = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = totalRecords === 0 ? 0 : Math.min(currentPage * pageSize, totalRecords);
  const employeeSummaryPageRows = filteredEmployeeSummary.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const detailedCallsPageRows = filteredDetailedCalls.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const getVisiblePages = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis-left");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis-right");
    pages.push(totalPages);
    return pages;
  };

  const getOneOnOneFeedbackDocId = (r) => {
    const candidates = [
      r?.oneOnOneFeedbackId,
      r?.feedbackId,
      r?.oneOnOneFeedback?._id,
      r?.oneOnOneFeedback?.id,
      r?.one_on_one_feedback_id,
    ];
    for (const c of candidates) {
      if (c != null && String(c).trim() !== "") return String(c).trim();
    }
    return null;
  };

  const loadOneOnOneFeedbackForModal = async (record) => {
    setOneOnOneServerData(null);
    setOneOnOneFeedbackText("");
    const docId = getOneOnOneFeedbackDocId(record);
    const callId = record?.callId;
    if (!docId && !callId) {
      setLoadingOneOnOneFetch(false);
      return;
    }
    setLoadingOneOnOneFetch(true);
    try {
      let res;
      if (docId) {
        res = await axios.get(`${ONE_ON_ONE_FEEDBACK_API}/${encodeURIComponent(docId)}`, getAuthConfig());
      } else {
        res = await axios.get(ONE_ON_ONE_FEEDBACK_API, {
          ...getAuthConfig(),
          params: { callId },
        });
      }

      const item = extractOneOnOneDocFromGetResponse(res);
      if (!item) return;

      setOneOnOneServerData(item);
      if (item.feedback != null) setOneOnOneFeedbackText(String(item.feedback));
    } catch (e) {
      if (e?.response?.status !== 404) {
        console.warn("Could not load 1-1 feedback:", e?.response?.data || e.message);
        toast.error(
          e?.response?.data?.message || e?.message || "Could not load feedback from server",
        );
      }
    } finally {
      setLoadingOneOnOneFetch(false);
    }
  };

  const openOneOnOneFeedback = async (record) => {
    setOneOnOneModal({ open: true, record });
    await loadOneOnOneFeedbackForModal(record);
  };

  const submitOneOnOneFeedback = async () => {
    const record = oneOnOneModal.record;
    if (!record?.callId) return;
    const text = oneOnOneFeedbackText.trim();
    if (!text) {
      toast.error("Please enter feedback");
      return;
    }
    const emp = record.employee || {};
    const srv = oneOnOneServerData;
    const body = {
      callId: record.callId,
      callNo:
        getCallNoFromCallee(record) ||
        (srv?.callNo != null && String(srv.callNo) !== "" ? String(srv.callNo) : "") ||
        "",
      feedback: text,
      aliasName: emp.aliasName || srv?.aliasName || "",
      empId:
        emp.empId != null
          ? String(emp.empId)
          : srv?.empId != null && String(srv.empId) !== ""
            ? String(srv.empId)
            : "",
      employeeName: emp.employeeName || emp.empName || srv?.employeeName || "",
    };
    setSubmittingOneOnOne(true);
    try {
      const res = await axios.post(ONE_ON_ONE_FEEDBACK_API, body, getAuthConfig());
      if (res?.data?.success === false) {
        throw new Error(res?.data?.message || "Failed to submit 1-1 feedback");
      }
      toast.success("1-1 feedback submitted");
      setOneOnOneModal({ open: false, record: null });
      setOneOnOneFeedbackText("");
      setOneOnOneServerData(null);
      await fetchReport();
    } catch (error) {
      console.error("1-1 feedback failed:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to submit 1-1 feedback",
      );
    } finally {
      setSubmittingOneOnOne(false);
    }
  };

  const saveRow = async (record) => {
    const merged = mergeDraft(record);
    const followUpEnabled = toBool(merged.followUp);
    const details = {
      ...EMPTY_DETAILS,
      ...(record.followUpDetails || {}),
      ...(merged.followUpDetails || {}),
    };

    if (followUpEnabled && (!details.emailAddress?.trim() || !details.contactPerson?.trim())) {
      const message = "Email address and contact person are required for follow-up";
      toast.error(message);
      return;
    }

    const body = {
      category: merged.category || "",
      followUp: followUpEnabled,
      followUpDetails: details,
    };

    try {
      const res = await axios.put(`${REPORT_BASE}/call-records/${record.callId}/category`, body, getAuthConfig());
      if (!res?.data?.success) {
        throw new Error(res?.data?.message || "Failed to update category/follow-up");
      }
      toast.success("Call record updated");
      setFollowUpModal({ open: false, callId: null });
      await fetchReport();
    } catch (error) {
      console.error("Update row failed:", error);
      toast.error(error?.response?.data?.message || "Failed to save this row");
    }
  };

  const exportRows = () => {
    if (!state.records.length) {
      toast.info("No records available to export");
      return;
    }

    const rows = state.records.map((record) => {
      const merged = mergeDraft(record);
      const details = { ...EMPTY_DETAILS, ...(merged.followUpDetails || {}) };
      return {
        from: state.filters.from,
        to: state.filters.to,
        callerFilter: state.filters.callerName,
        categoryFilter: state.filters.category,
        resolvedEmployee: state.reportFilters?.resolvedEmployee
          ? JSON.stringify(state.reportFilters.resolvedEmployee)
          : "",
        callId: merged.callId || "",
        callerName: merged.callerName || "",
        calleeName: merged.calleeName || "",
        receiverNumber: getCalleeReceiverNumber(merged) || "",
        empId: merged.employee?.empId || "",
        employeeName: merged.employee?.employeeName || "",
        aliasName: merged.employee?.aliasName || "",
        employeeMobileNo: merged.employee?.mobileNo || "",
        startTime: merged.startTime || "",
        direction: merged.direction || "",
        answered: merged.answered || "",
        talkTimeMS: merged.talkTimeMS || 0,
        category: merged.category || "",
        followUp: toBool(merged.followUp) ? "Yes" : "No",
        customerName: details.customerName || "",
        emailAddress: details.emailAddress || "",
        address: details.address || "",
        contactPerson: details.contactPerson || "",
        followUpNotes: details.followUpNotes || "",
        remark: details.remark || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Call Data Report");
    XLSX.writeFile(wb, `Call_Data_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const summaryCards = state.summary
    ? [
        {
          key: "employees",
          title: "Total Employees",
          value: state.summary.totalEmployees || 0,
          iconBg: "bg-blue-50",
          iconColor: "text-blue-600",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9.5" cy="7" r="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M22 19v-1a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
        {
          key: "calls",
          title: "Total Calls",
          value: state.summary.totalCalls || 0,
          iconBg: "bg-emerald-50",
          iconColor: "text-emerald-600",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.12.89.33 1.76.62 2.6a2 2 0 0 1-.45 2.1l-1.27 1.27a16 16 0 0 0 6.2 6.2l1.27-1.27a2 2 0 0 1 2.1-.45c.84.29 1.71.5 2.6.62A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
        {
          key: "answeredMissed",
          title: "Answered/Missed",
          value: `${state.summary.answeredCalls || 0}/${state.summary.missedCalls || 0}`,
          iconBg: "bg-violet-50",
          iconColor: "text-violet-600",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          ),
        },
        {
          key: "talkTime",
          title: "Talk Time (min)",
          value: state.summary.totalTalkTimeMinutes || 0,
          iconBg: "bg-amber-50",
          iconColor: "text-amber-600",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
        {
          key: "categorized",
          title: "Categorized Calls",
          value: state.summary.categorizedCalls || 0,
          iconBg: "bg-fuchsia-50",
          iconColor: "text-fuchsia-600",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M20.59 13.41 12 22l-8.59-8.59A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.41.59L22 12a2 2 0 0 1 0 2.82Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
            </svg>
          ),
        },
        {
          key: "followup",
          title: "Follow-up Calls",
          value: state.summary.followUpCount || 0,
          iconBg: "bg-rose-50",
          iconColor: "text-rose-600",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M3 12a9 9 0 0 1 15.3-6.36L21 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12a9 9 0 0 1-15.3 6.36L3 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 16H3v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
      ]
    : [];

  return (
    <div
      className="p-6 max-w-[1700px] mx-auto space-y-6 relative min-h-[280px]"
      aria-busy={state.loading}
    >
      <style>{`
        .call-report-scroll {
          overflow-x: scroll !important;
          scrollbar-width: thin !important;
          scrollbar-color: #9ca3af #eef2f7 !important;
        }
        .call-report-scroll::-webkit-scrollbar {
          display: block !important;
          height: 12px !important;
        }
        .call-report-scroll::-webkit-scrollbar-track {
          background: #eef2f7 !important;
          border-radius: 9999px !important;
        }
        .call-report-scroll::-webkit-scrollbar-thumb {
          background: #9ca3af !important;
          border-radius: 9999px !important;
        }
        .call-report-scroll::-webkit-scrollbar-thumb:hover {
          background: #6b7280 !important;
        }
      `}</style>
      <div>
        <h1 className="text-2xl font-bold text-indigo-800">Call Data Reports</h1>
        <p className="text-gray-600 mt-1">Employee-wise call details with category and follow-up in one view.</p>
      </div>



      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        {state.summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaryCards.map((card) => (
              <div key={card.key} className="rounded-2xl border border-gray-200 bg-white px-5 py-4 min-h-[116px] flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-lg leading-tight font-semibold text-gray-600 truncate">{card.title}</p>
                  <p className="text-2xl leading-none font-bold text-gray-800 mt-4">{card.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${card.iconBg} ${card.iconColor}`}>
                  {card.icon}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              value={tableSearchText}
              onChange={(e) => {
                setTableSearchText(e.target.value);
                setState((prev) => ({
                  ...prev,
                  filters: {
                    ...prev.filters,
                    page: 1,
                  },
                }));
              }}
              disabled={state.loading}
              placeholder="Search records in Employee Summary and Detailed Calls"
              className="h-[42px] w-full rounded-lg border border-gray-300 pl-11 pr-3 text-gray-800 disabled:opacity-50 disabled:cursor-wait"
            />
          </div>
          <button
            type="button"
            onClick={exportRows}
            disabled={state.loading}
            className="h-[42px] w-full md:w-[160px] shrink-0 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            Export
          </button>
        </div>
      </div>




      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 overflow-visible pb-1">
          <div className={`relative w-full min-w-0 ${dateDropdownOpen ? "z-40" : "z-10"}`} ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (state.loading) return;
                setDateDropdownOpen((prev) => !prev);
              }}
              disabled={state.loading}
              className="h-[42px] w-full px-3 border border-gray-300 rounded-lg text-left bg-white flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              <span className="truncate text-gray-800">
                {DATE_PRESETS.find((item) => item.value === datePreset)?.label || "Date Range"}
              </span>
              <span className="text-gray-500">▾</span>
            </button>
            {dateDropdownOpen && (
              <div className="absolute z-30 top-full mt-2 left-0 right-0 rounded-xl border border-gray-200 bg-white shadow-xl p-2">
                {DATE_PRESETS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (option.value === "customRange") {
                        previousDatePresetRef.current = datePreset;
                        setDatePreset("customRange");
                        if (!customDateRange?.from || !customDateRange?.to) {
                          setCustomDateRange({ from: state.filters.from, to: state.filters.to });
                        }
                        return;
                      }
                      applyDatePreset(option.value);
                      setDateDropdownOpen(false);
                    }}
                    className={`w-full h-10 px-3 rounded-lg text-left ${
                      datePreset === option.value
                        ? "bg-indigo-600 text-white"
                        : "hover:bg-gray-100 text-gray-800"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                {datePreset === "customRange" && (
                  <div className="mt-2 border-t border-gray-100 pt-2">
                    <p className="mb-2 px-1 text-xs font-medium text-gray-600">Custom Date Range</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="w-full">
                        <p className="mb-1 px-1 text-[11px] font-medium text-gray-500">From</p>
                        <input
                          type="date"
                          value={customDateRange.from}
                          onChange={(e) => {
                            const from = e.target.value;
                            setCustomDateRange((prev) => ({ ...prev, from }));
                          }}
                          disabled={state.loading}
                          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        />
                      </div>
                      <div className="w-full">
                        <p className="mb-1 px-1 text-[11px] font-medium text-gray-500">To</p>
                        <input
                          type="date"
                          value={customDateRange.to}
                          onChange={(e) => {
                            const to = e.target.value;
                            setCustomDateRange((prev) => ({ ...prev, to }));
                          }}
                          disabled={state.loading}
                          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!customDateRange.from || !customDateRange.to) return;
                          applyDatePreset("customRange", customDateRange);
                          setDateDropdownOpen(false);
                        }}
                        disabled={state.loading || !customDateRange.from || !customDateRange.to}
                        className="h-10 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-wait"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDatePreset(previousDatePresetRef.current || "today");
                          setCustomDateRange({ from: state.filters.from, to: state.filters.to });
                          setDateDropdownOpen(false);
                        }}
                        disabled={state.loading}
                        className="h-10 px-4 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Range: {state.filters.from} to {state.filters.to}
                </p>
              </div>
            )}
          </div>
          <div className={`relative w-full min-w-0 ${callerDropdownOpen ? "z-40" : "z-10"}`} ref={callerDropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (state.loading) return;
                setCallerDropdownOpen((prev) => !prev);
              }}
              disabled={state.loading}
              className="h-[42px] w-full px-3 border border-gray-300 rounded-lg text-left bg-white flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              <span className="truncate text-gray-800">{state.filters.callerName || "All caller aliases"}</span>
              <span className="text-gray-500">▾</span>
            </button>
            {callerDropdownOpen && (
              <div className="absolute z-30 top-full mt-2 left-0 right-0 rounded-xl border border-gray-200 bg-white shadow-xl p-2">
                <input
                  type="text"
                  value={callerSearchText}
                  onChange={(e) => setCallerSearchText(e.target.value)}
                  placeholder="Search caller"
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = {
                      ...state.filters,
                      callerName: "",
                      callerMobileNo: "",
                      callerEmpId: "",
                      page: 1,
                    };
                    setState((prev) => ({ ...prev, filters: next }));
                    fetchReport(next);
                    setCallerDropdownOpen(false);
                  }}
                  className={`mt-2 w-full h-10 px-3 rounded-lg text-left ${
                    !state.filters.callerName ? "bg-indigo-600 text-white" : "hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  All caller aliases
                </button>
                <div className="mt-1 max-h-72 overflow-y-auto">
                  {filteredCallerOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No caller found</div>
                  ) : (
                    filteredCallerOptions.map((option) => (
                      <button
                        key={`caller-${option.empId}-${option.value}`}
                        type="button"
                        onClick={() => {
                          const next = {
                            ...state.filters,
                            callerName: option.value || "",
                            callerMobileNo: option.mobileNo ? String(option.mobileNo).trim() : "",
                            callerEmpId: option.empId ? String(option.empId).trim() : "",
                            page: 1,
                          };
                          setState((prev) => ({ ...prev, filters: next }));
                          fetchReport(next);
                          setCallerDropdownOpen(false);
                        }}
                        className={`w-full h-10 px-3 rounded-lg text-left ${
                          state.filters.callerName === option.value
                            ? "bg-indigo-600 text-white"
                            : "hover:bg-gray-100 text-gray-800"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className={`relative w-full min-w-0 ${categoryDropdownOpen ? "z-40" : "z-10"}`} ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (state.loading) return;
                setCategoryDropdownOpen((prev) => !prev);
              }}
              disabled={state.loading}
              className="h-[42px] w-full px-3 border border-gray-300 rounded-lg text-left bg-white flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              <span className="truncate text-gray-800">{state.filters.category || "All categories"}</span>
              <span className="text-gray-500">▾</span>
            </button>
            {categoryDropdownOpen && (
              <div className="absolute z-30 top-full mt-2 left-0 right-0 rounded-xl border border-gray-200 bg-white shadow-xl p-2">
                <button
                  type="button"
                  onClick={() => {
                    updateFilter("category", "");
                    setCategoryDropdownOpen(false);
                  }}
                  className={`w-full h-10 px-3 rounded-lg text-left ${
                    !state.filters.category ? "bg-indigo-600 text-white" : "hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  All categories
                </button>
                <div className="mt-1 max-h-72 overflow-y-auto">
                  {state.categoryOptions.map((option) => (
                    <button
                      key={`filter-category-${option}`}
                      type="button"
                      onClick={() => {
                        updateFilter("category", option);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full h-10 px-3 rounded-lg text-left ${
                        state.filters.category === option
                          ? "bg-indigo-600 text-white"
                          : "hover:bg-gray-100 text-gray-800"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="w-full min-w-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={state.loading}
              className="h-[42px] w-full px-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-wait inline-flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M3 12a9 9 0 0 1 15.3-6.36L21 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 0 1-15.3 6.36L3 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 16H3v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Clear Filter
            </button>
          </div>
        </div>
        {state.reportFilters?.resolvedEmployee && (
          <p className="mt-3 text-sm text-gray-600">
            <span className="font-medium text-gray-800">Resolved employee:</span>{" "}
            {typeof state.reportFilters.resolvedEmployee === "object"
              ? [
                  state.reportFilters.resolvedEmployee.employeeName ||
                    state.reportFilters.resolvedEmployee.aliasName,
                  state.reportFilters.resolvedEmployee.empId,
                  state.reportFilters.resolvedEmployee.mobileNo,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : String(state.reportFilters.resolvedEmployee)}
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (state.loading) return;
              setActiveSectionTab("employeeSummary");
              setState((prev) => ({ ...prev, filters: { ...prev.filters, page: 1 } }));
            }}
            disabled={state.loading}
            className={`h-11 px-5 rounded-xl border font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
              activeSectionTab === "employeeSummary"
                ? "bg-amber-500 border-amber-500 text-white"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Employee Summary
          </button>
          <button
            type="button"
            onClick={() => {
              if (state.loading) return;
              setActiveSectionTab("detailedCalls");
              setState((prev) => ({ ...prev, filters: { ...prev.filters, page: 1 } }));
            }}
            disabled={state.loading}
            className={`h-11 px-5 rounded-xl border font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
              activeSectionTab === "detailedCalls"
                ? "bg-amber-500 border-amber-500 text-white"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Detailed Calls
          </button>
        </div>
      </div>

      {activeSectionTab === "employeeSummary" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-3">
          <div className="px-1 pb-1 font-semibold text-indigo-700">Employee Summary</div>
          <div className="overflow-x-auto pb-1">
            {/* className="overflow-x-scroll call-report-scroll pb-1" */}
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.2fr_1fr] gap-4 items-center rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-base font-semibold text-gray-600">
                <div>Employee</div>
                <div>Total Calls</div>
                <div>Answered</div>
                <div>Missed</div>
                <div>Talk Time (Hrs)</div>
                <div>Categorized</div>
                <div>Follow-up</div>
              </div>
              {employeeSummaryPageRows.length === 0 ? (
                <div className="mt-3 rounded-xl border border-gray-200 px-4 py-8 text-center text-gray-500">
                  No employee summary found
                </div>
              ) : (
                employeeSummaryPageRows.map((emp, index) => (
                  <div
                    key={`${emp.employeeName}-${index}`}
                    className="mt-3 grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.2fr_1fr] gap-4 items-center rounded-xl border border-gray-200 bg-white px-4 py-4 font-medium text-gray-900"
                  >
                    <div className="min-w-0">
                      <div className="truncate">{emp.employeeName || "-"}</div>
                      {(emp.empId || emp.mobileNo) && (
                        <div className="text-sm text-gray-600 truncate mt-0.5 tabular-nums font-medium">
                          {[emp.empId, emp.mobileNo].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <div className="tabular-nums text-base">{emp.totalCalls || 0}</div>
                    <div className="tabular-nums text-base">{emp.answeredCalls || 0}</div>
                    <div className="tabular-nums text-base">{emp.missedCalls || 0}</div>
                    <div className="tabular-nums text-base">{toHoursFromMinutes(emp.totalTalkTimeMinutes)}</div>
                    <div className="tabular-nums text-base">{emp.categorizedCalls || 0}</div>
                    <div className="tabular-nums text-base">{emp.followUpCount || 0}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeSectionTab === "detailedCalls" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-3">
          <div className="px-1 pb-1 font-semibold text-indigo-700">Detailed Calls</div>
          <div className="overflow-x-scroll call-report-scroll pb-1">
            <div className="min-w-[1780px]">
              <div className="grid grid-cols-[1.5fr_1.2fr_1.2fr_1.2fr_1fr_1fr_1fr_1.3fr_0.8fr_1fr_1fr] gap-4 items-center rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-base font-semibold text-gray-600">
                <div>Date/Time</div>
                <div>Call ID</div>
                <div>Caller</div>
                <div>Phone No.</div>
                <div>Direction</div>
                <div>Answered</div>
                <div>Talk Time (min)</div>
                <div>Category</div>
                <div>Follow Up</div>
                <div>Details</div>
                <div>Action</div>
              </div>
              {detailedCallsPageRows.length === 0 ? (
                <div className="mt-3 rounded-xl border border-gray-200 px-4 py-8 text-center text-gray-500">
                  No call records found for selected filters
                </div>
              ) : (
                detailedCallsPageRows.map((record, index) => {
                  const merged = mergeDraft(record);
                  const calleeDisplayName = (
                    (merged.calleeName || merged.callee?.name || "").trim() || ""
                  );
                  const calleeReceiver = getCalleeReceiverNumber(merged);
                  const callNoLine = getCallNoFromCallee(merged);
                  return (
                    <div
                      key={`${record.callId}-${index}`}
                      className="mt-3 grid grid-cols-[1.5fr_1.2fr_1.2fr_1.2fr_1fr_1fr_1fr_1.3fr_0.8fr_1fr_1fr] gap-4 items-center rounded-xl border border-gray-200 bg-white px-4 py-4 font-medium text-gray-900"
                    >
                      <div className="text-base">{record.startTime ? new Date(record.startTime).toLocaleString() : "-"}</div>
                      <div className="min-w-0">
                        <div className="truncate tabular-nums text-base font-medium text-gray-900">{record.callId || "-"}</div>
                        {callNoLine ? (
                          <div className="text-xs text-gray-500 truncate mt-1 font-medium" title={callNoLine}>
                            {callNoLine}
                          </div>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold">{record.callerName || "-"}</div>
                        {record.employee && (
                          <div className="text-sm text-gray-600 truncate mt-1 tabular-nums font-medium leading-snug">
                            {[
                              record.employee.empId,
                              record.employee.aliasName && record.employee.aliasName !== record.callerName
                                ? record.employee.aliasName
                                : null,
                              record.employee.mobileNo,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold">
                          {calleeDisplayName || calleeReceiver || "—"}
                        </div>
                        {calleeDisplayName && calleeReceiver ? (
                          <div className="text-sm text-gray-600 truncate mt-1 tabular-nums font-medium leading-snug">
                            {calleeReceiver}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-base">{record.direction || "-"}</div>
                      <div className="text-base">{record.answered || "-"}</div>
                      <div className="text-lg font-semibold tabular-nums text-gray-900">{toMinutes(record.talkTimeMS)}</div>
                      <div className="min-w-0 text-base text-gray-900">
                        <span className="block truncate" title={String(merged.category || "").trim() || undefined}>
                          {String(merged.category || "").trim() || "—"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={toBool(merged.followUp)}
                          onChange={(e) => updateDraft(record.callId, { followUp: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <button
                          className="h-10 w-full rounded-lg border border-blue-500 bg-white px-3 text-blue-700 hover:bg-blue-500 hover:text-white cursor-pointer"
                          onClick={() => setFollowUpModal({ open: true, callId: record.callId })}
                        >
                          View/Edit
                        </button>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => openOneOnOneFeedback(record)}
                          className="h-10 w-full rounded-lg border border-violet-500 bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 cursor-pointer"
                        >
                          1-1 Feedback
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-700">
          Showing {showingFrom} to {showingTo} of {totalRecords} records
        </p>
        <div className="flex items-center gap-2 text-base font-medium text-gray-800">
          <button
            onClick={() => {
              const nextPage = Math.max(1, currentPage - 1);
              const next = { ...state.filters, page: nextPage };
              setState((prev) => ({ ...prev, filters: next }));
            }}
            disabled={currentPage <= 1 || state.loading}
            className="px-2 py-1 text-gray-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {getVisiblePages().map((item) => {
            if (String(item).startsWith("ellipsis")) {
              return <span key={item} className="px-1 text-gray-400">...</span>;
            }
            const isActive = Number(item) === currentPage;
            return (
              <button
                key={`page-${item}`}
                onClick={() => {
                  const next = { ...state.filters, page: Number(item) };
                  setState((prev) => ({ ...prev, filters: next }));
                }}
                className={`h-8 min-w-8 px-2 rounded-lg border cursor-pointer ${
                  isActive
                    ? "border-gray-900 bg-white text-gray-900"
                    : "border-transparent bg-transparent text-gray-700 hover:border-gray-200"
                }`}
              >
                {item}
              </button>
            );
          })}
          <button
            onClick={() => {
              const nextPage = Math.min(totalPages, currentPage + 1);
              const next = { ...state.filters, page: nextPage };
              setState((prev) => ({ ...prev, filters: next }));
            }}
            disabled={currentPage >= totalPages || state.loading}
            className="px-2 py-1 text-gray-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {state.error && !state.loading && <div className="text-red-600 text-sm">{state.error}</div>}

      {state.loading && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white px-10 py-8 shadow-xl">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            <p className="text-base font-semibold text-gray-800">Loading report…</p>
            <p className="text-sm text-gray-500">Applying filters</p>
          </div>
        </div>
      )}

      {followUpModal.open && activeRecord && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
          <div className="bg-slate-100 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden">
            <div className="px-6 py-5 bg-blue-600 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-3xl text-white leading-none">Follow-up Details</h3>
                <p className="text-blue-100 mt-1">Call ID: {activeRecord.callId}</p>
              </div>
              <button
                onClick={() => setFollowUpModal({ open: false, callId: null })}
                className="h-10 w-10 rounded-xl bg-white/15 text-white border border-white/35 hover:bg-white/25 text-xl leading-none cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-6 bg-slate-100 space-y-5">
              <div className="rounded-2xl border border-blue-200 bg-blue-100/60 p-4">
                <h4 className="text-blue-700 font-semibold mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {["customerName", "emailAddress", "address", "contactPerson"].map((key) => {
                    const current = mergeDraft(activeRecord)?.followUpDetails?.[key] || "";
                    const placeholder = key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (c) => c.toUpperCase());
                    return (
                      <input
                        key={key}
                        value={current}
                        placeholder={placeholder}
                        onChange={(e) => updateDraftDetails(activeRecord.callId, key, e.target.value)}
                        className="h-12 px-4 border border-blue-200 rounded-xl bg-slate-50 text-slate-700 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-100/60 p-4">
                <h4 className="text-violet-700 font-semibold mb-3">Notes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.keys(EMPTY_DETAILS)
                    .filter((key) => !["customerName", "emailAddress", "address", "contactPerson"].includes(key))
                    .map((key) => {
                      const current = mergeDraft(activeRecord)?.followUpDetails?.[key] || "";
                      const placeholder = key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (c) => c.toUpperCase());
                      return (
                        <input
                          key={key}
                          value={current}
                          placeholder={placeholder}
                          onChange={(e) => updateDraftDetails(activeRecord.callId, key, e.target.value)}
                          className="h-12 px-4 border border-violet-200 rounded-xl bg-slate-50 text-slate-700 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      );
                    })}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-300 bg-slate-200/60 flex justify-end gap-3">
              <button
                onClick={() => setFollowUpModal({ open: false, callId: null })}
                className="cursor-pointer h-11 px-6 rounded-xl border border-slate-300 text-slate-800 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveRow(activeRecord)}
                className="cursor-pointer h-11 px-7 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {oneOnOneModal.open && oneOnOneModal.record && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-[1px] z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 flex items-start justify-between gap-3 shrink-0">
              <div>
                <h3 className="font-semibold text-xl text-white">1-1 Feedback</h3>
                <p className="text-violet-100 text-sm mt-1">
                  {oneOnOneServerData
                    ? "Loaded from server — edit feedback and submit to update"
                    : "Submit feedback for this call"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOneOnOneModal({ open: false, record: null });
                  setOneOnOneFeedbackText("");
                  setOneOnOneServerData(null);
                }}
                className="h-9 w-9 rounded-lg bg-white/15 text-white border border-white/30 hover:bg-white/25 text-xl leading-none cursor-pointer shrink-0"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              {loadingOneOnOneFetch && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-violet-700 bg-violet-50 rounded-xl border border-violet-100">
                  <span className="h-4 w-4 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                  GET /one-on-one-feedback … loading
                </div>
              )}

              {oneOnOneServerData && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-sm">
                  <p className="font-semibold text-violet-900 mb-3">GET API — saved feedback (full response)</p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {Object.keys(oneOnOneServerData)
                      .sort((a, b) => a.localeCompare(b))
                      .map((key) => (
                        <div key={key} className={key === "feedback" ? "sm:col-span-2" : ""}>
                          <dt className="text-violet-800/90 font-medium text-xs uppercase tracking-wide">
                            {key}
                          </dt>
                          <dd className="mt-0.5 text-gray-900 break-words whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
                            {formatOneOnOneFieldValue(key, oneOnOneServerData[key])}
                          </dd>
                        </div>
                      ))}
                  </dl>
                  <details className="mt-3 group">
                    <summary className="cursor-pointer text-violet-800 font-medium text-sm list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                      <span className="text-violet-500 group-open:rotate-90 transition-transform">▸</span>
                      Raw JSON (GET)
                    </summary>
                    <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto max-h-56 text-xs leading-relaxed">
                      {JSON.stringify(oneOnOneServerData, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              {!oneOnOneServerData && !loadingOneOnOneFetch && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                  <p className="sm:col-span-2 text-xs text-gray-600">
                    No GET payload yet (new feedback or nothing on server). Call context from report row:
                  </p>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500 font-medium">Call ID</span>
                    <p className="mt-1 font-mono text-gray-900 break-all text-base">
                      {oneOnOneModal.record.callId || "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500 font-medium">Call No</span>
                    <p className="mt-1 text-gray-900 text-base">{getCallNoFromCallee(oneOnOneModal.record) || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500 font-medium">Alias name</span>
                    <p className="mt-1 text-gray-900">{oneOnOneModal.record.employee?.aliasName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Emp ID</span>
                    <p className="mt-1 text-gray-900 tabular-nums">
                      {oneOnOneModal.record.employee?.empId != null
                        ? String(oneOnOneModal.record.employee.empId)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Employee name</span>
                    <p
                      className="mt-1 text-gray-900 truncate"
                      title={
                        oneOnOneModal.record.employee?.employeeName || oneOnOneModal.record.employee?.empName
                      }
                    >
                      {oneOnOneModal.record.employee?.employeeName ||
                        oneOnOneModal.record.employee?.empName ||
                        "—"}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Feedback *{" "}
                  {oneOnOneServerData && (
                    <span className="font-normal text-gray-500">(editable — same text as GET &quot;feedback&quot; above)</span>
                  )}
                </label>
                {loadingOneOnOneFetch ? (
                  <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-xl">
                    Waiting for API…
                  </p>
                ) : (
                  <textarea
                    value={oneOnOneFeedbackText}
                    onChange={(e) => setOneOnOneFeedbackText(e.target.value)}
                    rows={5}
                    placeholder="e.g. 1-1 went well. Discussed Q2 targets and follow-up on key accounts."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 resize-y min-h-[120px]"
                  />
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setOneOnOneModal({ open: false, record: null });
                  setOneOnOneFeedbackText("");
                  setOneOnOneServerData(null);
                }}
                className="h-11 px-5 rounded-xl border border-gray-300 text-gray-800 font-semibold hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingOneOnOne}
                onClick={submitOneOnOneFeedback}
                className="h-11 px-6 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {submittingOneOnOne ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallDataReports;
