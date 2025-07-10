import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx"; // ✅ Import xlsx

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
    <div className="flex flex-col p-6 gap-4 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow p-4">
        {/* Header + Controls */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {/* Call Details for <span className="text-blue-600">{callerName}</span> */}
            Calls Records
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="border px-3 py-2 rounded text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
            {/* <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm cursor-pointer"
            >
              Export to Excel
            </button> */}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-gray-700 mb-4">
          <div className="bg-gray-100 p-3 rounded shadow-sm">
            <strong>Total Calls:</strong> {stats.total}
          </div>
          <div className="bg-gray-100 p-3 rounded shadow-sm">
            <strong>Incoming:</strong> {stats.incoming}
          </div>
          <div className="bg-gray-100 p-3 rounded shadow-sm">
            <strong>Outgoing:</strong> {stats.outgoing}
          </div>
          <div className="bg-gray-100 p-3 rounded shadow-sm">
            <strong>Answered:</strong> {stats.answered}
          </div>
          <div className="bg-gray-100 p-3 rounded shadow-sm">
            <strong>Missed:</strong> {stats.missed}
          </div>
          <div className="bg-gray-100 p-3 rounded shadow-sm">
            <strong>Total Talk Time:</strong> {stats.totalTalkTime}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-800">
            <thead className="bg-white sticky top-0 z-10">
              <tr className="text-blue-600 border-b">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Called No</th>
                <th className="p-3 text-left">Call Time</th>
                <th className="p-3 text-left">Call Duration</th>
                <th className="p-3 text-left">Call Status</th>
                <th className="p-3 text-left">Conversion Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((r, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="p-3">{r.date}</td>
                    <td className="p-3">{r.callee}</td>
                    <td className="p-3">{r.callTime}</td>
                    <td className="p-3">{r.callDuration}</td>
                    <td className="p-3">{r.callStatus}</td>
                    <td className="p-3">{r.conversionStatus}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">
                    No call records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserCallDashboard;
