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
    <div className="p-6 flex justify-center">
      <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-4xl">
        <h2 className="text-2xl font-semibold mb-6">Personal Hygiene</h2>
        <div className="flex flex-col md:flex-row justify-left items-center gap-8">
          <div className="space-y-4 w-full md:w-2/3">
            <div className="flex justify-between">
              <span>Attendance</span>
              <span className="text-green-600 font-medium">{score.attendance.value}/{score.attendance.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Breaks</span>
              <span className="text-orange-500 font-medium">{score.breaks.value}/{score.breaks.limit}</span>
            </div>
            <div className="flex justify-between">
              <span>Daily Targets</span>
              <span className="text-green-600 font-medium">{score.dailyTargets.value}/{score.dailyTargets.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Time In - Out</span>
              <span className="text-red-500 font-medium">{score.timeInOut.value}/{score.timeInOut.total}</span>
            </div>
          </div>

          <div className="w-36 h-36 relative">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-0">
              <path
                className="text-gray-200"
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="text-green-600"
                strokeDasharray={`${score.totalScore}, 100`}
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <text x="18" y="20.35" className="fill-current text-gray-800 text-sm" textAnchor="middle">
                {score.totalScore}%
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeHygiene;
