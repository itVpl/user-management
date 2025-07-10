import React, { useState,useEffect } from 'react';
import { GreenCheck,RedCrossCheck } from '../../assets/image';
import axios from 'axios';

const HRManagementSystem = () => {
  const [activeTab, setActiveTab] = useState('dailyAttendance');
  const [activeMenuItem, setActiveMenuItem] = useState('attendance');

const [dailyAttendanceData, setDailyAttendanceData] = useState([]);
const [loadingAttendance, setLoadingAttendance] = useState(true);
const [attendanceError, setAttendanceError] = useState(null);


// for leave 
const [leaveRequestData, setLeaveRequestData] = useState([]);
const [loadingLeaves, setLoadingLeaves] = useState(true);
const [leaveError, setLeaveError] = useState(null);


useEffect(() => {
  const fetchAttendance = async () => {
    const userData = sessionStorage.getItem("user");
    if (!userData) {
      setAttendanceError("User not logged in");
      setLoadingAttendance(false);
      return;
    }

    const { empId } = JSON.parse(userData);
    if (!empId) {
      setAttendanceError("Invalid session");
      setLoadingAttendance(false);
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];

      const res = await axios.get(
        `https://vpl-liveproject-1.onrender.com/api/v1/attendance?date=${today}`,
        {
          withCredentials: true,
          headers: {
            // If token is needed: Authorization: `Bearer ${token}`
          }
        }
      );

      setDailyAttendanceData(res.data.records || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setAttendanceError("Could not fetch attendance.");
    } finally {
      setLoadingAttendance(false);
    }
  };

  fetchAttendance();
}, []);


useEffect(() => {
  const fetchLeaveRequests = async () => {
    try {
      const res = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/leave/all", {
        withCredentials: true,
      });

      console.log("Leave API response:", res.data);

      if (Array.isArray(res.data.leaves)) {
        setLeaveRequestData(res.data.leaves);
      } else {
        throw new Error("Unexpected response structure");
      }

    } catch (err) {
      console.error("Error fetching leave requests", err);
      setLeaveError("Could not fetch leave data.");
    } finally {
      setLoadingLeaves(false);
    }
  };

  fetchLeaveRequests();
}, []);


  const leaveBalanceData = [
    { empId: 'VPL001', name: 'Troy', casualLeave: '06', sickLeave: '03', totalLeave: '09' },
    { empId: 'VPL002', name: 'Easton', casualLeave: '06', sickLeave: '03', totalLeave: '09' },
    { empId: 'VPL003', name: 'Dhruv', casualLeave: '01', sickLeave: '2.5', totalLeave: '3.5' },
    { empId: 'VPL004', name: 'Rishabh', casualLeave: '03', sickLeave: '00', totalLeave: '03' },
  ];

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Present': 'bg-green-600 text-white',
      'Absent': 'bg-red-600 text-white',
      'On-Leave': 'bg-yellow-500 text-white',
      'Half day': 'bg-blue-500 text-white',
    };
    return `px-3 py-1 rounded-full text-sm font-medium ${statusClasses[status] || 'bg-gray-200'}`;
  };

const getActionButtons = (status, leaveId) => {
  const handleLeaveAction = async (newStatus) => {
    const reviewer = JSON.parse(sessionStorage.getItem("user"))?.empId;
    if (!reviewer) return alert("Session expired");

    try {
      await axios.patch(
        `https://vpl-liveproject-1.onrender.com/api/v1/leave/status/${leaveId}`,
        {
          status: newStatus,
          reviewedBy: reviewer,
        },
        { withCredentials: true }
      );

      // ✅ Update UI immediately
      setLeaveRequestData(prev =>
        prev.map(req =>
          req._id === leaveId ? { ...req, status: newStatus } : req
        )
      );
    } catch (err) {
      console.error("Leave status update failed", err);
      alert("Failed to update leave status");
    }
  };

  if (status === 'pending') {
    return (
      <div className="flex gap-2">
        <button onClick={() => handleLeaveAction("approved")}>
          <img src={GreenCheck} alt="Approve" className="w-5 h-5" />
        </button>
        <button onClick={() => handleLeaveAction("rejected")}>
          <img src={RedCrossCheck} alt="Reject" className="w-5 h-5" />
        </button>
      </div>
    );
  }
  return <span className={`text-xs font-medium ${status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>{status}</span>;
};

const getLeaveStatusBadge = (status, row) => {
  const statusClasses = {
    approved: 'bg-green-600 text-white px-3 py-1 rounded text-sm',
    rejected: 'bg-red-600 text-white px-3 py-1 rounded text-sm',
  };

  if (status === 'approved' || status === 'rejected') {
    return <span className={statusClasses[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  }

  // For pending → show approve/reject action buttons
  return getActionButtons(status, row._id);
};

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dailyAttendance':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Log In</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Log out</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Total hrs</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Dept</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                </tr>
              </thead>
              <tbody>
      {loadingAttendance ? (
  <tr><td colSpan="9" className="text-center py-4">Loading...</td></tr>
) : attendanceError ? (
  <tr><td colSpan="9" className="text-center py-4 text-red-500">{attendanceError}</td></tr>
) : dailyAttendanceData.length === 0 ? (
  <tr><td colSpan="9" className="text-center py-4">No attendance data found.</td></tr>
) : (
  dailyAttendanceData.map((row, index) => (
    <tr key={index} className="border-b hover:bg-gray-50">
      <td className="py-3 px-4 text-gray-700">{row.date}</td>
      <td className="py-3 px-4 text-blue-600">{row.empId}</td>
      <td className="py-3 px-4 text-gray-700">{row.name}</td>
      <td className="py-3 px-4 text-gray-700">{row.logIn || '------'}</td>
      <td className="py-3 px-4 text-gray-700">{row.logOut || '------'}</td>
      <td className="py-3 px-4 text-gray-700">{row.totalHrs || ''}</td>
      <td className="py-3 px-4">
        <span className={getStatusBadge(row.status)}>{row.status}</span>
      </td>
      <td className="py-3 px-4 text-gray-700">{row.dept}</td>
      <td className="py-3 px-4 text-gray-700">{row.role}</td>
    </tr>
  ))
)}
              </tbody>
            </table>
          </div>
        );
      
      case 'leaveRequest':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">From</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">To</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Type of Leave</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Dept</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingLeaves ? (
  <tr><td colSpan="9" className="text-center py-4">Loading leaves...</td></tr>
) : leaveError ? (
  <tr><td colSpan="9" className="text-center py-4 text-red-500">{leaveError}</td></tr>
) : leaveRequestData.length === 0 ? (
  <tr><td colSpan="9" className="text-center py-4">No leave requests found.</td></tr>
) : (
  leaveRequestData.map((row, index) => (
<tr key={index} className="border-b hover:bg-gray-50">
  <td className="py-3 px-4 text-gray-700">{row.createdAt?.slice(0, 10) || '-'}</td>
  <td className="py-3 px-4 text-blue-600">{row.empId}</td>
  <td className="py-3 px-4 text-gray-700">{row.empName || 'N/A'}</td>
  <td className="py-3 px-4 text-gray-700">{row.fromDate?.slice(0, 10)}</td>
  <td className="py-3 px-4 text-gray-700">{row.toDate?.slice(0, 10)}</td>
  <td className="py-3 px-4 text-gray-700">{row.leaveType}</td>
  <td className="py-3 px-4 text-gray-700">{row.department || 'N/A'}</td>
  <td className="py-3 px-4 text-gray-700">{row.role || 'N/A'}</td>
  <td className="py-3 px-4">
    {getLeaveStatusBadge(row.status, row)}
  </td>
</tr>
  ))
)}
              </tbody>
            </table>
          </div>
        );
      
      case 'leaveBalance':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Causal Leave</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Sick Leave</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Total Leave</th>
                </tr>
              </thead>
              <tbody>
                {leaveBalanceData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-blue-600">{row.empId}</td>
                    <td className="py-3 px-4 text-gray-700">{row.name}</td>
                    <td className="py-3 px-4 text-gray-700">{row.casualLeave}</td>
                    <td className="py-3 px-4 text-gray-700">{row.sickLeave}</td>
                    <td className="py-3 px-4 text-gray-700">{row.totalLeave}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
 
        {/* Tab Navigation */}
        <div className="bg-white px-6 py-4 border-b">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('dailyAttendance')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'dailyAttendance'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Daily Attendance
            </button>
            <button
              onClick={() => setActiveTab('leaveRequest')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'leaveRequest'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Leave Request
            </button>
            <button
              onClick={() => setActiveTab('leaveBalance')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'leaveBalance'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Leave Balance
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm">
            {renderTabContent()}
          </div>
          
          {/* Pagination */}
          <div className="flex justify-between items-center mt-6">
            <span className="text-sm text-gray-600">4 of 4</span>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="px-3 py-1 bg-blue-500 text-white rounded">1</button>
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRManagementSystem;