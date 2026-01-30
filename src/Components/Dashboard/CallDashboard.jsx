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
  Paperclip,
  X,
  AlertTriangle,
  Play,
  Calendar
} from "lucide-react";
import CallIcon from '@mui/icons-material/Call';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';


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
// const dbg = (...args) => DEBUG && 
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
  const [attachmentFile, setAttachmentFile] = useState(null);


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
          api.get("/api/v1/inhouseUser/cmt/report", { params: { date } }),
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
        setReport(null);
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
    "/api/v1/inhouseUser/{empId}/target-reason"
  ]), []);


  const handleSubmitReason = async () => {
    if (!reasonText.trim()) {
      setReasonError("Please enter the reason.");
      return;
    }
    if (!empId) {
      setReasonError("Employee ID is missing.");
      return;
    }
    try {
      setReasonLoading(true);
      setReasonError(null);

      let success = false;
      let lastErr = null;

      for (const ep of REASON_ENDPOINTS) {
        try {
          // Replace {empId} placeholder with actual empId value
          const endpoint = ep.replace('{empId}', empId);

          // Always use FormData format as per API spec
          const formData = new FormData();
          formData.append('empId', empId);
          formData.append('date', date);
          formData.append('reason', reasonText.trim());

          // Add attachment if file is selected (field name should be 'attachments' as per API)
          if (attachmentFile) {
            formData.append('attachments', attachmentFile);
          }

          const res = await api.patch(endpoint, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          if (res?.data?.success !== false) {
            success = true;
            // Update report with response data if available
            if (res?.data?.data) {
              setReport((prev) =>
                prev ? {
                  ...prev,
                  reason: res.data.data.reason || reasonText.trim(),
                  statusMessage: res.data.data.statusMessage || prev.statusMessage || "",
                  attachments: res.data.data.attachments || []
                } : prev
              );
            }
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

      // Success notification
      alertify.success("Reason updated successfully" + (attachmentFile ? " with attachment" : ""));

      setIsReasonOpen(false);
      setReasonText("");
      setAttachmentFile(null);

      // Reset file input
      const input = document.getElementById('attachmentInput');
      if (input) input.value = '';

      // Refresh report data to show updated reason and attachments
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (token && canRequest && endpoint) {
        try {
          const params = { date, empId };
          const res = await api.get(endpoint, { params });
          if (res?.data?.data) {
            setReport(res.data.data);
          }
        } catch (e) {
          console.error("Failed to refresh report:", e);
          // Don't show error to user, just log it
        }
      }
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


  const CircularProgress = ({ percentage }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-36 h-36 flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#f3f4f6"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#10b981"
            strokeWidth="3"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Progress</span>
          <span className="text-4xl font-bold text-gray-600">{Math.round(percentage)}%</span>
        </div>
      </div>
    );
  };


  const ProgressBar = ({ current, required, colorClass = "bg-orange-500", label, unit = "" }) => {
    const p = percent(current, required);
    return (
      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className="text-xs text-gray-400">
            Required: {required} | Current: {current} | Remaining: {Math.max(0, required - current)}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
          <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width: `${p}%` }}></div>
        </div>
        <div className="text-right text-xs font-bold text-red-500">{p}%</div>
      </div>
    )
  }


  // Show full-page loader on initial load
  if (loading && !report) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-6">
        <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Fetching {department || "Daily"} Report...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch your data</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-white p-6 font-sans">
      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm mb-6 relative">

        <div className="flex flex-col xl:flex-row justify-between xl:items-stretch gap-12">

          {/* Left Side: Header + Cards */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">Daily Target - {department}</h1>
                <p className="text-gray-900 text-base font-medium">
                  {new Date(date).getDate()} {new Date(date).toLocaleString('default', { month: 'long' })} {new Date(date).getFullYear()} - {new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1 font-medium">Last updated</p>
                <p className="text-xl font-semibold text-gray-800">
                  {report?.updatedAt
                    ? new Date(report.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : "Today"} | {report?.updatedAt
                      ? new Date(report.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                      : "00:00"}
                </p>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Talk Time Card */}
              <div className="border border-red-200 bg-white rounded-xl p-5 relative shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-sm font-medium text-gray-800">Talk Time</span>
                  <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-600"></div> Critical
                  </span>
                </div>
                <div className="text-4xl font-normal text-gray-800">
                  <span className="font-normal">{report?.talkTime?.formatted?.split(':')[0] || "0"}/{report?.targets?.talkTime?.required || "3"}</span> <span className="text-2xl text-gray-500 font-normal">hrs</span>
                </div>
              </div>

              {/* Delivery Orders / Truckers Card */}
              {department === 'Sales' ? (
                <div className="border border-green-200 bg-white rounded-xl p-5 relative shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-sm font-medium text-gray-800">Delivery Orders</span>
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div> Completed
                    </span>
                  </div>
                  <div className="text-4xl font-normal text-gray-800">
                    {report?.deliveryOrdersCount || 0}/{report?.targets?.deliveryOrders?.required || 3}
                  </div>
                </div>
              ) : (
                <div className="border border-green-200 bg-white rounded-xl p-5 relative shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-sm font-bold text-gray-800">Truckers Added</span>
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div> Status
                    </span>
                  </div>
                  <div className="text-4xl font-normal text-gray-800">
                    {report?.truckerCount || 0}/{report?.targets?.truckers?.required || "0"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: User & Circular Progress */}
          <div className="flex items-end gap-10 xl:pl-12 xl:border-l xl:border-gray-100 min-w-[450px] relative">
            {/* Date Picker - Absolute Positioned */}
            <div className="absolute top-0 right-0 z-10 w-[140px]">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer hover:border-blue-400 transition-colors shadow-sm group w-full">
                <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 flex-1 truncate">
                  {date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : "Select Date"}
                </span>
                <Calendar className="w-4 h-4 text-gray-500 group-hover:text-blue-500 flex-shrink-0" />
              </div>
              <input
                type="date"
                value={date ? new Date(date).toLocaleDateString('en-CA') : ''}
                onChange={(e) => setDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex-1 space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold text-gray-800">{report?.employeeName || empId || "User"}</h3>
                  <span className="px-3 py-1 bg-[#FDF2E3] text-[#D97706] text-xs font-bold rounded-lg whitespace-nowrap">Need Attention</span>
                </div>
                <p className="text-xs text-gray-400 font-medium">{report?.designation || department || "Sales Trainee"}</p>
              </div>

              {/* Linear Bars - Flat style */}
              <div className="space-y-5">
                {/* Talk Time Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-semibold text-gray-600">Talk Time</span>
                    <span className="text-[#3B82F6] font-bold">{percent(report?.talkTime?.hours || 0, report?.targets?.talkTime?.required || 3)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5">
                    <div
                      className="bg-[#FF5722] h-2.5"
                      style={{ width: `${Math.min(100, percent(report?.talkTime?.hours || 0, report?.targets?.talkTime?.required || 3))}%` }}
                    ></div>
                  </div>
                </div>

                {/* Department Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-semibold text-gray-600">{department === 'Sales' ? 'Orders' : 'Truckers'}</span>
                    <span className="text-[#3B82F6] font-bold">
                      {department === 'Sales'
                        ? percent(report?.deliveryOrdersCount || 0, report?.targets?.deliveryOrders?.required || 3)
                        : percent(report?.truckerCount || 0, report?.targets?.truckers?.required || 3)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5">
                    <div
                      className="bg-[#10B981] h-2.5"
                      style={{
                        width: `${Math.min(100, department === 'Sales'
                          ? percent(report?.deliveryOrdersCount || 0, report?.targets?.deliveryOrders?.required || 3)
                          : percent(report?.truckerCount || 0, report?.targets?.truckers?.required || 3))}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Circular Progress Element */}
            <div className="flex flex-col items-center">


              <CircularProgress percentage={
                Math.round(
                  ((percent(report?.talkTime?.hours || 0, report?.targets?.talkTime?.required || 3)) +
                    (department === 'Sales'
                      ? percent(report?.deliveryOrdersCount || 0, report?.targets?.deliveryOrders?.required || 3)
                      : percent(report?.truckerCount || 0, report?.targets?.truckers?.required || 3))) / 2
                ) || 0
              } />
            </div>

          </div>

        </div>
      </div>


      {/* Action Required Section - Exact Match to Screenshot */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <AlertTriangle className="w-6 h-6 text-red-500 bg-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Action Required</h2>
              <p className="text-gray-600 font-medium">(You need {
                Math.max(0, (report?.targets?.talkTime?.required || 3) - (report?.talkTime?.hours || 0)).toFixed(1)
              } more hours of talk time today)</p>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto self-end md:self-center">
            <button className="flex-1 md:flex-none btn bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-3 transition-all min-w-[170px]">
              <span className="text-xl"> <CallIcon /></span>
              <span className="font-semibold">Start Calling</span>
            </button>
            <button
              onClick={() => setIsReasonOpen(true)}
              className="flex-1 md:flex-none btn bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all min-w-[170px]">
              <span className="text-xl">📝</span>
              <span className="font-semibold">Submit Reason</span>
            </button>
          </div>
        </div>

        <div className="space-y-6 px-1">
          {/* Talk Time */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-lg font-semibold text-gray-700">Talk Time</span>
              <span className="text-xs text-gray-400 font-medium tracking-wide">
                Required: {report?.targets?.talkTime?.required || "100"} | Current: {report?.talkTime?.formatted?.split(':')[0] || "1"} | Remaining: {Math.max(0, (report?.targets?.talkTime?.required || 3) - (report?.talkTime?.hours || 0)).toFixed(0)}
              </span>
            </div>
            {/* Plane (Rectangular) Progress Bar */}
            <div className="w-full bg-gray-100 h-4">
              <div
                className="bg-orange-500 h-full"
                style={{ width: `${percent(report?.talkTime?.hours || 0, report?.targets?.talkTime?.required || 3)}%` }}
              ></div>
            </div>
            <div className="text-right mt-1">
              <span className="text-xs font-bold text-red-500">{percent(report?.talkTime?.hours || 0, report?.targets?.talkTime?.required || 3)}%</span>
            </div>
          </div>

          {/* Delivery Orders / Truckers */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-lg font-semibold text-gray-700">
                {department === 'Sales' ? "Delivery Orders" : "Truckers Added"}
              </span>
              <span className="text-xs text-gray-400 font-medium tracking-wide">
                Required: {department === 'Sales' ? (report?.targets?.deliveryOrders?.required || "100") : (report?.targets?.truckers?.required || "5")} | Current: {department === 'Sales' ? (report?.deliveryOrdersCount || 0) : (report?.truckerCount || 0)} | Remaining: {0}
              </span>
            </div>
            {/* Plane (Rectangular) Progress Bar */}
            <div className="w-full bg-gray-100 h-4">
              <div
                className="bg-emerald-500 h-full"
                style={{
                  width: `${department === 'Sales'
                    ? percent(report?.deliveryOrdersCount || 0, report?.targets?.deliveryOrders?.required || 3)
                    : percent(report?.truckerCount || 0, report?.targets?.truckers?.required || 3)}%`
                }}
              ></div>
            </div>
            <div className="text-right mt-1">
              <span className="text-xs font-bold text-emerald-500">{department === 'Sales'
                ? percent(report?.deliveryOrdersCount || 0, report?.targets?.deliveryOrders?.required || 3)
                : percent(report?.truckerCount || 0, report?.targets?.truckers?.required || 3)}%
              </span>
            </div>
          </div>
        </div>
      </div>


      {/* Report Section - Exact Match to Screenshot */}
      <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {department} Report — {report?.employeeName || 'Shyam Singh'} ({report?.empId || '1234'})
          </h2>
          <div className="flex items-center gap-2">
            {String(report?.status).toLowerCase() !== 'completed' && (
              <AlertCircle className="w-4 h-4 text-orange-600" />
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${String(report?.status).toLowerCase() === 'completed'
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'
              }`}>
              {String(report?.status).toLowerCase() === 'completed' ? 'Completed' : 'Incomplete'}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-gray-700 text-sm">
            {department === 'Sales'
              ? `Delivery Orders Completed ( ${report?.deliveryOrdersCount || 0}/1 ), But talking incomplete ( ${report?.talkTime?.formatted || "0.0"} / 3h )`
              : `Truckers Added ( ${report?.truckerCount || 0}/1 ), But talking incomplete ( ${report?.talkTime?.formatted || "0.0"} / 3h )`
            }
          </p>
        </div>
      </div>


      {/* Reason Modal - Preserved Original Logic */}
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


            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="reasonText">
                  Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="reasonText"
                  rows={4}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  className={`w-full rounded-xl border ${reasonError ? "border-red-300" : "border-gray-200"} bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 ${reasonError ? "focus:ring-red-500/30 focus:border-red-400" : "focus:ring-blue-500/30 focus:border-blue-400"}`}
                  placeholder=""
                  aria-invalid={!!reasonError}
                  disabled={reasonLoading}
                />
                {reasonError && <p className="text-xs text-red-600">{reasonError}</p>}
              </div>


              {/* Attachment Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Attachment <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                {!attachmentFile ? (
                  <label
                    htmlFor="attachmentInput"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-blue-400 cursor-pointer transition-colors"
                  >
                    <Paperclip className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">Click to attach file</span>
                    <input
                      id="attachmentInput"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            setReasonError("File size should be less than 10MB");
                            return;
                          }
                          setAttachmentFile(file);
                          setReasonError(null);
                        }
                      }}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                      disabled={reasonLoading}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl bg-blue-50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate" title={attachmentFile.name}>
                        {attachmentFile.name}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        ({(attachmentFile.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentFile(null);
                        const input = document.getElementById('attachmentInput');
                        if (input) input.value = '';
                      }}
                      className="ml-2 p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      disabled={reasonLoading}
                      aria-label="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG, XLSX (Max 10MB)
                </p>
              </div>
            </div>


            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsReasonOpen(false);
                  setReasonText("");
                  setAttachmentFile(null);
                  const input = document.getElementById('attachmentInput');
                  if (input) input.value = '';
                }}
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
