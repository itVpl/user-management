import React, { useEffect, useState } from "react";
import axios from "axios";
import { Phone, Clock, Target, TrendingUp, BarChart3, Users, Activity, CheckCircle, XCircle, AlertCircle } from "lucide-react";

// Get alias and role from storage
const getUserInfo = () => {
  try {
    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!userStr) return {};
    const user = JSON.parse(userStr);
    return {
      role: user.role || null,
      alias: user.aliasName || null,
    };
  } catch {
    return {};
  }
};

const formatDateTime = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

const formatSeconds = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const DailyTarget = () => {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, answered: 0, missed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rateRequests, setRateRequests] = useState(0);
  const [totalTalkTime, setTotalTalkTime] = useState(0);

  const [mode, setMode] = useState("daily"); // daily, weekly, monthly
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { role, alias } = getUserInfo();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (!alias) {
          setError("User alias not found.");
          setLoading(false);
          return;
        }

        const today = new Date();
        let from, to;

        if (mode === "daily") {
          from = formatDateTime(new Date(today.setHours(0, 0, 0, 0)));
          to = formatDateTime(new Date());
        } else if (mode === "weekly") {
          const lastWeek = new Date(today);
          lastWeek.setDate(today.getDate() - 6);
          from = formatDateTime(lastWeek);
          to = formatDateTime(new Date());
        } else if (mode === "monthly") {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          from = formatDateTime(startOfMonth);
          to = formatDateTime(new Date());
        }

        const response = await axios.get(
          "https://vpl-liveproject-1.onrender.com/api/v1/analytics/8x8/call-records/filter",
          { params: { callerName: alias, calleeName: alias, from, to } }
        );

        const rawData = response.data?.data || [];
        let talkTimeSum = 0;
        let rateReqCount = 0;

        const transformed = rawData.map((record) => {
          const dateObj = new Date(record.startTime);
          const date = dateObj.toLocaleDateString("en-GB");
          const time = dateObj.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });

          const duration = record.talkTime || "00:00:00";
          const callStatus = record.lastLegDisposition || "Unknown";
          const conversionStatus = (record.talkTimeMS || 0) < 20000 ? "Open" : "Converted";

          if (record.talkTime) {
            const [h, m, s] = record.talkTime.split(":").map(Number);
            talkTimeSum += h * 3600 + m * 60 + s;
          }

          if (record.rateRequest) rateReqCount++;

          return {
            date,
            callee: record.callee,
            callTime: time,
            callDuration: duration,
            callStatus,
            conversionStatus,
          };
        });

        const total = transformed.length;
        const answered = transformed.filter((r) => r.callStatus === "Connected").length;
        const missed = total - answered;

        setRecords(transformed);
        setStats({ total, answered, missed });
        setTotalTalkTime(talkTimeSum);
        setRateRequests(rateReqCount);
        setLoading(false);
      } catch (err) {
        console.error("API error:", err);
        setError("Failed to fetch call records");
        setLoading(false);
      }
    };

    fetchData();
  }, [alias, mode]);

  let callTarget = 100;
  let rateRequestTarget = 2;
  let talkTimeTarget = 3 * 3600;
  let showEmployeeTargets = role === "employee";
  const percentage = Math.round((stats.total / callTarget) * 100);

  const paginatedRecords =
    mode === "monthly"
      ? records.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : records;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading call records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        {/* <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Call Dashboard</h1>
            <p className="text-gray-600">Track your call performance</p>
          </div>
        </div> */}
        
        {/* Mode Selector */}
        <div className="flex justify-end mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            {["daily", "weekly", "monthly"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Table */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-800">Call Records</h2>
                </div>
                <span className="text-sm text-gray-600">{paginatedRecords.length} records</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["Date", "Called No", "Call Time", "Call Duration", "Call Status", "Conversion Status"].map((header) => (
                      <th key={header} className="px-6 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Phone className="w-12 h-12 text-gray-300 mb-3" />
                          <p className="text-gray-500 font-medium">No call records found</p>
                          <p className="text-gray-400 text-sm">Try changing the time period</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-800 font-medium">{r.date}</td>
                        <td className="px-6 py-4 text-gray-700">{r.callee}</td>
                        <td className="px-6 py-4 text-gray-700">{r.callTime}</td>
                        <td className="px-6 py-4 text-gray-700">{r.callDuration}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            r.callStatus === "Connected" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {r.callStatus === "Connected" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {r.callStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            r.conversionStatus === "Converted" 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {r.conversionStatus === "Converted" ? <TrendingUp className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                            {r.conversionStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {mode === "monthly" && (
              <div className="bg-gray-50 px-6 py-4 flex justify-center items-center gap-3">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-700 font-medium">
                  Page {currentPage}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      p * pageSize < records.length ? p + 1 : p
                    )
                  }
                  disabled={currentPage * pageSize >= records.length}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Panel */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* Target Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Daily Target</h3>
                <p className="text-gray-600 text-sm">Call completion progress</p>
              </div>
              
              <div className="relative w-28 h-28 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle 
                    cx="60" cy="60" r="50" 
                    fill="none" 
                    stroke="#E5E7EB" 
                    strokeWidth="8" 
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="8"
                    strokeDasharray={`${(percentage > 100 ? 100 : percentage) * 3.14} 999`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.5s ease-in-out" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-800">{percentage}%</span>
                  <span className="text-xs text-gray-600">{stats.total}/{callTarget}</span>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Call Statistics
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-700">Total Calls</span>
                  </div>
                  <span className="font-semibold text-blue-600">{stats.total}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-gray-700">Answered</span>
                  </div>
                  <span className="font-semibold text-green-600">{stats.answered}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-gray-700">Missed</span>
                  </div>
                  <span className="font-semibold text-red-600">{stats.missed}</span>
                </div>
              </div>
            </div>

            {/* Employee Targets */}
            {showEmployeeTargets && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Daily Targets
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Calls</span>
                      <span className="font-medium">{stats.total}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{width: `${Math.min((stats.total / 100) * 100, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rate Requests</span>
                      <span className="font-medium">{rateRequests}/2</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{width: `${Math.min((rateRequests / 2) * 100, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Talk Time</span>
                      <span className="font-medium">{formatSeconds(totalTalkTime)}/03:00:00</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                        style={{width: `${Math.min((totalTalkTime / 10800) * 100, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {(stats.total < 100 || rateRequests < 2 || totalTalkTime < 10800) && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Delivery Order (DO)</span>
                    </div>
                    <p className="text-yellow-700 text-sm">Some targets are not yet completed</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyTarget;
