import React, { useEffect, useState } from "react";
import axios from "axios";

const ProfilePage = () => {
    const [employee, setEmployee] = useState(null);
    const [activeTab, setActiveTab] = useState("attendance");
    const [leaveType, setLeaveType] = useState("");
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

    useEffect(() => {
        if (!empId) return;
        axios
            .get(`https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/${empId}`)
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
            const res = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/leave/my", {
                withCredentials: true
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
            const res = await axios.get(`https://vpl-liveproject-1.onrender.com/api/v1/attendance/my?date=${date}`, { withCredentials: true });
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

        try {
            // Create dates in local timezone to avoid UTC conversion issues
            const createLocalDate = (dateStr) => {
                const [year, month, day] = dateStr.split('-');
                return new Date(year, month - 1, day, 12, 0, 0).toISOString();
            };
            
            const payload = {
                empId,
                leaveType: leaveType.toLowerCase().replace(" ", ""),
                fromDate: createLocalDate(fromDate),
                toDate: createLocalDate(toDate),
                reason,
            };

            console.log(payload);

            const res = await axios.post("https://vpl-liveproject-1.onrender.com/api/v1/leave/apply", payload, { withCredentials: true });

            if (res.data.success) {
                setLeaveMessage("Leave request submitted successfully.");
                setLeaveType("");
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
    const logoutTime = filteredSessions[filteredSessions.length-1]?.logoutTime || "--";

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
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {activeTab === "leave" && (
                        <div className="grid grid-cols-3 gap-6">
                            <div className="col-span-1 bg-white p-6 rounded-2xl shadow-lg border border-indigo-100">
                                <h2 className="text-xl font-semibold text-indigo-700 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M6 2a2 2 0 00-2 2v2h12V4a2 2 0 00-2-2H6zM4 8v8a2 2 0 002 2h8a2 2 0 002-2V8H4z" />
                                    </svg>
                                    Apply for Leave
                                </h2>
                                <form className="space-y-4" onSubmit={handleLeaveSubmit}>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                                        <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300">
                                            <option value="">Select Type</option>
                                            <option value="casual">Casual Leave</option>
                                            <option value="sick">Sick Leave</option>
                                            <option value="custom">Custom Leave</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-1/2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                                            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300" />
                                        </div>
                                        <div className="w-1/2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300" placeholder="Reason for Leave" />
                                    </div>

                                    {leaveMessage && <p className="text-sm text-red-600 font-medium">{leaveMessage}</p>}

                                    <button type="submit" className="bg-indigo-600 text-white w-full py-2 rounded-lg text-sm hover:bg-indigo-700 transition cursor-pointer">Submit Request</button>
                                </form>
                            </div>

                            <div className="col-span-2 bg-white p-6 rounded-2xl shadow-lg border border-indigo-100">
                                <h2 className="text-xl font-semibold text-indigo-700 mb-4">Leave History</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border-t border-gray-200">
                                        <thead className="bg-indigo-50 text-indigo-700">
                                            <tr>
                                                <th className="py-3 px-4 font-medium border-b border-gray-200">From</th>
                                                <th className="py-3 px-4 font-medium border-b border-gray-200">To</th>
                                                <th className="py-3 px-4 font-medium border-b border-gray-200">Type</th>
                                                <th className="py-3 px-4 font-medium border-b border-gray-200">Reason</th>
                                                <th className="py-3 px-4 font-medium border-b border-gray-200">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaveHistory.length > 0 ? (
                                                leaveHistory
                                                    .slice((leavePage - 1) * recordsPerPage, leavePage * recordsPerPage)
                                                    .map((leave, idx) => (
                                                        <tr
                                                            key={idx}
                                                            className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-indigo-50 transition`}
                                                        >
                                                            <td className="py-2 px-4 text-gray-800">{new Date(leave.fromDate).toLocaleDateString()}</td>
                                                            <td className="px-4">{new Date(leave.toDate).toLocaleDateString()}</td>
                                                            <td className="px-4 capitalize text-gray-700">{leave.leaveType}</td>
                                                            <td className="px-4 text-gray-700">{leave.reason}</td>
                                                            <td className="px-4">
                                                                <span
                                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${leave.status === "approved"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : leave.status === "rejected"
                                                                            ? "bg-red-100 text-red-700"
                                                                            : "bg-yellow-100 text-yellow-700"
                                                                        }`}
                                                                >
                                                                    {leave.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="text-center text-gray-400 py-4">
                                                        No leave history found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    {leaveHistory.length > recordsPerPage && (
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button
                                                className="px-3 py-1 rounded bg-indigo-100 text-indigo-700 disabled:opacity-50"
                                                onClick={() => setLeavePage((p) => Math.max(1, p - 1))}
                                                disabled={leavePage === 1}
                                            >
                                                Prev
                                            </button>
                                            <span className="px-2 py-1">Page {leavePage} of {Math.ceil(leaveHistory.length / recordsPerPage)}</span>
                                            <button
                                                className="px-3 py-1 rounded bg-indigo-100 text-indigo-700 disabled:opacity-50"
                                                onClick={() => setLeavePage((p) => Math.min(Math.ceil(leaveHistory.length / recordsPerPage), p + 1))}
                                                disabled={leavePage === Math.ceil(leaveHistory.length / recordsPerPage)}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "attendance" && (
                        <div className="col-span-3 bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-indigo-200 transition duration-300 ease-in-out">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-indigo-700 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M7 2v2H3v2h4v2h2V6h4V4H9V2H7zm0 8v2h10v-2H7zm0 4v2h10v-2H7zm0 4v2h10v-2H7z" />
                                    </svg>
                                    Attendance
                                </h2>
                                <div className="flex gap-2 items-end ml-4">
                                    <div className="relative">
                                        <label htmlFor="attendanceDate" className="absolute left-3 -top-2.5 text-xs bg-white px-1 text-indigo-600 font-semibold">Select Date</label>
                                        <input
                                            type="date"
                                            id="attendanceDate"
                                            className="pl-3 pr-4 py-2 w-36 text-sm border border-indigo-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white"
                                            value={attendanceDate}
                                            onChange={e => setAttendanceDate(e.target.value)}
                                            max={new Date().toISOString().slice(0, 10)}
                                        />
                                    </div>
                                    {/* <button
                                        className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
                                        onClick={() => fetchAttendanceData(attendanceDate)}
                                        type="button"
                                        disabled={!attendanceDate}
                                    >
                                        Fetch
                                    </button> */}
                                </div>
                            </div>
                            {attendanceRecord ? (
                                <>
                                    <div className="mb-4">
                                        <div className="flex gap-6">
                                            <div><span className="font-semibold">Date:</span> {attendanceRecord.date}</div>
                                            <div><span className="font-semibold">Login:</span> {loginTime}</div>
                                            <div><span className="font-semibold">Logout:</span> {logoutTime}</div>
                                            <div><span className="font-semibold">Total Hrs:</span> {attendanceRecord.totalTime}</div>
                                            <div><span className="font-semibold">Status:</span> <span className={`px-2 py-1 rounded-full text-xs font-medium ${attendanceRecord.status === "present" ? "bg-green-100 text-green-700" : attendanceRecord.status === "absent" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{attendanceRecord.status}</span></div>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left border-t border-gray-200">
                                            <thead className="bg-indigo-50 text-indigo-700">
                                                <tr>
                                                    <th className="py-3 px-4 font-medium border-b border-gray-200">Session Login</th>
                                                    <th className="py-3 px-4 font-medium border-b border-gray-200">Session Logout</th>
                                                    <th className="py-3 px-4 font-medium border-b border-gray-200">Duration</th>
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
                                                            <tr key={idx} className={idx % 2 === 0 ? "bg-white hover:bg-indigo-50 transition" : "bg-gray-50 hover:bg-indigo-50 transition"}>
                                                                <td className="py-2 px-4 text-gray-800">{session.loginTime}</td>
                                                                <td className="px-4">{session.logoutTime}</td>
                                                                <td className="px-4 text-gray-500">{session.duration}</td>
                                                            </tr>
                                                        ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3} className="text-center text-gray-400 py-4">No session data found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-gray-400 py-8">No attendance data found for selected date.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
