import React, { useEffect, useState } from "react";
import axios from "axios";

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading call records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[85vh] flex flex-row gap-6 bg-[#F8F8FA] min-h-screen p-0 md:p-8">
      {/* Table */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#F0F0F0] px-0 md:px-6 py-4 md:py-6 overflow-x-auto max-h-[85vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#2196F3] text-[15px] font-medium border-b border-[#E5E5E5]">
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Called No</th>
              <th className="py-3 px-4 text-left">Call Time</th>
              <th className="py-3 px-4 text-left">Call Duration</th>
              <th className="py-3 px-4 text-left">Call Status</th>
              <th className="py-3 px-4 text-left">Conversion Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-400">
                  No call records found
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, i) => (
                <tr key={i} className="border-b border-[#F0F0F0] hover:bg-[#F8F8FA]">
                  <td className="py-3 px-4 text-[#222]">{r.date}</td>
                  <td className="py-3 px-4 text-[#222]">{r.callee}</td>
                  <td className="py-3 px-4 text-[#222]">{r.callTime}</td>
                  <td className="py-3 px-4 text-[#222]">{r.callDuration}</td>
                  <td className="py-3 px-4 text-[#2196F3] font-medium">{r.callStatus}</td>
                  <td className="py-3 px-4 text-[#2196F3] font-medium">{r.conversionStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {mode === "monthly" && (
          <div className="flex justify-center items-center py-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1 bg-gray-200 rounded mx-1"
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className="px-3 text-gray-700">Page {currentPage}</span>
            <button
              onClick={() =>
                setCurrentPage((p) =>
                  p * pageSize < records.length ? p + 1 : p
                )
              }
              className="px-3 py-1 bg-gray-200 rounded mx-1"
              disabled={currentPage * pageSize >= records.length}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Panel */}
      <div className="w-[335px] min-w-[260px] max-w-[360px] bg-white rounded-2xl shadow-sm border border-[#F0F0F0] flex flex-col items-center py-6 px-4 mt-4 md:mt-0 max-h-[85vh] overflow-y-auto">
        <div className="text-[2.3rem] font-bold text-[#111] mb-2">Target</div>
        <div className="relative w-40 h-40 mb-4 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#E5E5E5" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#22C55E"
              strokeWidth="10"
              strokeDasharray={`${(percentage > 100 ? 100 : percentage) * 3.27} 999`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 1s" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[2.2rem] font-bold text-[#222]">{percentage}%</span>
          </div>
        </div>
        <div className="text-[2rem] font-semibold text-[#111] mb-2">{stats.total} / {callTarget}</div>

        <div className="w-full flex flex-col gap-2 mt-6">
          <div className="flex justify-between text-[#222] text-[1rem]">
            <span>Total Calls</span>
            <span>{stats.total}</span>
          </div>
          <div className="flex justify-between text-[#222] text-[1rem]">
            <span>Answered Calls</span>
            <span>{stats.answered}</span>
          </div>
          <div className="flex justify-between text-[#222] text-[1rem]">
            <span>No answered Calls</span>
            <span>{stats.missed}</span>
          </div>
        </div>

        {showEmployeeTargets && (
          <div className="w-full mt-8 border-t pt-6">
            <div className="text-lg font-semibold mb-2 text-[#2196F3]">Employee Daily Targets</div>
            <div className="flex justify-between text-[#222] text-[1rem] mb-1">
              <span>Calls</span>
              <span>{stats.total} / 100</span>
            </div>
            <div className="flex justify-between text-[#222] text-[1rem] mb-1">
              <span>Rate Requests</span>
              <span>{rateRequests} / 2</span>
            </div>
            <div className="flex justify-between text-[#222] text-[1rem]">
              <span>Talktime</span>
              <span>{formatSeconds(totalTalkTime)} / 03:00:00</span>
            </div>
            {(stats.total < 100 || rateRequests < 2 || totalTalkTime < 10800) && (
              <div className="mt-6 p-4 bg-yellow-100 text-yellow-800 rounded-lg text-center font-semibold border border-yellow-300">
                DO (Delivery Order)
              </div>
            )}
          </div>
        )}

        {/* Dropdown */}
        <div className="w-full flex justify-start items-end pl-2 pb-2 mt-auto">
          <div className="relative">
            <select
              className="appearance-none w-40 px-4 py-2 pr-8 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white shadow-md hover:border-blue-400 transition cursor-pointer"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyTarget;
