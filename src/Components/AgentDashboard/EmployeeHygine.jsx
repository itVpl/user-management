import React, { useEffect, useState } from 'react';
import axios from 'axios';

const EmployeeHygiene = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [breakHistory, setBreakHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attendanceRes, breakRes] = await Promise.all([
          axios.get("https://vpl-liveproject-1.onrender.com/api/v1/attendance/my?date=2025-07-04", {
            withCredentials: true,
          }),
          axios.get("https://vpl-liveproject-1.onrender.com/api/v1/break/my-history", {
            withCredentials: true,
          }),
        ]);

        const attendance = attendanceRes?.data?.attendance || [];
        const breaks = breakRes?.data?.breaks || [];

        setAttendanceData(attendance);
        setBreakHistory(breaks);

        const result = calculateScore(attendance, breaks);
        setScore(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateScore = (attendance, breaks) => {
    const totalDays = attendance.length;
    const presentDays = attendance.filter((a) => a.status === "completed").length;
    const overdueBreaks = breaks.filter((b) => b.isOverdue).length;
    const totalBreaks = breaks.length;
    const validTimeInOut = attendance.filter((a) => a.timeIn && a.timeOut).length;

    const completedTarget = 2500;
    const expectedTarget = 3000;

    const attendanceScore = totalDays ? (presentDays / totalDays) * 100 : 0;
    const breakScore = totalBreaks ? ((totalBreaks - overdueBreaks) / totalBreaks) * 100 : 100;
    const targetScore = (completedTarget / expectedTarget) * 100;
    const timeInOutScore = totalDays ? (validTimeInOut / totalDays) * 100 : 0;

    const totalScore = Math.round(
      (attendanceScore * 0.35 +
        breakScore * 0.2 +
        targetScore * 0.3 +
        timeInOutScore * 0.15) / 100 * 100
    );

    return {
      attendance: { value: presentDays, total: totalDays },
      breaks: { value: getTotalBreakDuration(breaks), limit: "01:00" },
      dailyTargets: { value: completedTarget, total: expectedTarget },
      timeInOut: { value: validTimeInOut, total: totalDays },
      totalScore,
    };
  };

  const getTotalBreakDuration = (breaks) => {
    if (!breaks.length) return "00:00";
    let totalMinutes = 0;
    breaks.forEach((brk) => {
      if (brk.duration) {
        const [hr, min] = brk.duration.split(':').map(Number);
        totalMinutes += (hr * 60 + min);
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  if (loading) return <div className="flex justify-center items-center h-60">
        <div className="w-10 h-10 border-b-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        {/* animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto */}
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
  if (!score) return <div className="text-center py-10">No data available</div>;

  return (
    <div className="min-h-screen   flex justify-center items-center px-4 py-10">
  <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-white/40 p-8 w-full max-w-8xl transform transition duration-300 hover:scale-[1.01]">

    {/* Header */}
    <div className="mb-8 text-center">
      <h2 className="text-3xl font-bold tracking-tight text-gray-800 drop-shadow-md">
        ✨ Personal Hygiene Summary
      </h2>
      
    </div>

    <div className="flex flex-col md:flex-row justify-between items-center gap-12">

      {/* Metrics */}
      <div className="space-y-6 w-full md:w-2/3">
        {[
          { label: "Attendance", value: score.attendance.value, total: score.attendance.total, color: "text-green-500" },
          { label: "Breaks", value: score.breaks.value, total: score.breaks.limit, color: "text-orange-500" },
          { label: "Daily Targets", value: score.dailyTargets.value, total: score.dailyTargets.total, color: "text-green-500" },
          { label: "Time In - Out", value: score.timeInOut.value, total: score.timeInOut.total, color: "text-red-500" },
        ].map((item, idx) => (
          <div key={idx} className="bg-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.05)] rounded-xl px-6 py-4 flex justify-between items-center border border-gray-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition">
            <span className="text-gray-700 font-medium">{item.label}</span>
            <span className={`text-xl font-bold ${item.color}`}>{item.value}/{item.total}</span>
          </div>
        ))}
      </div>

      {/* 3D Score Ring */}
      <div className="w-44 h-44 relative bg-white/70 shadow-inner rounded-full border border-gray-200 p-2 flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <defs>
            <linearGradient id="3dGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <path
            className="text-gray-300"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
          />
          <path
            strokeDasharray={`${score.totalScore}, 100`}
            strokeLinecap="round"
            stroke="url(#3dGradient)"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeWidth="3.5"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-sm text-gray-500">Total Score</p>
          <p className="text-3xl font-bold text-gray-800">{score.totalScore}%</p>
        </div>
      </div>
    </div>
  </div>
</div>

  );
};

export default EmployeeHygiene;
