import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GreenCheck } from '../../assets/image';
import {
  Calendar, Clock, User, CheckCircle, XCircle, AlertCircle,
  Search, Filter, ArrowLeft, ArrowRight
} from 'lucide-react';
import API_CONFIG from '../../config/api.js';


// ------------------ COMPONENT ------------------
const HRManagementSystem = () => {
  const [activeTab, setActiveTab] = useState('dailyAttendance'); // 'dailyAttendance' | 'leaveRequest' | 'leaveBalance'


  // Attendance data
  const [dailyAttendanceData, setDailyAttendanceData] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [attendanceError, setAttendanceError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('all'); // all | present | half day | absent


  // Leave data
  const [leaveRequestData, setLeaveRequestData] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);
  const [leaveError, setLeaveError] = useState(null);
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all'); // all | pending | approved | rejected | cancelled | manager_approved


  // per-row action loading (for finalize tick)
  const [finalizing, setFinalizing] = useState({});


  // Leave Balance (from API)
  const [leaveBalanceData, setLeaveBalanceData] = useState([]);
  const [loadingLeaveBalance, setLoadingLeaveBalance] = useState(true);
  const [leaveBalanceError, setLeaveBalanceError] = useState(null);
  const [leaveBalanceSearch, setLeaveBalanceSearch] = useState('');


  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);


  // Reset page on tab/date/filter/search change
  useEffect(() => setCurrentPage(1), [activeTab, selectedDate, attendanceStatusFilter, leaveStatusFilter, attendanceSearch, leaveSearch, leaveBalanceSearch]);


  // ------------------ FETCH: Attendance ------------------
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
          `${API_CONFIG.BASE_URL}/api/v1/attendance?date=${selectedDate}`,
          { withCredentials: true }
        );
        setDailyAttendanceData(res.data.records || []);
      } catch (error) {
        console.error("Error fetching attendance:", error);
        const status = error.response?.status;
        const msg = error.response?.data?.message || error.response?.data?.msg;
        if (status === 403 || status === 401) {
          setAttendanceError(
            msg || "You don't have permission to view attendance. Contact HR or admin to get access."
          );
        } else if (msg) {
          setAttendanceError(msg);
        } else {
          setAttendanceError("Could not fetch attendance. Please try again or contact support.");
        }
      } finally {
        setLoadingAttendance(false);
      }
    };
    fetchAttendance();
  }, [selectedDate]);


  // ------------------ FETCH: Leaves ------------------
  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/leave/all`, {
          withCredentials: true,
        });
        if (Array.isArray(res.data.leaves)) {
          setLeaveRequestData(res.data.leaves);
        } else {
          throw new Error("Unexpected response structure");
        }
      } catch (err) {
        console.error("Error fetching leave requests", err);
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.response?.data?.msg;
        if (status === 403 || status === 401) {
          setLeaveError(
            msg || "You don't have permission to view leave data. Contact HR or admin to get access."
          );
        } else if (msg) {
          setLeaveError(msg);
        } else {
          setLeaveError("Could not fetch leave data. Please try again or contact support.");
        }
      } finally {
        setLoadingLeaves(false);
      }
    };
    fetchLeaveRequests();
  }, []);


  // ------------------ FETCH: Leave Balance ------------------
  useEffect(() => {
    const fetchLeaveBalance = async () => {
      try {
        setLoadingLeaveBalance(true);
        setLeaveBalanceError(null);
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/leave/balance`, {
          withCredentials: true,
        });
        if (res.data?.success && Array.isArray(res.data.data)) {
          setLeaveBalanceData(res.data.data);
        } else {
          setLeaveBalanceData([]);
        }
      } catch (err) {
        console.error("Error fetching leave balance:", err);
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.response?.data?.msg;
        if (status === 403 || status === 401) {
          setLeaveBalanceError(
            msg || "You don't have permission to view leave balance. Contact HR or admin to get access."
          );
        } else if (msg) {
          setLeaveBalanceError(msg);
        } else {
          setLeaveBalanceError("Could not fetch leave balance. Please try again or contact support.");
        }
        setLeaveBalanceData([]);
      } finally {
        setLoadingLeaveBalance(false);
      }
    };
    fetchLeaveBalance();
  }, []);


  // ------------------ HELPERS ------------------
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    if (typeof dateString === 'string' && dateString.includes('-') && dateString.split('-').length === 3) {
      const [d,m,y] = dateString.split('-');
      if (d?.length === 2 && m?.length === 2 && y?.length === 4) return dateString;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString || '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };


  const getAttendanceBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'present':  return 'bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold';
      case 'half day': return 'bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold';
      case 'absent':   return 'bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold';
      default:         return 'bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold';
    }
  };


  // normalize status to snake_case lowercase
  const normalizeStatus = (s) =>
    (s || 'pending')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[ -]+/g, '_'); // spaces/dash => underscore


  // label pretty
  const prettyStatus = (sRaw) => {
    const s = normalizeStatus(sRaw);
    if (s === 'manager_approved') return 'Manager approved';
    if (s === 'half_day') return 'Half Day';
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };


  // Leave status chip (badge)
  const LeaveStatusChip = ({ status }) => {
    const s = normalizeStatus(status);
    const base = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold';
    const cls =
      s === 'approved'         ? 'bg-green-100 text-green-800' :
      s === 'rejected'         ? 'bg-red-100 text-red-800'     :
      s === 'cancelled'        ? 'bg-gray-100 text-gray-700'   :
      s === 'manager_approved' ? 'bg-yellow-100 text-yellow-700' :
                                 'bg-blue-100 text-blue-700'; // pending / others
    return <span className={`${base} ${cls}`}>{prettyStatus(status)}</span>;
  };


  // FINALIZE: only for manager_approved -> make approved
  const finalizeApprove = async (leaveId) => {
    const reviewer = JSON.parse(sessionStorage.getItem("user"))?.empId;
    if (!reviewer) return alert("Session expired");


    try {
      setFinalizing(prev => ({ ...prev, [leaveId]: true }));
      await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/leave/status/${leaveId}`,
        { status: 'approved', reviewedBy: reviewer },
        { withCredentials: true }
      );
      // Update UI: manager_approved -> approved
      setLeaveRequestData(prev =>
        prev.map(r => (r._id === leaveId ? { ...r, status: 'approved' } : r))
      );
    } catch (err) {
      console.error('Finalize approve failed', err);
      alert('Failed to approve');
    } finally {
      setFinalizing(prev => ({ ...prev, [leaveId]: false }));
    }
  };


  // ACTION CELL:
  // - if status == manager_approved -> show green tick button (to finalize)
  // - else -> show "—"
  const LeaveActionCell = ({ row }) => {
    const s = normalizeStatus(row.status);
    if (s === 'manager_approved') {
      const busy = !!finalizing[row._id];
      return (
        <button
          onClick={() => finalizeApprove(row._id)}
          disabled={busy}
          className={`inline-flex items-center justify-center p-2 rounded-lg ring-1 ring-inset transition
            ${busy ? 'bg-gray-100 ring-gray-200 cursor-not-allowed'
                   : 'bg-green-50 ring-green-200 hover:bg-green-100'}`}
          title="Finalize Approve"
        >
          {busy ? (
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <img src={GreenCheck} alt="Approve" className="w-4 h-4" />
          )}
        </button>
      );
    }
    // koi action nahi
    return <span className="text-gray-400">—</span>;
  };


  // Filters
  const attendanceFiltered = dailyAttendanceData.filter(r => {
    const matchText = (attendanceSearch || '').trim().toLowerCase();
    const str = `${r.empId || ''} ${r.empName || ''} ${r.department || ''} ${r.role || ''}`.toLowerCase();
    const okSearch = matchText ? str.includes(matchText) : true;
    const st = (r.status || '').toLowerCase();
    const okStatus = attendanceStatusFilter === 'all' ? true : st === attendanceStatusFilter;
    return okSearch && okStatus;
  });


  const leaveFiltered = leaveRequestData.filter(r => {
    // Exclude automatic half-day leaves
    const reason = (r.reason || '').toLowerCase();
    if (reason.includes('automatic half-day leave due to incomplete daily targets')) {
      return false;
    }
    
    const matchText = (leaveSearch || '').trim().toLowerCase();
    const str = `${r.empId || ''} ${r.empName || ''} ${r.leaveType || ''} ${r.department || ''} ${r.role || ''}`.toLowerCase();
    const okSearch = matchText ? str.includes(matchText) : true;
    const st = normalizeStatus(r.status || 'pending'); // normalized
    const okStatus = leaveStatusFilter === 'all' ? true : st === leaveStatusFilter;
    return okSearch && okStatus;
  });


  const leaveBalanceFiltered = leaveBalanceData.filter(r => {
    const matchText = (leaveBalanceSearch || '').trim().toLowerCase();
    if (!matchText) return true;
    const str = `${r.empId || ''} ${r.name || ''}`.toLowerCase();
    return str.includes(matchText);
  });


  // Pagination helpers on filtered lists
  const paginated = (arr) => {
    const start = (currentPage - 1) * recordsPerPage;
    const end   = start + recordsPerPage;
    return arr.slice(start, end);
  };


  const currentData = activeTab === 'dailyAttendance'
    ? attendanceFiltered
    : activeTab === 'leaveRequest'
    ? leaveFiltered
    : leaveBalanceFiltered;


  const totalPages = Math.max(1, Math.ceil(currentData.length / recordsPerPage));
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex   = Math.min(startIndex + recordsPerPage, currentData.length);

  // Smart pagination: show limited page numbers
  const getPageNumbers = () => {
    const maxVisible = 7; // Maximum number of page buttons to show
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages = [];
    const halfVisible = Math.floor(maxVisible / 2);
    
    if (currentPage <= halfVisible + 1) {
      // Near the start
      for (let i = 1; i <= maxVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    } else if (currentPage >= totalPages - halfVisible) {
      // Near the end
      pages.push(1);
      for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // In the middle
      pages.push(1);
      for (let i = currentPage - halfVisible + 1; i <= currentPage + halfVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    }
    
    return pages;
  };


  // Stats Cards (LeaveApproval-style)
  const StatsHeader = () => {
    if (activeTab === 'dailyAttendance') {
      const present = attendanceFiltered.filter(x => (x.status || '').toLowerCase() === 'present').length;
      const halfday = attendanceFiltered.filter(x => (x.status || '').toLowerCase() === 'half day').length;
      const absent  = attendanceFiltered.filter(x => (x.status || '').toLowerCase() === 'absent').length;
      const total   = attendanceFiltered.length;


      return (
        <div className="flex flex-wrap items-center gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Records</p>
                <p className="text-xl font-bold text-gray-800">{total}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-xl font-bold text-green-600">{present}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Half Day</p>
                <p className="text-xl font-bold text-yellow-600">{halfday}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-xl font-bold text-red-600">{absent}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }


    if (activeTab === 'leaveRequest') {
      const total    = leaveFiltered.length;
      const pending  = leaveFiltered.filter(x => normalizeStatus(x.status || 'pending') === 'pending').length;
      const approved = leaveFiltered.filter(x => normalizeStatus(x.status) === 'approved').length;
      const rejected = leaveFiltered.filter(x => normalizeStatus(x.status) === 'rejected').length;


      return (
        <div className="flex flex-wrap items-center gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-xl font-bold text-gray-800">{total}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{pending}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-xl font-bold text-green-600">{approved}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-xl font-bold text-red-600">{rejected}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }


    // Leave Balance
    return (
      <div className="flex flex-wrap items-center gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <User className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Employees</p>
              <p className="text-xl font-bold text-gray-800">{leaveBalanceFiltered.length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };


  // ------------------ RENDER ------------------
 
  // Show loader on initial load
  if (loadingAttendance && loadingLeaves) {
    return (
      <div className="p-6">
        <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Attendance & Leave Data...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch the information</p>
          </div>
        </div>
      </div>
    );
  }
 
  return (
    <div className="p-6">
      {/* Tabs (simple) */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'dailyAttendance', label: 'Daily Attendance' },
          { key: 'leaveRequest', label: 'Leave Request' },
          { key: 'leaveBalance', label: 'Leave Balance' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-full border transition ${
              activeTab === t.key ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-800 border-gray-300 hover:bg-blue-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>


      {/* Header Stats — LeaveApproval-style */}
      <StatsHeader />


      {/* Search / Filters — LeaveApproval-style */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Left: search */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={
                activeTab === 'dailyAttendance'
                  ? 'Search by employee name, ID, dept, role...'
                  : activeTab === 'leaveRequest'
                  ? 'Search by employee, leave type, dept, role...'
                  : 'Search by employee name or ID...'
              }
              value={activeTab === 'dailyAttendance' ? attendanceSearch : activeTab === 'leaveRequest' ? leaveSearch : leaveBalanceSearch}
              onChange={(e) => {
                if (activeTab === 'dailyAttendance') setAttendanceSearch(e.target.value);
                else if (activeTab === 'leaveRequest') setLeaveSearch(e.target.value);
                else setLeaveBalanceSearch(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>


          {/* Right: filters */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="text-gray-400 hidden md:block" size={18} />
            {activeTab === 'dailyAttendance' && (
              <>
                <select
                  value={attendanceStatusFilter}
                  onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="half day">Half Day</option>
                  <option value="absent">Absent</option>
                </select>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}
            {activeTab === 'leaveRequest' && (
              <select
                value={leaveStatusFilter}
                onChange={(e) => setLeaveStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="manager_approved">Manager Approved</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}
          </div>
        </div>
      </div>


      {/* Tables — LeaveApproval-style */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                {activeTab === 'dailyAttendance' && (
                  <>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Date</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Emp ID</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Emp Name</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Log In</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Log Out</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Total Hrs</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Dept</th>
                  </>
                )}
                {activeTab === 'leaveRequest' && (
                  <>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Date</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Emp ID</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Emp Name</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">From</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">To</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Leave Type</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Reason</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Dept</th>
                    {/* Status */}
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    {/* Action */}
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
                  </>
                )}
                {activeTab === 'leaveBalance' && (
                  <>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Emp ID</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Emp Name</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Casual Leave</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Sick Leave</th>
                    <th className="text-left py-4 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">Total Leave</th>
                  </>
                )}
              </tr>
            </thead>


            <tbody>
              {/* Loading state */}
              {((activeTab === 'dailyAttendance' && loadingAttendance) ||
                (activeTab === 'leaveRequest' && loadingLeaves) ||
                (activeTab === 'leaveBalance' && loadingLeaveBalance)) && (
                <tr>
                  <td colSpan={activeTab === 'dailyAttendance' ? 8 : activeTab === 'leaveRequest' ? 10 : 5} className="py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-600">
                        {activeTab === 'dailyAttendance' ? 'Loading attendance...' : activeTab === 'leaveRequest' ? 'Loading leave requests...' : 'Loading leave balance...'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}


              {/* Error state */}
              {((activeTab === 'dailyAttendance' && attendanceError) ||
                (activeTab === 'leaveRequest' && leaveError) ||
                (activeTab === 'leaveBalance' && leaveBalanceError)) && (
                <tr>
                  <td colSpan={activeTab === 'dailyAttendance' ? 8 : activeTab === 'leaveRequest' ? 10 : 5} className="py-12">
                    <div className="text-center">
                      <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
                      <p className="text-red-600">
                        {activeTab === 'dailyAttendance' ? attendanceError : activeTab === 'leaveRequest' ? leaveError : leaveBalanceError}
                      </p>
                    </div>
                  </td>
                </tr>
              )}


              {/* Empty / Data rows */}
              {activeTab === 'dailyAttendance' && !loadingAttendance && !attendanceError && (
                attendanceFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No attendance data found.</p>
                      <p className="text-gray-400 text-sm">Try another date or search criteria.</p>
                    </td>
                  </tr>
                ) : (
                  paginated(attendanceFiltered).map((row, idx) => (
                    <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-4 px-6 text-gray-700">{formatDate(row.date)}</td>
                      <td className="py-4 px-6 text-blue-700 font-medium">{row.empId}</td>
                      <td className="py-4 px-6 text-gray-800">{row.empName}</td>
                      <td className="py-4 px-6 text-gray-700">{row.loginTime || '— — — —'}</td>
                      <td className="py-4 px-6 text-gray-700">{row.logoutTime || '— — — —'}</td>
                      <td className="py-4 px-6 text-gray-700">{row.totalTime || ''}</td>
                      <td className="py-4 px-6"><span className={getAttendanceBadge(row.status)}>{row.status}</span></td>
                      <td className="py-4 px-6 text-gray-700">{row.department}</td>
                    </tr>
                  ))
                )
              )}


              {activeTab === 'leaveRequest' && !loadingLeaves && !leaveError && (
                leaveFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No leave requests found.</p>
                      <p className="text-gray-400 text-sm">When employees submit leave, they will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  paginated(leaveFiltered).map((row, idx) => (
                    <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-4 px-6 text-gray-700">{formatDate(row.appliedAt)}</td>
                      <td className="py-4 px-6 text-blue-700 font-medium">{row.empId}</td>
                      <td className="py-4 px-6 text-gray-800">{row.empName || 'N/A'}</td>
                      <td className="py-4 px-6 text-gray-700">{formatDate(row.fromDate)}</td>
                      <td className="py-4 px-6 text-gray-700">{formatDate(row.toDate)}</td>
                      <td className="py-4 px-6 text-gray-700">{row.leaveType}</td>
                      <td className="py-4 px-6 text-gray-700 max-w-xs">
                        <div className="truncate" title={row.reason || 'N/A'}>
                          {row.reason || 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-700">{row.department || 'N/A'}</td>
                      {/* Status */}
                      <td className="py-4 px-6"><LeaveStatusChip status={row.status} /></td>
                      {/* Action: only if manager_approved */}
                      <td className="py-4 px-6"><LeaveActionCell row={row} /></td>
                    </tr>
                  ))
                )
              )}


              {activeTab === 'leaveBalance' && !loadingLeaveBalance && !leaveBalanceError && (
                leaveBalanceFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No leave balance data available.</p>
                      <p className="text-gray-400 text-sm">Try a different search or check back later.</p>
                    </td>
                  </tr>
                ) : (
                  paginated(leaveBalanceFiltered).map((row, idx) => (
                    <tr key={row.empId || idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-4 px-6 text-blue-700 font-medium">{row.empId}</td>
                      <td className="py-4 px-6 text-gray-800">{row.name}</td>
                      <td className="py-4 px-6 text-gray-700">{row.casualLeave}</td>
                      <td className="py-4 px-6 text-gray-700">{row.sickLeave}</td>
                      <td className="py-4 px-6 text-gray-700">{row.totalLeave}</td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>


        {/* Pagination — LeaveApproval-style */}
        {currentData.length > 0 && (
          <div className="flex justify-between items-center mt-6 bg-white rounded-2xl p-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {endIndex} of {currentData.length} results
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ArrowLeft size={16} /> Previous
                </button>


                <div className="hidden md:flex items-center gap-1">
                  {getPageNumbers().map((page, idx, arr) => {
                    // Add ellipsis between non-consecutive pages
                    const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsisBefore && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            currentPage === page ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>


                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


export default HRManagementSystem;
