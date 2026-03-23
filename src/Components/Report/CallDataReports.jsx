import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import API_CONFIG from "../../config/api";

const REPORT_BASE = `${API_CONFIG.BASE_URL}/api/v1/analytics/8x8`;
const EMPTY_DETAILS = {
  customerName: "",
  emailAddress: "",
  address: "",
  contactPerson: "",
  followUpNotes: "",
  remark: "",
};

const getTodayRange = () => {
  const now = new Date().toISOString().slice(0, 10);
  return {
    from: now,
    to: now,
  };
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

const CallDataReports = () => {
  const [state, setState] = useState(() => ({
    loading: false,
    filters: {
      ...getTodayRange(),
      callerName: "",
      category: "",
      mobileNo: "",
      page: 1,
      limit: 10,
    },
    /** Echoed from GET /call-records/report `filters` (callerName, calleeName, mobileNo, resolvedEmployee, etc.) */
    reportFilters: null,
    categoryOptions: [],
    summary: null,
    employeeSummary: [],
    records: [],
    error: null,
  }));
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingRows, setSavingRows] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [followUpModal, setFollowUpModal] = useState({ open: false, callId: null });
  const [activeSectionTab, setActiveSectionTab] = useState("employeeSummary");
  const [callerDropdownOpen, setCallerDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [callerSearchText, setCallerSearchText] = useState("");
  const callerDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);

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
      const res = await axios.get(`${REPORT_BASE}/call-records/category-options`, getAuthConfig());
      const options = res?.data?.data || res?.data?.options || [];
      setState((prev) => ({
        ...prev,
        categoryOptions: Array.isArray(options) ? options : [],
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

      setEmployeeOptions(options);
    } catch (error) {
      console.error("Active employees fetch failed:", error);
      toast.error("Failed to load active employee aliases");
    }
  };

  const fetchReport = async (incomingFilters) => {
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
        if (filters.category?.trim()) params.set("category", filters.category.trim());
        const mobile = String(filters.mobileNo || "").trim();
        if (mobile) {
          params.set("mobileNo", mobile);
          params.set("mobile", mobile);
        }
        params.set("pageSize", String(requestedLimit));
        params.set("page", String(requestedPage));
        params.set("limit", String(requestedLimit));
        return params;
      };

      const requestPayload = async (requestedPage, requestedLimit) => {
        const params = buildParams(requestedPage, requestedLimit);
        try {
          const reportRes = await axios.get(`${REPORT_BASE}/call-records/report?${params.toString()}`, getAuthConfig());
          return reportRes?.data || {};
        } catch (primaryErr) {
          if (primaryErr?.response?.status === 404) throw primaryErr;
          console.warn("Primary report API failed, trying filter API:", primaryErr);
          const filterRes = await axios.get(`${REPORT_BASE}/call-records/filter?${params.toString()}`, getAuthConfig());
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
        for (let p = 2; p <= totalPagesFromApi; p += 1) {
          const pagePayload = await requestPayload(p, pageFetchLimit);
          const pageRecords = Array.isArray(pagePayload?.data)
            ? pagePayload.data
            : Array.isArray(pagePayload?.records)
              ? pagePayload.records
              : [];
          if (!pageRecords.length) break;
          nextRecords = [...nextRecords, ...pageRecords];
          if (nextRecords.length >= totalFromApi) break;
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
      setRowErrors({});
    } catch (error) {
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
    setRowErrors((prev) => ({ ...prev, [callId]: "" }));
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
    setRowErrors((prev) => ({ ...prev, [callId]: "" }));
  };

  const handleReset = async () => {
    const defaults = { ...getTodayRange(), callerName: "", category: "", mobileNo: "", page: 1, limit: 10 };
    setState((prev) => ({ ...prev, filters: defaults }));
    await fetchReport(defaults);
  };

  const pageSize = 10;
  const filteredCallerOptions = employeeOptions.filter((option) =>
    option.label.toLowerCase().includes(callerSearchText.trim().toLowerCase())
  );
  const activeRows = activeSectionTab === "employeeSummary" ? state.employeeSummary : state.records;
  const totalRecords = activeRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(Math.max(1, Number(state.filters.page || 1)), totalPages);
  const showingFrom = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = totalRecords === 0 ? 0 : Math.min(currentPage * pageSize, totalRecords);
  const employeeSummaryPageRows = state.employeeSummary.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const detailedCallsPageRows = state.records.slice((currentPage - 1) * pageSize, currentPage * pageSize);
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
      setRowErrors((prev) => ({ ...prev, [record.callId]: message }));
      toast.error(message);
      return;
    }

    const body = {
      category: merged.category || "",
      followUp: followUpEnabled,
      followUpDetails: details,
    };

    setSavingRows((prev) => ({ ...prev, [record.callId]: true }));
    try {
      const res = await axios.put(`${REPORT_BASE}/call-records/${record.callId}/category`, body, getAuthConfig());
      if (!res?.data?.success) {
        throw new Error(res?.data?.message || "Failed to update category/follow-up");
      }
      toast.success("Call record updated");
      await fetchReport();
    } catch (error) {
      console.error("Update row failed:", error);
      setRowErrors((prev) => ({
        ...prev,
        [record.callId]: error?.response?.data?.message || "Failed to save this row",
      }));
      toast.error("Failed to save this row");
    } finally {
      setSavingRows((prev) => ({ ...prev, [record.callId]: false }));
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
        mobileNoFilter: state.filters.mobileNo || "",
        resolvedEmployee: state.reportFilters?.resolvedEmployee
          ? JSON.stringify(state.reportFilters.resolvedEmployee)
          : "",
        callId: merged.callId || "",
        callerName: merged.callerName || "",
        calleeName: merged.calleeName || "",
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




      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3 flex-nowrap overflow-visible pb-1">
          <input
            type="date"
            value={state.filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            disabled={state.loading}
            className="w-[240px] shrink-0 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          />
          <input
            type="date"
            value={state.filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            disabled={state.loading}
            className="w-[240px] shrink-0 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          />
          <div className={`relative w-[250px] shrink-0 ${callerDropdownOpen ? "z-40" : "z-10"}`} ref={callerDropdownRef}>
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
                    updateFilter("callerName", "");
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
                          updateFilter("callerName", option.value);
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
          <div className={`relative w-[250px] shrink-0 ${categoryDropdownOpen ? "z-40" : "z-10"}`} ref={categoryDropdownRef}>
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
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Employee mobile (optional)"
            title="Resolves employee from Employee collection; filters 8x8 calls by alias/name"
            value={state.filters.mobileNo}
            disabled={state.loading}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                filters: { ...prev.filters, mobileNo: e.target.value },
              }))
            }
            onBlur={(e) => {
              const mobile = e.target.value.trim();
              setState((prev) => {
                const next = { ...prev.filters, mobileNo: mobile, page: 1 };
                fetchReport(next);
                return { ...prev, filters: next };
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const mobile = e.currentTarget.value.trim();
                setState((prev) => {
                  const next = { ...prev.filters, mobileNo: mobile, page: 1 };
                  fetchReport(next);
                  return { ...prev, filters: next };
                });
              }
            }}
            className="w-[240px] shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-wait"
          />
          <div className="flex gap-2 shrink-0">
            {/* <select
              value={state.filters.limit}
              onChange={(e) => {
                const next = {
                  ...state.filters,
                  page: 1,
                  limit: 10,
                };
                setState((prev) => ({ ...prev, filters: next }));
                fetchReport(next);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={10}>10 / page</option>
            </select> */}
            <button
              type="button"
              onClick={handleReset}
              disabled={state.loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              Reset
            </button>
          </div>
          <button
            type="button"
            onClick={exportRows}
            disabled={state.loading}
            className="ml-auto shrink-0 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            Export
          </button>
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
                <div>Talk Time (min)</div>
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
                    <div className="tabular-nums text-lg font-semibold text-gray-900">{emp.totalTalkTimeMinutes || 0}</div>
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
            <div className="min-w-[1650px]">
              <div className="grid grid-cols-[1.5fr_1.2fr_1.2fr_1fr_1fr_1fr_1.3fr_0.8fr_1fr_1fr] gap-4 items-center rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-base font-semibold text-gray-600">
                <div>Date/Time</div>
                <div>Call ID</div>
                <div>Caller</div>
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
                  return (
                    <div
                      key={`${record.callId}-${index}`}
                      className="mt-3 grid grid-cols-[1.5fr_1.2fr_1.2fr_1fr_1fr_1fr_1.3fr_0.8fr_1fr_1fr] gap-4 items-center rounded-xl border border-gray-200 bg-white px-4 py-4 font-medium text-gray-900"
                    >
                      <div className="text-base">{record.startTime ? new Date(record.startTime).toLocaleString() : "-"}</div>
                      <div className="truncate tabular-nums text-base font-medium text-gray-900">{record.callId || "-"}</div>
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
                      <div className="text-base">{record.direction || "-"}</div>
                      <div className="text-base">{record.answered || "-"}</div>
                      <div className="text-lg font-semibold tabular-nums text-gray-900">{toMinutes(record.talkTimeMS)}</div>
                      <div>
                        <select
                          value={merged.category || ""}
                          onChange={(e) => updateDraft(record.callId, { category: e.target.value })}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          <option value="">Select</option>
                          {state.categoryOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
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
                          className="h-10 w-full rounded-lg border border-blue-500 bg-white px-3 text-blue-600 hover:bg-blue-50"
                          onClick={() => setFollowUpModal({ open: true, callId: record.callId })}
                        >
                          View/Edit
                        </button>
                      </div>
                      <div>
                        <button
                          onClick={() => saveRow(record)}
                          disabled={!!savingRows[record.callId]}
                          className="h-10 w-full rounded-lg border border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingRows[record.callId] ? "Saving..." : "Save"}
                        </button>
                        {rowErrors[record.callId] && <p className="text-xs text-red-600 mt-1">{rowErrors[record.callId]}</p>}
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
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Follow-up Details - {activeRecord.callId}</h3>
              <button onClick={() => setFollowUpModal({ open: false, callId: null })} className="text-gray-500 hover:text-gray-800">
                Close
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.keys(EMPTY_DETAILS).map((key) => {
                const current = mergeDraft(activeRecord)?.followUpDetails?.[key] || "";
                return (
                  <input
                    key={key}
                    value={current}
                    placeholder={key}
                    onChange={(e) => updateDraftDetails(activeRecord.callId, key, e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                );
              })}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setFollowUpModal({ open: false, callId: null })}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallDataReports;
