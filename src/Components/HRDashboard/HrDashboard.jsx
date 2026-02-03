import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MoreHorizontal, User, Settings, Users, Calendar, FileText, Clock, CheckCircle, AlertCircle, TrendingUp, Award } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import UpcomingBirthdays from '../UpcomingBirthdays';


const HRDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [currentMonthLeaves, setCurrentMonthLeaves] = useState([]);
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(0);
  const [pendingAndApprovedLeaves, setPendingAndApprovedLeaves] = useState([]);
  const [leaveStats, setLeaveStats] = useState({
    totalCount: 0,
    pendingCount: 0,
    managerApprovedCount: 0
  });
  const [newJoinersData, setNewJoinersData] = useState({ totalNewJoiners: 0, newJoiners: [] });
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, onLeave: 0 });
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [hygienePercentage, setHygienePercentage] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(5);
  const [todayLoginData, setTodayLoginData] = useState({
    loginCount: 0,
    totalEmployees: 0,
    attendancePercentage: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const empRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        const empData = empRes.data?.employees || [];
        setEmployees(empData);

        // Fetch new joiners data
        try {
          const newJoinersRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/new-joiners`);
          setNewJoinersData(newJoinersRes.data);
        } catch (error) {
          console.error("Error fetching new joiners:", error);
          setNewJoinersData({ totalNewJoiners: 1, newJoiners: [] }); // Fallback to 1
        }

        // const leaveRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/leave/all`);
        // const leaveData = Array.isArray(leaveRes.data) ? leaveRes.data : leaveRes.data.leaves || [];
        // setLeaves(leaveData);

        // Fetch current month leave requests
        try {
          const currentMonthRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/leave/current-month`);
          const currentMonthData = currentMonthRes.data?.leaves || [];
          setCurrentMonthLeaves(currentMonthData);
          setCurrentMonthTotal(currentMonthRes.data?.total || 6);
          setCurrentMonth(currentMonthRes.data?.currentMonth || 0);
        } catch (error) {
          console.error("Error fetching current month leaves:", error);
          setCurrentMonth(6); // Fallback to 7
          setCurrentMonthLeaves([]);
          setCurrentMonthTotal(6);
        }

        // Fetch pending and manager approved leaves
        try {
          const token = sessionStorage.getItem("token") || localStorage.getItem("token");
          console.log("Fetching pending and approved leaves with token:", token ? "Token exists" : "No token");
          const pendingApprovedRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/leave/pending-and-manager-approved`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          console.log("API Response:", pendingApprovedRes.data);
          const leavesData = pendingApprovedRes.data?.leaves || [];
          console.log("Leaves data:", leavesData);
          setPendingAndApprovedLeaves(leavesData);
          setLeaveStats({
            totalCount: pendingApprovedRes.data?.totalCount || 0,
            pendingCount: pendingApprovedRes.data?.pendingCount || 0,
            managerApprovedCount: pendingApprovedRes.data?.managerApprovedCount || 0
          });
        } catch (error) {
          console.error("Error fetching pending and approved leaves:", error);
          console.error("Error details:", error.response?.data || error.message);
          setPendingAndApprovedLeaves([]);
          setLeaveStats({
            totalCount: 0,
            pendingCount: 0,
            managerApprovedCount: 0
          });
        }

        // Fetch pending leave count
        try {
          const token = sessionStorage.getItem("token") || localStorage.getItem("token");
          const pendingCountRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/leave/current-month-pending-count`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          setPendingLeaveCount(pendingCountRes.data?.pendingLeaveCount || 0);
        } catch (error) {
          console.error("Error fetching pending leave count:", error);
          setPendingLeaveCount(0);
        }

        // Fetch attendance
        try {
          const today = new Date().toISOString().split("T")[0];
          const attRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/attendance?date=${today}`);
          const attendanceStats = attRes.data;
          setAttendance(attendanceStats);
        } catch (error) {
          console.error("Error fetching attendance:", error);
          setAttendance({ present: 0, absent: 0, onLeave: 0 });
        }

        // Fetch today's login count
        try {
          const token = sessionStorage.getItem("token") || localStorage.getItem("token");
          const loginCountRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/today-login-count`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          setTodayLoginData({
            loginCount: loginCountRes.data?.loginCount || 0,
            totalEmployees: loginCountRes.data?.totalEmployees || 0,
            attendancePercentage: parseFloat(loginCountRes.data?.attendancePercentage) || 0
          });
        } catch (error) {
          console.error("Error fetching today's login count:", error);
          setTodayLoginData({
            loginCount: 0,
            totalEmployees: 0,
            attendancePercentage: 0
          });
        }

        const notVerified = empData.filter(e => !e.docVerified);
        setPendingVerifications(notVerified.length);

        // Fetch tasks
        try {
          const taskRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/dailytask/assign`);
          setTasks(taskRes.data.task || []);
        } catch (error) {
          console.error("Error fetching tasks:", error);
          setTasks([]);
        }

        // Calculate hygiene percentage
        try {
          const breakRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/break/my-history`);
          const lateBreaks = breakRes.data.filter(b => b.duration && parseInt(b.duration.split(":")[0]) > 1);
          const hygieneScore = empData.length ? Math.round(((empData.length - lateBreaks.length) / empData.length) * 100) : 0;
          setHygienePercentage(hygieneScore);
        } catch (error) {
          console.error("Error fetching break data:", error);
          setHygienePercentage(0);
        }

      } catch (error) {
        console.error("Dashboard Data Fetch Error:", error);
      }
    };
    fetchData();
  }, []);

  // Monitor newJoinersData changes
  useEffect(() => {
    // 
  }, [newJoinersData]);

  // Monitor currentMonthLeaves changes
  useEffect(() => {
    // 
    // 
  }, [currentMonthLeaves]);

  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = "green" }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    const colorClass = color === "green" ? "stroke-emerald-500" : color === "blue" ? "stroke-blue-500" : "stroke-red-500";

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
            className="text-gray-100"
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
            className={`transition-all duration-500 ease-out ${colorClass}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-xl font-bold text-gray-800">
          {percentage}%
        </span>
      </div>
    );
  };

  const StatCard = ({ title, value, icon: Icon, color, gradient, subtitle }) => (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="text-left">
          <p className="text-base text-gray-500 font-medium">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-sm`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-2">{value || 0}</div>
      <p className="text-teal-600 font-medium">{title}</p>
    </div>
  );

  // Pagination logic
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = pendingAndApprovedLeaves.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(pendingAndApprovedLeaves.length / recordsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const Pagination = () => {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
        >
          Previous
        </button>

        {pageNumbers.map((number) => (
          <button
            key={number}
            onClick={() => handlePageChange(number)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === number
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {number}
          </button>
        ))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}


      {/* Top Stats Cards */}
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-3">
        <StatCard
          title="Total Employees"
          value={employees.length}
          icon={Users}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          gradient="from-blue-500 to-blue-600"
          subtitle="Active Team"
        />
        <StatCard
          title="Today Login Users"
          value={todayLoginData.loginCount}
          icon={CheckCircle}
          color="bg-gradient-to-r from-emerald-500 to-emerald-600"
          gradient="from-emerald-500 to-emerald-600"
          subtitle={`${todayLoginData.attendancePercentage}% of ${todayLoginData.totalEmployees} employees`}
        />
        <StatCard
          title="Leave Requests"
          value={pendingLeaveCount}
          icon={Calendar}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
          gradient="from-orange-500 to-orange-600"
          subtitle="Pending Requests"
        />
        <StatCard
          title="New Joiners"
          value={newJoinersData.totalNewJoiners}
          icon={TrendingUp}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
          gradient="from-purple-500 to-purple-600"
          subtitle="This Month"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-8 mb-3">
        {/* Employee Status Overview */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {/* <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="text-white" size={20} />
              </div> */}
              <h3 className="text-xl font-bold text-gray-800">Employee Status</h3>
            </div>
            <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" size={20} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-gray-700 font-medium">Active</span>
              </div>
              <span className="font-bold text-emerald-600">{employees.filter(e => e.status === 'active').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-gray-700 font-medium">Inactive</span>
              </div>
              <span className="font-bold text-orange-600">{employees.filter(e => e.status !== 'active').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-700 font-medium">On Notice</span>
              </div>
              <span className="font-bold text-red-600">{employees.filter(e => e.status === 'notice').length}</span>
            </div>
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {/* <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Clock className="text-white" size={20} />
              </div> */}
              <h3 className="text-xl font-bold text-gray-800">Today's Attendance</h3>
            </div>
            <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" size={20} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-gray-600">Present</span>
                <span className="font-bold text-emerald-600">{attendance.present || 0}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Absent</span>
                <span className="font-bold text-red-600">{attendance.absent || 0}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-gray-600">On Leave</span>
                <span className="font-bold text-orange-600">{attendance.onLeave || 0}</span>
              </div>
            </div>
            <div className="ml-6">
              <CircularProgress
                percentage={Math.round((attendance.present / (attendance.present + attendance.absent + attendance.onLeave)) * 100) || 0}
                color="blue"
              />
            </div>
          </div>
        </div>

        
        {/* <UpcomingBirthdays limit={3} /> */}
      </div>

      

      {/* Leave Request Table */}
      <div className="bg-white border border-[#C8C8C8] rounded-[17.59px] p-6 mb-3"
           style={{
             boxShadow: '7.54px 7.54px 67.85px 0px rgba(0, 0, 0, 0.05)',
             borderWidth: '1.31px'
           }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Calendar className="text-white" size={20} />
            </div> */}
            <h3 className="text-xl font-bold text-gray-800">Pending & Manager Approved Leave Requests</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Pending: {leaveStats.pendingCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Manager Approved: {leaveStats.managerApprovedCount}</span>
            </div>
            <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" size={20} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-2 text-gray-600 font-medium text-base">Employee ID</th>
                <th className="text-left py-4 px-2 text-gray-600 font-medium text-base">Employee Name</th>
                <th className="text-left py-4 px-2 text-gray-600 font-medium text-base">Department</th>
                <th className="text-left py-4 px-2 text-gray-600 font-medium text-base">Type of Leave</th>
                <th className="text-left py-4 px-2 text-gray-600 font-medium text-base">Total Days</th>
                <th className="text-left py-4 px-8 text-gray-600 font-medium text-base">Leave Duration</th>
                <th className="text-left py-4 px-8 text-gray-600 font-medium text-base">Status</th>
                <th className="text-left py-4 px-2 text-gray-600 font-medium text-base">Applied Date</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((leave, index) => {
                const fromDate = new Date(leave.fromDate).toLocaleDateString('en-GB');
                const toDate = new Date(leave.toDate).toLocaleDateString('en-GB');
                const appliedDate = new Date(leave.appliedAt).toLocaleDateString('en-GB');

                const getStatusColor = (status) => {
                  switch (status) {
                    case 'pending':
                      return 'bg-orange-100 text-orange-700';
                    case 'manager_approved':
                      return 'bg-blue-100 text-blue-700';
                    case 'approved':
                      return 'bg-emerald-100 text-emerald-700';
                    case 'rejected':
                      return 'bg-red-100 text-red-700';
                    default:
                      return 'bg-gray-100 text-gray-700';
                  }
                };

                const getStatusText = (status) => {
                  switch (status) {
                    case 'pending':
                      return 'Pending';
                    case 'manager_approved':
                      return 'Manager Approved';
                    case 'approved':
                      return 'Approved';
                    case 'rejected':
                      return 'Rejected';
                    default:
                      return status || 'Pending';
                  }
                };

                return (
                  <tr key={leave._id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                    <td className="py-4 px-4 text-gray-800 font-medium">{leave.empId}</td>
                    <td className="py-4 px-4 text-gray-800">{leave.empName}</td>
                    <td className="py-4 px-4 text-gray-800 capitalize">{leave.department}</td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
                        {leave.leaveType}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-800 font-medium">{leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}</td>
                    <td className="py-4 px-4 text-gray-800">{fromDate} - {toDate}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(leave.status)}`}>
                        {getStatusText(leave.status)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-800 text-sm">{appliedDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, pendingAndApprovedLeaves.length)} of {leaveStats.totalCount} pending and manager approved leave requests
          </div>
          {/* <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg">
               View All Requests
             </button> */}
        </div>
        {totalPages > 1 && <Pagination />}
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        {/* Upcoming Birthdays */}
        <div className="lg:col-span-3">
          <UpcomingBirthdays limit={3} />
        </div>
      </div>


    </div>
  );
};

export default HRDashboard;
