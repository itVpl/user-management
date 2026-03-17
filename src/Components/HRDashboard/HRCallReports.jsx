import React, { useState, useEffect } from "react";
import axios from "axios";
import API_CONFIG from "../../config/api";
import {
  Calendar,
  Users,
  Phone,
  Mail,
  Clock,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const todayISO = () => new Date().toISOString().slice(0, 10);

const authHeader = () => {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  return { withCredentials: true, headers: { Authorization: `Bearer ${token}` } };
};

export default function HRCallReports() {
  const [reportType, setReportType] = useState("single"); // 'single' | 'range'
  const [date, setDate] = useState(todayISO());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(todayISO());
  const [empId, setEmpId] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [expandedEmployee, setExpandedEmployee] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setReportData(null);
    try {
      const params = new URLSearchParams();
      if (reportType === "single") {
        params.set("date", date);
      } else {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }
      if (empId.trim()) params.set("empId", empId.trim());
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/hr-activity/report?${params.toString()}`,
        authHeader()
      );
      if (res.data.success) setReportData(res.data);
    } catch (err) {
      console.error("HR report fetch error:", err);
      setReportData({ success: false, message: err.response?.data?.message || "Failed to load report" });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      const start = reportType === "single" ? date : startDate;
      const end = reportType === "single" ? date : endDate;
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);
      if (empId.trim()) params.set("hrEmployeeId", empId.trim());
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/hr-activity/stats?${params.toString()}`,
        authHeader()
      );
      if (res.data.success) setStatsData(res.data.data);
    } catch (err) {
      console.error("HR stats fetch error:", err);
      setStatsData(null);
    }
  };

  const fetchDailyBreakdown = async () => {
    try {
      const params = new URLSearchParams();
      const start = reportType === "single" ? date : startDate;
      const end = reportType === "single" ? date : endDate;
      params.set("startDate", start);
      params.set("endDate", end);
      if (empId.trim()) params.set("hrEmployeeId", empId.trim());
      params.set("reportType", "daily");
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/hr-activity/reports?${params.toString()}`,
        authHeader()
      );
      if (res.data.success) setDailyData(res.data.data);
    } catch (err) {
      console.error("HR daily report fetch error:", err);
      setDailyData(null);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, date, startDate, endDate, empId]);

  useEffect(() => {
    fetchStats();
    fetchDailyBreakdown();
  }, [reportType, date, startDate, endDate, empId]);

  const summary = reportData?.summary;
  const filters = reportData?.filters;
  const data = reportData?.data || [];
  const overview = statsData?.overview;
  const hrEmployeeStats = statsData?.hrEmployeeStats || [];
  const dailyBreakdown = dailyData?.dailyBreakdown || {};

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-indigo-800">HR Call Reports</h1>
        <p className="text-gray-600 mt-1">View call activities by date or date range with summary and daily breakdown.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow border border-indigo-100 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Report type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300"
            >
              <option value="single">Single date</option>
              <option value="range">Date range</option>
            </select>
          </div>
          {reportType === "single" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HR employee (optional)</label>
            <input
              type="text"
              placeholder="e.g. VPL004"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg w-36 focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            type="button"
            onClick={() => { fetchReport(); fetchStats(); fetchDailyBreakdown(); }}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
        </div>
      )}

      {!loading && reportData && !reportData.success && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
          {reportData.message || "Failed to load report."}
        </div>
      )}

      {!loading && reportData?.success && (
        <>
          {/* Summary cards (from report API) */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">Total employees</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{summary.totalEmployees ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <Phone className="w-5 h-5" />
                  <span className="text-sm font-medium">Total calls</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{summary.totalCalls ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm font-medium">Total emails</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{summary.totalEmails ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">Call duration</span>
                </div>
                <p className="text-lg font-bold text-gray-800">
                  {summary.totalCallDurationFormatted ?? summary.totalCallDuration ?? 0}
                </p>
              </div>
            </div>
          )}

          {/* Stats overview (from stats API) */}
          {overview && (
            <div className="bg-white rounded-2xl border border-indigo-100 p-4 mb-6 shadow-sm">
              <h2 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Overview (stats)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div><span className="text-gray-500">Total calls</span><p className="font-semibold">{overview.totalCalls ?? 0}</p></div>
                <div><span className="text-gray-500">Total duration</span><p className="font-semibold">{overview.avgDurationFormatted ?? overview.totalDuration ?? 0}</p></div>
                <div><span className="text-gray-500">Avg duration</span><p className="font-semibold">{overview.avgDurationFormatted ?? "—"}</p></div>
                <div><span className="text-gray-500">Completed calls</span><p className="font-semibold">{overview.completedCalls ?? "—"}</p></div>
                <div><span className="text-gray-500">Completion rate</span><p className="font-semibold">{overview.completionRate != null ? `${overview.completionRate}%` : "—"}</p></div>
              </div>
            </div>
          )}

          {/* Per-employee data */}
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden mb-6">
            <h2 className="text-lg font-semibold text-indigo-700 p-4 border-b border-gray-100">
              Per-employee breakdown
            </h2>
            {data.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">No data for the selected period.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.map((emp) => {
                  const isExpanded = expandedEmployee === emp.empId;
                  const dayData = emp.dateWiseData || [];
                  return (
                    <div key={emp.empId || emp._id}>
                      <button
                        type="button"
                        onClick={() => setExpandedEmployee(isExpanded ? null : emp.empId)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
                      >
                        <div className="flex items-center gap-2">
                          {dayData.length > 0 ? (
                            isExpanded ? <ChevronDown className="w-5 h-5 text-indigo-600" /> : <ChevronRight className="w-5 h-5 text-indigo-600" />
                          ) : null}
                          <span className="font-medium text-gray-800">{emp.employeeName ?? emp.empId}</span>
                          <span className="text-sm text-gray-500">({emp.department})</span>
                        </div>
                        {emp.summary && (
                          <div className="flex gap-4 text-sm">
                            <span>Calls: {emp.summary.totalCalls ?? 0}</span>
                            <span>Emails: {emp.summary.totalEmails ?? 0}</span>
                            <span>{emp.summary.totalCallDurationFormatted ?? ""}</span>
                          </div>
                        )}
                      </button>
                      {isExpanded && dayData.length > 0 && (
                        <div className="bg-gray-50 px-4 pb-4">
                          {dayData.map((day) => (
                            <div key={day.date} className="rounded-lg border border-gray-200 bg-white p-3 mt-2">
                              <p className="font-medium text-gray-700 mb-2">{day.date}</p>
                              <p className="text-sm text-gray-600">Calls: {day.totalCalls ?? 0}, Emails: {day.totalEmails ?? 0}, Duration: {day.totalCallDurationFormatted ?? day.totalCallDuration ?? 0}</p>
                              {day.calls?.length > 0 && (
                                <table className="w-full mt-2 text-sm">
                                  <thead><tr className="text-left text-gray-500"><th>Name</th><th>Phone</th><th>Purpose</th><th>Duration</th></tr></thead>
                                  <tbody>
                                    {day.calls.slice(0, 10).map((c, i) => (
                                      <tr key={i}><td>{c.name}</td><td>{c.mobileNo}</td><td>{c.purpose}</td><td>{c.durationFormatted ?? c.duration}</td></tr>
                                    ))}
                                    {day.calls.length > 10 && <tr><td colSpan={4} className="text-gray-400">+{day.calls.length - 10} more</td></tr>}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* HR employee stats (from stats API) */}
          {hrEmployeeStats.length > 0 && (
            <div className="bg-white rounded-2xl border border-indigo-100 p-4 mb-6 shadow-sm">
              <h2 className="text-lg font-semibold text-indigo-700 mb-3">HR employee stats</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b">
                      <th className="pb-2">Employee</th>
                      <th className="pb-2">Total calls</th>
                      <th className="pb-2">Total duration</th>
                      <th className="pb-2">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hrEmployeeStats.map((s, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2">{s.employeeName ?? s._id}</td>
                        <td className="py-2">{s.totalCalls ?? 0}</td>
                        <td className="py-2">{s.totalDuration ?? 0}</td>
                        <td className="py-2">{s.completedCalls ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily breakdown (from reports API) */}
          {Object.keys(dailyBreakdown).length > 0 && (
            <div className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Daily breakdown
              </h2>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b sticky top-0 bg-white">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Calls</th>
                      <th className="pb-2 pr-4">Emails</th>
                      <th className="pb-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(dailyBreakdown)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([day, val]) => (
                        <tr key={day} className="border-b border-gray-100">
                          <td className="py-2 pr-4">{day}</td>
                          <td className="py-2 pr-4">{val.calls ?? 0}</td>
                          <td className="py-2 pr-4">{val.emails ?? 0}</td>
                          <td className="py-2">{val.total ?? 0}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
