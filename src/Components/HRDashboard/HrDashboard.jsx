import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MoreHorizontal, User, Settings, Users, Calendar, FileText, Clock, CheckCircle, AlertCircle, TrendingUp, Award } from 'lucide-react';

const HRDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [currentMonthLeaves, setCurrentMonthLeaves] = useState([]);
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(0);
  const [newJoinersData, setNewJoinersData] = useState({ totalNewJoiners: 0, newJoiners: [] });
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

        // Fetch new joiners data
        try {
          const newJoinersRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/new-joiners");
          setNewJoinersData(newJoinersRes.data);
        } catch (error) {
          console.error("Error fetching new joiners:", error);
          setNewJoinersData({ totalNewJoiners: 1, newJoiners: [] }); // Fallback to 1
        }

        // const leaveRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/leave/all");
        // const leaveData = Array.isArray(leaveRes.data) ? leaveRes.data : leaveRes.data.leaves || [];
        // setLeaves(leaveData);

        // Fetch current month leave requests
        try {
          const currentMonthRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/leave/current-month");
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

        // Fetch attendance
        try {
          const today = new Date().toISOString().split("T")[0];
          const attRes = await axios.get(`https://vpl-liveproject-1.onrender.com/api/v1/attendance?date=${today}`);
          const attendanceStats = attRes.data;
          setAttendance(attendanceStats);
        } catch (error) {
          console.error("Error fetching attendance:", error);
          setAttendance({ present: 0, absent: 0, onLeave: 0 });
        }

        const notVerified = empData.filter(e => !e.docVerified);
        setPendingVerifications(notVerified.length);

        // Fetch tasks
        try {
          const taskRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/dailytask/assign");
          setTasks(taskRes.data.task || []);
        } catch (error) {
          console.error("Error fetching tasks:", error);
          setTasks([]);
        }

        // Calculate hygiene percentage
        try {
          const breakRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/break/my-history");
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
    // console.log("New Joiners Data Updated:", newJoinersData);
  }, [newJoinersData]);

  // Monitor currentMonthLeaves changes
  useEffect(() => {
    // console.log("Current Month Leaves Updated:", currentMonthLeaves);
    // console.log("Current Month Leaves Length:", currentMonthLeaves.length);
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
    <div className={`bg-gradient-to-br ${gradient} rounded-xl shadow-lg p-6 border border-white/20 backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-lg`}>
          <Icon className="text-white" size={24} />
        </div>
        <div className="text-right">
          <p className="text-sm text-white/80 font-medium">{subtitle}</p>
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-2">{value || 0}</div>
      <p className="text-white/90 font-medium">{title}</p>
    </div>
  );

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      

      {/* Top Stats Cards */}
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
        <StatCard
          title="Total Employees"
          value={employees.length}
          icon={Users}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          gradient="from-blue-500 to-blue-600"
          subtitle="Active Team"
        />
        <StatCard
          title="Present Today"
          value={attendance.present || 0}
          icon={CheckCircle}
          color="bg-gradient-to-r from-emerald-500 to-emerald-600"
          gradient="from-emerald-500 to-emerald-600"
          subtitle="On Time"
        />
        <StatCard
          title="Leave Requests"
          value={currentMonthTotal}
          icon={Calendar}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
          gradient="from-orange-500 to-orange-600"
          subtitle="Total Requests"
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
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        {/* Employee Status Overview */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="text-white" size={20} />
              </div>
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
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Clock className="text-white" size={20} />
              </div>
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

        {/* Upcoming Birthdays */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Upcoming Birthdays</h3>
            </div>
          </div>
          <div className="space-y-3">
            {employees
              .filter(emp => {
                if (!emp.dateOfBirth) return false;
                const today = new Date();
                const birthday = new Date(emp.dateOfBirth);
                const nextBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
                
                // If birthday has passed this year, check next year
                if (nextBirthday < today) {
                  nextBirthday.setFullYear(today.getFullYear() + 1);
                }
                
                const diffTime = nextBirthday - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 30; // Show birthdays in next 30 days
              })
              .sort((a, b) => {
                const today = new Date();
                const birthdayA = new Date(a.dateOfBirth);
                const birthdayB = new Date(b.dateOfBirth);
                const nextBirthdayA = new Date(today.getFullYear(), birthdayA.getMonth(), birthdayA.getDate());
                const nextBirthdayB = new Date(today.getFullYear(), birthdayB.getMonth(), birthdayB.getDate());
                
                if (nextBirthdayA < today) nextBirthdayA.setFullYear(today.getFullYear() + 1);
                if (nextBirthdayB < today) nextBirthdayB.setFullYear(today.getFullYear() + 1);
                
                return nextBirthdayA - nextBirthdayB;
              })
              .slice(0, 3)
              .map((emp, index) => {
                const today = new Date();
                const birthday = new Date(emp.dateOfBirth);
                const nextBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
                
                if (nextBirthday < today) {
                  nextBirthday.setFullYear(today.getFullYear() + 1);
                }
                
                const diffTime = nextBirthday - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={emp._id} className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {emp.employeeName?.charAt(0) || emp.empName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{emp.employeeName || emp.empName}</p>
                        <p className="text-sm text-gray-600">{emp.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-pink-600">
                        {diffDays === 0 ? 'Today' : `${diffDays} day${diffDays > 1 ? 's' : ''}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {birthday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            {employees.filter(emp => {
              if (!emp.dateOfBirth) return false;
              const today = new Date();
              const birthday = new Date(emp.dateOfBirth);
              const nextBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
              if (nextBirthday < today) {
                nextBirthday.setFullYear(today.getFullYear() + 1);
              }
              const diffTime = nextBirthday - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 30;
            }).length === 0 && (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No upcoming birthdays</p>
                <p className="text-gray-400 text-xs">in the next 30 days</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave Request Table */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Calendar className="text-white" size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Current Month Leave Requests</h3>
          </div>
          <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" size={20} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Employee ID</th>
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Employee Name</th>
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Department</th>
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Type of Leave</th>
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Total Days</th>
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Leave Duration</th>
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentMonthLeaves.slice(0, 6).map((leave, index) => {
                const fromDate = new Date(leave.fromDate).toLocaleDateString('en-GB');
                const toDate = new Date(leave.toDate).toLocaleDateString('en-GB');
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
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {leave.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {Math.min(currentMonthLeaves.length, 6)} of {currentMonthLeaves.length} current month leave requests
          </div>
          <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg">
            View All Requests
          </button>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Pending Verification */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <AlertCircle className="text-white" size={20} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Pending Verification</h3>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="mb-6">
              <CircularProgress 
                percentage={Math.round(((employees.length - pendingVerifications) / employees.length) * 100) || 0} 
                size={120} 
                color="blue"
              />
            </div>
            <div className="text-4xl font-bold text-gray-800 mb-4">{pendingVerifications}</div>
            <p className="text-gray-600 mb-6 text-center">Documents pending verification</p>
            <button className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg">
              Review Documents
            </button>
          </div>
        </div>

        {/* Hygiene Compliance */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Award className="text-white" size={20} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Hygiene Compliance</h3>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="mb-6">
              <CircularProgress 
                percentage={hygienePercentage} 
                size={120} 
                color={hygienePercentage >= 80 ? 'green' : 'red'} 
              />
            </div>
            <div className="text-center">
              <h4 className="text-2xl font-bold text-gray-800 mb-2">Monthly Hygiene Log</h4>
              <p className="text-gray-600 mb-6">Overall compliance rate</p>
            </div>
            <button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg">
              View Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
