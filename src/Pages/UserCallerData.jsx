import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import { Phone, CheckCircle, XCircle, BarChart3, Clock, FileText, Users, MessageSquare, Download, ChevronLeft, ChevronRight, AlertTriangle, X, Info } from "lucide-react";
import API_CONFIG from "../config/api";
import { format } from "date-fns";

const BASE_8X8 = `${API_CONFIG.BASE_URL}/api/v1/analytics/8x8`;
const getAuthHeaders = () => API_CONFIG.getAuthHeaders();

// Fallback category options if API fails (“Follow up” opens a modal, not a dropdown option)
const CATEGORY_OPTIONS_FALLBACK = [
  "No answer", "Voice mail", "Call drop", "RPC Not Available", "Call back",
  "Not interested", "Introduction/email", "RPC", "MAIL/Email price list",
  "Rate follow up", "Prospect", "Lead"
];

const formatDateTime = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

const formatDuration = (ms) => {
  const safe = Number(ms || 0);
  let seconds = Math.floor(safe / 1000);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  seconds %= 3600;
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

// ---- Status helpers ----
const normalizeCallStatus = (rec, alias) => {
  const talkMs = Number(rec.talkTimeMS || 0);
  const last = (rec.lastLegDisposition || "").toLowerCase();
  const direction = (rec.direction || "").toLowerCase();

  // 1) Answered: any positive talk time (most reliable), or explicit "answered"
  if (talkMs > 0 || last === "answered") return "Answered";

  // 2) Missed vs Not-Connected decided by direction (and 0 talk time)
  if (direction === "incoming") return "Missed";
  if (direction === "outgoing") {
    // Outgoing, 0 talk time => Not-Connected
    return "Not-Connected";
  }

  // 3) Edge: sometimes providers mark "connected" but talk time is 0
  if (last === "connected") return "Connected";

  // Fallbacks
  if (["busy", "no answer", "declined", "voicemail", "canceled", "cancelled", "abandoned"].includes(last)) {
    // If we can’t trust direction, default to Not-Connected for no-talk calls
    return "Not-Connected";
  }

  // Default safe bucket
  return "Not-Connected";
};

const STATUS_BADGE = {
  "Answered":  "bg-teal-500 text-white",
  "Connected": "bg-blue-500 text-white",
  "Not-Connected": "bg-red-500 text-white",
  "Missed": "bg-red-500 text-white",
};

const CONVERSION_BADGE = {
  "Converted": "bg-teal-500 text-white",
  "Open":      "bg-yellow-500 text-white",
};

/** Stored remark → value for input[type=datetime-local] (supports ISO, legacy text, yyyy-mm-ddThh:mm[:ss]). */
const toDatetimeLocalValue = (s) => {
  if (s == null || s === "") return "";
  const str = String(s).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) return str.slice(0, 19);
    return str.slice(0, 16);
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
};

const formatNextFollowUpForExport = (remark) => {
  const localVal = toDatetimeLocalValue(remark);
  if (!localVal) return remark == null ? "" : String(remark).trim();
  const [datePart, timePart = "00:00:00"] = localVal.split("T");
  const [y, mo, da] = datePart.split("-").map(Number);
  const [hh = 0, mi = 0, se = 0] = timePart.split(":").map((n) => Number(n) || 0);
  const dt = new Date(y, mo - 1, da, hh, mi, se);
  if (Number.isNaN(dt.getTime())) return String(remark).trim();
  return format(dt, "yyyy-MM-dd HH:mm:ss");
};

const emptyFollowUpDetails = () => ({
  customerName: "",
  emailAddress: "",
  address: "",
  contactPerson: "",
  followUpNotes: "",
  remark: "",
});

function FollowUpModal({ open, onClose, initialDetails, onSave, saving, modalError }) {
  const [form, setForm] = useState(emptyFollowUpDetails());
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (open) {
      const d = initialDetails && typeof initialDetails === "object" ? initialDetails : {};
      const merged = { ...emptyFollowUpDetails(), ...d };
      merged.remark = toDatetimeLocalValue(merged.remark);
      setForm(merged);
      setFieldErrors({});
    }
  }, [open, initialDetails]);

  if (!open) return null;

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!String(form.emailAddress || "").trim()) errs.emailAddress = "Email Address is required";
    if (!String(form.contactPerson || "").trim()) errs.contactPerson = "Contact Person is required";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    onSave({
      customerName: String(form.customerName || "").trim(),
      emailAddress: String(form.emailAddress || "").trim(),
      address: String(form.address || "").trim(),
      contactPerson: String(form.contactPerson || "").trim(),
      followUpNotes: String(form.followUpNotes || "").trim(),
      remark: String(form.remark || "").trim(),
    });
  };

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500";
  const textareaClass = `${inputClass} resize-y min-h-[72px]`;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-up-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 id="follow-up-modal-title" className="text-lg font-semibold text-gray-900">
            Follow up
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {modalError ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{modalError}</div>
          ) : null}

          <div>
            <label className={labelClass}>Customer Name</label>
            <input type="text" value={form.customerName} onChange={setField("customerName")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.emailAddress}
              onChange={setField("emailAddress")}
              className={`${inputClass} ${fieldErrors.emailAddress ? "border-red-400" : ""}`}
            />
            {fieldErrors.emailAddress ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.emailAddress}</p>
            ) : null}
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input type="text" value={form.address} onChange={setField("address")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>
              Contact Person <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.contactPerson}
              onChange={setField("contactPerson")}
              className={`${inputClass} ${fieldErrors.contactPerson ? "border-red-400" : ""}`}
            />
            {fieldErrors.contactPerson ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.contactPerson}</p>
            ) : null}
          </div>
          <div>
            <label className={labelClass}>Follow-up Notes</label>
            <textarea value={form.followUpNotes} onChange={setField("followUpNotes")} rows={3} className={textareaClass} />
          </div>
          <div>
            <label className={labelClass}>Next follow up date &amp; time</label>
            <input
              type="datetime-local"
              step="1"
              value={form.remark}
              onChange={setField("remark")}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const UserCallDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [stats, setStats] = useState({
    total: 0,
    answered: 0,
    missed: 0,
    incoming: 0,
    outgoing: 0,
    totalTalkTime: "00:00:00",
  });

  // Category dropdown options (from API or fallback) and per-row saved category / followUp / followUpDetails
  const [categoryOptions, setCategoryOptions] = useState(CATEGORY_OPTIONS_FALLBACK);
  const [categories, setCategories] = useState({}); // callId -> { category, followUp, followUpDetails }

  const [modalCallId, setModalCallId] = useState(null);
  const [modalError, setModalError] = useState("");
  const [savingModal, setSavingModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  /** Row highlight when opening Call Data from dashboard (?focusCallId=) */
  const [highlightCallId, setHighlightCallId] = useState(null);

  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  const fetchData = async (alias, date) => {
    const start = new Date(`${date}T00:00:00`);
    const isToday = date === new Date().toISOString().split("T")[0];
    const end = isToday ? new Date() : new Date(`${date}T23:59:59`);

    const from = formatDateTime(start);
    const to = formatDateTime(end);

    try {
      const res = await axios.get(
        `${BASE_8X8}/call-records/filter`,
        {
          params: { callerName: alias, calleeName: alias, from, to },
          headers: getAuthHeaders(),
        }
      );

      const rawData = res.data?.data || [];
      if (rawData.length === 0) {
        setRecords([]);
        setCategories({});
        setStats({
          total: 0,
          answered: 0,
          missed: 0,
          incoming: 0,
          outgoing: 0,
          totalTalkTime: "00:00:00",
        });
        return;
      }



      let totalTalkTimeMS = 0;
      let incoming = 0;
      let outgoing = 0;
      let answered = 0;
      let missed = 0;

      const transformed = rawData.map((record) => {
        // Sum talk time
        const talkMs = Number(record.talkTimeMS || 0);
        totalTalkTimeMS += talkMs;

        // Direction counts (rely on provider field)
        const dir = (record.direction || "").toLowerCase();
        if (dir === "incoming") incoming++;
        if (dir === "outgoing") outgoing++;

        // Normalize status
        const normStatus = normalizeCallStatus(record, alias);

        // Answered/Missed tallies
        if (normStatus === "Answered") answered++;
        if (normStatus === "Missed") missed++;

        // Display fields
        const dateObj = new Date(record.startTime);
        const date = dateObj.toLocaleDateString("en-GB"); // dd/mm/yyyy
        const time = dateObj.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        // Conversion status: talk < 20s -> Open, else Converted
        const conversionStatus = talkMs < 20000 ? "Open" : "Converted";

        // For "Called No" column we’ll keep callee (as in your UI)
        return {
          callId: record.callId,
          date,
          callee: record.callee,
          callTime: time,
          callDuration: record.talkTime || formatDuration(talkMs),
          callStatus: normStatus,
          conversionStatus,
        };
      });

      const total = transformed.length;

      // Fetch saved category/followUp for these callIds
      const callIds = transformed.map((r) => r.callId).filter(Boolean);
      if (callIds.length > 0) {
        try {
          const catRes = await axios.get(
            `${BASE_8X8}/call-records/categories`,
            {
              params: { callIds: callIds.join(",") },
              headers: getAuthHeaders(),
            }
          );
          if (catRes.data?.success && catRes.data?.data) {
            setCategories(catRes.data.data);
          } else {
            setCategories({});
          }
        } catch (catErr) {
          console.warn("Categories fetch failed:", catErr);
          setCategories({});
        }
      } else {
        setCategories({});
      }

      setRecords(transformed);
      setStats({
        total,
        answered,
        missed,
        incoming,
        outgoing,
        totalTalkTime: formatDuration(totalTalkTimeMS),
      });
    } catch (err) {
      console.error("❌ API Error fetching filtered calls:", err);
      // keep previous UI; optionally reset
    }
  };

  // Fetch category options once on load
  useEffect(() => {
    const loadCategoryOptions = async () => {
      try {
        const res = await axios.get(
          `${BASE_8X8}/call-records/category-options`,
          { headers: getAuthHeaders() }
        );
        if (res.data?.success && Array.isArray(res.data?.options)) {
          setCategoryOptions(res.data.options);
        }
      } catch (err) {
        console.warn("Category options fetch failed, using fallback:", err);
      }
    };
    loadCategoryOptions();
  }, []);

  const updateCategory = useCallback(async (callId, payload) => {
    if (!callId) return { success: false, error: "Missing call ID" };
    try {
      const res = await axios.put(
        `${BASE_8X8}/call-records/${encodeURIComponent(callId)}/category`,
        payload,
        { headers: getAuthHeaders() }
      );
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setCategories((prev) => {
          const prevRow = prev[callId] || {};
          return {
            ...prev,
            [callId]: {
              category: d.category !== undefined ? d.category : prevRow.category,
              followUp: d.followUp !== undefined ? d.followUp : prevRow.followUp,
              followUpDetails:
                d.followUpDetails !== undefined
                  ? d.followUpDetails || {}
                  : prevRow.followUpDetails || {},
            },
          };
        });
        return { success: true, data: d };
      }
      return { success: false, error: res.data?.message || "Save failed" };
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        e.message ||
        "Save failed";
      console.error("Failed to update category:", e);
      return { success: false, error: msg };
    }
  }, []);

  const onCategoryChange = async (callId, value) => {
    const current = categories[callId] || {};
    const newCategory = value || null;
    setCategories((prev) => ({
      ...prev,
      [callId]: {
        ...current,
        category: newCategory,
        ...(newCategory === "Voice mail"
          ? { followUp: false, followUpDetails: {} }
          : {}),
      },
    }));
    await updateCategory(callId, { category: newCategory });
    if (newCategory === "Voice mail") {
      await updateCategory(callId, { followUp: false });
    }
  };

  const openFollowUpModal = (callId) => {
    setModalError("");
    setModalCallId(callId);
  };

  const closeFollowUpModal = () => {
    setModalCallId(null);
    setModalError("");
  };

  const saveFollowUpModal = async (details) => {
    if (!modalCallId) return;
    setSavingModal(true);
    setModalError("");
    const current = categories[modalCallId] || {};
    const result = await updateCategory(modalCallId, {
      category: current.category ?? null,
      followUp: true,
      followUpDetails: details,
    });
    setSavingModal(false);
    if (result.success) {
      closeFollowUpModal();
    } else {
      setModalError(result.error || "Could not save");
    }
  };

  const modalFollowUpDetails =
    modalCallId && categories[modalCallId]?.followUpDetails
      ? categories[modalCallId].followUpDetails
      : {};

  const exportToExcel = () => {
    if (records.length === 0) {
      setNotification({
        show: true,
        message: "No data available to export. Please select a date with call records.",
        type: 'warning'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 4000);
      return;
    }

    // Prepare data with proper headers
    const headers = [
      "Date", "Called No", "Call Time", "Call Duration", "Call Status", "Conversion Status",
      "Category", "Follow up", "Customer Name", "Email", "Contact Person", "Address", "Follow-up Notes", "Next follow up date & time",
    ];
    const data = records.map(record => {
      const cat = categories[record.callId] || {};
      const d = cat.followUpDetails && typeof cat.followUpDetails === "object" ? cat.followUpDetails : {};
      return [
        record.date,
        record.callee,
        record.callTime,
        record.callDuration,
        record.callStatus,
        record.conversionStatus,
        cat.category ?? "",
        cat.followUp ? "Yes" : "No",
        d.customerName ?? "",
        d.emailAddress ?? "",
        d.contactPerson ?? "",
        d.address ?? "",
        d.followUpNotes ?? "",
        formatNextFollowUpForExport(d.remark),
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Call Records");
    XLSX.writeFile(workbook, `Call_Records_${selectedDate}.xlsx`);

    // Show success notification
    setNotification({
      show: true,
      message: "Excel file downloaded successfully!",
      type: 'success'
    });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  // Pagination derived
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = records.slice(startIndex, endIndex);

  const handlePageChange = (page) => setCurrentPage(page);

  const focusCallIdParam = searchParams.get("focusCallId");

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

  /** Deep link from dashboard: /call-dashboard?focusCallId=… */
  useEffect(() => {
    const raw = focusCallIdParam;
    if (!raw || records.length === 0) return;

    const clearParam = () => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("focusCallId");
          return next;
        },
        { replace: true }
      );
    };

    const idx = records.findIndex((r) => String(r.callId) === String(raw));
    if (idx < 0) {
      clearParam();
      setNotification({
        show: true,
        message:
          "This call is not on the selected date. Pick the call’s date above, then use View again from the dashboard.",
        type: "warning",
      });
      setTimeout(() => setNotification({ show: false, message: "", type: "info" }), 6000);
      return;
    }

    const page = Math.floor(idx / itemsPerPage) + 1;
    setCurrentPage(page);
    setHighlightCallId(raw);
    clearParam();

    const scrollTimer = setTimeout(() => {
      const safe = String(raw).replace(/"/g, "");
      const el = document.querySelector(`tr[data-call-id="${safe}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);

    const unhighlightTimer = setTimeout(() => setHighlightCallId(null), 6000);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(unhighlightTimer);
    };
  }, [records, focusCallIdParam, setSearchParams, itemsPerPage]);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    if (!storedUser) {
      console.warn("❌ No user in sessionStorage");
      return;
    }
    const user = JSON.parse(storedUser);
    const alias = user.aliasName;
    if (!alias) {
      console.warn("❌ aliasName missing in user object");
      return;
    }
    fetchData(alias, selectedDate);
  }, [selectedDate]);

  return (
    <div className="bg-white p-4 sm:p-6">
      <FollowUpModal
        open={!!modalCallId}
        initialDetails={modalFollowUpDetails}
        onClose={closeFollowUpModal}
        onSave={saveFollowUpModal}
        saving={savingModal}
        modalError={modalError}
      />

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`max-w-sm p-4 rounded-lg shadow-lg border ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : notification.type === 'warning'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-5 h-5 ${
                notification.type === 'success'
                  ? 'text-green-400'
                  : notification.type === 'warning'
                  ? 'text-yellow-400'
                  : 'text-blue-400'
              }`}>
                {notification.type === 'success' ? (
                  <CheckCircle size={20} />
                ) : notification.type === 'warning' ? (
                  <AlertTriangle size={20} />
                ) : (
                  <Info size={20} />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setNotification({ show: false, message: '', type: 'info' })}
                  className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    notification.type === 'success'
                      ? 'text-green-500 hover:bg-green-100 focus:ring-green-600'
                      : notification.type === 'warning'
                      ? 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600'
                      : 'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Call Performance */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-800">
            Today's Call Performance -{" "}
            {selectedDate
              ? format(new Date(selectedDate.replace(/-/g, "/")), "d MMM yyyy")
              : ""}
          </h1>
        </div>

        {/* Stat Cards */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 text-center bg-[#F9F9FB]">
            <div className="p-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-green-500">{stats.answered}</p>
              <p className="text-sm text-gray-500">Answered</p>
            </div>
            <div className="p-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-red-500">{stats.missed}</p>
              <p className="text-sm text-gray-500">Missed</p>
            </div>
            <div className="p-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-yellow-500">{stats.incoming}</p>
              <p className="text-sm text-gray-500">Incoming</p>
            </div>
            <div className="p-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-blue-500">{stats.outgoing}</p>
              <p className="text-sm text-gray-500">Outgoing</p>
            </div>
            <div className="p-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-yellow-500">{stats.totalTalkTime}</p>
              <p className="text-sm text-gray-500">Talk Time</p>
            </div>
            <div className="p-4">
              <p className="text-3xl font-bold text-green-500">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Calls</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-w-[1250px] mx-auto">
  <button className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
    <span className="font-medium text-gray-600">Start a new call</span>
    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
      <Phone className="text-green-600" size={16} />
    </div>
  </button>

  <button className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
    <span className="font-medium text-gray-600">Add Follow-Up</span>
    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
      <Users className="text-yellow-600" size={16} />
    </div>
  </button>

  <button className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
    <span className="font-medium text-gray-600">Mark Conversation</span>
    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
      <MessageSquare className="text-purple-600" size={16} />
    </div>
  </button>

  <button
    onClick={exportToExcel}
    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
  >
    <span className="font-medium text-gray-600">Download Report</span>
    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
      <Download className="text-blue-600" size={16} />
    </div>
  </button>
</div>



      {/* Table */}
      <div className="bg-white border border-[#C8C8C8] rounded-[17.59px] p-6 mb-3"
           style={{
             boxShadow: '7.54px 7.54px 67.85px 0px rgba(0, 0, 0, 0.05)',
             borderWidth: '1.31px'
           }}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Call Data</h2>
            <input
                type="date"
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
            />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Date</th>
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Phone No</th>
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Call Time</th>
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Call Duration</th>
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Call Status</th>
                {/* <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Conversion Status</th> */}
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Category</th>
                <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Follow up</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.length > 0 ? (
                currentRecords.map((r) => {
                  const cat = categories[r.callId] || {};
                  const showFollowUpBtn = cat.category !== "Voice mail";
                  return (
                    <tr
                      key={r.callId ?? r.date + r.callee + r.callTime}
                      data-call-id={r.callId != null ? String(r.callId) : undefined}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        highlightCallId != null && String(highlightCallId) === String(r.callId)
                          ? "bg-teal-50 ring-2 ring-inset ring-teal-300"
                          : ""
                      }`}
                    >
                      <td className="py-4 px-6 text-gray-800 font-medium">{r.date}</td>
                      <td className="py-4 px-6 text-gray-800">{r.callee}</td>
                      <td className="py-4 px-6 text-gray-800">{r.callTime}</td>
                      <td className="py-4 px-6 text-gray-800 font-semibold">{r.callDuration}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[r.callStatus] || "bg-gray-200 text-gray-800"}`}
                        >
                          {r.callStatus}
                        </span>
                      </td>
                      {/* <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${CONVERSION_BADGE[r.conversionStatus] || "bg-gray-200 text-gray-800"}`}
                        >
                          {r.conversionStatus}
                        </span>
                      </td> */}
                      <td className="py-4 px-6">
                        <select
                          value={cat.category ?? ""}
                          onChange={(e) => onCategoryChange(r.callId, e.target.value || null)}
                          className="w-full max-w-[180px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-transparent"
                        >
                          <option value="">Select...</option>
                          {categoryOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-6">
                        {showFollowUpBtn ? (
                          <button
                            type="button"
                            onClick={() => openFollowUpModal(r.callId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            {cat.followUp ? (
                              <>
                                Edit follow up
                                <span className="text-teal-600 font-bold" aria-hidden>
                                  ✓
                                </span>
                              </>
                            ) : (
                              "Follow up"
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 px-6 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Phone className="w-8 h-8 text-gray-300 mb-2" />
                      <p>No call records found</p>
                      <p className="text-gray-400 text-sm">Try selecting a different date</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
         {/* Pagination */}
        {totalPages > 1 && records.length > 0 && (
            <div className="flex justify-between items-center p-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, records.length)} of {records.length} call records
            </div>
            <div className="flex gap-2">
                <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                <ChevronLeft size={16} />
                </button>
                <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                <ChevronRight size={16} />
                </button>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default UserCallDashboard;