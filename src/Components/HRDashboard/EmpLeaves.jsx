import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Calendar,
  Plus,
  X,
  Eye,
  User,
  Mail,
  Building,
  ClipboardList,
  Clock,
  Briefcase,
  Layers,
  CheckCircle,
  Info,
  Search,
} from "lucide-react";


// ✅ Import the new Date Range Selector
import DateRangeSelector from './DateRangeSelector';


// ✅ Auto-detect environment variable
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || process.env.REACT_APP_API_BASE_URL;


const EmpLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");


  // Get current date and set default to current month (1st to last day)
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);


    return {
      // Ensure output is YYYY-MM-DD
      startDate: firstDay.toISOString().split("T")[0],
      endDate: lastDay.toISOString().split("T")[0],
    };
  };


  const [dateRange, setDateRange] = useState(getCurrentMonthRange());
  const [summary, setSummary] = useState({
    totalLeavesApplied: 0,
    totalUniqueUsers: 0,
    totalDaysApplied: 0,
  });
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [userBreakdown, setUserBreakdown] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState(""); // Search term for employee dropdown
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false); // Control dropdown visibility


  const [formData, setFormData] = useState({
    empId: "",
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
    isHalfDay: false,
    halfDayType: "",
    autoApprove: true,
  });


  const leaveTypes = [
    { label: "Casual Leave", value: "casual" },
    { label: "Sick Leave", value: "sick" },
    { label: "Custom Leave", value: "custom" },
    { label: "Half Day", value: "half-day" },
  ];


  const getToken = () => sessionStorage.getItem("token");


  // ✅ Fetch Employees
  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const token = getToken();


      const res = await axios.get(`${API_BASE_URL}/inhouseUser/`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });


      if (res.data && res.data.employees) {
        // Filter only active employees and map to required format
        const activeEmployees = res.data.employees
          .filter((emp) => emp.status === "active")
          .map((emp) => ({
            empId: emp.empId,
            employeeName: emp.employeeName,
            department: emp.department,
            designation: emp.designation,
          }));


        setEmployees(activeEmployees);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      alert("Failed to load employees list");
    } finally {
      setEmployeesLoading(false);
    }
  };


  // ✅ Fetch HR Leave Stats
  const fetchLeaveStats = async () => {
    // Simple date validation before fetching
    if (!dateRange.startDate || !dateRange.endDate || new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
      return;
    }
   
    try {
      setLoading(true);
      const token = getToken();


      const res = await axios.get(
        `${API_BASE_URL}/leave/hr-leave-stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      );


      if (res.data.success) {
        const { allLeaves, summary, userWiseBreakdown } = res.data.data;
        const formatted = allLeaves.map((leave, i) => ({
          id: leave.leaveId || `LV-${String(i + 1).padStart(3, "0")}`,
          empId: leave.empId,
          employeeName: leave.employeeName || "Unknown",
          leaveType: leave.leaveType,
          fromDate: leave.fromDate.split("T")[0],
          toDate: leave.toDate.split("T")[0],
          days: leave.totalDays,
          reason: leave.reason,
          status: leave.status,
          appliedDate: leave.appliedAt.split("T")[0],
          // Store additional data for details view
          isHalfDay: leave.isHalfDay,
          halfDayType: leave.halfDayType,
          email: leave.email,
          department: leave.department,
          appliedAt: leave.appliedAt,
        }));
        setLeaves(formatted);
        setSummary(summary);


        // Store user breakdown for details modal
        if (userWiseBreakdown) {
          setUserBreakdown(userWiseBreakdown);
        }
      }
    } catch (err) {
      console.error("Error fetching leave stats:", err);
      alert("Failed to load leave data");
    } finally {
      setLoading(false);
    }
  };


  // ✅ EFFECT: Reruns the API call whenever dateRange changes
  useEffect(() => {
    fetchLeaveStats();
  }, [dateRange]);


  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee =>
    employee.employeeName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    employee.empId.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    employee.department.toLowerCase().includes(employeeSearch.toLowerCase())
  );


  // Handle employee selection
  const handleEmployeeSelect = (employee) => {
    setFormData(prev => ({
      ...prev,
      empId: employee.empId
    }));
    setEmployeeSearch(`${employee.empId} - ${employee.employeeName} (${employee.department})`);
    setShowEmployeeDropdown(false);
  };


  // Handle employee search input change
  const handleEmployeeSearchChange = (e) => {
    setEmployeeSearch(e.target.value);
    setFormData(prev => ({
      ...prev,
      empId: "" // Clear empId when user types manually
    }));
    setShowEmployeeDropdown(true);
  };


  // Handle employee search input focus
  const handleEmployeeSearchFocus = () => {
    setShowEmployeeDropdown(true);
  };


  // Reset employee search when modal closes
  const resetEmployeeSearch = () => {
    setEmployeeSearch("");
    setShowEmployeeDropdown(false);
  };


  const openModal = () => {
    setFormData({
      empId: "",
      leaveType: "",
      fromDate: "",
      toDate: "",
      reason: "",
      isHalfDay: false,
      halfDayType: "",
      autoApprove: true,
    });
    resetEmployeeSearch();
    // Fetch employees when modal opens
    fetchEmployees();
    setShowModal(true);
  };


  const closeModal = () => {
    setShowModal(false);
    resetEmployeeSearch();
  };


  // ✅ Open Employee Details Modal - Only show latest leave
  const openEmployeeDetails = (employeeId) => {
    const employeeLeaves = leaves.filter((leave) => leave.empId === employeeId);
    const userDetails = userBreakdown.find((user) => user.empId === employeeId);


    if (employeeLeaves.length > 0 || userDetails) {
      // Get only the latest leave (most recent appliedAt date)
      let latestLeave = null;
      if (employeeLeaves.length > 0) {
        // Sort by appliedAt date in descending order and take the first one
        const sortedLeaves = [...employeeLeaves].sort((a, b) =>
          new Date(b.appliedAt) - new Date(a.appliedAt)
        );
        latestLeave = sortedLeaves[0];
      }


      // If we have userDetails with leaves, also check for the latest one there
      let userDetailsLatestLeave = null;
      if (userDetails?.leaves && userDetails.leaves.length > 0) {
        const sortedUserLeaves = [...userDetails.leaves].sort((a, b) =>
          new Date(b.appliedAt) - new Date(a.appliedAt)
        );
        userDetailsLatestLeave = sortedUserLeaves[0];
      }


      // Prefer the latest leave from userDetails if available, otherwise use from employeeLeaves
      const finalLatestLeave = userDetailsLatestLeave || latestLeave;


      setSelectedEmployee({
        empId: employeeId,
        employeeName:
          employeeLeaves[0]?.employeeName ||
          userDetails?.employeeName ||
          "Unknown",
        email: employeeLeaves[0]?.email || userDetails?.email || "N/A",
        department:
          employeeLeaves[0]?.department || userDetails?.department || "N/A",
        // Store only the latest leave
        latestLeave: finalLatestLeave ? {
          ...finalLatestLeave,
          totalDays: finalLatestLeave.totalDays || finalLatestLeave.days || 0,
          appliedAt: finalLatestLeave.appliedAt || finalLatestLeave.appliedDate,
        } : null,
        totalLeaves: userDetails?.totalLeaves || employeeLeaves.length,
        totalDays:
          userDetails?.totalDays ||
          employeeLeaves.reduce((sum, leave) => sum + leave.days, 0),
      });
      setShowDetailsModal(true);
    }
  };


  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedEmployee(null);
  };


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };


  // ✅ Submit Leave
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return alert("Session expired. Please log in again.");


    if (
      !formData.empId ||
      !formData.leaveType ||
      !formData.fromDate ||
      !formData.toDate ||
      !formData.reason
    ) {
      alert("Please fill all required fields");
      return;
    }


    // Validate dates
    if (new Date(formData.fromDate) > new Date(formData.toDate)) {
      alert("From date cannot be after To date");
      return;
    }


    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/leave/hr-apply-for-user`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );


      if (res.data.success) {
        alert(res.data.message);
        fetchLeaveStats();
        closeModal();
      }
    } catch (err) {
      console.error("Error submitting leave:", err);
      alert("Failed to apply leave. Check console for details.");
    } finally {
      setLoading(false);
    }
  };


  const filteredLeaves = leaves.filter(
    (leave) =>
      leave.leaveType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.empId.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };


  // Format date for display
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: dateStr.length > 10 ? "numeric" : undefined,
    });
  };


  // Format date with time for details
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  // Helper component for styled info display
  const InfoCard = ({ icon: Icon, title, value, colorClass = "text-gray-700" }) => (
    <div className="flex items-start gap-3 p-2 bg-white rounded-lg">
      <div className={`p-2 rounded-lg ${colorClass.replace('text', 'bg').replace('-700', '-100').replace('-800', '-100')}`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{title}</p>
        <p className={`text-base font-semibold ${colorClass}`}>{value}</p>
      </div>
    </div>
  );


  // Helper component for styled section display with different background colors
  const SectionContainer = ({
    icon: Icon,
    title,
    children,
    colorClass = "text-indigo-600",
    bgColor = "bg-white"
  }) => (
    <div className={`rounded-xl shadow-lg p-6 mb-6 ${bgColor}`}>
      <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
        <Icon className={`w-6 h-6 mr-3 ${colorClass}`} />
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        {/* Summary Cards */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Leaves</p>
              <p className="text-2xl font-bold text-gray-800">
                {summary.totalLeavesApplied}
              </p>
            </div>
          </div>


          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Days Applied</p>
              <p className="text-2xl font-bold text-gray-800">
                {summary.totalDaysApplied}
              </p>
            </div>
          </div>


          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search by name, ID, type, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
         
          {/* ✅ Integrated DateRangeSelector */}
          <DateRangeSelector
            dateRange={dateRange}
            setDateRange={setDateRange}
          />
         
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition"
          >
            <Plus className="w-5 h-5" /> Apply for Leave
          </button>
        </div>


        {/* Date Range Display */}
        <div className="text-sm text-gray-600 mb-4">
          Showing leaves from{" "}
          <span className="font-semibold">
            {formatDisplayDate(dateRange.startDate)}
          </span>{" "}
          to{" "}
          <span className="font-semibold">
            {formatDisplayDate(dateRange.endDate)}
          </span>
        </div>
      </div>


      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-xl font-semibold text-gray-800 mb-2">Loading Leaves...</p>
              <p className="text-sm text-gray-600">Please wait while we fetch employee leave data</p>
            </div>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <p className="p-6 text-center text-gray-500">
            {leaves.length === 0
              ? "No leaves found for selected date range"
              : "No leaves match your search"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  {[
                    "EMPLOYEE ID",
                    "EMPLOYEE NAME",
                    "LEAVE TYPE",
                    "FROM",
                    "TO",
                    "DAYS",
                    "STATUS",
                    "ACTIONS",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {leave.empId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {leave.employeeName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                      {leave.leaveType.replace("-", " ")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {leave.fromDate}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {leave.toDate}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {leave.days}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          leave.status
                        )}`}
                      >
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEmployeeDetails(leave.empId)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Apply Leave Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.4)] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative p-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hide slider by removing the decorative gradient accent */}
           
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-6 rounded-t-3xl flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                Apply for Leave
              </h2>
              <button
                onClick={closeModal}
                className="text-white transition-transform hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>


            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10 p-8">
              {/* Employee ID - Searchable Dropdown */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Employee <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={handleEmployeeSearchChange}
                    onFocus={handleEmployeeSearchFocus}
                    placeholder="Search employee by name, ID, or department..."
                    className="w-full px-4 py-3 border border-gray-300/50 rounded-xl bg-white/70 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
               
                {/* Hidden select for form submission */}
                <select
                  name="empId"
                  value={formData.empId}
                  onChange={handleInputChange}
                  required
                  className="hidden"
                >
                  <option value="">Select Employee</option>
                  {employees.map((employee) => (
                    <option key={employee.empId} value={employee.empId}>
                      {employee.empId} - {employee.employeeName} ({employee.department})
                    </option>
                  ))}
                </select>


                {/* Employee Dropdown */}
                {showEmployeeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {employeesLoading ? (
                      <div className="p-3 text-center text-gray-500">
                        Loading employees...
                      </div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className="p-3 text-center text-gray-500">
                        No employees found
                      </div>
                    ) : (
                      filteredEmployees.map((employee) => (
                        <div
                          key={employee.empId}
                          onClick={() => handleEmployeeSelect(employee)}
                          className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-800">
                            {employee.employeeName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {employee.empId} • {employee.department}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>


              {/* Leave Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300/50 rounded-xl bg-white/70 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                >
                  <option value="">Select Type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>


              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    From Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="fromDate"
                    value={formData.fromDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300/50 rounded-xl bg-white/70 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    To Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="toDate"
                    value={formData.toDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300/50 rounded-xl bg-white/70 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
              </div>


              {/* Half Day */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="halfDay"
                  name="isHalfDay"
                  checked={formData.isHalfDay}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="halfDay" className="text-sm text-gray-700">
                  Half Day
                </label>
              </div>


              {formData.isHalfDay && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Half Day Type
                  </label>
                  <select
                    name="halfDayType"
                    value={formData.halfDayType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300/50 rounded-xl bg-white/70 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  >
                    <option value="">Select</option>
                    <option value="first_half">First Half</option>
                    <option value="second_half">Second Half</option>
                  </select>
                </div>
              )}


              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  placeholder="Reason for leave..."
                  className="w-full px-4 py-3 border border-gray-300/50 rounded-xl bg-white/70 resize-none shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>


              {/* Auto Approve */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoApprove"
                  name="autoApprove"
                  checked={formData.autoApprove}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="autoApprove" className="text-sm text-gray-700">
                  Auto Approve
                </label>
              </div>


              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-70 transition flex items-center justify-center gap-2 shadow-md"
              >
                <Calendar className="w-5 h-5" />
                {loading ? "Submitting..." : "Submit Leave Request"}
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Employee Details Modal - Only showing latest leave */}
      {showDetailsModal && selectedEmployee && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.4)] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative p-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Background Gradient */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-6 rounded-t-3xl flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                Leave Details for {selectedEmployee.employeeName}
              </h2>
              <button
                onClick={closeDetailsModal}
                className="text-white hover:text-gray-200 transition-transform hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>


            <div className="p-6">
              {/* --- Basic Information Section - Light Blue Background --- */}
              <SectionContainer
                icon={User}
                title="Employee Information"
                colorClass="text-green-600"
                bgColor="bg-green-50"
              >
                <div className="bg-white p-4 rounded-2xl border border-green-100">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard
                    icon={ClipboardList}
                    title="Employee ID"
                    value={selectedEmployee.empId}
                    colorClass="text-indigo-700"
                  />
                  <InfoCard
                    icon={User}
                    title="Employee Name"
                    value={selectedEmployee.employeeName}
                    colorClass="text-indigo-700"
                  />
                  <InfoCard
                    icon={Building}
                    title="Department"
                    value={selectedEmployee.department}
                    colorClass="text-indigo-700"
                  />
                  <InfoCard
                    icon={Mail}
                    title="Email"
                    value={selectedEmployee.email}
                    colorClass="text-indigo-700"
                  />
                  <InfoCard
                    icon={Layers}
                    title="Total Leaves Applied"
                    value={selectedEmployee.totalLeaves}
                    colorClass="text-red-700"
                  />
                  <InfoCard
                    icon={Calendar}
                    title="Total Days Applied"
                    value={selectedEmployee.totalDays}
                    colorClass="text-red-700"
                  />
                  </div>
                  </div>
              </SectionContainer>


              {/* --- Latest Leave Section - Light Green Background --- */}
              <SectionContainer
                icon={Calendar}
                title="Latest Leave"
                colorClass="text-green-600"
                bgColor="bg-green-50"
              >
                {selectedEmployee.latestLeave ? (
                  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <InfoCard
                        icon={Briefcase}
                        title="Leave Type"
                        value={selectedEmployee.latestLeave.leaveType?.replace("-", " ") || "N/A"}
                        colorClass="text-blue-700"
                      />
                      <InfoCard
                        icon={Calendar}
                        title="From Date"
                        value={formatDisplayDate(selectedEmployee.latestLeave.fromDate)}
                        colorClass="text-blue-700"
                      />
                      <InfoCard
                        icon={Calendar}
                        title="To Date"
                        value={formatDisplayDate(selectedEmployee.latestLeave.toDate)}
                        colorClass="text-blue-700"
                      />
                      <InfoCard
                        icon={Layers}
                        title="Days"
                        value={selectedEmployee.latestLeave.totalDays || selectedEmployee.latestLeave.days || 0}
                        colorClass="text-blue-700"
                      />
                      {selectedEmployee.latestLeave.isHalfDay && (
                        <InfoCard
                          icon={Clock}
                          title="Half Day Type"
                          value={
                            selectedEmployee.latestLeave.halfDayType?.replace("_", " ") ||
                            "First Half"
                          }
                          colorClass="text-purple-700"
                        />
                      )}
                      <InfoCard
                        icon={CheckCircle}
                        title="Status"
                        value={selectedEmployee.latestLeave.status || "N/A"}
                        colorClass={
                          selectedEmployee.latestLeave.status === "Approved"
                            ? "text-green-700"
                            : selectedEmployee.latestLeave.status === "Pending"
                            ? "text-yellow-700"
                            : "text-red-700"
                        }
                      />
                      <InfoCard
                        icon={Info}
                        title="Applied On"
                        value={formatDateTime(selectedEmployee.latestLeave.appliedAt)}
                        colorClass="text-gray-700"
                      />
                    </div>


                    {/* Reason Display */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-500 mb-1 flex items-center">
                        <ClipboardList className="w-4 h-4 mr-1 text-gray-500" />
                        Reason
                      </h4>
                      <p className="text-gray-800 p-3 bg-gray-100 rounded-md border border-gray-200">
                        {selectedEmployee.latestLeave.reason || "No reason provided"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-8 text-center border border-gray-200/50">
                    <p className="text-gray-500">
                      No leave records found for this employee in the selected date range.
                    </p>
                  </div>
                )}
              </SectionContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default EmpLeaves;

