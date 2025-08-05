import React, { useEffect, useState } from "react";
import axios from "axios";

const ProfilePage = () => {
    const [employee, setEmployee] = useState(null);
    const [activeTab, setActiveTab] = useState("attendance");
    const [leaveType, setLeaveType] = useState("");
    const [halfDayType, setHalfDayType] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [reason, setReason] = useState("");
    const [leaveMessage, setLeaveMessage] = useState("");
    const [leaveHistory, setLeaveHistory] = useState("");
    const [attendanceData, setAttendanceData] = useState([]);
    const [attendancePage, setAttendancePage] = useState(1);
    const [leavePage, setLeavePage] = useState(1);
    const recordsPerPage = 5;
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [attendanceMonth, setAttendanceMonth] = useState("");
    const [attendanceDate, setAttendanceDate] = useState("");
    const [attendanceRecord, setAttendanceRecord] = useState(null);

    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
    const empId = userStr ? JSON.parse(userStr).empId : null;
     const [activityDate, setActivityDate] = useState("");
  const [callLogs, setCallLogs] = useState([]);
  const [activityName, setActivityName] = useState("");
  const [activityMobile, setActivityMobile] = useState("");
  const [activityDuration, setActivityDuration] = useState("");
  const [activityPurpose, setActivityPurpose] = useState("");
  const [activityNotes, setActivityNotes] = useState("");

  const [emailDate, setEmailDate] = useState("");
  const [emailLogs, setEmailLogs] = useState([]);
  const [email, setEmail] = useState("");
  const [emailType, setEmailType] = useState("");
  const [emailPurpose, setEmailPurpose] = useState("");
  const [emailNotes, setEmailNotes] = useState("");
  

const fetchCallLogs = async (date) => {
  try {
    if (!date) return;
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const res = await axios.get(
      `https://vpl-liveproject-1.onrender.com/api/v1/hr-activity/call/date?date=${date}`,
      { 
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log("📞 Full Call Response JSON:", JSON.stringify(res.data, null, 2));

    if (res.data.success && Array.isArray(res.data.data)) {
      setCallLogs(res.data.data);
    } else {
      setCallLogs([]);
    }
  } catch (err) {
    console.error("❌ Error fetching call logs:", err.message, err?.response?.data);
  }
};


const fetchEmailLogs = async (date) => {
  try {
    if (!date) return;
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const res = await axios.get(
      `https://vpl-liveproject-1.onrender.com/api/v1/hr-activity/email/date/all?date=${date}`,
      { 
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log("📧 Full Email Response JSON:", JSON.stringify(res.data, null, 2));

    if (res.data.success && Array.isArray(res.data.data)) {
      setEmailLogs(res.data.data);
    } else {
      setEmailLogs([]);
    }
  } catch (err) {
    console.error("❌ Error fetching email logs:", err.message, err?.response?.data);
  }
};


const submitCallActivity = async (e) => {
  e.preventDefault();
  try {
    const payload = {
      name: activityName,
      mobileNo: activityMobile,
      duration: Number(activityDuration),
      purpose: activityPurpose,
      notes: activityNotes,
    };
    console.log("📤 Submitting call activity:", payload);

    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const res = await axios.post(
      "https://vpl-liveproject-1.onrender.com/api/v1/hr-activity/call/create",
      payload,
      { 
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log("✅ Call Activity Submission Response:", res.data);

    fetchCallLogs(activityDate);
    setActivityName("");
    setActivityMobile("");
    setActivityDuration("");
    setActivityPurpose("");
    setActivityNotes("");
  } catch (err) {
    console.error("❌ Submit Call Error:", err.message, err?.response?.data);
  }
};

const submitEmailActivity = async (e) => {
  e.preventDefault();
  try {
    const payload = {
      email,
      emailType,
      purpose: emailPurpose,
      notes: emailNotes,
    };
    console.log("📤 Submitting email activity:", payload);

    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const res = await axios.post(
      "https://vpl-liveproject-1.onrender.com/api/v1/hr-activity/email/create",
      payload,
      { 
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log("✅ Email Activity Submission Response:", res.data);

    fetchEmailLogs(emailDate);
    setEmail("");
    setEmailType("");
    setEmailPurpose("");
    setEmailNotes("");
  } catch (err) {
    console.error("❌ Submit Email Error:", err.message, err?.response?.data);
  }
};
const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

useEffect(() => {
  const today = getTodayDate();
  setActivityDate(today);
  setEmailDate(today);
  fetchCallLogs(today);
  fetchEmailLogs(today);
}, []);






    useEffect(() => {
        if (!empId) return;
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        axios
            .get(`https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/${empId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then((res) => {
                if (res.data.success) {
                    setEmployee(res.data.employee);
                }
            })
            .then(() => fetchLeaveHistory())
            .then(() => fetchAttendanceData())
            .catch((err) => console.error("API error:", err));
    }, [empId]);

    const fetchLeaveHistory = async () => {
        try {
            const token = sessionStorage.getItem("token") || localStorage.getItem("token");
            const res = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/leave/my", {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setLeaveHistory(res.data.leaves || []);
            }
        } catch (err) {
            console.error("Fetch Leave History Error:", err);
        }
    };

    const fetchAttendanceData = async (date = attendanceDate) => {
        if (!date) return;
        try {
            const token = sessionStorage.getItem("token") || localStorage.getItem("token");
            const res = await axios.get(`https://vpl-liveproject-1.onrender.com/api/v1/attendance/my?date=${date}`, { 
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setAttendanceRecord(res.data);
            } else {
                setAttendanceRecord(null);
            }
        } catch (err) {
            setAttendanceRecord(null);
        }
    };

    useEffect(() => {
        if (empId && attendanceDate) fetchAttendanceData(attendanceDate);
    }, [attendanceDate, empId]);

    const handleLeaveSubmit = async (e) => {
        e.preventDefault();
        if (!leaveType || !fromDate || !toDate || !reason) {
            setLeaveMessage("Please fill in all fields.");
            return;
        }

        // Check if half-day is selected but half-day type is not selected
        if (leaveType === "half-day" && !halfDayType) {
            setLeaveMessage("Please select half-day type.");
            return;
        }

        try {
            // Send dates as simple strings to avoid timezone conversion issues
            const payload = {
                empId,
                leaveType: leaveType === "half-day" ? "half-day" : leaveType.toLowerCase().replace(" ", ""),
                halfDayType: leaveType === "half-day" ? halfDayType : undefined,
                fromDate: fromDate,
                toDate: toDate,
                reason,
            };

            console.log(payload);

            const token = sessionStorage.getItem("token") || localStorage.getItem("token");
            const res = await axios.post("https://vpl-liveproject-1.onrender.com/api/v1/leave/apply", payload, { 
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setLeaveMessage("Leave request submitted successfully.");
                setLeaveType("");
                setHalfDayType("");
                setFromDate("");
                setToDate("");
                setReason("");
            } else {
                setLeaveMessage("Something went wrong.");
            }
        } catch (error) {
            console.error("Leave Apply Error:", error);
            if (error.response?.data?.message) {
                setLeaveMessage(error.response.data.message);
            } else {
                setLeaveMessage("Failed to submit leave request.");
            }
        }
    };

    const filteredSessions = attendanceRecord && attendanceRecord.sessions
        ? attendanceRecord.sessions.filter(
            session =>
                session.loginTime.startsWith(attendanceRecord.date) ||
                session.logoutTime.startsWith(attendanceRecord.date)
        )
        : [];
    const loginTime = filteredSessions[0]?.loginTime || "--";
    const logoutTime = filteredSessions[filteredSessions.length - 1]?.logoutTime || "--";

    // if (!employee) return <div className="p-6">Loading profile...</div>;
    if (!employee) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="w-10 h-10 border-b-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }


    return (
        <div className="p-6 pt-2 bg-gradient-to-b from-slate-100 to-blue-50 min-h-screen font-sans">
            <div className="relative w-full h-40 bg-gradient-to-r from-indigo-200 to-indigo-400 rounded-xl shadow-md">
                <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <img
                        src="https://cdn-icons-png.flaticon.com/512/147/147144.png"
                        alt="Profile"
                        className="object-cover w-full h-full"
                    />
                </div>
            </div>

            <div className="flex justify-between items-center mt-16 px-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{employee.employeeName || "No Name"}</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {employee.designation || "Employee"} • {employee.dateOfJoining?.slice(0, 10)} • {employee.empId || ""}
                    </p>
                </div>
                <span className="text-green-500 font-semibold text-sm">● {employee.status || "Active"}</span>
            </div>

            <div className="grid grid-cols-2 gap-6 px-6 mt-6">
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-indigo-200 transition duration-300 ease-in-out">
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

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-indigo-200 transition duration-300 ease-in-out">
                    <h2 className="text-xl font-semibold mb-4 text-indigo-700 flex items-center gap-2">
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

            <div className="px-6 mt-8">
                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setActiveTab("attendance")}
                        className={`px-4 py-2 cursor-pointer rounded-md font-semibold ${activeTab === "attendance"
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-indigo-600 border border-indigo-300"
                            }`}
                    >
                        Attendance
                    </button>
                    <button
                        onClick={() => setActiveTab("leave")}
                        className={`px-4 py-2 cursor-pointer rounded-md font-semibold ${activeTab === "leave"
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-indigo-600 border border-indigo-300"
                            }`}
                    >
                        Leave
                    </button>
                    {/* Show this tab only if HR */}
                    {employee?.department === "HR" && (
                        <button
                            onClick={() => setActiveTab("hrActivity")}
                            className={`px-4 py-2 cursor-pointer rounded-md font-semibold ${activeTab === "hrActivity"
                                ? "bg-indigo-600 text-white"
                                : "bg-white text-indigo-600 border border-indigo-300"
                                }`}
                        >
                            HR Daily Activity
                        </button>
                    )}

                </div>

                <div className="grid grid-cols-1 gap-6">
                    {activeTab === "leave" && (
                        <div className="grid grid-cols-3 gap-6">
                            <div className="col-span-1 bg-gradient-to-br from-white to-indigo-50 p-8 rounded-3xl shadow-xl border border-indigo-200 hover:shadow-2xl transition-all duration-300">
                                <h2 className="text-2xl font-bold text-indigo-800 mb-6 flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M6 2a2 2 0 00-2 2v2h12V4a2 2 0 00-2-2H6zM4 8v8a2 2 0 002 2h8a2 2 0 002-2V8H4z" />
                                    </svg>
                                    </div>
                                    Apply for Leave
                                </h2>
                                <form className="space-y-6" onSubmit={handleLeaveSubmit}>
                                    <div className="relative">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Leave Type
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={leaveType}
                                                onChange={(e) => setLeaveType(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-gray-50 border-2 border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 appearance-none cursor-pointer text-gray-700 font-medium shadow-sm"
                                            >
                                                <option value="" className="text-gray-500">Select Leave Type</option>
                                                <option value="casual" className="text-gray-700">🎉 Casual Leave</option>
                                                <option value="sick" className="text-gray-700">🏥 Sick Leave</option>
                                                <option value="half-day" className="text-gray-700">⏰ Half Day</option>
                                                <option value="custom" className="text-gray-700">📝 Custom Leave</option>
                                        </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Half Day Type Dropdown - Only show when Half Day is selected */}
                                    {leaveType === "half-day" && (
                                        <div className="animate-fadeIn bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200">
                                            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                </svg>
                                                Half Day Type
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={halfDayType}
                                                    onChange={(e) => setHalfDayType(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-blue-50 border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 appearance-none cursor-pointer text-gray-700 font-medium shadow-sm"
                                                >
                                                    <option value="" className="text-gray-500">Select Half Day Type</option>
                                                    <option value="first_half" className="text-gray-700">First Half</option>
                                                    <option value="second_half" className="text-gray-700">Second Half</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                        </div>
                                        </div>
                                            <div className="mt-3 text-xs text-blue-700 bg-blue-100 px-4 py-3 rounded-xl border border-blue-200">
                                                💡 <span className="font-semibold">Tip:</span> First Half is typically 5:30 PM - 10:00 PM, Second Half is 10:00 PM - 2:30 AM
                                    </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                </svg>
                                                From Date
                                            </label>
                                            <input
                                                type="date"
                                                value={fromDate}
                                                onChange={(e) => setFromDate(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-green-50 border-2 border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm"
                                            />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                </svg>
                                                To Date
                                            </label>
                                            <input
                                                type="date"
                                                value={toDate}
                                                onChange={(e) => setToDate(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-red-50 border-2 border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            Reason for Leave
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-purple-50 border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 shadow-sm resize-none"
                                            placeholder="Please provide a detailed reason for your leave request..."
                                            rows="3"
                                        />
                                    </div>

                                    {leaveMessage && (
                                        <div className={`p-4 rounded-xl border-2 ${leaveMessage.includes("successfully")
                                                ? "bg-green-50 border-green-200 text-green-700"
                                                : "bg-red-50 border-red-200 text-red-700"
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                {leaveMessage.includes("successfully") ? (
                                                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                                <span className="font-semibold">{leaveMessage}</span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-lg hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                                        </svg>
                                        Submit Leave Request
                                    </button>
                                </form>
                            </div>

                            <div className="col-span-2 bg-gradient-to-br from-white to-indigo-50 p-8 rounded-3xl shadow-xl border border-indigo-200 hover:shadow-2xl transition-all duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-indigo-800 flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        Leave History
                                    </h2>
                                    <div className="text-sm text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full font-medium">
                                        {leaveHistory.length} Records
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-lg">
                                <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                                <tr>
                                                    <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                            </svg>
                                                            From Date
                                                        </div>
                                                    </th>
                                                    <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                            </svg>
                                                            To Date
                                                        </div>
                                                    </th>
                                                    <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                            Leave Type
                                                        </div>
                                                    </th>
                                                    <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                            </svg>
                                                            Reason
                                                        </div>
                                                    </th>
                                                    <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            Status
                                                        </div>
                                                    </th>
                                            </tr>
                                        </thead>
                                            <tbody className="divide-y divide-gray-100">
                                            {leaveHistory.length > 0 ? (
                                                leaveHistory
                                                    .slice((leavePage - 1) * recordsPerPage, leavePage * recordsPerPage)
                                                    .map((leave, idx) => (
                                                        <tr
                                                            key={idx}
                                                                className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group"
                                                            >
                                                                <td className="py-4 px-6 text-gray-800 font-medium">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                                        {new Date(leave.fromDate).toLocaleDateString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-6 text-gray-800 font-medium">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                                        {new Date(leave.toDate).toLocaleDateString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-6">
                                                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                                        {leave.leaveType === 'casual' && '🎉'}
                                                                        {leave.leaveType === 'sick' && '🏥'}
                                                                        {leave.leaveType.includes('half-day') && '⏰'}
                                                                        {leave.leaveType === 'custom' && '📝'}
                                                                        {leave.leaveType.replace('-', ' ').replace(/_/g, ' ')}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 px-6 text-gray-700">
                                                                    <div className="max-w-xs truncate" title={leave.reason}>
                                                                        {leave.reason}
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-6">
                                                                <span
                                                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${leave.status === "approved"
                                                                                ? "bg-green-100 text-green-700 border border-green-200"
                                                                        : leave.status === "rejected"
                                                                                    ? "bg-red-100 text-red-700 border border-red-200"
                                                                                    : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                                                            }`}
                                                                    >
                                                                        {leave.status === "approved" && (
                                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                            </svg>
                                                                        )}
                                                                        {leave.status === "rejected" && (
                                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                            </svg>
                                                                        )}
                                                                        {leave.status === "pending" && (
                                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                                            </svg>
                                                                        )}
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

                                    {leaveHistory.length > recordsPerPage && (
                                    <div className="flex justify-between items-center mt-6 px-2">
                                        <div className="text-sm text-gray-600">
                                            Showing {((leavePage - 1) * recordsPerPage) + 1} to {Math.min(leavePage * recordsPerPage, leaveHistory.length)} of {leaveHistory.length} records
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                                                onClick={() => setLeavePage((p) => Math.max(1, p - 1))}
                                                disabled={leavePage === 1}
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                Previous
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.ceil(leaveHistory.length / recordsPerPage) }, (_, i) => (
                                            <button
                                                        key={i}
                                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${leavePage === i + 1
                                                                ? "bg-indigo-600 text-white"
                                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                            }`}
                                                        onClick={() => setLeavePage(i + 1)}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                                                onClick={() => setLeavePage((p) => Math.min(Math.ceil(leaveHistory.length / recordsPerPage), p + 1))}
                                                disabled={leavePage === Math.ceil(leaveHistory.length / recordsPerPage)}
                                            >
                                                Next
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                        </div>
                                    )}
                            </div>
                        </div>
                    )}

                    {activeTab === "attendance" && (
                        <div className="col-span-3 bg-gradient-to-br from-white to-indigo-50 p-8 rounded-3xl shadow-xl border border-indigo-200 hover:shadow-2xl transition-all duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center gap-3">
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    </div>
                                    Attendance Overview
                                </h2>
                                <div className="flex gap-3 items-center">
                                    <div className="relative group">
                                        <label htmlFor="attendanceDate" className="absolute left-4 -top-2.5 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-0.5 rounded-full font-semibold shadow-lg">
                                            📅 Select Date
                                        </label>
                                        <input
                                            type="date"
                                            id="attendanceDate"
                                            className="pl-4 pr-12 py-3 w-44 text-sm border-2 border-indigo-200 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white hover:border-indigo-300 transition-all duration-200"
                                            value={attendanceDate}
                                            onChange={e => setAttendanceDate(e.target.value)}
                                            max={new Date().toISOString().slice(0, 10)}
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                            </svg>
                                    </div>
                                    </div>
                                </div>
                            </div>
                            {attendanceRecord ? (
                                <>
                                    <div className="mb-6 bg-white rounded-2xl p-6 shadow-lg border border-indigo-100">
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                                <div className="bg-blue-500 p-2 rounded-lg">
                                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                    </svg>
                                        </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 font-medium">Date</div>
                                                    <div className="text-sm font-semibold text-gray-800">{attendanceRecord.date}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                                <div className="bg-green-500 p-2 rounded-lg">
                                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 font-medium">Login Time</div>
                                                    <div className="text-sm font-semibold text-gray-800">{loginTime}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
                                                <div className="bg-red-500 p-2 rounded-lg">
                                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 font-medium">Logout Time</div>
                                                    <div className="text-sm font-semibold text-gray-800">{logoutTime}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                                                <div className="bg-purple-500 p-2 rounded-lg">
                                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 font-medium">Total Hours</div>
                                                    <div className="text-sm font-semibold text-gray-800">{attendanceRecord.totalTime}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                                                <div className={`p-2 rounded-lg ${attendanceRecord.status === "present" ? "bg-green-500" : attendanceRecord.status === "absent" ? "bg-red-500" : "bg-yellow-500"}`}>
                                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 font-medium">Status</div>
                                                    <div className={`text-sm font-semibold px-2 py-1 rounded-full text-xs ${attendanceRecord.status === "present" ? "bg-green-100 text-green-700 border border-green-200" : attendanceRecord.status === "absent" ? "bg-red-100 text-red-700 border border-red-200" : "bg-yellow-100 text-yellow-700 border border-yellow-200"}`}>
                                                        {attendanceRecord.status}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
                                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                                </svg>
                                                Session Details
                                            </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700">
                                                    <tr>
                                                        <th className="py-4 px-6 font-semibold border-b border-indigo-200 flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                            </svg>
                                                            Session Login
                                                        </th>
                                                        <th className="py-4 px-6 font-semibold border-b border-indigo-200 flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                            </svg>
                                                            Session Logout
                                                        </th>
                                                        <th className="py-4 px-6 font-semibold border-b border-indigo-200 flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                            </svg>
                                                            Duration
                                                        </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {attendanceRecord.sessions && attendanceRecord.sessions.length > 0 ? (
                                                    attendanceRecord.sessions
                                                        .filter(session =>
                                                            session.loginTime.startsWith(attendanceRecord.date) ||
                                                            session.logoutTime.startsWith(attendanceRecord.date)
                                                        )
                                                        .map((session, idx) => (
                                                                <tr key={idx} className={`hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                                                                    <td className="py-3 px-6 text-gray-800 font-medium">{session.loginTime}</td>
                                                                    <td className="py-3 px-6 text-gray-800 font-medium">{session.logoutTime}</td>
                                                                    <td className="py-3 px-6">
                                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                                            ⏱️ {session.duration}
                                                                        </span>
                                                                    </td>
                                                            </tr>
                                                        ))
                                                ) : (
                                                    <tr>
                                                            <td colSpan={3} className="text-center text-gray-400 py-8">
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
                    {activeTab === "hrActivity" && employee?.department === "HR" && (
                        <div className="grid grid-cols-1 gap-10">
      {/* HR Call Section */}
      <div className="grid grid-cols-3 gap-6">
        {/* Call Form */}
        <div className="col-span-1 bg-white p-6 rounded-2xl shadow-lg border border-indigo-100">
          <h2 className="text-lg font-semibold mb-4 text-indigo-700">Log HR Call</h2>
          <form onSubmit={submitCallActivity} className="space-y-4">
            <input type="text" placeholder="Name" className="w-full px-4 py-2 border rounded-lg" value={activityName} onChange={(e) => setActivityName(e.target.value)} />
            <input type="text" placeholder="Mobile No" className="w-full px-4 py-2 border rounded-lg" value={activityMobile} onChange={(e) => setActivityMobile(e.target.value)} />
            <input type="number" placeholder="Call Duration (mins)" className="w-full px-4 py-2 border rounded-lg" value={activityDuration} onChange={(e) => setActivityDuration(e.target.value)} />
            <input type="text" placeholder="Purpose" className="w-full px-4 py-2 border rounded-lg" value={activityPurpose} onChange={(e) => setActivityPurpose(e.target.value)} />
            <textarea placeholder="Notes" className="w-full px-4 py-2 border rounded-lg" value={activityNotes} onChange={(e) => setActivityNotes(e.target.value)} />
            <button type="submit" className="bg-indigo-600 text-white w-full py-2 rounded-lg">Submit</button>
          </form>
        </div>

        {/* Call Logs */}
        <div className="col-span-2 bg-white p-6 rounded-2xl shadow-lg border border-indigo-100">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-semibold text-indigo-700">Call Logs</h2>
            <div className="relative w-fit">
              <label className="absolute -top-2.5 left-3 px-1 text-sm text-indigo-600 font-semibold bg-white z-10">Select Date</label>
              <input type="date" className="px-3 py-2 rounded-lg border border-gray-300" value={activityDate} onChange={(e) => { const d = e.target.value; setActivityDate(d); fetchCallLogs(d); }} />
            </div>
          </div>
          <table className="w-full text-sm text-left border-t border-gray-200">
            <thead className="bg-indigo-50 text-indigo-700">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="px-4">Mobile</th>
                <th className="px-4">Duration</th>
                <th className="px-4">Purpose</th>
                <th className="px-4">Notes</th>
              </tr>
            </thead>
            <tbody>
  {callLogs.length ? callLogs.map((log, idx) => (
    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
      <td className="py-2 px-4">{log.callDetails?.name || "-"}</td>
      <td className="px-4">{log.callDetails?.mobileNo || "-"}</td>
      <td className="px-4">{log.callDetails?.duration} min</td>
      <td className="px-4">{log.callDetails?.purpose}</td>
      <td className="px-4">{log.notes || "-"}</td>
    </tr>
  )) : (
    <tr>
      <td colSpan={5} className="text-center py-4 text-gray-500">No Call Logs</td>
    </tr>
  )}
</tbody>

          </table>
        </div>
      </div>

      {/* HR Email Section */}
      <div className="grid grid-cols-3 gap-6">
        {/* Email Form */}
        <div className="col-span-1 bg-white p-6 rounded-2xl shadow-lg border border-indigo-100">
          <h2 className="text-lg font-semibold mb-4 text-indigo-700">Log HR Email</h2>
          <form onSubmit={submitEmailActivity} className="space-y-4">
            <input type="email" placeholder="Email" className="w-full px-4 py-2 border rounded-lg" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select className="w-full px-4 py-2 border rounded-lg" value={emailType} onChange={(e) => setEmailType(e.target.value)}>
              <option value="">Select Type</option>
              <option value="send">Send</option>
              <option value="receive">Receive</option>
            </select>
            <input type="text" placeholder="Purpose" className="w-full px-4 py-2 border rounded-lg" value={emailPurpose} onChange={(e) => setEmailPurpose(e.target.value)} />
            <textarea placeholder="Notes" className="w-full px-4 py-2 border rounded-lg" value={emailNotes} onChange={(e) => setEmailNotes(e.target.value)} />
            <button type="submit" className="bg-indigo-600 text-white w-full py-2 rounded-lg">Submit</button>
          </form>
        </div>

        {/* Email Logs */}
        <div className="col-span-2 bg-white p-6 rounded-2xl shadow-lg border border-indigo-100">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-semibold text-indigo-700">Email Logs</h2>
            <div className="relative w-fit">
              <label className="absolute -top-2.5 left-3 px-1 text-sm text-indigo-600 font-semibold bg-white z-10">Select Date</label>
              <input type="date" className="px-3 py-2 rounded-lg border border-gray-300" value={emailDate} onChange={(e) => { const d = e.target.value; setEmailDate(d); fetchEmailLogs(d); }} />
            </div>
          </div>
          <table className="w-full text-sm text-left border-t border-gray-200">
            <thead className="bg-indigo-50 text-indigo-700">
              <tr>
                <th className="py-3 px-4">Email</th>
                <th className="px-4">Type</th>
                <th className="px-4">Purpose</th>
                <th className="px-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {emailLogs.length ? emailLogs.map((log, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td>{log.emailDetails?.email}</td>
<td>{log.emailDetails?.emailType}</td>
<td>{log.emailDetails?.purpose}</td>
<td>{log.emailDetails?.notes || log.notes}</td>

                </tr>
              )) : <tr><td colSpan={4} className="text-center py-4 text-gray-500">No Email Logs</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
