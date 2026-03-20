import React, { useEffect, useMemo, useState } from "react";
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
      page: 1,
      limit: 20,
    },
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
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.callerName?.trim()) params.set("callerName", filters.callerName.trim());
      if (filters.category?.trim()) params.set("category", filters.category.trim());
      params.set("pageSize", "1500");
      params.set("page", String(filters.page || 1));
      params.set("limit", String(filters.limit || 20));

      // Prefer unified report API; gracefully fallback to legacy filter API.
      let payload = null;
      try {
        const reportRes = await axios.get(`${REPORT_BASE}/call-records/report?${params.toString()}`, getAuthConfig());
        payload = reportRes?.data || {};
      } catch (primaryErr) {
        console.warn("Primary report API failed, trying filter API:", primaryErr);
        const filterRes = await axios.get(`${REPORT_BASE}/call-records/filter?${params.toString()}`, getAuthConfig());
        payload = filterRes?.data || {};
      }

      if (!payload?.success) {
        throw new Error(payload?.message || "Failed to load call report");
      }

      const nextRecords = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.records) ? payload.records : [];
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
          page: Number(payload?.pagination?.page || filters.page || 1),
          limit: Number(payload?.pagination?.limit || filters.limit || 20),
          totalPages: Number(payload?.pagination?.totalPages || 1),
          totalRecords: Number(payload?.pagination?.total || nextRecords.length || 0),
        },
        summary: payload.summary || computedSummary,
        employeeSummary: Array.isArray(payload.employeeSummary) && payload.employeeSummary.length
          ? payload.employeeSummary
          : computedEmployeeSummary,
        records: nextRecords,
        error: null,
      }));
      setDrafts({});
      setRowErrors({});
    } catch (error) {
      console.error("Call report fetch failed:", error);
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

  const updateFilter = (key, value) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
    }));
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
    const defaults = { ...getTodayRange(), callerName: "", category: "", page: 1, limit: 20 };
    setState((prev) => ({ ...prev, filters: defaults }));
    await fetchReport(defaults);
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
        callId: merged.callId || "",
        callerName: merged.callerName || "",
        calleeName: merged.calleeName || "",
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

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-indigo-800">Call Data Reports</h1>
        <p className="text-gray-600 mt-1">Employee-wise call details with category and follow-up in one view.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <input
            type="date"
            value={state.filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="date"
            value={state.filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={state.filters.callerName}
            onChange={(e) => updateFilter("callerName", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All caller aliases</option>
            {employeeOptions.map((option) => (
              <option key={`caller-${option.empId}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={state.filters.category}
            onChange={(e) => updateFilter("category", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All categories</option>
            {state.categoryOptions.map((option) => (
              <option key={`filter-category-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const next = { ...state.filters, page: 1 };
              setState((prev) => ({ ...prev, filters: next }));
              fetchReport(next);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Search
          </button>
          <div className="flex gap-2">
            <select
              value={state.filters.limit}
              onChange={(e) => {
                const next = {
                  ...state.filters,
                  page: 1,
                  limit: Number(e.target.value),
                };
                setState((prev) => ({ ...prev, filters: next }));
                fetchReport(next);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={200}>200 / page</option>
            </select>
            <button onClick={handleReset} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Reset
            </button>
            <button onClick={exportRows} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              Export
            </button>
          </div>
        </div>
      </div>

      {state.summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border">Total Employees: <strong>{state.summary.totalEmployees || 0}</strong></div>
          <div className="bg-white p-4 rounded-xl border">Total Calls: <strong>{state.summary.totalCalls || 0}</strong></div>
          <div className="bg-white p-4 rounded-xl border">Answered/Missed: <strong>{state.summary.answeredCalls || 0}/{state.summary.missedCalls || 0}</strong></div>
          <div className="bg-white p-4 rounded-xl border">Talk Time (min): <strong>{state.summary.totalTalkTimeMinutes || 0}</strong></div>
          <div className="bg-white p-4 rounded-xl border">Categorized Calls: <strong>{state.summary.categorizedCalls || 0}</strong></div>
          <div className="bg-white p-4 rounded-xl border">Follow-up Calls: <strong>{state.summary.followUpCount || 0}</strong></div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <div className="p-4 border-b font-semibold text-indigo-700">Employee Summary</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Employee</th>
              <th className="text-left p-3">Total Calls</th>
              <th className="text-left p-3">Answered</th>
              <th className="text-left p-3">Missed</th>
              <th className="text-left p-3">Talk Time (min)</th>
              <th className="text-left p-3">Categorized</th>
              <th className="text-left p-3">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {state.employeeSummary.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">No employee summary found</td></tr>
            ) : (
              state.employeeSummary.map((emp, index) => (
                <tr key={`${emp.employeeName}-${index}`} className="border-t">
                  <td className="p-3">{emp.employeeName || "-"}</td>
                  <td className="p-3">{emp.totalCalls || 0}</td>
                  <td className="p-3">{emp.answeredCalls || 0}</td>
                  <td className="p-3">{emp.missedCalls || 0}</td>
                  <td className="p-3">{emp.totalTalkTimeMinutes || 0}</td>
                  <td className="p-3">{emp.categorizedCalls || 0}</td>
                  <td className="p-3">{emp.followUpCount || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <div className="p-4 border-b font-semibold text-indigo-700">Detailed Calls</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Date/Time</th>
              <th className="text-left p-3">Call ID</th>
              <th className="text-left p-3">Caller</th>
              <th className="text-left p-3">Direction</th>
              <th className="text-left p-3">Answered</th>
              <th className="text-left p-3">Talk Time (min)</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Follow Up</th>
              <th className="text-left p-3">Details</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {state.records.length === 0 ? (
              <tr><td colSpan={10} className="p-8 text-center text-gray-500">No call records found for selected filters</td></tr>
            ) : (
              state.records.map((record, index) => {
                const merged = mergeDraft(record);
                return (
                  <tr key={`${record.callId}-${index}`} className="border-t align-top">
                    <td className="p-3">{record.startTime ? new Date(record.startTime).toLocaleString() : "-"}</td>
                    <td className="p-3">{record.callId || "-"}</td>
                    <td className="p-3">{record.callerName || "-"}</td>
                    <td className="p-3">{record.direction || "-"}</td>
                    <td className="p-3">{record.answered || "-"}</td>
                    <td className="p-3">{toMinutes(record.talkTimeMS)}</td>
                    <td className="p-3">
                      <select
                        value={merged.category || ""}
                        onChange={(e) => updateDraft(record.callId, { category: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded-md min-w-[140px]"
                      >
                        <option value="">Select</option>
                        {state.categoryOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={toBool(merged.followUp)}
                        onChange={(e) => updateDraft(record.callId, { followUp: e.target.checked })}
                      />
                    </td>
                    <td className="p-3">
                      <button
                        className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                        onClick={() => setFollowUpModal({ open: true, callId: record.callId })}
                      >
                        View/Edit
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => saveRow(record)}
                        disabled={!!savingRows[record.callId]}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingRows[record.callId] ? "Saving..." : "Save"}
                      </button>
                      {rowErrors[record.callId] && <p className="text-xs text-red-600 mt-1">{rowErrors[record.callId]}</p>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Page {state.filters.page || 1} of {state.filters.totalPages || 1}
          {typeof state.filters.totalRecords === "number" ? ` • Total records: ${state.filters.totalRecords}` : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const nextPage = Math.max(1, Number(state.filters.page || 1) - 1);
              const next = { ...state.filters, page: nextPage };
              setState((prev) => ({ ...prev, filters: next }));
              fetchReport(next);
            }}
            disabled={Number(state.filters.page || 1) <= 1 || state.loading}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => {
              const current = Number(state.filters.page || 1);
              const totalPages = Number(state.filters.totalPages || 1);
              const nextPage = Math.min(totalPages, current + 1);
              const next = { ...state.filters, page: nextPage };
              setState((prev) => ({ ...prev, filters: next }));
              fetchReport(next);
            }}
            disabled={Number(state.filters.page || 1) >= Number(state.filters.totalPages || 1) || state.loading}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {state.loading && <div className="text-center text-gray-600 py-4">Loading...</div>}
      {state.error && <div className="text-red-600 text-sm">{state.error}</div>}

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
