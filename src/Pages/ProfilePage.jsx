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
  const [callLogsHeaders, setCallLogsHeaders] = useState(null); // from API when response has headers (new format)
  const [hrCallModalOpen, setHrCallModalOpen] = useState(false);
  const [hrShortlistLoadingId, setHrShortlistLoadingId] = useState(null); // id of row being shortlisted
  const [hrCallSearch, setHrCallSearch] = useState("");
  const [hrExpFilter, setHrExpFilter] = useState("all");
  const [hrCallPage, setHrCallPage] = useState(1);
  const hrCallRowsPerPage = 5;
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
  const COLOR_OPTIONS = [
    "red",
    "green",
    "blue",
    "yellow",
    "orange",
    "purple",
    "pink",
    "gray",
    "black",
    "white",
  ];
  const [activityDate, setActivityDate] = useState(() => todayISO());
  const [submitting, setSubmitting] = useState(false);

  // HR Call Excel import
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [importResult, setImportResult] = useState(null); // { success, message, data: { imported, failed, errors } }

  const userStr =
    localStorage.getItem("user") || sessionStorage.getItem("user");
  const empId = userStr ? JSON.parse(userStr).empId : null;

  // Hybrid eligibility (weekly target) – from GET /api/v1/weekly-target/hybrid-eligibility
  const [hybridEligibility, setHybridEligibility] = useState(null);
  const [hybridEligibilityLoading, setHybridEligibilityLoading] =
    useState(false);

  // Tier 3 (Sales TL) – Manager & Team from GET /api/v1/sales-executive-target/manager-team
  const [managerTeam, setManagerTeam] = useState(null);
  const [managerTeamLoading, setManagerTeamLoading] = useState(false);

  // Refs for clickable inputs
  const attDateRef = useRef(null);
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const hrActivityInitRef = useRef(false);
  const openPicker = (ref) => {
    if (!ref?.current) return;
    ref.current.focus();
    if (typeof ref.current.showPicker === "function") ref.current.showPicker();
  };

  /* ========= API helpers ========= */
  const authHeader = () => {
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    return {
      withCredentials: true,
      headers: { Authorization: `Bearer ${token}` },
    };
  };

  const fetchLeaveHistory = async () => {
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/leave/my`,
        authHeader(),
      );
      if (res.data.success) setLeaveHistory(res.data.leaves || []);
      else setLeaveHistory([]);
    } catch {
      setLeaveHistory([]);
    }
  };

  const fetchLeaveBalance = async () => {
    if (!empId) return;
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/leave/balance/${empId}`,
        authHeader(),
      );
      if (res.data.success) setLeaveBalance(res.data);
      else setLeaveBalance(null);
    } catch {
      setLeaveBalance(null);
    }
  };

  const fetchAttendanceData = async (date) => {
    const d = date || attendanceDate;
    if (!d || !empId) return;
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/activity/user/${empId}?date=${d}`,
        authHeader(),
      );
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
        authHeader(),
      );
      if (res.data.success && Array.isArray(res.data.data)) {
        setCallLogs(res.data.data);
        setCallLogsHeaders(res.data.headers || null);
      } else {
        setCallLogs([]);
        setCallLogsHeaders(null);
      }
    } catch {
      setCallLogs([]);
      setCallLogsHeaders(null);
    }
  };

  const handleHrShortlist = async (candidateId) => {
    if (!candidateId) return;
    setHrShortlistLoadingId(candidateId);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/candidate/${candidateId}/shortlist`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true },
      );
      if (res.data && res.data.success) {
        // Re-fetch using the currently selected date.
        await fetchCallLogs(activityDate);
      }
    } catch (err) {
      console.error("Shortlist failed:", err);
    } finally {
      setHrShortlistLoadingId(null);
    }
  };

  const downloadImportTemplate = async () => {
    setTemplateDownloading(true);
    setImportResult(null);
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/hr-activity/call/import/template`,
        { ...authHeader(), responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hr-call-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setImportResult({
        success: false,
        message: err.response?.data?.message || "Failed to download template",
        data: { imported: 0, failed: 0, errors: [] },
      });
    } finally {
      setTemplateDownloading(false);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile || !activityDate) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("excelFile", importFile);
      formData.append("date", activityDate);
      const token =
        sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/hr-activity/call/import`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // Do not set Content-Type; axios sets multipart/form-data with boundary
          },
          withCredentials: true,
        },
      );
      const data = res.data;
      setImportResult({
        success: data.success,
        message:
          data.message ||
          (data.success ? "Import completed." : "Import failed."),
        data: data.data || { imported: 0, failed: 0, errors: [] },
      });
      if (data.success) {
        setImportFile(null);
        fetchCallLogs(activityDate);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Import failed.";
      setImportResult({
        success: false,
        message: msg,
        data: err.response?.data?.data || {
          imported: 0,
          failed: 0,
          errors: [],
        },
      });
    } finally {
      setImportLoading(false);
    }
  };

  const fetchHybridEligibility = async () => {
    if (!empId) return;
    setHybridEligibilityLoading(true);
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/weekly-target/hybrid-eligibility?empId=${encodeURIComponent(empId)}`,
        authHeader(),
      );
      if (res.data?.success && res.data?.data) {
        setHybridEligibility(res.data.data);
      } else {
        setHybridEligibility(null);
      }
    } catch {
      setHybridEligibility(null);
    } finally {
      setHybridEligibilityLoading(false);
    }
  };

  /* ========= Bootstrap ========= */
  useEffect(() => {
    const today = todayISO();
    setActivityDate(today);
    setAttendanceDate(today); // Attendance: default select today
    fetchCallLogs(today);
  }, []);

  useEffect(() => {
    if (activeTab !== "hrActivity") return;
    if (hrActivityInitRef.current) return;
    hrActivityInitRef.current = true;
    const today = todayISO();
    setActivityDate(today);
    setHrExpFilter("all");
    fetchCallLogs(today);
  }, [activeTab]);

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
    if (empId && employee?.department === "CMT") fetchHybridEligibility();
  }, [empId, employee?.department]);

  const isSalesTL = String(employee?.designation || "")
    .toLowerCase()
    .includes("sales tl");

  const fetchManagerTeam = async () => {
    if (!empId || !isSalesTL) return;
    setManagerTeamLoading(true);
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/sales-executive-target/manager-team`,
        authHeader(),
      );
      if (res.data?.success && res.data?.data) setManagerTeam(res.data.data);
      else setManagerTeam(null);
    } catch {
      setManagerTeam(null);
    } finally {
      setManagerTeamLoading(false);
    }
  };

  useEffect(() => {
    if (employee && isSalesTL) fetchManagerTeam();
  }, [employee]);

  useEffect(() => {
    if (activeTab === "leave" && empId) {
      fetchLeaveBalance();
    }
  }, [activeTab, empId]);

  // Reset leave page when filtered leaves change
  useEffect(() => {
    const filteredLeaves = leaveHistory.filter((leave) => {
      const reason = String(leave.reason || "").toLowerCase();
      return (
        !reason.includes("automatic half-day leave") &&
        !reason.includes("incomplete daily")
      );
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
    const parts = dateTimeStr.split(" ");
    if (parts.length !== 2) return null;
    const [datePart, timePart] = parts;
    const [day, month, year] = datePart.split("-");
    return new Date(`${year}-${month}-${day}T${timePart}`);
  };

  // Extract login/logout times from new API structure
  const firstLoginTime = attendanceRecord?.timings?.firstLoginTime || null;
  const lastLogoutTime = attendanceRecord?.timings?.lastLogoutTime || null;
  const loginTimeDisp = firstLoginTime
    ? (() => {
        const d = parseDateTime(firstLoginTime);
        return d
          ? formatTimeHM(d.toISOString())
          : firstLoginTime.split(" ")[1]?.slice(0, 5) || "--";
      })()
    : "--";
  const logoutTimeDisp = lastLogoutTime
    ? (() => {
        const d = parseDateTime(lastLogoutTime);
        return d
          ? formatTimeHM(d.toISOString())
          : lastLogoutTime.split(" ")[1]?.slice(0, 5) || "--";
      })()
    : "--";

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
        leaveType:
          leaveType === "half-day"
            ? "half-day"
            : leaveType.toLowerCase().replace(" ", ""),
        halfDayType: leaveType === "half-day" ? halfDayType : undefined,
        fromDate,
        toDate,
        reason: reason.trim(),
      };

      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/leave/apply-with-balance`,
        payload,
        authHeader(),
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
      const msg =
        error?.response?.data?.message || "Failed to submit leave request.";
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
        authHeader(),
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
      "Shortlisted",
      "Candidate Status",
      "Purpose",
      "Duration (mins)",
      "Date",
      "Notes",
    ];

    // Convert data to CSV format (supports both headers-based and callDetails format)
    const csvData = callLogs.map((log) => {
      const get = (k) => {
        const v = getLogVal(log, k);
        return v !== undefined && v !== null ? String(v) : "";
      };
      const shortlisted = log.shortlisted === true ? "Yes" : "No";
      const candidateStatus = (log.candidateStatus ?? (log.shortlisted ? "Shortlisted" : "")) || "";
      const dur = log.durationFormatted ?? log.callDetails?.duration ?? log.duration;
      const date = log.activityDate ?? log.callDetails?.activityDate ?? log.date;
      const notes = log.notes ?? log.callDetails?.notes ?? "";
      return [
        get("Name") || get("name"),
        get("Phone number") || get("mobileNo"),
        get("Experience/ last company name") || get("totalExp"),
        get("Location") || get("currentLocation"),
        get("CurrentCompany") || get("currentCompany"),
        get("Salary") || get("currentSalary"),
        get("noticePeriod"),
        get("Email") || get("email"),
        get("comment"),
        shortlisted,
        candidateStatus,
        get("purpose"),
        typeof dur === "string" ? dur : (dur != null ? `${dur}` : ""),
        date ? new Date(date).toISOString().slice(0, 10) : "",
        notes,
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        row
          .map((field) =>
            typeof field === "string" && field.includes(",")
              ? `"${field.replace(/"/g, '""')}"`
              : field,
          )
          .join(","),
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `HR_Daily_Activity_${activityDate || new Date().toISOString().slice(0, 10)}.csv`,
    );
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

  const hrCallSearchTerm = hrCallSearch.trim().toLowerCase();
  const expYearsFromText = (raw) => {
    const s = String(raw ?? "").toLowerCase();
    const m = s.match(/(\d+(\.\d+)?)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };

  // Unified getter: supports new API format (flat keys from headers) and old format (callDetails)
  const getLogVal = (log, key) => {
    if (!log) return undefined;
    const cd = log.callDetails || {};
    const map = {
      Name: () => log.Name ?? cd.name,
      "Phone number": () => log["Phone number"] ?? cd.mobileNo,
      Email: () => log.Email ?? cd.email,
      "Job role": () => log["Job role"] ?? cd.profile,
      Salary: () => log.Salary ?? cd.currentSalary,
      "Experience/ last company name": () => log["Experience/ last company name"] ?? cd.totalExp,
      Location: () => log.Location ?? cd.currentLocation,
      Age: () => log.Age ?? cd.age,
      Gender: () => log.Gender ?? cd.gender,
      Resume: () => log.Resume ?? cd.resume,
      name: () => log.Name ?? cd.name,
      mobileNo: () => log["Phone number"] ?? cd.mobileNo,
      totalExp: () => log["Experience/ last company name"] ?? cd.totalExp,
      currentLocation: () => log.Location ?? cd.currentLocation,
      currentCompany: () => log.CurrentCompany ?? cd.currentCompany,
      currentSalary: () => log.Salary ?? cd.currentSalary,
      noticePeriod: () => log.NoticePeriod ?? cd.noticePeriod,
      email: () => log.Email ?? cd.email,
      comment: () => log.Comment ?? cd.comment,
      purpose: () => log.Purpose ?? cd.purpose,
      notes: () => log.notes ?? cd.notes,
    };
    if (map[key]) return map[key]();
    return log[key] ?? cd[key];
  };

  // Fixed 15 columns for HR Call table (14 data + Action for Shortlist)
  const HR_CALL_TABLE_COLUMNS = [
    { key: "activityDate", label: "Date" },
    { key: "durationFormatted", label: "Duration" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "candidateStatus", label: "Candidate Status" },
    { key: "Name", label: "Name" },
    { key: "Age", label: "Age" },
    { key: "Gender", label: "Gender" },
    { key: "Phone number", label: "Phone number" },
    { key: "Email", label: "Email" },
    { key: "Job role", label: "Job role" },
    { key: "Salary", label: "Salary" },
    { key: "Experience/ last company name", label: "Experience/ last company name" },
    { key: "Location", label: "Location" },
    { key: "Resume", label: "Resume" },
    { key: "_action", label: "Action" },
  ];

  const hrLogsAfterExp =
    hrExpFilter === "all"
      ? callLogs
      : callLogs.filter((log) => {
          const expVal = getLogVal(log, "Experience/ last company name") ?? getLogVal(log, "totalExp");
          const years = expYearsFromText(expVal);
          if (years == null) return false;
          if (hrExpFilter === "10+") return years >= 10;
          const n = Number(hrExpFilter);
          if (!Number.isFinite(n) || n < 1) return true;
          return years >= n && years < n + 1;
        });

  const hrCallLogsForTable = hrCallSearchTerm
    ? hrLogsAfterExp.filter((log) => {
        const haystack = [
          getLogVal(log, "Name"),
          getLogVal(log, "name"),
          getLogVal(log, "Phone number"),
          getLogVal(log, "mobileNo"),
          getLogVal(log, "Email"),
          getLogVal(log, "email"),
          getLogVal(log, "Job role"),
          getLogVal(log, "currentCompany"),
          getLogVal(log, "purpose"),
          getLogVal(log, "Location"),
          getLogVal(log, "currentLocation"),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(hrCallSearchTerm);
      })
    : hrLogsAfterExp;

  const hrHasAnyFilter = Boolean(hrCallSearchTerm) || hrExpFilter !== "all";
  const hrCallTotalEntries = hrCallLogsForTable.length;
  const hrCallTotalPages =
    hrCallTotalEntries > 0
      ? Math.ceil(hrCallTotalEntries / hrCallRowsPerPage)
      : 1;
  const hrCallCurrentPage = Math.min(
    Math.max(hrCallPage, 1),
    hrCallTotalPages,
  );
  const hrCallStartIndex = (hrCallCurrentPage - 1) * hrCallRowsPerPage;
  const hrCallEndIndex = Math.min(
    hrCallStartIndex + hrCallRowsPerPage,
    hrCallTotalEntries,
  );
  const hrCallLogsPage = hrCallLogsForTable.slice(
    hrCallStartIndex,
    hrCallEndIndex,
  );
  const hrCallShowingFrom = hrCallTotalEntries ? hrCallStartIndex + 1 : 0;
  const hrCallShowingTo = hrCallEndIndex;
  const hrCallPaginationItems = (() => {
    if (hrCallTotalPages <= 7) {
      return Array.from({ length: hrCallTotalPages }, (_, i) => i + 1);
    }
    const pages = new Set([
      1,
      hrCallTotalPages,
      hrCallCurrentPage,
      hrCallCurrentPage - 1,
      hrCallCurrentPage + 1,
    ]);
    const list = Array.from(pages)
      .filter((p) => p >= 1 && p <= hrCallTotalPages)
      .sort((a, b) => a - b);
    const items = [];
    for (let i = 0; i < list.length; i += 1) {
      const p = list[i];
      const prev = i > 0 ? list[i - 1] : null;
      if (prev != null && p - prev > 1) items.push("…");
      items.push(p);
    }
    return items;
  })();

  const resetHrFilters = () => {
    const today = todayISO();
    setHrExpFilter("all");
    setHrCallSearch("");
    setHrCallPage(1);
    if (activityDate === today) {
      setActivityDate("");
      setTimeout(() => {
        setActivityDate(today);
        fetchCallLogs(today);
      }, 0);
      return;
    }
    setActivityDate(today);
    fetchCallLogs(today);
  };

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
          <h1 className="text-3xl font-bold text-gray-800">
            {employee.employeeName || "No Name"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {employee.designation || "Employee"} •{" "}
            {formatDateDDMMYYYY(employee.dateOfJoining)} •{" "}
            {employee.empId || ""}
          </p>
        </div>
        <span className="text-green-500 font-semibold text-sm">
          ● {employee.status || "Active"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 px-4 mt-4">
        <div className="bg-white p-4 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-indigo-200 transition duration-300 ease-in-out">
          <h2 className="text-xl font-semibold mb-4 text-indigo-700 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-indigo-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 0a6 6 0 00-6 6v1a6 6 0 1012 0V6a6 6 0 00-6-6zM4 7v-.96A6.98 6.98 0 001 12c0 3.866 3.134 7 7 7h4a7 7 0 007-7 6.98 6.98 0 00-3-5.96V7a8 8 0 11-16 0z" />
            </svg>
            About
          </h2>
          <ul className="text-sm text-gray-700 space-y-3">
            <li>
              <span className="font-semibold text-gray-900">Full Name:</span>{" "}
              {employee.employeeName}
            </li>
            <li>
              <span className="font-semibold text-gray-900">Gender:</span>{" "}
              {employee.sex || "N/A"}
            </li>
            <li>
              <span className="font-semibold text-gray-900">Department:</span>{" "}
              {employee.department || "N/A"}
            </li>
          </ul>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-indigo-200 transition duration-300 ease-in-out">
          <h2 className="text-lg font-semibold mb-3 text-indigo-700 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-indigo-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M2 3h20v18H2V3zm11 16h7V5h-7v14zM4 5v14h7V5H4z" />
            </svg>
            Contacts
          </h2>
          <ul className="text-sm text-gray-700 space-y-3">
            <li>
              <span className="font-semibold text-gray-900">Contact:</span>{" "}
              {employee.mobileNo || "--"}
            </li>
            <li>
              <span className="font-semibold text-gray-900">
                Alternative Contact:
              </span>{" "}
              {employee.alternateNo || "--"}
            </li>
            <li>
              <span className="font-semibold text-gray-900">Email:</span>{" "}
              {employee.email || "--"}
            </li>
          </ul>
        </div>
      </div>

      {/* Hybrid Eligibility (Weekly Target API) – CMT only */}
      {employee?.department === "CMT" && (
        <div className="px-4 mt-4">
          <div className="bg-white p-5 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-indigo-200 transition duration-300 ease-in-out">
            <h2 className="text-xl font-semibold mb-4 text-indigo-700 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              Hybrid Eligibility (Next Week)
            </h2>
            {hybridEligibilityLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Loading…
              </div>
            ) : hybridEligibility ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold ${
                      hybridEligibility.eligibleForHybridNextWeek
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {hybridEligibility.eligibleForHybridNextWeek
                      ? "✓ Eligible"
                      : "Not eligible"}
                  </span>
                </div>
                {hybridEligibility.message && (
                  <p className="text-sm text-gray-700 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                    {hybridEligibility.message}
                  </p>
                )}
                {hybridEligibility.lastWeekTarget && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                    <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                      Last week&apos;s target
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Week start</div>
                        <div className="font-medium text-gray-800">
                          {hybridEligibility.lastWeekTarget.weekStartDate
                            ? new Date(
                                hybridEligibility.lastWeekTarget.weekStartDate,
                              ).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Week end</div>
                        <div className="font-medium text-gray-800">
                          {hybridEligibility.lastWeekTarget.weekEndDate
                            ? new Date(
                                hybridEligibility.lastWeekTarget.weekEndDate,
                              ).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Progress</div>
                        <div className="font-bold text-indigo-600">
                          {hybridEligibility.lastWeekTarget
                            .progressPercentage != null
                            ? `${hybridEligibility.lastWeekTarget.progressPercentage}%`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Eligibility information could not be loaded.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Manager & Team – Sales TL only */}
      {isSalesTL && (
        <div className="px-4 mt-4">
          <div className="bg-white p-5 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-indigo-200 transition duration-300 ease-in-out">
            <h2 className="text-xl font-semibold mb-4 text-indigo-700 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM16 18a2 2 0 01-2 2H6a2 2 0 01-2-2v-2h12v2zM8 18v-2H4v-2a4 4 0 014-4h4a4 4 0 014 4v2H8z" />
              </svg>
              Manager & Team
            </h2>
            {managerTeamLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Loading…
              </div>
            ) : managerTeam ? (
              <div className="space-y-4">
                {managerTeam.manager && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                    <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                      Your Manager
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span>
                        <span className="font-semibold text-gray-700">
                          Name:
                        </span>{" "}
                        {managerTeam.manager.employeeName || "—"}
                      </span>
                      <span>
                        <span className="font-semibold text-gray-700">ID:</span>{" "}
                        {managerTeam.manager.empId || "—"}
                      </span>
                      <span>
                        <span className="font-semibold text-gray-700">
                          Department:
                        </span>{" "}
                        {managerTeam.manager.department || "—"}
                      </span>
                      <span>
                        <span className="font-semibold text-gray-700">
                          Designation:
                        </span>{" "}
                        {managerTeam.manager.designation || "—"}
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                    Team (
                    {managerTeam.totalEmployees ??
                      managerTeam.employees?.length ??
                      0}
                    )
                  </div>
                  <div className="space-y-3">
                    {(managerTeam.employees || []).map((emp) => (
                      <div
                        key={emp.empId || emp.employeeName}
                        className="p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="font-medium text-gray-800">
                            {emp.employeeName || "—"}
                          </div>
                          <span className="text-xs text-gray-500">
                            {emp.empId} • {emp.designation || "—"}
                          </span>
                        </div>
                        {emp.target ? (
                          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                            <div>
                              Status:{" "}
                              <span className="font-medium">
                                {emp.target.status || "—"}
                              </span>{" "}
                              • Progress:{" "}
                              <span className="font-medium">
                                {emp.target.progress ?? "—"}%
                              </span>
                            </div>
                            {emp.target.tier === 2 &&
                              emp.target.tier2Targets && (
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                  <span>
                                    Active:{" "}
                                    {emp.target.tier2Targets
                                      .activeCustomersCompleted ?? 0}
                                    /
                                    {emp.target.tier2Targets
                                      .activeCustomersMin ?? 0}
                                    –
                                    {emp.target.tier2Targets
                                      .activeCustomersMax ?? 0}
                                  </span>
                                  <span>
                                    DO Added:{" "}
                                    {emp.target.tier2Targets.doAddedCompleted ??
                                      0}
                                    /{emp.target.tier2Targets.doAddedMin ?? 0}–
                                    {emp.target.tier2Targets.doAddedMax ?? 0}
                                  </span>
                                  <span>
                                    Lead Gen:{" "}
                                    {emp.target.tier2Targets
                                      .followUpCompleted ?? 0}
                                  </span>
                                  <span>
                                    Rate Req:{" "}
                                    {emp.target.tier2Targets.loadCreatedCount ??
                                      0}
                                  </span>
                                  <span>
                                    Sell Software:{" "}
                                    {emp.target.tier2Targets
                                      .shipperSoftwareSellCompleted ?? 0}
                                  </span>
                                </div>
                              )}
                            {emp.target.tier === 1 &&
                              emp.target.tier1Targets && (
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                  <span>
                                    Lead Gen:{" "}
                                    {emp.target.tier1Targets
                                      .followUpCompleted ?? 0}
                                    /
                                    {emp.target.tier1Targets.followUpPerDay ??
                                      0}
                                  </span>
                                  <span>
                                    Calls:{" "}
                                    {emp.target.tier1Targets.callsCompleted ??
                                      0}
                                  </span>
                                  <span>
                                    Meetings:{" "}
                                    {emp.target.tier1Targets
                                      .meetingsCompleted ?? 0}
                                    /
                                    {emp.target.tier1Targets.meetingsPerWeek ??
                                      0}
                                  </span>
                                </div>
                              )}
                            {(emp.target.monthStartDate ||
                              emp.target.weekStartDate) && (
                              <div className="text-gray-500 mt-1">
                                {emp.target.monthStartDate
                                  ? `${formatDateDDMMYYYY(emp.target.monthStartDate?.slice?.(0, 10))} – ${formatDateDDMMYYYY(emp.target.monthEndDate?.slice?.(0, 10))}`
                                  : emp.target.weekStartDate
                                    ? `${formatDateDDMMYYYY(emp.target.weekStartDate?.slice?.(0, 10))} – ${formatDateDDMMYYYY(emp.target.weekEndDate?.slice?.(0, 10))}`
                                    : null}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 mt-2">
                            No target set
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {(managerTeam.employees || []).length === 0 && (
                  <p className="text-sm text-gray-500">No team members.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Team information could not be loaded.
              </p>
            )}
          </div>
        </div>
      )}

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
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  Leave Balance
                </h2>
                {leaveBalance?.quarterlyInfo ? (
                  <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-6 rounded-xl border border-indigo-200">
                    <div className="text-lg font-semibold text-indigo-800 mb-4">
                      Quarterly Information
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-600 mb-1">
                          Current Quarter
                        </div>
                        <div className="text-lg font-bold text-indigo-700">
                          {leaveBalance.quarterlyInfo.currentQuarter}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-600 mb-1">
                          Quarter Period
                        </div>
                        <div className="text-sm font-bold text-indigo-700">
                          {leaveBalance.quarterlyInfo.quarterStartDate} to{" "}
                          {leaveBalance.quarterlyInfo.quarterEndDate}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-600 mb-1">
                          Quarterly Used
                        </div>
                        <div className="text-lg font-bold text-indigo-700">
                          {leaveBalance.quarterlyInfo.quarterlyUsed} /{" "}
                          {leaveBalance.quarterlyInfo.quarterlyLimit}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-600 mb-1">
                          Last Allocation
                        </div>
                        <div className="text-sm font-bold text-indigo-700">
                          {leaveBalance.quarterlyInfo.lastMonthlyAllocation}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Loading quarterly information...
                  </div>
                )}
              </div>

              <div className="col-span-1 bg-gradient-to-br from-white to-indigo-50 p-5 rounded-2xl shadow-xl border border-indigo-200 hover:shadow-2xl transition-all duration-300">
                <h2 className="text-xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
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
                        onChange={(e) => {
                          setLeaveType(e.target.value);
                          setLeaveErrors((p) => ({ ...p, leaveType: "" }));
                        }}
                        className={`w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-gray-50 border-2 ${leaveErrors.leaveType ? "border-red-400" : "border-indigo-200"} focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 appearance-none cursor-pointer text-gray-700 font-medium shadow-sm`}
                      >
                        <option value="">Select Leave Type</option>
                        <option value="casual">Casual Leave</option>
                        <option value="sick">Sick Leave</option>
                        <option value="half-day">Half Day</option>
                        <option value="custom">Custom Leave</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-indigo-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    {leaveErrors.leaveType && (
                      <p className="text-red-600 text-xs mt-1">
                        {leaveErrors.leaveType}
                      </p>
                    )}
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
                          <svg
                            className="w-5 h-5 text-blue-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-blue-700 bg-blue-100 px-4 py-3 rounded-xl border border-blue-200">
                        💡 Tip: First Half is typically 5:30 PM - 10:00 PM,
                        Second Half is 10:00 PM - 2:30 AM
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => openPicker(fromRef)}
                      className="relative cursor-pointer"
                    >
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
                          setLeaveErrors((p) => ({ ...p, fromDate: "" }));
                        }}
                        className={`w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-green-50 border-2 ${leaveErrors.fromDate ? "border-red-400" : "border-green-200"} focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm`}
                      />
                      {leaveErrors.fromDate && (
                        <p className="text-red-600 text-xs mt-1">
                          {leaveErrors.fromDate}
                        </p>
                      )}
                    </div>

                    <div
                      onClick={() => openPicker(toRef)}
                      className="relative cursor-pointer"
                    >
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        To Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={toRef}
                        type="date"
                        value={toDate}
                        min={fromDate || todayISO()} // To >= From
                        onChange={(e) => {
                          setToDate(e.target.value);
                          setLeaveErrors((p) => ({ ...p, toDate: "" }));
                        }}
                        className={`w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-red-50 border-2 ${leaveErrors.toDate ? "border-red-400" : "border-red-200"} focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 shadow-sm`}
                      />
                      {leaveErrors.toDate && (
                        <p className="text-red-600 text-xs mt-1">
                          {leaveErrors.toDate}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reason for Leave <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        setLeaveErrors((p) => ({ ...p, reason: "" }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white to-purple-50 border-2 ${leaveErrors.reason ? "border-red-400" : "border-purple-200"} focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 shadow-sm resize-none`}
                      placeholder="Please provide a detailed reason for your leave request..."
                      rows="3"
                    />
                    {leaveErrors.reason && (
                      <p className="text-red-600 text-xs mt-1">
                        {leaveErrors.reason}
                      </p>
                    )}
                  </div>

                  {/* Banner */}
                  {leaveMessage && (
                    <div
                      className={`p-4 rounded-xl border-2 ${leaveMessage.includes("successfully") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}
                    >
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
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Submit Leave Request
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-500 mt-1">
                    Note: Past dates are disabled. Only present & future dates
                    allowed.
                  </p>
                </form>
              </div>

              {/* Leave History */}
              <div className="col-span-2 bg-gradient-to-br from-white to-indigo-50 p-5 rounded-2xl shadow-xl border border-indigo-200 hover:shadow-2xl transition-all duration-300">
                {(() => {
                  // Filter out automatic half-day leaves due to incomplete tasks
                  const filteredLeaves = leaveHistory.filter((leave) => {
                    const reason = String(leave.reason || "").toLowerCase();
                    return (
                      !reason.includes("automatic half-day leave") &&
                      !reason.includes("incomplete daily")
                    );
                  });
                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-indigo-800 flex items-center gap-2">
                          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                            <svg
                              className="w-6 h-6 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
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
                                <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">
                                  From Date
                                </th>
                                <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">
                                  To Date
                                </th>
                                <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">
                                  Leave Type
                                </th>
                                <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">
                                  Reason
                                </th>
                                <th className="py-4 px-6 font-semibold text-left border-b border-indigo-400">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {filteredLeaves.length > 0 ? (
                                filteredLeaves
                                  .slice(
                                    (leavePage - 1) * recordsPerPage,
                                    leavePage * recordsPerPage,
                                  )
                                  .map((leave, idx) => (
                                    <tr
                                      key={idx}
                                      className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group"
                                    >
                                      <td className="py-4 px-6 text-gray-800 font-medium">
                                        {new Date(
                                          leave.fromDate,
                                        ).toLocaleDateString("en-US", {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </td>
                                      <td className="py-4 px-6 text-gray-800 font-medium">
                                        {new Date(
                                          leave.toDate,
                                        ).toLocaleDateString("en-US", {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </td>
                                      <td className="py-4 px-6">
                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                          {String(leave.leaveType)
                                            .replace("-", " ")
                                            .replace(/_/g, " ")}
                                        </span>
                                      </td>
                                      <td className="py-4 px-6 text-gray-700">
                                        <div
                                          className="max-w-xs truncate"
                                          title={leave.reason}
                                        >
                                          {leave.reason}
                                        </div>
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
                                      <svg
                                        className="w-12 h-12"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <p className="text-lg font-medium">
                                        No Leave History
                                      </p>
                                      <p className="text-sm">
                                        You haven't applied for any leaves yet.
                                      </p>
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
                            Showing {(leavePage - 1) * recordsPerPage + 1} to{" "}
                            {Math.min(
                              leavePage * recordsPerPage,
                              filteredLeaves.length,
                            )}{" "}
                            of {filteredLeaves.length} records
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                              onClick={() =>
                                setLeavePage((p) => Math.max(1, p - 1))
                              }
                              disabled={leavePage === 1}
                            >
                              Previous
                            </button>
                            <div className="flex items-center gap-1 flex-wrap justify-center">
                              {Array.from(
                                {
                                  length: Math.ceil(
                                    filteredLeaves.length / recordsPerPage,
                                  ),
                                },
                                (_, i) => (
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
                                ),
                              )}
                            </div>
                            <button
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                              onClick={() =>
                                setLeavePage((p) =>
                                  Math.min(
                                    Math.ceil(
                                      filteredLeaves.length / recordsPerPage,
                                    ),
                                    p + 1,
                                  ),
                                )
                              }
                              disabled={
                                leavePage ===
                                Math.ceil(
                                  filteredLeaves.length / recordsPerPage,
                                )
                              }
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
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  Terms and Conditions
                </h2>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-6">
                <TermsAndConditions
                  onAccept={(data) => {
                    console.log("Terms accepted:", data);
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
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  Attendance Overview
                </h2>

                {/* FULL CLICKABLE DATE BOX */}
                <div
                  className="relative group cursor-pointer"
                  onClick={() => openPicker(attDateRef)}
                >
                  <label
                    htmlFor="attendanceDate"
                    className="absolute left-4 -top-2.5 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-0.5 rounded-full font-semibold shadow-lg"
                  >
                    📅 Select Date
                  </label>
                  <input
                    ref={attDateRef}
                    type="date"
                    id="attendanceDate"
                    className="pl-4 pr-12 py-3 w-44 text-sm border-2 border-indigo-200 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white hover:border-indigo-300 transition-all duration-200"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    max={todayISO()}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-indigo-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {attendanceRecord ? (
                <>
                  <div className="mb-4 bg-white rounded-2xl p-4 shadow-lg border border-indigo-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <InfoChip
                        title="Date"
                        value={attendanceRecord.date || "--"}
                        tone="blue"
                      />
                      <InfoChip
                        title="Login Time"
                        value={loginTimeDisp}
                        tone="green"
                      />
                      <InfoChip
                        title="Logout Time"
                        value={logoutTimeDisp}
                        tone="red"
                      />
                      <InfoChip
                        title="Total Hours"
                        value={
                          attendanceRecord.statistics?.totalHoursFormatted ||
                          "--"
                        }
                        tone="purple"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Session Details
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700">
                          <tr>
                            <th className="py-4 px-6 font-semibold border-b border-indigo-200 text-center">
                              Session #
                            </th>
                            <th className="py-4 px-6 font-semibold border-b border-indigo-200 text-center">
                              Login Time
                            </th>
                            <th className="py-4 px-6 font-semibold border-b border-indigo-200 text-center">
                              Logout Time
                            </th>
                            <th className="py-4 px-6 font-semibold border-b border-indigo-200 text-center">
                              Duration
                            </th>
                            <th className="py-4 px-6 font-semibold border-b border-indigo-200 text-center">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSessions.length ? (
                            filteredSessions
                              .slice(
                                (attendanceSessionPage - 1) * sessionsPerPage,
                                attendanceSessionPage * sessionsPerPage,
                              )
                              .map((session, idx) => {
                                // Parse login/logout times from DD-MM-YYYY HH:mm:ss format
                                const loginTimeStr = session.loginTime || "";
                                const logoutTimeStr = session.logoutTime || "";
                                const loginDisplay = loginTimeStr
                                  ? (() => {
                                      const parts = loginTimeStr.split(" ");
                                      return parts.length === 2
                                        ? parts[1].slice(0, 5)
                                        : loginTimeStr;
                                    })()
                                  : "--";
                                const logoutDisplay = logoutTimeStr
                                  ? (() => {
                                      const parts = logoutTimeStr.split(" ");
                                      return parts.length === 2
                                        ? parts[1].slice(0, 5)
                                        : logoutTimeStr;
                                    })()
                                  : "--";

                                return (
                                  <tr
                                    key={idx}
                                    className={`transition-all duration-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                                  >
                                    <td className="py-3 px-6 text-gray-800 font-medium text-center">
                                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                                        {session.sessionNumber ||
                                          (attendanceSessionPage - 1) *
                                            sessionsPerPage +
                                            idx +
                                            1}
                                      </span>
                                    </td>
                                    <td className="py-3 px-6 text-gray-800 font-medium text-center">
                                      {loginDisplay !== "--"
                                        ? `${loginDisplay} (${loginTimeStr.split(" ")[0]})`
                                        : "--"}
                                    </td>
                                    <td className="py-3 px-6 text-gray-800 font-medium text-center">
                                      {logoutDisplay !== "--"
                                        ? `${logoutDisplay} (${logoutTimeStr.split(" ")[0]})`
                                        : "--"}
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
                                        {session.status === "completed"
                                          ? "✓"
                                          : session.status === "active"
                                            ? "●"
                                            : ""}
                                        {session.status || "--"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td
                                colSpan={5}
                                className="text-center text-gray-400 py-8"
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <svg
                                    className="w-12 h-12 text-gray-300"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <span className="text-sm font-medium">
                                    No session data found
                                  </span>
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
                          Showing{" "}
                          {(attendanceSessionPage - 1) * sessionsPerPage + 1} to{" "}
                          {Math.min(
                            attendanceSessionPage * sessionsPerPage,
                            filteredSessions.length,
                          )}{" "}
                          of {filteredSessions.length} sessions
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                            onClick={() =>
                              setAttendanceSessionPage((p) =>
                                Math.max(1, p - 1),
                              )
                            }
                            disabled={attendanceSessionPage === 1}
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1 flex-wrap justify-center">
                            {Array.from(
                              {
                                length: Math.ceil(
                                  filteredSessions.length / sessionsPerPage,
                                ),
                              },
                              (_, i) => (
                                <button
                                  key={i}
                                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                    attendanceSessionPage === i + 1
                                      ? "bg-indigo-600 text-white shadow-md"
                                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                                  }`}
                                  onClick={() =>
                                    setAttendanceSessionPage(i + 1)
                                  }
                                >
                                  {i + 1}
                                </button>
                              ),
                            )}
                          </div>
                          <button
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                            onClick={() =>
                              setAttendanceSessionPage((p) =>
                                Math.min(
                                  Math.ceil(
                                    filteredSessions.length / sessionsPerPage,
                                  ),
                                  p + 1,
                                ),
                              )
                            }
                            disabled={
                              attendanceSessionPage ===
                              Math.ceil(
                                filteredSessions.length / sessionsPerPage,
                              )
                            }
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
                      <svg
                        className="w-16 h-16 text-indigo-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No Attendance Data Found
                      </h3>
                      <p className="text-gray-500">
                        No attendance data available for the selected date.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= HR ACTIVITY TAB (your original retained) ================= */}
          {activeTab === "hrActivity" && employee?.department === "HR" && (
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white border-1 border-gray-300 rounded-2xl p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-4 px-8 py-3 rounded-xl border-1 border-gray-300 min-w-[280px]">
                      <div className="w-11 h-11 rounded-full bg-blue-50 border-1 border-blue-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-bold text-2xl">
                          {callLogs.length}
                        </span>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-lg font-semibold text-gray-900">
                          Total Calls
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1 mt-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="relative w-full sm:flex-1">
                      <svg
                        className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5a7.5 7.5 0 006.15-3.85z"
                        />
                      </svg>
                      <input
                        value={hrCallSearch}
                        onChange={(e) => {
                          setHrCallSearch(e.target.value);
                          setHrCallPage(1);
                        }}
                        placeholder="Search name, mobile, company, purpose..."
                        className="w-full h-12 pl-10 pr-4 rounded-xl border-1 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setHrCallModalOpen(true)}
                      className="h-11 px-5 border-1 border-blue-600 text-white bg-blue-700 hover:bg-blue-600 rounded-xl transition-colors font-semibold whitespace-nowrap flex items-center justify-center gap-2 sm:w-auto cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Add Log HR Call
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white border-1 border-gray-300 rounded-2xl p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
                    <input
                      type="date"
                      className="cursor-pointer h-11 px-3 rounded-xl border-1 border-gray-300 bg-white w-full sm:w-[200px]"
                      value={activityDate}
                      onChange={(e) => {
                        const d = e.target.value;
                        setActivityDate(d);
                        setHrCallPage(1);
                        fetchCallLogs(d);
                      }}
                    />

                    <select
                      value={hrExpFilter}
                      onChange={(e) => {
                        setHrExpFilter(e.target.value);
                        setHrCallPage(1);
                      }}
                      className="cursor-pointer h-11 px-3 rounded-xl border-1 border-gray-300 bg-white w-full sm:w-[220px]"
                    >
                      <option value="all">All Experience</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="9">9</option>
                      <option value="10">10</option>
                      <option value="10+">10+</option>
                    </select>

                    <button
                      type="button"
                      onClick={resetHrFilters}
                      className="h-11 px-4 border-1 cursor-pointer border-gray-400 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition-colors font-semibold whitespace-nowrap flex items-center justify-center cursor-pointer w-full sm:w-auto"
                    >
                      Clear Filters
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:ml-auto">
                    <button
                      onClick={exportToCSV}
                      disabled={!callLogs.length}
                      className="h-11 px-4 border-1 border-green-600 text-green-700 bg-white rounded-xl hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Export to CSV
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setImportModalOpen(true);
                        setImportResult(null);
                        setImportFile(null);
                      }}
                      className="h-11 px-4 border-1 border-blue-600 text-blue-700 bg-white rounded-xl hover:bg-blue-50 transition-colors font-semibold whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      Import
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white border-1 border-gray-300 rounded-2xl p-4">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left min-w-max border-separate border-spacing-y-3">
                    <thead>
                      <tr>
                        {HR_CALL_TABLE_COLUMNS.map((col, i) => (
                          <th
                            key={col.key}
                            className={`text-left py-4 px-6 text-gray-600 font-medium text-base bg-gray-100 border-y border-gray-200 ${i === 0 ? "border-l rounded-l-xl" : ""} ${i === HR_CALL_TABLE_COLUMNS.length - 1 ? "border-r rounded-r-xl" : ""}`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {hrCallTotalEntries ? (
                        hrCallLogsPage.map((log, idx) => {
                          const cd = log.callDetails || {};
                          const dur = log.durationFormatted ?? cd.duration ?? log.duration;
                          const date = log.activityDate ?? cd.activityDate ?? log.date;
                          const shortlisted = log.shortlisted === true;
                          const candidateId = log.candidateId ?? null;
                          const canShortlist = Boolean(candidateId) && !shortlisted;
                          const isShortlisting = hrShortlistLoadingId === candidateId;

                          const statusLabel = (status) => {
                            if (!status) return null;
                            const s = String(status).toLowerCase();
                            const statusClass =
                              s === "shortlisted" ? "bg-blue-100 text-blue-700" :
                              s === "interviewed" ? "bg-yellow-100 text-yellow-700" :
                              s === "selected" ? "bg-green-100 text-green-700" :
                              s === "rejected" ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-700";
                            const label = status.charAt(0).toUpperCase() + status.slice(1);
                            return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>{label}</span>;
                          };

                          const renderCell = (col) => {
                            const { key } = col;
                            if (key === "activityDate") {
                              return date ? new Date(date).toISOString().slice(0, 10) : "—";
                            }
                            if (key === "durationFormatted") {
                              const val = log.durationFormatted ?? (dur !== undefined && dur !== null ? `${dur} min` : null);
                              return val ?? "—";
                            }
                            if (key === "shortlisted") {
                              return shortlisted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                  Yes
                                </span>
                              ) : <span className="text-gray-400">—</span>;
                            }
                            if (key === "candidateStatus") {
                              const status = log.candidateStatus ?? (shortlisted ? "Shortlisted" : null);
                              return statusLabel(status) ?? <span className="text-gray-400">—</span>;
                            }
                            if (key === "_action") {
                              if (canShortlist) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleHrShortlist(candidateId)}
                                    disabled={isShortlisting}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    {isShortlisting ? "Shortlisting…" : "Shortlist"}
                                  </button>
                                );
                              }
                              return <span className="text-gray-400">—</span>;
                            }
                            const val = getLogVal(log, key);
                            return val !== undefined && val !== null && val !== "" ? String(val) : "—";
                          };

                          return (
                            <tr key={log?.id || log?._id || `${hrCallStartIndex + idx}`} className="group">
                              {HR_CALL_TABLE_COLUMNS.map((col, i) => (
                                <td
                                  key={col.key}
                                  className={`py-4 px-6 bg-white border-y border-gray-200 text-gray-700 font-medium group-hover:bg-gray-50 ${i === 0 ? "border-l rounded-l-xl" : ""} ${i === HR_CALL_TABLE_COLUMNS.length - 1 ? "border-r rounded-r-xl" : ""}`}
                                >
                                  {renderCell(col)}
                                </td>
                              ))}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={HR_CALL_TABLE_COLUMNS.length}
                            className="py-10 px-6 text-center text-gray-500 bg-white border border-gray-200 rounded-xl text-sm font-medium"
                          >
                            {hrHasAnyFilter
                              ? "No matching results"
                              : "No Call Logs"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border-1 border-gray-300 rounded-2xl px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-gray-600">
                    Showing{" "}
                    <span className="font-medium text-gray-800">
                      {hrCallShowingFrom}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-gray-800">
                      {hrCallShowingTo}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-gray-800">
                      {hrCallTotalEntries}
                    </span>{" "}
                    entries
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      disabled={hrCallCurrentPage === 1}
                      onClick={() =>
                        setHrCallPage((p) => Math.max(1, p - 1))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Previous
                    </button>

                    <div className="flex items-center gap-2">
                      {hrCallPaginationItems.map((item, i) =>
                        item === "…" ? (
                          <span
                            key={`ellipsis-${i}`}
                            className="px-2 text-gray-500 text-sm"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setHrCallPage(item)}
                            className={`min-w-9 h-9 px-3 rounded-lg border text-sm font-medium cursor-pointer ${item === hrCallCurrentPage ? "border-gray-900 text-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                          >
                            {item}
                          </button>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={hrCallCurrentPage === hrCallTotalPages}
                      onClick={() =>
                        setHrCallPage((p) => Math.min(hrCallTotalPages, p + 1))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Next
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {hrCallModalOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                  onClick={() => setHrCallModalOpen(false)}
                >
                  <div
                    className="bg-white border-2 border-gray-300 rounded-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/20 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16h6m2 4H7a4 4 0 01-4-4V7a4 4 0 014-4h10a4 4 0 014 4v9a4 4 0 01-4 4z" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-white leading-tight">Log HR Call</h2>
                            <p className="text-white/80 text-sm">Enter call details below</p>
                          </div>
                        </div>

                        <button type="button" onClick={() => setHrCallModalOpen(false)} className="text-white/90 hover:text-white hover:bg-white/10 rounded-xl p-2 cursor-pointer">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <form onSubmit={submitCallActivity} className="overflow-y-auto p-6 space-y-4">
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                        <h3 className="text-base font-semibold text-blue-800">Basic Information</h3>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Name *</label>
                            <input type="text" placeholder="Name *" className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityName} onChange={(e) => setActivityName(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Mobile No *</label>
                            <input type="text" placeholder="Mobile No *" className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityMobileNo} onChange={(e) => setActivityMobileNo(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Email</label>
                            <input type="email" placeholder="Email" className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityEmail} onChange={(e) => setActivityEmail(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                        <h3 className="text-base font-semibold text-emerald-800">Experience & Current Details</h3>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Total Experience</label>
                            <input type="text" placeholder="Total Experience (e.g., 5 years)" className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityTotalExp} onChange={(e) => setActivityTotalExp(e.target.value)} />
                          </div>
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Current Location</label>
                            <input type="text" placeholder="Current Location" className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityCurrentLocation} onChange={(e) => setActivityCurrentLocation(e.target.value)} />
                          </div>
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Current Company</label>
                            <input type="text" placeholder="Current Company" className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityCurrentCompany} onChange={(e) => setActivityCurrentCompany(e.target.value)} />
                          </div>
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Current Salary</label>
                            <input type="text" placeholder="Current Salary (e.g., 8 LPA)" className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityCurrentSalary} onChange={(e) => setActivityCurrentSalary(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                        <h3 className="text-base font-semibold text-purple-800">Call Details</h3>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Purpose *</label>
                            <input type="text" placeholder="Purpose *" className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityPurpose} onChange={(e) => setActivityPurpose(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Duration (mins) *</label>
                            <input type="number" placeholder="Call Duration (mins) *" className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityDuration} onChange={(e) => setActivityDuration(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Activity Date *</label>
                            <input type="date" placeholder="Activity Date *" className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 cursor-pointer" value={activityDate} onChange={(e) => { setActivityDate(e.target.value); fetchCallLogs(e.target.value); }} />
                          </div>
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Notice Period</label>
                            <input type="text" placeholder="Notice Period (e.g., 30 days)" className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityNoticePeriod} onChange={(e) => setActivityNoticePeriod(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                        <h3 className="text-base font-semibold text-amber-800">Comment</h3>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start">
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Comment</label>
                            <textarea placeholder="Comment" className="w-full px-4 py-3 border border-gray-200 rounded-xl min-h-[96px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityComment} onChange={(e) => setActivityComment(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Comment Color</label>
                            <select className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 cursor-pointer" value={activityColor} onChange={(e) => setActivityColor(e.target.value)}>
                              {COLOR_OPTIONS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <h3 className="text-base font-semibold text-slate-800">Notes</h3>
                        <div className="mt-3">
                          <label className="block text-sm font-semibold text-gray-800 mb-2">Notes</label>
                          <textarea placeholder="Notes" className="w-full px-4 py-3 border border-gray-200 rounded-xl min-h-[96px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={activityNotes} onChange={(e) => setActivityNotes(e.target.value)} />
                        </div>
                      </div>

                      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
                        <button type="button" onClick={() => setHrCallModalOpen(false)} className="h-11 px-5 border-1 border-red-700 text-red-700 bg-white rounded-xl hover:bg-red-600 hover:text-white transition-colors font-semibold cursor-pointer">
                          Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="h-11 px-6 border-1 border-blue-600 text-white bg-blue-800 hover:bg-blue-700 rounded-xl disabled:opacity-50 font-semibold cursor-pointer">
                          {submitting ? "Submitting..." : "Submit"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {importModalOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                  onClick={() => setImportModalOpen(false)}
                >
                  <div
                    className="bg-white border-2 border-gray-300 rounded-2xl max-w-md w-full mx-4 p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-blue-700">
                        Import candidates from Excel
                      </h3>
                      <button
                        type="button"
                        onClick={() => setImportModalOpen(false)}
                        className="text-gray-500 border border-gray-300 bg-white hover:bg-gray-50 hover:text-gray-700 rounded-lg p-1 cursor-pointer"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                    <form onSubmit={handleImportSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Call date (for all imported rows)
                        </label>
                        <input
                          type="date"
                          readOnly
                          value={activityDate}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={downloadImportTemplate}
                          disabled={templateDownloading}
                          className="w-full h-11 px-4 border-2 border-blue-600 text-blue-700 bg-white rounded-xl hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold cursor-pointer"
                        >
                          {templateDownloading
                            ? "Downloading..."
                            : "Download template (.xlsx)"}
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Excel file
                        </label>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.xlsm"
                          onChange={(e) =>
                            setImportFile(e.target.files?.[0] || null)
                          }
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold"
                        />
                      </div>
                      {importResult && (
                        <div
                          className={`p-3 rounded-xl text-sm ${importResult.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}
                        >
                          <p className="font-medium">{importResult.message}</p>
                          {importResult.data &&
                            (importResult.data.imported > 0 ||
                              importResult.data.failed > 0) && (
                              <p className="mt-1">
                                Imported: {importResult.data.imported}, Failed:{" "}
                                {importResult.data.failed}
                              </p>
                            )}
                          {importResult.data?.errors?.length > 0 && (
                            <ul className="mt-2 list-disc list-inside space-y-0.5">
                              {importResult.data.errors.map((err, i) => (
                                <li key={i}>
                                  Row {err.row}: {err.message}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setImportModalOpen(false)}
                          className="flex-1 h-11 px-4 border-2 border-gray-400 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition-colors font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!importFile || importLoading}
                          className="flex-1 h-11 px-4 border-2 border-blue-600 text-blue-700 bg-white rounded-xl hover:bg-blue-50 disabled:opacity-50 font-semibold cursor-pointer"
                        >
                          {importLoading ? "Importing..." : "Import"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
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
    blue: ["from-blue-50 to-indigo-50", "border-blue-200", "bg-blue-500"],
    green: ["from-green-50 to-emerald-50", "border-green-200", "bg-green-500"],
    red: ["from-red-50 to-pink-50", "border-red-200", "bg-red-500"],
    purple: [
      "from-purple-50 to-indigo-50",
      "border-purple-200",
      "bg-purple-500",
    ],
    yellow: [
      "from-yellow-50 to-orange-50",
      "border-yellow-200",
      "bg-yellow-500",
    ],
  }[tone] || ["from-gray-50 to-gray-100", "border-gray-200", "bg-gray-500"];

  return (
    <div
      className={`flex items-center gap-2 p-3 bg-gradient-to-r ${tones[0]} rounded-xl border ${tones[1]}`}
    >
      <div className={`${tones[2]} p-2 rounded-lg`}>
        <svg
          className="w-4 h-4 text-white"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
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
