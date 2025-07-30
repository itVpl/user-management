import React, { useState, useEffect } from 'react';
import { GreenCheck, RedCrossCheck } from '../../assets/image';
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);

  // Date selection for attendance
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Reset to first page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Reset to first page when date changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

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
        setLoadingAttendance(true);
        setAttendanceError(null);

        const res = await axios.get(
          `https://vpl-liveproject-1.onrender.com/api/v1/attendance?date=${selectedDate}`,
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
  }, [selectedDate]);

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

  switch (status?.toLowerCase()) {
    case 'present':
      return 'bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium';
    case 'half day':
      return 'bg-yellow-400 text-white px-3 py-1 rounded-full text-sm font-medium';
    case 'absent':
      return 'bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium';
    default:
      return 'bg-gray-300 text-black px-3 py-1 rounded-full text-sm font-medium';
  }
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
          <button 
            onClick={() => handleLeaveAction("approved")}
            className="p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200"
            title="Approve Leave"
          >
            <img src={GreenCheck} alt="Approve" className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleLeaveAction("rejected")}
            className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200"
            title="Reject Leave"
          >
            <img src={RedCrossCheck} alt="Reject" className="w-4 h-4" />
          </button>
        </div>
      );
    }
    return (
      <span className={`text-xs font-medium px-3 py-1 rounded-full ${
        status === 'approved' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLeaveStatusBadge = (status, row) => {
    if (status === 'approved' || status === 'rejected') {
      return (
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${
          status === 'approved' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    }

    // For pending → show approve/reject action buttons
    return getActionButtons(status, row._id);
  };

  // Pagination functions
  const getCurrentRecords = (data) => {
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    return data.slice(indexOfFirstRecord, indexOfLastRecord);
  };

  const getTotalPages = (data) => {
    return Math.ceil(data.length / recordsPerPage);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = (totalPages) => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Date formatting function
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    // If it's already in dd-mm-yyyy format, return as is
    if (typeof dateString === 'string' && dateString.includes('-') && dateString.split('-').length === 3) {
      const parts = dateString.split('-');
      if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
        return dateString; // Already in correct format
      }
    }
    
    // Try to parse the date
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.log('Invalid date:', dateString);
      return dateString || '-'; // Return original string if parsing fails
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dailyAttendance':
        return (
          <div>
            {/* Date Selection */}
            <div className="mb-4 flex justify-end">
              <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                <label htmlFor="date-select" className="text-sm font-medium text-gray-600">
                  📅 Date:
                </label>
                <input
                  type="date"
                  id="date-select"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 hover:bg-white transition-colors duration-200"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white shadow-md rounded-lg" style={{boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 -4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Employee Name</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Log In</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Log out</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Total hrs</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Dept</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Role</th>
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
                    getCurrentRecords(dailyAttendanceData).map((row, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700">{formatDate(row.date)}</td>
                      <td className="py-3 px-4 text-blue-600">{row.empId}</td>
                      <td className="py-3 px-4 text-gray-700">{row.empName}</td>
                      <td className="py-3 px-4 text-gray-700">{row.loginTime || '------'}</td>
                      <td className="py-3 px-4 text-gray-700">{row.logoutTime || '------'}</td>
                      <td className="py-3 px-4 text-gray-700">{row.totalTime || ''}</td>
                      <td className="py-3 px-4">
                        <span className={getStatusBadge(row.status)}>{row.status}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{row.department}</td>
                      <td className="py-3 px-4 text-gray-700">{row.role}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>
        );

      case 'leaveRequest':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg" style={{boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 -4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Employee Name</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">From</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">To</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Type of Leave</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Dept</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Action</th>
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
                    getCurrentRecords(leaveRequestData).map((row, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700">{formatDate(row.appliedAt)}</td>
                      <td className="py-3 px-4 text-blue-600">{row.empId}</td>
                      <td className="py-3 px-4 text-gray-700">{row.empName || 'N/A'}</td>
                      <td className="py-3 px-4 text-gray-700">{formatDate(row.fromDate)}</td>
                      <td className="py-3 px-4 text-gray-700">{formatDate(row.toDate)}</td>
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
            <table className="min-w-full bg-white shadow-md rounded-lg" style={{boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 -4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Employee Name</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Casual Leave</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Sick Leave</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-500">Total Leave</th>
                </tr>
              </thead>
                              <tbody>
                                    {getCurrentRecords(leaveBalanceData).map((row, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
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
    <div className="p-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab('dailyAttendance')}
          className={`px-4 py-2 rounded-full border ${
            activeTab === 'dailyAttendance' ? "bg-blue-500 text-white" : "bg-white text-black"
          }`}
        >
          Daily Attendance
        </button>
        <button
          onClick={() => setActiveTab('leaveRequest')}
          className={`px-4 py-2 rounded-full border ${
            activeTab === 'leaveRequest' ? "bg-blue-500 text-white" : "bg-white text-black"
          }`}
        >
          Leave Request
        </button>
        <button
          onClick={() => setActiveTab('leaveBalance')}
          className={`px-4 py-2 rounded-full border ${
            activeTab === 'leaveBalance' ? "bg-blue-500 text-white" : "bg-white text-black"
          }`}
        >
          Leave Balance
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white p-6 shadow-lg rounded-xl">
        {renderTabContent()}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        {(() => {
          const currentData = activeTab === 'dailyAttendance' ? dailyAttendanceData : 
                             activeTab === 'leaveRequest' ? leaveRequestData : 
                             leaveBalanceData;
          const totalPages = getTotalPages(currentData);
          const startRecord = (currentPage - 1) * recordsPerPage + 1;
          const endRecord = Math.min(currentPage * recordsPerPage, currentData.length);
          
          return (
            <>
              <span className="text-sm text-gray-600">
                Showing {startRecord}-{endRecord} of {currentData.length} results
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`px-3 py-1 rounded ${
                      currentPage === pageNumber 
                        ? 'bg-blue-500 text-white' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                
                <button 
                  onClick={() => handleNextPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default HRManagementSystem;