import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Phone, CheckCircle, XCircle, BarChart3, Clock, FileText, Users, MessageSquare, Download, ChevronLeft, ChevronRight } from "lucide-react";
import API_CONFIG from "../config/api";
import { format } from "date-fns";

const formatDateTime = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

const formatDuration = (ms) => {
  const safe = Number(ms || 0);
  let seconds = Math.floor(safe / 1000);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  seconds %= 3600;
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

// ---- Status helpers ----
const normalizeCallStatus = (rec, alias) => {
  const talkMs = Number(rec.talkTimeMS || 0);
  const last = (rec.lastLegDisposition || "").toLowerCase();
  const direction = (rec.direction || "").toLowerCase();

  // 1) Answered: any positive talk time (most reliable), or explicit "answered"
  if (talkMs > 0 || last === "answered") return "Answered";

  // 2) Missed vs Not-Connected decided by direction (and 0 talk time)
  if (direction === "incoming") return "Missed";
  if (direction === "outgoing") {
    // Outgoing, 0 talk time => Not-Connected
    return "Not-Connected";
  }

  // 3) Edge: sometimes providers mark "connected" but talk time is 0
  if (last === "connected") return "Connected";

  // Fallbacks
  if (["busy", "no answer", "declined", "voicemail", "canceled", "cancelled", "abandoned"].includes(last)) {
    // If we can’t trust direction, default to Not-Connected for no-talk calls
    return "Not-Connected";
  }

  // Default safe bucket
  return "Not-Connected";
};

const STATUS_BADGE = {
  "Answered":  "bg-teal-500 text-white",
  "Connected": "bg-blue-500 text-white",
  "Not-Connected": "bg-red-500 text-white",
  "Missed": "bg-red-500 text-white",
};

const CONVERSION_BADGE = {
  "Converted": "bg-teal-500 text-white",
  "Open":      "bg-yellow-500 text-white",
};

const UserCallDashboard = () => {
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [stats, setStats] = useState({
    total: 0,
    answered: 0,
    missed: 0,
    incoming: 0,
    outgoing: 0,
    totalTalkTime: "00:00:00",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchData = async (alias, date) => {
    const start = new Date(`${date}T00:00:00`);
    const isToday = date === new Date().toISOString().split("T")[0];
    const end = isToday ? new Date() : new Date(`${date}T23:59:59`);

    const from = formatDateTime(start);
    const to = formatDateTime(end);

    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/analytics/8x8/call-records/filter`,
        {
          // IMPORTANT: Keep both to fetch when user is caller or callee
          params: { callerName: alias, calleeName: alias, from, to },
        }
      );

      const rawData = res.data?.data || [];
      if (rawData.length === 0) {
        setRecords([]);
        setStats({
          total: 0,
          answered: 0,
          missed: 0,
          incoming: 0,
          outgoing: 0,
          totalTalkTime: "00:00:00",
        });
        return;
      }



      let totalTalkTimeMS = 0;
      let incoming = 0;
      let outgoing = 0;
      let answered = 0;
      let missed = 0;

      const transformed = rawData.map((record) => {
        // Sum talk time
        const talkMs = Number(record.talkTimeMS || 0);
        totalTalkTimeMS += talkMs;

        // Direction counts (rely on provider field)
        const dir = (record.direction || "").toLowerCase();
        if (dir === "incoming") incoming++;
        if (dir === "outgoing") outgoing++;

        // Normalize status
        const normStatus = normalizeCallStatus(record, alias);

        // Answered/Missed tallies
        if (normStatus === "Answered") answered++;
        if (normStatus === "Missed") missed++;

        // Display fields
        const dateObj = new Date(record.startTime);
        const date = dateObj.toLocaleDateString("en-GB"); // dd/mm/yyyy
        const time = dateObj.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        // Conversion status: talk < 20s -> Open, else Converted
        const conversionStatus = talkMs < 20000 ? "Open" : "Converted";

        // For "Called No" column we’ll keep callee (as in your UI)
        return {
          date,
          callee: record.callee,
          callTime: time,
          callDuration: record.talkTime || formatDuration(talkMs),
          callStatus: normStatus,
          conversionStatus,
        };
      });

      const total = transformed.length;

      setRecords(transformed);
      setStats({
        total,
        answered,
        missed,
        incoming,
        outgoing,
        totalTalkTime: formatDuration(totalTalkTimeMS),
      });
    } catch (err) {
      console.error("❌ API Error fetching filtered calls:", err);
      // keep previous UI; optionally reset
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Call Records");
    XLSX.writeFile(workbook, `Call_Records_${selectedDate}.xlsx`);
  };

  // Pagination derived
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = records.slice(startIndex, endIndex);

  const handlePageChange = (page) => setCurrentPage(page);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    if (!storedUser) {
      console.warn("❌ No user in sessionStorage");
      return;
    }
    const user = JSON.parse(storedUser);
    const alias = user.aliasName;
    if (!alias) {
      console.warn("❌ aliasName missing in user object");
      return;
    }
    fetchData(alias, selectedDate);
  }, [selectedDate]);

  return (
    <div className="bg-white p-4 sm:p-6">
      {/* Today's Call Performance */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-800">
            Today's Call Performance -{" "}
            {selectedDate
              ? format(new Date(selectedDate.replace(/-/g, "/")), "d MMM yyyy")
              : ""}
          </h1>
        </div>

        {/* Stat Cards */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 text-center bg-[#F9F9FB]">
            <div className="p-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-green-500">{stats.answered}</p>
              <p className="text-sm text-gray-500">Answered</p>
            </div>
            <div className="p-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-red-500">{stats.missed}</p>
              <p className="text-sm text-gray-500">Missed</p>
            </div>
            <div className="p-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-yellow-500">{stats.incoming}</p>
              <p className="text-sm text-gray-500">Incoming</p>
            </div>
            <div className="p-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-blue-500">{stats.outgoing}</p>
              <p className="text-sm text-gray-500">Outgoing</p>
            </div>
            <div className="p-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-yellow-500">{stats.totalTalkTime}</p>
              <p className="text-sm text-gray-500">Talk Time</p>
            </div>
            <div className="p-4">
              <p className="text-3xl font-bold text-green-500">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Calls</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-w-[1250px] mx-auto">
  <button className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
    <span className="font-medium text-gray-600">Start a new call</span>
    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
      <Phone className="text-green-600" size={16} />
    </div>
  </button>

  <button className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
    <span className="font-medium text-gray-600">Add Follow-Up</span>
    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
      <Users className="text-yellow-600" size={16} />
    </div>
  </button>

  <button className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
    <span className="font-medium text-gray-600">Mark Conversation</span>
    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
      <MessageSquare className="text-purple-600" size={16} />
    </div>
  </button>

  <button
    onClick={exportToExcel}
    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
  >
    <span className="font-medium text-gray-600">Download Report</span>
    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
      <Download className="text-blue-600" size={16} />
    </div>
  </button>
</div>



      {/* Table */}
      <div className="bg-white border border-[#C8C8C8] rounded-[17.59px] p-6 mb-3"
           style={{
             boxShadow: '7.54px 7.54px 67.85px 0px rgba(0, 0, 0, 0.05)',
             borderWidth: '1.31px'
           }}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Call Data</h2>
            <input
                type="date"
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
            />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Date</th>
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Called No</th>
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Call Time</th>
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Call Duration</th>
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Call Status</th>
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Conversion Status</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.length > 0 ? (
                currentRecords.map((r, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-gray-800 font-medium">{r.date}</td>
                    <td className="py-4 px-6 text-gray-800">{r.callee}</td>
                    <td className="py-4 px-6 text-gray-800">{r.callTime}</td>
                    <td className="py-4 px-6 text-gray-800 font-semibold">{r.callDuration}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[r.callStatus] || "bg-gray-200 text-gray-800"}`}
                      >
                        {r.callStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${CONVERSION_BADGE[r.conversionStatus] || "bg-gray-200 text-gray-800"}`}
                      >
                        {r.conversionStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Phone className="w-8 h-8 text-gray-300 mb-2" />
                      <p>No call records found</p>
                      <p className="text-gray-400 text-sm">Try selecting a different date</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
         {/* Pagination */}
        {totalPages > 1 && records.length > 0 && (
            <div className="flex justify-between items-center p-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, records.length)} of {records.length} call records
            </div>
            <div className="flex gap-2">
                <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                <ChevronLeft size={16} />
                </button>
                <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                <ChevronRight size={16} />
                </button>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default UserCallDashboard;