import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Target,
  TrendingUp,
  BarChart3,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import API_CONFIG from '../../config/api.js';

/* ============ AXIOS INSTANCE (JWT attach) ============ */
const api = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}`,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ============ DEBUG HELPERS ============ */
const DEBUG = true;
// const dbg = (...args) => DEBUG && console.log("%c[DailyTarget]", "color:#2563eb;font-weight:bold", ...args);
const dberr = (...args) => DEBUG && console.error("%c[DailyTarget]", "color:#dc2626;font-weight:bold", ...args);

/* ============ STORAGE HELPERS ============ */
const getUserInfoRaw = () => localStorage.getItem("user") || sessionStorage.getItem("user");
const getUserInfo = () => {
  try {
    const userStr = getUserInfoRaw();
    if (!userStr) return {};
    const user = JSON.parse(userStr);
    const out = {
      empId: user.empId || user.employeeId || user.userId || null,
      department: user.department?.name || user.department || null,
      employeeName: user.employeeName || user.name || null,
      designation: user.designation || null,
    };
    return out;
  } catch (e) {
    dberr("Failed to parse user from storage:", e);
    return {};
  }
};

/* ============ UTILS ============ */
const normalizeDept = (d) => {
  const v = (d || "").toString().trim().toLowerCase();
  if (v === "sales") return "Sales";
  if (v === "cmt") return "CMT";
  return null; // HR/Admin => consolidated
};

const toDateInputValue = (d = new Date()) => {
  const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return dt.toISOString().slice(0, 10); // YYYY-MM-DD
};

const formatDDMMYYYY = (dStr) => {
  if (!dStr) return "—";
  const dt = new Date(dStr);
  if (isNaN(dt)) return "—";
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// Treat these as placeholders -> don't prefill / don't show in summary
const isPlaceholderReason = (val) => {
  const s = String(val || "").trim().toLowerCase();
  return (
    s === "" ||
    s === "reason not provided yet" ||
    s === "not provided" ||
    s === "n/a" ||
    s === "na" ||
    s === "-" ||
    s === "none"
  );
};

const prettyName = (key) => {
  const map = { talkTime: "Talk Time (hrs)", deliveryOrders: "Delivery Orders", truckers: "Truckers Added" };
  return map[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
};

const percent = (current, required) => {
  if (!required || required <= 0) return 0;
  return Math.min(100, Math.round((Number(current || 0) / Number(required)) * 100));
};

const StatusBadge = ({ status }) => {
  const completed = String(status).toLowerCase() === "completed";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide
        ring-1 ring-inset
        ${completed ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}
      aria-label={`Status: ${completed ? "Completed" : "Incomplete"}`}
    >
      {completed ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {completed ? "Completed" : "Incomplete"}
    </span>
  );
};

/* ============ SKELETON & CARD ============ */
const SkeletonCard = () => (
  <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-5">
    <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse mb-3" />
    <div className="h-3 w-20 bg-gray-100 animate-pulse rounded mb-2" />
    <div className="h-6 w-24 bg-gray-200 animate-pulse rounded" />
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${className}`}>
    {children}
  </div>
);

/* ============ COMPONENT ============ */
const DailyTarget = () => {
  const { empId, department: deptFromUser } = getUserInfo();

  const [date, setDate] = useState(toDateInputValue());
  const department = useMemo(() => normalizeDept(deptFromUser), [deptFromUser]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serverMsg, setServerMsg] = useState(null);
  const [report, setReport] = useState(null);

  // Reason modal state
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [reasonLoading, setReasonLoading] = useState(false);
  const [reasonError, setReasonError] = useState(null);

  // Clickable date
  const dateInputRef = useRef(null);

  // HR/Admin consolidated
  const [deptAllLoading, setDeptAllLoading] = useState(false);
  const [deptAllError, setDeptAllError] = useState(null);
  const [salesDept, setSalesDept] = useState(null);
  const [cmtDept, setCmtDept] = useState(null);

  // HR/Admin: fetch both departments
  useEffect(() => {
    if (department) return;
    const run = async () => {
      setDeptAllLoading(true);
      setDeptAllError(null);
      try {
        const [salesRes, cmtRes] = await Promise.all([
          api.get("/api/v1/inhouseUser/sales/report", { params: { date } }),
          api.get("/api/v1/inhouseUser/cmt/report",   { params: { date } }),
        ]);
        setSalesDept(salesRes?.data?.data || null);
        setCmtDept(cmtRes?.data?.data || null);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.response?.data?.error || e.message || "Failed to load department reports";
        setDeptAllError(msg);
        setSalesDept(null);
        setCmtDept(null);
      } finally {
        setDeptAllLoading(false);
      }
    };
    run();
  }, [date, department]);

  const endpoint = useMemo(() => {
    if (department === "Sales") return "/api/v1/inhouseUser/sales/report";
    if (department === "CMT") return "/api/v1/inhouseUser/cmt/report";
    return null;
  }, [department]);

  const canRequest = endpoint && empId && date;

  const SummaryCard = ({ title, value, sub }) => (
    <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
      {sub ? <p className="text-xs text-gray-500 mt-0.5">{sub}</p> : null}
    </div>
  );

  const EmployeesTable = ({ rows, type }) => (
    <div className="overflow-auto rounded-xl border border-gray-100">
      <table className="min-w-[880px] w-full text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Emp ID</th>
            <th className="text-left px-4 py-3 font-semibold">Name</th>
            <th className="text-left px-4 py-3 font-semibold">Designation</th>
            <th className="text-left px-4 py-3 font-semibold">Talk Time</th>
            {type === "sales" ? (
              <th className="text-left px-4 py-3 font-semibold">Delivery Orders</th>
            ) : (
              <th className="text-left px-4 py-3 font-semibold">Truckers Added</th>
            )}
            <th className="text-left px-4 py-3 font-semibold">Status</th>
            <th className="text-left px-4 py-3 font-semibold">Reason</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50">
              <td className="px-4 py-3">{r.empId}</td>
              <td className="px-4 py-3">{r.employeeName}</td>
              <td className="px-4 py-3">{r.designation || "-"}</td>
              <td className="px-4 py-3">{r?.talkTime?.formatted || "-"}</td>
              {type === "sales" ? (
                <td className="px-4 py-3">{r?.deliveryOrdersCount ?? 0}</td>
              ) : (
                <td className="px-4 py-3">{r?.truckerCount ?? 0}</td>
              )}
              <td className="px-4 py-3"><StatusBadge status={r?.status || "-"} /></td>
              <td className="px-4 py-3 text-gray-700">{r?.reason || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // fetch self report
  useEffect(() => {
    const fetchReport = async () => {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        setError("Login token missing. Please login again.");
        setServerMsg("No token found in sessionStorage/localStorage.");
        setReport(null);
        dberr("Token not found. Add token to storage as 'token'.");
        return;
      }

      if (!canRequest) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setServerMsg(null);

        const params = { date, empId };
        const res = await api.get(endpoint, { params });
        setReport(res.data?.data || null);
      } catch (e) {
        const data = e?.response?.data;
        const msg = data?.message || data?.error || e?.message || "Request failed";
        setServerMsg(msg);
        setError("Failed to fetch department report.");
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [endpoint, empId, date, canRequest, department]);

  /* ===== Save Reason with 404 fallback & validation ===== */
  const REASON_ENDPOINTS = useMemo(() => ([
    "/api/v1/inhouseUser/target/reason",
    "/api/v1/inhouseUser/sales/target/reason",
    "/api/v1/inhouseUser/cmt/target/reason",
    "/api/v1/inhouseUser/daily-target/reason",
  ]), []);

  const handleSubmitReason = async () => {
    if (!reasonText.trim()) {
      setReasonError("Please enter the reason.");
      return;
    }
    try {
      setReasonLoading(true);
      setReasonError(null);

      const payload = { empId, date, reason: reasonText.trim() };
      let success = false;
      let lastErr = null;

      for (const ep of REASON_ENDPOINTS) {
        try {
          const res = await api.post(ep, payload);
          if (res?.data?.success !== false) {
            success = true;
            break;
          }
        } catch (e) {
          lastErr = e;
          const status = e?.response?.status;
          if (status !== 404) break; // only keep trying on 404
        }
      }

      if (!success) {
        const data = lastErr?.response?.data;
        const msg = data?.message || data?.error || lastErr?.message || "Failed to submit reason";
        throw new Error(msg);
      }

      // optimistic UI
      setReport((prev) =>
        prev ? { ...prev, reason: reasonText.trim(), statusMessage: prev.statusMessage || "" } : prev
      );

      setIsReasonOpen(false);
      setReasonText("");
    } catch (e) {
      setReasonError(e.message || "Failed to submit reason");
    } finally {
      setReasonLoading(false);
    }
  };

  // ===== Early returns =====
  if (!empId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-6">
        <Card className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Missing Employee ID</h3>
          <p className="text-gray-600">
            Storage me <b>empId</b> hona chahiye.
          </p>
          <pre className="mt-4 text-left text-xs bg-gray-50 p-3 rounded-xl border border-gray-100 overflow-auto">{getUserInfoRaw()}</pre>
        </Card>
      </div>
    );
  }

  // HR/Admin view
  if (!department) {
    const salesSummary = salesDept?.summary;
    const cmtSummary = cmtDept?.summary;

    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Department Reports</h1>
              <p className="text-gray-600">Sales &amp; CMT — {formatDDMMYYYY(date)}</p>
            </div>
          </div>

          {/* Full clickable date field */}
          <div
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer flex items-center"
            onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.focus()}
            role="button"
            aria-label="Change date"
          >
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              max={toDateInputValue(new Date())}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
              aria-label="Date"
            />
          </div>
        </div>

        {/* Loading / Error */}
        {deptAllLoading && (
          <div className="min-h-[120px] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
        {!deptAllLoading && deptAllError && (
          <Card className="p-8 text-center max-w-xl mx-auto border-red-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-red-100">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Couldn’t load reports</h3>
            <p className="text-red-600">{deptAllError}</p>
          </Card>
        )}

        {/* SALES & CMT */}
        {!deptAllLoading && !deptAllError && (
          <div className="space-y-8">
            {/* Sales */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Sales — All Users</h3>
                <span className="text-sm text-gray-600">
                  Total: <b>{salesDept?.employees?.length || 0}</b>
                </span>
              </div>

              {salesSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  <SummaryCard title="Dept Status" value={salesSummary.departmentStatus} />
                  <SummaryCard title="Employees" value={`${salesSummary.totalEmployees}`} sub={`Completed ${salesSummary.completedEmployees} / Incomplete ${salesSummary.incompleteEmployees}`} />
                  <SummaryCard title="Total Talk Time" value={salesSummary.totalTalkTime?.formatted} sub={`Avg ${salesSummary.avgTalkTime?.formatted}`} />
                  <SummaryCard title="Delivery Orders" value={`${salesSummary.totalDeliveryOrders}`} sub={`Req ${salesSummary.targets?.deliveryOrders?.required}/user`} />
                </div>
              ) : null}

              {salesDept?.employees?.length ? (
                <EmployeesTable rows={salesDept.employees} type="sales" />
              ) : (
                <div className="text-sm text-gray-600">No Sales data for this date.</div>
              )}
            </Card>

            {/* CMT */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">CMT — All Users</h3>
                <span className="text-sm text-gray-600">
                  Total: <b>{cmtDept?.employees?.length || 0}</b>
                </span>
              </div>

              {cmtSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  <SummaryCard title="Dept Status" value={cmtSummary.departmentStatus} />
                  <SummaryCard title="Employees" value={`${cmtSummary.totalEmployees}`} sub={`Completed ${cmtSummary.completedEmployees} / Incomplete ${cmtSummary.incompleteEmployees}`} />
                  <SummaryCard title="Total Talk Time" value={cmtSummary.totalTalkTime?.formatted} sub={`Avg ${cmtSummary.avgTalkTime?.formatted}`} />
                  <SummaryCard title="Truckers Added" value={`${cmtSummary.totalTruckerCount}`} sub={`Req ${cmtSummary.targets?.truckers?.required}/user`} />
                </div>
              ) : null}

              {cmtDept?.employees?.length ? (
                <EmployeesTable rows={cmtDept.employees} type="cmt" />
              ) : (
                <div className="text-sm text-gray-600">No CMT data for this date.</div>
              )}
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Daily Targets</h1>
            <p className="text-gray-600">{department} department report</p>
          </div>
        </div>

        {/* Full clickable date field */}
        <div
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer flex items-center"
          onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.focus()}
          role="button"
          aria-label="Change date"
        >
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            max={toDateInputValue(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent outline-none cursor-pointer"
            aria-label="Date"
          />
        </div>
      </div>

      {/* ===== TOP ROW ===== */}
      {!error && (
        <>
          {loading ? (
            <div className="mb-8 grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-6 overflow-x-auto pb-1">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : report ? (
            <div className="mb-8 grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-6 overflow-x-auto pb-1">
              {/* Talk Time */}
              <Card className="p-5 text-center">
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-3 ring-1 ring-blue-100">
                  <Clock size={20} className="text-blue-600" />
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Talk Time</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {report?.talkTime?.formatted || `${(report?.talkTime?.hours || 0).toFixed(2)}h`}
                </p>
              </Card>

              {/* Dept-specific metric */}
              {String(report.department).toLowerCase() === "sales" ? (
                <Card className="p-5 text-center">
                  <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center mb-3 ring-1 ring-indigo-100">
                    <TrendingUp size={20} className="text-indigo-600" />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Delivery Orders</p>
                  <p className="text-2xl font-bold text-indigo-700 mt-1">{report.deliveryOrdersCount ?? 0}</p>
                </Card>
              ) : (
                <Card className="p-5 text-center">
                  <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center mb-3 ring-1 ring-emerald-100">
                    <Users size={20} className="text-emerald-600" />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Truckers Added</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{report.truckerCount ?? 0}</p>
                </Card>
              )}

              {/* Status */}
              <Card className="p-5 text-center">
                <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center mb-3 ring-1 ring-green-100">
                  <BarChart3 size={20} className="text-green-600" />
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                <p className="text-2xl font-bold mt-1">
                  <span className={String(report.status).toLowerCase() === "completed" ? "text-emerald-700" : "text-amber-700"}>
                    {report.status}
                  </span>
                </p>
              </Card>

              {/* Designation */}
              <Card className="p-5 text-center">
                <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center mb-3 ring-1 ring-gray-100">
                  <Target size={20} className="text-gray-700" />
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Designation</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{report.designation || "-"}</p>
              </Card>
            </div>
          ) : null}
        </>
      )}

      {/* Loading inline */}
      {loading && (
        <div className="min-h-[100px] flex items-center justify-center mb-8">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-gray-600">Fetching {department} report...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card className="p-8 text-center max-w-xl mx-auto border-red-200">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-red-100">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h3>
          <p className="text-red-600 mb-3">{error}</p>
          {serverMsg && (
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-semibold">Server:</span> {serverMsg}
            </p>
          )}
          <button
            onClick={() => setDate((d) => d)}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl shadow hover:bg-blue-700 active:scale-[0.99] transition"
          >
            Retry
          </button>
        </Card>
      )}

      {/* Summary + Targets */}
      {!loading && !error && report && (
        <div className="space-y-8">
          {/* Top Summary */}
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {report.department} Report — {report.employeeName} ({report.empId})
                </h2>
                <p className="text-sm text-gray-600">Date: {formatDDMMYYYY(report.date || date)}</p>
              </div>

              {/* Right side: status + updated + Reason button */}
              <div className="flex items-center gap-3">
                <StatusBadge status={report.status} />
                {report.createdAt && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-4 h-4" />
                    Updated: {new Date(report.createdAt).toLocaleString()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setReasonError(null);
                    const prefill = report?.reason;
                    setReasonText(isPlaceholderReason(prefill) ? "" : String(prefill || ""));
                    setIsReasonOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium bg-blue-600 text-white px-3 py-2 rounded-lg shadow hover:bg-blue-700 active:scale-[0.99] transition"
                  aria-label="Add / update reason"
                >
                  Reason
                </button>
              </div>
            </div>

            {report.statusMessage && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
                {report.statusMessage}
              </div>
            )}
            {report.reason && !isPlaceholderReason(report.reason) && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>Reason:</strong> {report.reason}
              </div>
            )}
          </Card>

          {/* Targets Progress */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Targets</h3>
            <div className="space-y-5">
              {report.targets &&
                Object.entries(report.targets).map(([key, tgt]) => {
                  const p = percent(tgt?.current, tgt?.required);
                  return (
                    <div
                      key={key}
                      className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {key === "talkTime" ? (
                            <Clock className="w-4 h-4 text-blue-600" />
                          ) : key === "deliveryOrders" ? (
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Users className="w-4 h-4 text-emerald-600" />
                          )}
                          <span className="text-sm font-semibold text-gray-900">{prettyName(key)}</span>
                        </div>
                        <span className="text-xs text-gray-600">
                          Required: <b>{tgt?.required}</b>&nbsp;|&nbsp;Current: <b>{tgt?.current}</b>&nbsp;|&nbsp;Remaining:{" "}
                          <b>{tgt?.remaining}</b>
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden ring-1 ring-inset ring-gray-100">
                        <div
                          className={`h-3 transition-all duration-500 ease-out ${p >= 100 ? "bg-emerald-500" : p >= 60 ? "bg-blue-500" : "bg-amber-400"}`}
                          style={{ width: `${p}%` }}
                          aria-valuenow={p}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          role="progressbar"
                        />
                      </div>
                      <div className="mt-2 text-right text-xs font-medium text-gray-600">{p}%</div>
                    </div>
                  );
                })}
              {!report.targets && (
                <div className="text-sm text-gray-600">No targets configured for this department.</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !report && (
        <Card className="p-8 text-center">
          <p className="text-gray-600">
            No data available for <b>{department}</b> on <b>{formatDDMMYYYY(date)}</b>.
          </p>
        </Card>
      )}

      {/* Reason Modal */}
      {isReasonOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => !reasonLoading && setIsReasonOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 z-10">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Add / Update Reason</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  This will be saved for <b>{empId}</b> on <b>{formatDDMMYYYY(date)}</b>.
                </p>
              </div>
              <button
                onClick={() => !reasonLoading && setIsReasonOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="reasonText">
                Reason <span className="text-red-600">*</span>
              </label>
              <textarea
                id="reasonText"
                rows={4}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                className={`w-full rounded-xl border ${reasonError ? "border-red-300" : "border-gray-200"} bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 ${reasonError ? "focus:ring-red-500/30 focus:border-red-400" : "focus:ring-blue-500/30 focus:border-blue-400"}`}
                placeholder=""   /* no default sample text */
                aria-invalid={!!reasonError}
                disabled={reasonLoading}
              />
              {reasonError && <p className="text-xs text-red-600">{reasonError}</p>}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReasonOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                disabled={reasonLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReason}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow disabled:opacity-60"
                disabled={reasonLoading}
              >
                {reasonLoading && (
                  <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                )}
                Save Reason
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTarget;
