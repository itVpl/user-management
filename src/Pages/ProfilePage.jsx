import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import TermsAndConditions from "../Components/TermsAndConditions";
import API_CONFIG from "../config/api";

/* ---------- Helpers ---------- */
const todayISO = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// date -> DD-MM-YYYY (kept from your code)
const formatDateDDMMYYYY = (input) => {
  if (!input) return "";
  const s = String(input);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  if (isNaN(d)) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const formatTimeHM = (iso) => {
  if (!iso) return "--";
  const d = new Date(iso);
  if (isNaN(d)) return "--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const inRange = (d, start, end) => d >= start && d <= end;
const overlapRanges = (aStart, aEnd, bStart, bEnd) =>
  inRange(aStart, bStart, bEnd) ||
  inRange(aEnd, bStart, bEnd) ||
  inRange(bStart, aStart, aEnd) ||
  inRange(bEnd, aStart, aEnd);

/* =================================== */

const ProfilePage = () => {
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState("attendance");
  const [termsAccepted, setTermsAccepted] = useState(true); // Default to true since user is authenticated

  // Leave state
  const [leaveType, setLeaveType] = useState("");
  const [halfDayType, setHalfDayType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaveMessage, setLeaveMessage] = useState("");
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveErrors, setLeaveErrors] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  // Leave pagination
  const [leavePage, setLeavePage] = useState(1);
  const recordsPerPage = 5;

  // Attendance state (default = today)
  const [attendanceDate, setAttendanceDate] = useState(() => todayISO());
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [attendanceSessionPage, setAttendanceSessionPage] = useState(1);
  const sessionsPerPage = 5;

  // HR Activity state (kept from your code)
  const [callLogs, setCallLogs] = useState([]);
  const [activityName, setActivityName] = useState("");
  const [activityMobileNo, setActivityMobileNo] = useState("");
  const [activityTotalExp, setActivityTotalExp] = useState("");
  const [activityCurrentLocation, setActivityCurrentLocation] = useState("");
  const [activityCurrentCompany, setActivityCurrentCompany] = useState("");
  const [activityCurrentSalary, setActivityCurrentSalary] = useState("");
  const [activityNoticePeriod, setActivityNoticePeriod] = useState("");
  const [activityEmail, setActivityEmail] = useState("");
  const [activityComment, setActivityComment] = useState("");
  const [activityPurpose, setActivityPurpose] = useState("");
  const [activityDuration, setActivityDuration] = useState("");
  const [activityNotes, setActivityNotes] = useState("");
  const [activityColor, setActivityColor] = useState("blue");
  const COLOR_OPTIONS = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'gray', 'black', 'white'];
  const [activityDate, setActivityDate] = useState(() => todayISO());
  const [submitting, setSubmitting] = useState(false);

  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const empId = userStr ? JSON.parse(userStr).empId : null;

  // Refs for clickable inputs
  const attDateRef = useRef(null);
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const openPicker = (ref) => {
    if (!ref?.current) return;
    ref.current.focus();
    if (typeof ref.current.showPicker === "function") ref.current.showPicker();
  };

  /* ========= API helpers ========= */
  const authHeader = () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    return { withCredentials: true, headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchLeaveHistory = async () => {
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/leave/my`, authHeader());
      if (res.data.success) setLeaveHistory(res.data.leaves || []);
      else setLeaveHistory([]);
    } catch (err) {
      setLeaveHistory([]);
    }
  };

  const fetchLeaveBalance = async () => {
    if (!empId) return;
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/leave/balance/${empId}`, authHeader());
      if (res.data.success) setLeaveBalance(res.data);
      else setLeaveBalance(null);
    } catch (err) {
      setLeaveBalance(null);
    }
  };

  const fetchAttendanceData = async (date) => {
    const d = date || attendanceDate;
    if (!d || !empId) return;
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/activity/user/${empId}?date=${d}`, authHeader());
      if (res.data.success) setAttendanceRecord(res.data);
      else setAttendanceRecord(null);
    } catch {
      setAttendanceRecord(null);
    }
  };

  const fetchCallLogs = async (date) => {
    try {
      if (!date) return;
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/hr-activity/call/date?date=${date}`,
        authHeader()
      );
      if (res.data.success && Array.isArray(res.data.data)) setCallLogs(res.data.data);
      else setCallLogs([]);
    } catch {}
  };


  /* ========= Bootstrap ========= */
  useEffect(() => {
    const today = todayISO();
    setActivityDate(today);
    setAttendanceDate(today); // Attendance: default select today
    fetchCallLogs(today);
  }, []);

  useEffect(() => {
    if (!empId) return;
    axios
      .get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/${empId}`, authHeader())
      .then((res) => {
        if (res.data.success) setEmployee(res.data.employee);
      })
      .then(fetchLeaveHistory)
      .then(fetchLeaveBalance)
      .then(() => fetchAttendanceData(todayISO()))
      .catch(() => {});
  }, [empId]);

  useEffect(() => {
    if (activeTab === "leave" && empId) {
      fetchLeaveBalance();
    }
  }, [activeTab, empId]);

  // Reset leave page when filtered leaves change
  useEffect(() => {
    const filteredLeaves = leaveHistory.filter(leave => {
      const reason = String(leave.reason || "").toLowerCase();
      return !reason.includes("automatic half-day leave") && !reason.includes("incomplete daily");
    });
    const maxPage = Math.ceil(filteredLeaves.length / recordsPerPage);
    if (leavePage > maxPage && maxPage > 0) {
      setLeavePage(1);
    }
  }, [leaveHistory]);

  useEffect(() => {
    if (empId && attendanceDate) {
      fetchAttendanceData(attendanceDate);
      setAttendanceSessionPage(1); // Reset to first page when date changes
    }
  }, [attendanceDate, empId]);

  /* ========= Attendance computed fields ========= */
  // Helper function to parse DD-MM-YYYY HH:mm:ss format to Date
  const parseDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return null;
    // Format: "15-12-2025 15:33:56"
    const parts = dateTimeStr.split(' ');
    if (parts.length !== 2) return null;
    const [datePart, timePart] = parts;
    const [day, month, year] = datePart.split('-');
    return new Date(`${year}-${month}-${day}T${timePart}`);
  };

  // Extract login/logout times from new API structure
  const firstLoginTime = attendanceRecord?.timings?.firstLoginTime || null;
  const lastLogoutTime = attendanceRecord?.timings?.lastLogoutTime || null;
  const loginTimeDisp = firstLoginTime ? (() => {
    const d = parseDateTime(firstLoginTime);
    return d ? formatTimeHM(d.toISOString()) : firstLoginTime.split(' ')[1]?.slice(0, 5) || "--";
  })() : "--";
  const logoutTimeDisp = lastLogoutTime ? (() => {
    const d = parseDateTime(lastLogoutTime);
    return d ? formatTimeHM(d.toISOString()) : lastLogoutTime.split(' ')[1]?.slice(0, 5) || "--";
  })() : "--";

  // Use sessions directly from new API
  const filteredSessions = attendanceRecord?.sessions || [];

  /* ========= Leave validations ========= */
  const validateLeave = () => {
    const errs = { leaveType: "", fromDate: "", toDate: "", reason: "" };
    let ok = true;

    // exact messages per tester
    if (!leaveType) {
      errs.leaveType = "Please enter the select leave type";
      ok = false;
    }
    if (!fromDate) {
      errs.fromDate = "Please  select the From date";
      ok = false;
    }
    if (!toDate) {
      errs.toDate = "Please  select the To date";
      ok = false;
    }
    if (fromDate && toDate && toDate < fromDate) {
      // spec wants the same message, even for invalid ordering
      errs.toDate = "Please  select the To date";
      ok = false;
    }
    if (!reason.trim()) {
      errs.reason = "Please  enter the reason .";
      ok = false;
    }
    if (leaveType === "half-day" && !halfDayType) {
      setLeaveMessage("Please select half-day type.");
      ok = false;
    }
    setLeaveErrors(errs);
    return ok;
  };

  const isOverlappingWithExisting = (start, end) => {
    if (!Array.isArray(leaveHistory) || !leaveHistory.length) return false;
    const s = String(start).slice(0, 10);
    const e = String(end).slice(0, 10);
    return leaveHistory.some((lv) => {
      const ls = String(lv.fromDate).slice(0, 10);
      const le = String(lv.toDate).slice(0, 10);
      return overlapRanges(s, e, ls, le);
    });
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setLeaveMessage("");

    if (!validateLeave()) return;

    // block past dates
    const tdy = todayISO();
    if ((fromDate && fromDate < tdy) || (toDate && toDate < tdy)) {
      setLeaveMessage("Past dates are not allowed.");
      return;
    }

    // one leave at a time (no overlap)
    if (isOverlappingWithExisting(fromDate, toDate)) {
      setLeaveMessage("You have already applied for leave during these dates.");
      return;
    }

    try {
      setLeaveSubmitting(true);
      const payload = {
        empId,
        leaveType: leaveType === "half-day" ? "half-day" : leaveType.toLowerCase().replace(" ", ""),
        halfDayType: leaveType === "half-day" ? halfDayType : undefined,
        fromDate,
        toDate,
        reason: reason.trim(),
      };

      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/leave/apply-with-balance`,
        payload,
        authHeader()
      );

      if (res.data.success) {
        setLeaveMessage("Leave request submitted successfully.");
        setLeaveType("");
        setHalfDayType("");
        setFromDate("");
        setToDate("");
        setReason("");
        fetchLeaveHistory();
        fetchLeaveBalance();
      } else {
        setLeaveMessage(res.data?.message || "Something went wrong.");
      }
    } catch (error) {
      const msg = error?.response?.data?.message || "Failed to submit leave request.";
      setLeaveMessage(msg);
    } finally {
      setLeaveSubmitting(false);
    }
  };

  /* ========= HR Call Submit (unchanged) ========= */
  const submitCallActivity = async (e) => {
    e.preventDefault();
    if (!activityName.trim()) return alert("Name is required");
    if (!activityMobileNo.trim()) return alert("Mobile No is required");
    if (!activityPurpose.trim()) return alert("Purpose is required");
    if (!activityDuration || Number(activityDuration) <= 0)
      return alert("Duration (mins) must be > 0");
    if (!activityDate) return alert("Activity date is required");

    try {
      setSubmitting(true);
      const payload = {
        name: activityName.trim(),
        mobileNo: activityMobileNo.trim(),
        totalExp: activityTotalExp.trim(),
        currentLocation: activityCurrentLocation.trim(),
        currentCompany: activityCurrentCompany.trim(),
        currentSalary: activityCurrentSalary.trim(),
        noticePeriod: activityNoticePeriod.trim(),
        email: activityEmail.trim(),
        comment: activityComment.trim(),
        purpose: activityPurpose.trim(),
        duration: Number(activityDuration),
        activityDate,
        notes: activityNotes.trim(),
        color: activityColor,
      };

      await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/hr-activity/call/create`,
        payload,
        authHeader()
      );

      fetchCallLogs(activityDate);

      setActivityName("");
      setActivityMobileNo("");
      setActivityTotalExp("");
      setActivityCurrentLocation("");
      setActivityCurrentCompany("");
      setActivityCurrentSalary("");
      setActivityNoticePeriod("");
      setActivityEmail("");
      setActivityComment("");
      setActivityPurpose("");
      setActivityDuration("");
      setActivityNotes("");
      setActivityColor("red");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to submit call activity");
    } finally {
      setSubmitting(false);
    }
  };

  /* ========= CSV Export Function ========= */
  const exportToCSV = () => {
    if (!callLogs.length) {
      alert("No data to export");
      return;
    }

    // CSV headers
    const headers = [
      "Name",
      "Mobile No",
      "Total Experience",
      "Current Location",
      "Current Company",
      "Current Salary",
      "Notice Period",
      "Email",
      "Comment",
      "Purpose",
      "Duration (mins)",
      "Date",
      "Notes"
    ];

    // Convert data to CSV format
    const csvData = callLogs.map(log => {
      const cd = log.callDetails || {};
      const get = (k) => cd[k] ?? log[k] ?? "";
      
      return [
        get("name"),
        get("mobileNo"),
        get("totalExp"),
        get("currentLocation"),
        get("currentCompany"),
        get("currentSalary"),
        get("noticePeriod"),
        get("email"),
        get("comment"),
        get("purpose"),
        cd.duration ?? log.duration ?? "",
        cd.activityDate ?? log.activityDate ?? log.date ?? "",
        cd.notes ?? log.notes ?? ""
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => 
        row.map(field => 
          typeof field === "string" && field.includes(",") 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(",")
      )
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `HR_Daily_Activity_${activityDate || new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ================= UI ================= */

  if (!employee) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-10 h-10 border-b-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }


  /* ============ Render ============ */
  return (
    <div className="p-4 pt-2 bg-gradient-to-b from-slate-100 to-blue-50 min-h-screen font-sans">
      <div className="relative w-full h-32 bg-gradient-to-r from-indigo-200 to-indigo-400 rounded-xl shadow-md">
        <div className="absolute -bottom-10 left-6 w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
          <img
            src="https://cdn-icons-png.flaticon.com/512/147/147144.png"
            alt="Profile"
            className="object-cover w-full h-full"
          />
        </div>
      </div>

      <div className="flex justify-between items-center mt-12 px-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{employee.employeeName || "No Name"}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {employee.designation || "Employee"} • {formatDateDDMMYYYY(employee.dateOfJoining)} • {employee.empId || ""}
          </p>
        </div>
        <span className="text-green-500 font-semibold text-sm">● {employee.status || "Active"}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 px-4 mt-4">
        <div className="bg-white p-4 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-indigo-200 transition duration-300 ease-in-out">
          <h2 className="text-xl font-semibold mb-4 text-indigo-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 0a6 6 0 00-6 6v1a6 6 0 1012 0V6a6 6 0 00-6-6zM4 7v-.96A6.98 6.98 0 001 12c0 3.866 3.134 7 7 7h4a7 7 0 007-7 6.98 6.98 0 00-3-5.96V7a8 8 0 11-16 0z" />
            </svg>
            About
          </h2>
          <ul className="text-sm text-gray-700 space-y-3">
            <li><span className="font-semibold text-gray-900">Full Name:</span> {employee.employeeName}</li>
            <li><span className="font-semibold text-gray-900">Gender:</span> {employee.sex || "N/A"}</li>
            <li><span className="font-semibold text-gray-900">Department:</span> {employee.department || "N/A"}</li>
          </ul>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-indigo-200 transition duration-300 ease-in-out">
          <h2 className="text-lg font-semibold mb-3 text-indigo-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 3h20v18H2V3zm11 16h7V5h-7v14zM4 5v14h7V5H4z" />
            </svg>
            Contacts
          </h2>
          <ul className="text-sm text-gray-700 space-y-3">
            <li><span className="font-semibold text-gray-900">Contact:</span> {employee.mobileNo || "--"}</li>
            <li><span className="font-semibold text-gray-900">Alternative Contact:</span> {employee.alternateNo || "--"}</li>
            <li><span className="font-semibold text-gray-900">Email:</span> {employee.email || "--"}</li>
          </ul>
        </div>
      </div>

      <div className="px-4 mt-6">
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2 cursor-pointer rounded-md font-semibold ${activeTab === "attendance" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 border border-indigo-300"}`}
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={`px-4 py-2 cursor-pointer rounded-md font-semibold ${activeTab === "leave" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 border border-indigo-300"}`}
          >
            Leave
          </button>
          <button
            onClick={() => setActiveTab("terms")}
            className={`px-4 py-2 cursor-pointer rounded-md font-semibold ${activeTab === "terms" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 border border-indigo-300"}`}
          >
            Terms and Conditions
          </button>
          {employee?.department === "HR" && (
            <button
              onClick={() => setActiveTab("hrActivity")}
              className={`px-4 py-2 cursor-pointer rounded-md font-semibold ${activeTab === "hrActivity" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 border border-indigo-300"}`}
            >
              HR Daily Activity
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">

          {/* ================= LEAVE TAB ================= */}
          {activeTab === "leave" && (
            <div className="grid grid-cols-3 gap-4">
              {/* Leave Balance Card - Quarterly Information Only */}
              <div className="col-span-3 bg-gradient-to-br from-white to-indigo-50 p-5 rounded-2xl shadow-xl border border-indigo-200 mb-3">
                <h2 className="text-2xl font-bold text-indigo-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Leave Balance
                </h2>
                {leaveBalance?.quarterlyInfo ? (
                  <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-6 rounded-xl border border-indigo-200">
                    <div className="text-lg font-semibold text-indigo-800 mb-4">Quarterly Information</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-600 mb-1">Current Quarter</div>
                        <div className="text-lg font-bold text-indigo-700">{leaveBalance.quarterlyInfo.currentQuarter}</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-600 mb-1">Quarter Period</div>
                        <div className="text-sm font-bold text-indigo-700">
                          {leaveBalance.quarterlyInfo.quarterStartDate} to {leaveBalance.quarterlyInfo.quarterEndDate}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-600 mb-1">Quarterly Used</div>
                        <div className="text-lg font-bold text-indigo-700">
                          {leaveBalance.quarterlyInfo.quarterlyUsed} / {leaveBalance.quarterlyInfo.quarterlyLimit}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-600 mb-1">Last Allocation</div>
                        <div className="text-sm font-bold text-indigo-700">{leaveBalance.quarterlyInfo.lastMonthlyAllocation}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">Loading quarterly information...</div>
                )}
              </div>

              <div className="col-span-1 bg-gradient-to-br from-white to-indigo-50 p-5 rounded-2xl shadow-xl border border-indigo-200 hover:shadow-2xl transition-all duration-300">
                <h2 className="text-xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6 2a2 2 0 00-2 2v2h12V4a2 2 0 00-2-2H6zM4 8v8a2 2 0 002 2h8a2 2 0 002-2V8H4z" />
                    </svg>
                  </div>
                  Apply for Leave
                </h2>

                <form className="space-y-6" onSubmit={handleLeaveSubmit}>
                  {/* Leave Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Leave Type <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={leaveType}
                        onChange={(e) => { setLeaveType(e.target.value); setLeaveErrors((p)=>({...p, leaveType:""})); }}
                        className={`w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-gray-50 border-2 ${leaveErrors.leaveType ? "border-red-400" : "border-indigo-200"} focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 appearance-none cursor-pointer text-gray-700 font-medium shadow-sm`}
                      >
                        <option value="">Select Leave Type</option>
                        <option value="casual">Casual Leave</option>
                        <option value="sick">Sick Leave</option>
                        <option value="half-day">Half Day</option>
                        <option value="custom">Custom Leave</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    {leaveErrors.leaveType && <p className="text-red-600 text-xs mt-1">{leaveErrors.leaveType}</p>}
                  </div>

                  {/* Half Day Type */}
                  {leaveType === "half-day" && (
                    <div className="animate-fadeIn bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Half Day Type <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={halfDayType}
                          onChange={(e) => setHalfDayType(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-blue-50 border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 appearance-none cursor-pointer text-gray-700 font-medium shadow-sm"
                        >
                          <option value="">Select Half Day Type</option>
                          <option value="first_half">First Half</option>
                          <option value="second_half">Second Half</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-blue-700 bg-blue-100 px-4 py-3 rounded-xl border border-blue-200">
                        💡 Tip: First Half is typically 5:30 PM - 10:00 PM, Second Half is 10:00 PM - 2:30 AM
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div onClick={() => openPicker(fromRef)} className="relative cursor-pointer">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        From Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={fromRef}
                        type="date"
                        value={fromDate}
                        min={todayISO()} // past dates blocked
                        onChange={(e) => {
                          const v = e.target.value;
                          setFromDate(v);
                          if (toDate && toDate < v) setToDate(v);
                          setLeaveErrors((p)=>({...p, fromDate:""}));
                        }}
                        className={`w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-green-50 border-2 ${leaveErrors.fromDate ? "border-red-400" : "border-green-200"} focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm`}
                      />
                      {leaveErrors.fromDate && <p className="text-red-600 text-xs mt-1">{leaveErrors.fromDate}</p>}
                    </div>

                    <div onClick={() => openPicker(toRef)} className="relative cursor-pointer">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        To Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={toRef}
                        type="date"
                        value={toDate}
                        min={fromDate || todayISO()} // To >= From
                        onChange={(e) => { setToDate(e.target.value); setLeaveErrors((p)=>({...p, toDate:""})); }}
                        className={`w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-red-50 border-2 ${leaveErrors.toDate ? "border-red-400" : "border-red-200"} focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 shadow-sm`}
                      />
                      {leaveErrors.toDate && <p className="text-red-600 text-xs mt-1">{leaveErrors.toDate}</p>}
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reason for Leave <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => { setReason(e.target.value); setLeaveErrors((p)=>({...p, reason:""})); }}
                      className={`w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-purple-50 border-2 ${leaveErrors.reason ? "border-red-400" : "border-purple-200"} focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 shadow-sm resize-none`}
                      placeholder="Please provide a detailed reason for your leave request..."
                      rows="3"
                    />
                    {leaveErrors.reason && <p className="text-red-600 text-xs mt-1">{leaveErrors.reason}</p>}
                  </div>

                  {/* Banner */}
                  {leaveMessage && (
                    <div className={`p-4 rounded-xl border-2 ${leaveMessage.includes("successfully") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{leaveMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={leaveSubmitting}
                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-lg hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {leaveSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                        Submit Leave Request
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-500 mt-1">Note: Past dates are disabled. Only present & future dates allowed.</p>
                </form>
              </div>

              {/* Leave History */}
              <div className="col-span-2 bg-gradient-to-br from-white to-indigo-50 p-5 rounded-2xl shadow-xl border border-indigo-200 hover:shadow-2xl transition-all duration-300">
                {(() => {
                  // Filter out automatic half-day leaves due to incomplete tasks
                  const filteredLeaves = leaveHistory.filter(leave => {
                    const reason = String(leave.reason || "").toLowerCase();
                    return !reason.includes("automatic half-day leave") && !reason.includes("incomplete daily");
                  });
                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-indigo-800 flex items-center gap-2">
                          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          Leave History
                        </h2>
                        <div className="text-sm text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full font-medium">
                          {filteredLeaves.length} Records
                        </div>
                      </div>

                <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                        <tr>
                          <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">From Date</th>
                          <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">To Date</th>
                          <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">Leave Type</th>
                          <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">Reason</th>
                          <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredLeaves.length > 0 ? (
                          filteredLeaves
                            .slice((leavePage - 1) * recordsPerPage, leavePage * recordsPerPage)
                            .map((leave, idx) => (
                              <tr key={idx} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group">
                                <td className="py-4 px-6 text-gray-800 font-medium">
                                  {new Date(leave.fromDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td className="py-4 px-6 text-gray-800 font-medium">
                                  {new Date(leave.toDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td className="py-4 px-6">
                                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    {String(leave.leaveType).replace('-', ' ').replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-gray-700">
                                  <div className="max-w-xs truncate" title={leave.reason}>{leave.reason}</div>
                                </td>
                                <td className="py-4 px-6">
                                  <span
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                                      leave.status === "approved"
                                        ? "bg-green-100 text-green-700 border border-green-200"
                                        : leave.status === "rejected"
                                        ? "bg-red-100 text-red-700 border border-red-200"
                                        : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                    }`}
                                  >
                                    {leave.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center py-12">
                              <div className="flex flex-col items-center gap-3 text-gray-400">
                                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <p className="text-lg font-medium">No Leave History</p>
                                <p className="text-sm">You haven't applied for any leaves yet.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                      {filteredLeaves.length > recordsPerPage && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 px-2 py-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-600 font-medium">
                            Showing {((leavePage - 1) * recordsPerPage) + 1} to {Math.min(leavePage * recordsPerPage, filteredLeaves.length)} of {filteredLeaves.length} records
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                              onClick={() => setLeavePage((p) => Math.max(1, p - 1))}
                              disabled={leavePage === 1}
                            >
                              Previous
                            </button>
                            <div className="flex items-center gap-1 flex-wrap justify-center">
                              {Array.from({ length: Math.ceil(filteredLeaves.length / recordsPerPage) }, (_, i) => (
                                <button
                                  key={i}
                                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                    leavePage === i + 1
                                      ? "bg-indigo-600 text-white shadow-md"
                                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                                  }`}
                                  onClick={() => setLeavePage(i + 1)}
                                >
                                  {i + 1}
                                </button>
                              ))}
                            </div>
                            <button
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                              onClick={() => setLeavePage((p) => Math.min(Math.ceil(filteredLeaves.length / recordsPerPage), p + 1))}
                              disabled={leavePage === Math.ceil(filteredLeaves.length / recordsPerPage)}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ================= TERMS AND CONDITIONS TAB ================= */}
          {activeTab === "terms" && (
            <div className="bg-gradient-to-br from-white to-indigo-50 p-5 rounded-2xl shadow-xl border border-indigo-200 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center gap-3">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Terms and Conditions
                </h2>
              </div>
              
              <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-6">
                <TermsAndConditions 
                  onAccept={(data) => {
                    console.log('Terms accepted:', data);
                    setTermsAccepted(true);
                    // You can add any additional logic here after terms are accepted
                  }}
                  user={employee}
                  viewOnly={termsAccepted}
                />
              </div>
            </div>
          )}

          {/* ================= ATTENDANCE TAB ================= */}
          {activeTab === "attendance" && (
            <div className="col-span-3 bg-gradient-to-br from-white to-indigo-50 p-5 rounded-2xl shadow-xl border border-indigo-200 hover:shadow-2xl transition-all duration-300">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center gap-3">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Attendance Overview
                </h2>

                {/* FULL CLICKABLE DATE BOX */}
                <div className="relative group cursor-pointer" onClick={() => openPicker(attDateRef)}>
                  <label htmlFor="attendanceDate" className="absolute left-4 -top-2.5 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-0.5 rounded-full font-semibold shadow-lg">
                    📅 Select Date
                  </label>
                  <input
                    ref={attDateRef}
                    type="date"
                    id="attendanceDate"
                    className="pl-4 pr-12 py-3 w-44 text-sm border-2 border-indigo-200 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white hover:border-indigo-300 transition-all duration-200"
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    max={todayISO()}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {attendanceRecord ? (
                <>
                  <div className="mb-4 bg-white rounded-2xl p-4 shadow-lg border border-indigo-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <InfoChip title="Date" value={attendanceRecord.date || "--"} tone="blue" />
                      <InfoChip title="Login Time" value={loginTimeDisp} tone="green" />
                      <InfoChip title="Logout Time" value={logoutTimeDisp} tone="red" />
                      <InfoChip title="Total Hours" value={attendanceRecord.statistics?.totalHoursFormatted || "--"} tone="purple" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        Session Details
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700">
                          <tr>
                            <th className="py-4 px-6 font-semibold border-b border-indigo-200 text-center">Session #</th>
                            <th className="py-4 px-6 font-semibold border-b border-indigo-200 text-center">Login Time</th>
                            <th className="py-4 px-6 font-semibold border-b border-indigo-200 text-center">Logout Time</th>
                            <th className="py-4 px-6 font-semibold border-b border-indigo-200 text-center">Duration</th>
                            <th className="py-4 px-6 font-semibold border-b border-indigo-200 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSessions.length ? (
                            filteredSessions
                              .slice((attendanceSessionPage - 1) * sessionsPerPage, attendanceSessionPage * sessionsPerPage)
                              .map((session, idx) => {
                                // Parse login/logout times from DD-MM-YYYY HH:mm:ss format
                                const loginTimeStr = session.loginTime || "";
                                const logoutTimeStr = session.logoutTime || "";
                                const loginDisplay = loginTimeStr ? (() => {
                                  const parts = loginTimeStr.split(' ');
                                  return parts.length === 2 ? parts[1].slice(0, 5) : loginTimeStr;
                                })() : "--";
                                const logoutDisplay = logoutTimeStr ? (() => {
                                  const parts = logoutTimeStr.split(' ');
                                  return parts.length === 2 ? parts[1].slice(0, 5) : logoutTimeStr;
                                })() : "--";
                                
                                return (
                                  <tr key={idx} className={`transition-all duration-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                                    <td className="py-3 px-6 text-gray-800 font-medium text-center">
                                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                                        {session.sessionNumber || (attendanceSessionPage - 1) * sessionsPerPage + idx + 1}
                                      </span>
                                    </td>
                                    <td className="py-3 px-6 text-gray-800 font-medium text-center">
                                      {loginDisplay !== "--" ? `${loginDisplay} (${loginTimeStr.split(' ')[0]})` : "--"}
                                    </td>
                                    <td className="py-3 px-6 text-gray-800 font-medium text-center">
                                      {logoutDisplay !== "--" ? `${logoutDisplay} (${logoutTimeStr.split(' ')[0]})` : "--"}
                                    </td>
                                    <td className="py-3 px-6 text-center">
                                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                        ⏱️ {session.duration || "--"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-6 text-center">
                                      <span
                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                                          session.status === "completed"
                                            ? "bg-green-100 text-green-700 border border-green-200"
                                            : session.status === "active"
                                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                                            : "bg-gray-100 text-gray-700 border border-gray-200"
                                        }`}
                                      >
                                        {session.status === "completed" ? "✓" : session.status === "active" ? "●" : ""}
                                        {session.status || "--"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan={5} className="text-center text-gray-400 py-8">
                                <div className="flex flex-col items-center gap-2">
                                  <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-sm font-medium">No session data found</span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {filteredSessions.length > sessionsPerPage && (
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 px-2 py-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-600 font-medium">
                          Showing {((attendanceSessionPage - 1) * sessionsPerPage) + 1} to {Math.min(attendanceSessionPage * sessionsPerPage, filteredSessions.length)} of {filteredSessions.length} sessions
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                            onClick={() => setAttendanceSessionPage((p) => Math.max(1, p - 1))}
                            disabled={attendanceSessionPage === 1}
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1 flex-wrap justify-center">
                            {Array.from({ length: Math.ceil(filteredSessions.length / sessionsPerPage) }, (_, i) => (
                              <button
                                key={i}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                  attendanceSessionPage === i + 1
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                                }`}
                                onClick={() => setAttendanceSessionPage(i + 1)}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                          <button
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                            onClick={() => setAttendanceSessionPage((p) => Math.min(Math.ceil(filteredSessions.length / sessionsPerPage), p + 1))}
                            disabled={attendanceSessionPage === Math.ceil(filteredSessions.length / sessionsPerPage)}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-6 rounded-full">
                      <svg className="w-16 h-16 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Attendance Data Found</h3>
                      <p className="text-gray-500">No attendance data available for the selected date.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= HR ACTIVITY TAB (your original retained) ================= */}
          {activeTab === "hrActivity" && employee?.department === "HR" && (
            <div className="grid grid-cols-1 gap-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Call Form */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100">
                  <h2 className="text-lg font-semibold mb-4 text-indigo-700">Log HR Call</h2>

                  <form onSubmit={submitCallActivity} className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Name *" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityName} onChange={(e) => setActivityName(e.target.value)} />
                      <input type="text" placeholder="Mobile No *" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityMobileNo} onChange={(e) => setActivityMobileNo(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Total Experience (e.g., 5 years)" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityTotalExp} onChange={(e) => setActivityTotalExp(e.target.value)} />
                      <input type="text" placeholder="Current Location" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityCurrentLocation} onChange={(e) => setActivityCurrentLocation(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Current Company" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityCurrentCompany} onChange={(e) => setActivityCurrentCompany(e.target.value)} />
                      <input type="text" placeholder="Current Salary (e.g., 8 LPA)" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityCurrentSalary} onChange={(e) => setActivityCurrentSalary(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Notice Period (e.g., 30 days)" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityNoticePeriod} onChange={(e) => setActivityNoticePeriod(e.target.value)} />
                      <input type="email" placeholder="Email" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityEmail} onChange={(e) => setActivityEmail(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] items-start gap-4">
                      <textarea placeholder="Comment" className="w-full px-4 py-2 border rounded-lg min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityComment} onChange={(e) => setActivityComment(e.target.value)} />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Comment Color</label>
                        <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityColor} onChange={(e) => setActivityColor(e.target.value)}>
                          {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <input type="text" placeholder="Purpose *" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityPurpose} onChange={(e) => setActivityPurpose(e.target.value)} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="number" placeholder="Call Duration (mins) *" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityDuration} onChange={(e) => setActivityDuration(e.target.value)} />
                      <input type="date" placeholder="Activity Date *" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityDate} onChange={(e) => { setActivityDate(e.target.value); fetchCallLogs(e.target.value); }} />
                    </div>

                    <textarea placeholder="Notes" className="w-full px-4 py-2 border rounded-lg min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-300" value={activityNotes} onChange={(e) => setActivityNotes(e.target.value)} />

                    <button type="submit" disabled={submitting} className="bg-indigo-600 disabled:opacity-50 text-white w-full py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                      {submitting ? "Submitting..." : "Submit"}
                    </button>
                  </form>
                </div>

                {/* Call Logs */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg border border-indigo-100">
                  <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-indigo-700">Call Logs</h2>

                    <div className="flex flex-col md:flex-row gap-3 md:ml-auto">
                      <div className="relative w-full md:w-auto">
                        <label className="absolute -top-2.5 left-3 px-1 text-sm text-indigo-600 font-semibold bg-white z-10">
                          Select Date
                        </label>
                        <input
                          type="date"
                          className="px-3 py-2 rounded-lg border border-gray-300 w-full"
                          value={activityDate}
                          onChange={(e) => {
                            const d = e.target.value;
                            setActivityDate(d);
                            fetchCallLogs(d);
                          }}
                        />
                      </div>

                      <button
                        onClick={exportToCSV}
                        disabled={!callLogs.length}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Export to CSV
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-indigo-50 text-indigo-700">
                        <tr className="grid grid-cols-[160px_130px_120px_160px_160px_140px_140px_180px_200px_160px_110px_130px_220px] min-w-[1500px]">
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Mobile No</th>
                          <th className="py-3 px-4">Total Exp</th>
                          <th className="py-3 px-4">Current Location</th>
                          <th className="py-3 px-4">Current Company</th>
                          <th className="py-3 px-4">Current Salary</th>
                          <th className="py-3 px-4">Notice Period</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Comment</th>
                          <th className="py-3 px-4">Purpose</th>
                          <th className="py-3 px-4">Duration</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Notes</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {callLogs.length ? (
                          callLogs.map((log, idx) => {
                            const cd = log.callDetails || {};
                            const get = (k) => cd[k] ?? log[k] ?? "-";
                            const dur = cd.duration ?? log.duration;
                            const date = cd.activityDate ?? log.activityDate ?? log.date;
                            const colorEnum = cd.color ?? log.color ?? "red";
                            const commentText = get("comment");

                            return (
                              <tr
                                key={idx}
                                className={`grid grid-cols-[160px_130px_120px_160px_160px_140px_140px_180px_200px_160px_110px_130px_220px] min-w-[1500px] ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                              >
                                <td className="py-2 px-4">{get("name")}</td>
                                <td className="py-2 px-4">{get("mobileNo")}</td>
                                <td className="py-2 px-4">{get("totalExp")}</td>
                                <td className="py-2 px-4">{get("currentLocation")}</td>
                                <td className="py-2 px-4">{get("currentCompany")}</td>
                                <td className="py-2 px-4">{get("currentSalary")}</td>
                                <td className="py-2 px-4">{get("noticePeriod")}</td>
                                <td className="py-2 px-4">{get("email")}</td>
                                <td className="py-2 px-4">
                                  {commentText && commentText !== "-" ? (
                                    <span className="inline-flex items-center gap-2" style={{ color: colorEnum }}>
                                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorEnum }} />
                                      {commentText}
                                    </span>
                                  ) : "-"}
                                </td>
                                <td className="py-2 px-4">{get("purpose")}</td>
                                <td className="py-2 px-4">{dur === 0 || dur ? `${dur} min` : "-"}</td>
                                <td className="py-2 px-4">{date ? new Date(date).toISOString().slice(0, 10) : "-"}</td>
                                <td className="py-2 px-4">{cd.notes ?? log.notes ?? "-"}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr className="grid grid-cols-1">
                            <td className="text-center py-4 text-gray-500">No Call Logs</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

/* Small presentational chip */
const InfoChip = ({ title, value, tone = "blue", badge = false }) => {
  const tones = {
    blue:   ["from-blue-50 to-indigo-50","border-blue-200","bg-blue-500"],
    green:  ["from-green-50 to-emerald-50","border-green-200","bg-green-500"],
    red:    ["from-red-50 to-pink-50","border-red-200","bg-red-500"],
    purple: ["from-purple-50 to-indigo-50","border-purple-200","bg-purple-500"],
    yellow: ["from-yellow-50 to-orange-50","border-yellow-200","bg-yellow-500"],
  }[tone] || ["from-gray-50 to-gray-100","border-gray-200","bg-gray-500"];

  return (
    <div className={`flex items-center gap-2 p-3 bg-gradient-to-r ${tones[0]} rounded-xl border ${tones[1]}`}>
      <div className={`${tones[2]} p-2 rounded-lg`}>
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <div className="text-xs text-gray-500 font-medium">{title}</div>
        {badge ? (
          <div className="text-sm font-semibold px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 inline-block">
            {value}
          </div>
        ) : (
          <div className="text-sm font-semibold text-gray-800">{value}</div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
