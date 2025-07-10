import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MoreHorizontal, User, Settings } from 'lucide-react';

const HRDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, onLeave: 0 });
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [hygienePercentage, setHygienePercentage] = useState(0);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const empRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser");
        const empData = empRes.data?.employees || [];
        setEmployees(empData);

        const leaveRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/leave/all");
        const leaveData = Array.isArray(leaveRes.data) ? leaveRes.data : leaveRes.data.leaves || [];
        setLeaves(leaveData);

        const today = new Date().toISOString().split("T")[0];
        const attRes = await axios.get(`https://vpl-liveproject-1.onrender.com/api/v1/attendance?date=${today}`);
        const attendanceStats = attRes.data;
        setAttendance(attendanceStats);

        const notVerified = empData.filter(e => !e.docVerified);
        setPendingVerifications(notVerified.length);

        const taskRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/dailytask/assign");
        setTasks(taskRes.data.task || []);

        const breakRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/break/my-history");
        const lateBreaks = breakRes.data.filter(b => b.duration && parseInt(b.duration.split(":")[0]) > 1);
        const hygieneScore = empData.length ? Math.round(((empData.length - lateBreaks.length) / empData.length) * 100) : 0;
        setHygienePercentage(hygieneScore);

      } catch (error) {
        console.error("Dashboard Data Fetch Error:", error);
      }
    };
    fetchData();
  }, []);

  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = "green" }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    const colorClass = color === "green" ? "stroke-green-500" : "stroke-red-500";

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-all duration-300 ${colorClass}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-2xl font-bold text-gray-800">
          {percentage}%
        </span>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Total Employees */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Total Employees</h3>
            <MoreHorizontal className="text-gray-400 cursor-pointer" size={20} />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total</span>
              <span className="font-semibold">{employees.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active</span>
              <span className="font-semibold">{employees.filter(e => e.status === 'active').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">On-Notice</span>
              <span className="font-semibold">{employees.filter(e => e.status === 'notice').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Exited</span>
              <span className="font-semibold">{employees.filter(e => e.status === 'exited').length}</span>
            </div>
          </div>
        </div>

        {/* New Joiners */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <User className="text-white" size={16} />
              </div>
              <span className="text-lg font-semibold text-gray-800">New Joiners</span>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Settings className="text-blue-600" size={24} />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-800">
            {employees.filter(e => {
              const today = new Date();
              const joinDate = new Date(e.createdAt);
              const diff = (today - joinDate) / (1000 * 60 * 60 * 24);
              return diff <= 30;
            }).length}
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Today's Attendance</h3>
            <MoreHorizontal className="text-gray-400 cursor-pointer" size={20} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex justify-between min-w-[120px]">
                <span className="text-gray-600">Present</span>
                <span className="font-semibold">{attendance.present}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Absent</span>
                <span className="font-semibold">{attendance.absent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">On-Leave</span>
                <span className="font-semibold">{attendance.onLeave}</span>
              </div>
            </div>
            <div className="ml-8">
              <CircularProgress percentage={Math.round((attendance.present / (attendance.present + attendance.absent + attendance.onLeave)) * 100)} />
            </div>
          </div>
        </div>
      </div>

      {/* Leave Request Table */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Leave Request</h3>
          <MoreHorizontal className="text-gray-400 cursor-pointer" size={20} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-blue-600 font-medium">Employee ID</th>
                <th className="text-left py-3 px-4 text-blue-600 font-medium">Employee Name</th>
                <th className="text-left py-3 px-4 text-blue-600 font-medium">Type of Leave</th>
                <th className="text-left py-3 px-4 text-blue-600 font-medium">Leave Duration</th>
              </tr>
            </thead>
            <tbody>
              {leaves.slice(0, 8).map((leave, index) => (
                <tr key={leave._id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-3 px-4 text-gray-800">{leave.empId}</td>
                  <td className="py-3 px-4 text-gray-800">{leave.empName}</td>
                  <td className="py-3 px-4 text-gray-800">{leave.leaveType}</td>
                  <td className="py-3 px-4 text-gray-800">{leave.fromDate} - {leave.toDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            View all
          </button>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pending Verification */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Pending Verification</h3>
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <CircularProgress percentage={Math.round(((employees.length - pendingVerifications) / employees.length) * 100)} size={100} />
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-4">{pendingVerifications}</div>
            <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
              View all
            </button>
          </div>
        </div>

        {/* Hygiene Compliance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Hygiene Compliance</h3>
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <CircularProgress percentage={hygienePercentage} size={100} color={hygienePercentage >= 80 ? 'green' : 'red'} />
            </div>
            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Monthly Hygiene Log</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
