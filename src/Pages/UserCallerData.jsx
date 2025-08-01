import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx"; // ✅ Import xlsx
import { Phone, CheckCircle, XCircle, BarChart3, Clock } from "lucide-react";

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
  let seconds = Math.floor(ms / 1000);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  seconds %= 3600;
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const UserCallDashboard = () => {
  const [records, setRecords] = useState([]);
  const [callerName, setCallerName] = useState("");
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // ✅ Excel Export Function
  // const exportToExcel = () => {
  //   if (records.length === 0) return;

  //   const worksheet = XLSX.utils.json_to_sheet(records);
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, "Call Records");

  //   const fileName = `CallRecords_${selectedDate}.xlsx`;
  //   XLSX.writeFile(workbook, fileName);
  // };
  
  const fetchData = async (alias, date) => {
    const start = new Date(`${date}T00:00:00`);
    const isToday = date === new Date().toISOString().split("T")[0];
    const end = isToday ? new Date() : new Date(`${date}T23:59:59`);

    const from = formatDateTime(start);
    const to = formatDateTime(end);

    try {
      const res = await axios.get(
        "https://vpl-liveproject-1.onrender.com/api/v1/analytics/8x8/call-records/filter",
        { params: { callerName: alias, calleeName: alias, from, to } }
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

      setCallerName(rawData[0].callerName || alias);

      let totalTalkTimeMS = 0;
      let incoming = 0;
      let outgoing = 0;

      const transformed = rawData.map((record) => {
        const dateObj = new Date(record.startTime);
        const date = dateObj.toLocaleDateString("en-GB");
        const time = dateObj.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });


      

        totalTalkTimeMS += Number(record.talkTimeMS || 0);
        if (record.direction === "Incoming") incoming++;
        if (record.direction === "Outgoing") outgoing++;

        return {
          date,
          callee: record.callee,
          callTime: time,
          callDuration: record.talkTime || "00:00:00",
          callStatus: record.lastLegDisposition || "Unknown",
          conversionStatus:
            (record.talkTimeMS || 0) < 20000 ? "Open" : "Converted",
        };
      });

      const total = transformed.length;
      const answered = transformed.filter((r) => r.callStatus === "Connected").length;
      const missed = total - answered;

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
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = records.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to first page when date changes
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
    <>
      {/* Stats Cards - One Line Like Delivery Order */}
      <div className="flex justify-between items-center mb-6 mt-4">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Phone className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Calls</p>
                <p className="text-xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Answered</p>
                <p className="text-xl font-bold text-green-600">{stats.answered}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Missed</p>
                <p className="text-xl font-bold text-red-600">{stats.missed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Talk Time</p>
                <p className="text-xl font-bold text-purple-600">{stats.totalTalkTime}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Phone className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Incoming</p>
                <p className="text-xl font-bold text-orange-600">{stats.incoming}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Phone className="text-indigo-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Outgoing</p>
                <p className="text-xl font-bold text-indigo-600">{stats.outgoing}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Date Field - Right Side */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>
      </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Called No</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Call Time</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Call Duration</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Call Status</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Conversion Status</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.length > 0 ? (
                  currentRecords.map((r, index) => (
                    <tr key={index} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{r.date}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{r.callee}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{r.callTime}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-blue-600">{r.callDuration}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                          r.callStatus === "Connected"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {r.callStatus === "Connected" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {r.callStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                          r.conversionStatus === "Converted"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {r.conversionStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No call records found</p>
                    <p className="text-gray-400 text-sm">Try changing the date</p>
                  </div>
                )}
              </tbody>
            </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && records.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, records.length)} of {records.length} call records
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 border rounded-lg transition-colors ${
                  currentPage === page
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default UserCallDashboard;
