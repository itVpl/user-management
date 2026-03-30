import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { CalendarClock, ChevronRight, Loader2, X } from "lucide-react";
import API_CONFIG from "../../config/api";

const BASE_8X8 = `${API_CONFIG.BASE_URL}/api/v1/analytics/8x8`;

const getTokenHeaders = () => {
  const token =
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : {};
};

/** Same as Call Data: Bearer + JSON + browser IANA zone for naive `remark`. */
const getAuthHeadersWithTz = () => {
  const base = getTokenHeaders();
  if (!base.Authorization) return base;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz ? { ...base, "X-Time-Zone": tz } : base;
};

/** Stored remark or ISO → value for input[type=datetime-local]. */
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

/** UTC schedule → local datetime-local (when `remark` is empty). */
const nextFollowUpAtToLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
};

const emptyForm = () => ({
  customerName: "",
  contactNumber: "",
  emailAddress: "",
  address: "",
  contactPerson: "",
  followUpNotes: "",
  remark: "",
});

const formatSaveError = (err) => {
  const d = err?.response?.data;
  if (!d) return err?.message || "Save failed";
  if (typeof d.message === "string" && d.message.trim()) return d.message.trim();
  if (Array.isArray(d.errors)) return d.errors.map(String).join(" ");
  if (d.errors && typeof d.errors === "object") {
    const vals = Object.values(d.errors).flat().filter(Boolean);
    if (vals.length) return vals.map(String).join(" ");
  }
  if (d.error != null) return String(d.error);
  return "Save failed";
};

const formatNextFollowUp = (iso, timeZone) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const opts = { dateStyle: "medium", timeStyle: "short" };
    if (timeZone) opts.timeZone = timeZone;
    return new Intl.DateTimeFormat(undefined, opts).format(d);
  } catch {
    return String(iso);
  }
};

/**
 * Sales dashboard: lists scheduled call follow-ups from
 * GET /api/v1/analytics/8x8/dashboard/call-follow-ups
 *
 * @param {object} props
 * @param {"full"|"sidebar"} [props.variant="full"] — `sidebar` fits the bottom-right grid column (scroll + no bottom margin).
 * @param {number} [props.limit=20] — API page size.
 */
export default function CallFollowUpsDashboardCard({ variant = "full", limit = 20 }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [windowFilter, setWindowFilter] = useState("upcoming");
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const isSidebar = variant === "sidebar";

  useEffect(() => {
    if (!selectedRow) return;
    const d = selectedRow.followUpDetails && typeof selectedRow.followUpDetails === "object"
      ? selectedRow.followUpDetails
      : {};
    let remark = toDatetimeLocalValue(d.remark);
    if (!remark && selectedRow.nextFollowUpAt) {
      remark = nextFollowUpAtToLocalInput(selectedRow.nextFollowUpAt);
    }
    setEditForm({
      ...emptyForm(),
      ...d,
      remark,
    });
    setFieldErrors({});
    setSaveError("");
  }, [selectedRow]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = getAuthHeadersWithTz();
      if (!headers.Authorization) {
        setItems([]);
        setMeta(null);
        setLoading(false);
        return;
      }
      const res = await axios.get(`${BASE_8X8}/dashboard/call-follow-ups`, {
        params: { window: windowFilter, limit },
        headers,
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setItems(res.data.data);
        setMeta(res.data.meta || null);
      } else {
        setItems([]);
        setMeta(null);
        if (res.data?.message) setError(res.data.message);
      }
    } catch (e) {
      console.warn("Call follow-ups dashboard:", e);
      setItems([]);
      setMeta(null);
      const msg = e?.response?.data?.message || e?.message || "Could not load follow-ups";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [windowFilter, limit]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  /** After saving follow-up on Call Data, refresh this list so `nextFollowUpAt` stays in sync. */
  useEffect(() => {
    const onRefresh = () => {
      fetchList();
    };
    window.addEventListener("call-follow-ups-refresh", onRefresh);
    return () => window.removeEventListener("call-follow-ups-refresh", onRefresh);
  }, [fetchList]);

  useEffect(() => {
    const shouldOpen = searchParams.get("openFollowUpDetails") === "1";
    const targetCallId = searchParams.get("followUpCallId");
    if (!shouldOpen || !targetCallId || items.length === 0) return;

    const matched = items.find((row) => String(row.callId) === String(targetCallId));
    if (matched) {
      setSelectedRow(matched);
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("openFollowUpDetails");
      next.delete("followUpCallId");
      return next;
    }, { replace: true });
  }, [items, searchParams, setSearchParams]);

  const goToCallData = (callId) => {
    navigate(`/call-dashboard?focusCallId=${encodeURIComponent(String(callId))}`);
  };

  const closeDetails = () => {
    setSelectedRow(null);
    setSaveError("");
    setFieldErrors({});
  };

  const openDetails = (row) => setSelectedRow(row);

  const setField = (key) => (e) => {
    setEditForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const saveFollowUp = async (e) => {
    e.preventDefault();
    if (!selectedRow?.callId) return;
    const errs = {};
    if (!String(editForm.emailAddress || "").trim()) {
      errs.emailAddress = "Email Address is required for follow up";
    }
    if (!String(editForm.contactPerson || "").trim()) {
      errs.contactPerson = "Contact Person is required for follow up";
    }
    const remark = String(editForm.remark || "").trim();
    if (!remark) {
      errs.remark = "Next follow up date & time is required";
    } else {
      const dt = new Date(remark);
      if (Number.isNaN(dt.getTime())) {
        errs.remark = "Invalid next follow up date & time format";
      } else if (dt.getTime() <= Date.now()) {
        errs.remark = "Next follow up date & time must be in the future";
      }
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    const headers = getAuthHeadersWithTz();
    if (!headers.Authorization) {
      setSaveError("Not signed in");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const followUpDetails = {
        customerName: String(editForm.customerName || "").trim(),
        contactNumber: String(editForm.contactNumber || "").trim(),
        emailAddress: String(editForm.emailAddress || "").trim(),
        address: String(editForm.address || "").trim(),
        contactPerson: String(editForm.contactPerson || "").trim(),
        followUpNotes: String(editForm.followUpNotes || "").trim(),
        remark,
      };
      const res = await axios.put(
        `${BASE_8X8}/call-records/${encodeURIComponent(String(selectedRow.callId))}/category`,
        {
          category: selectedRow.category ?? null,
          followUp: true,
          followUpDetails,
        },
        { headers }
      );
      if (res.data?.success) {
        try {
          window.dispatchEvent(new CustomEvent("call-follow-ups-refresh"));
        } catch (_) {
          /* ignore */
        }
        await fetchList();
        closeDetails();
      } else {
        setSaveError(res.data?.message || "Could not save");
      }
    } catch (err) {
      setSaveError(formatSaveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`bg-white border border-[#C8C8C8] rounded-[17.59px] p-6 flex flex-col min-h-0 ${isSidebar ? "mb-0 h-full" : "mb-3"}`}
        style={{
          boxShadow: "7.54px 7.54px 67.85px 0px rgba(0, 0, 0, 0.05)",
          borderWidth: "1.31px",
        }}
      >
        <div
          className={`flex flex-col gap-4 mb-4 shrink-0 ${isSidebar ? "" : "sm:flex-row sm:items-center sm:justify-between"}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CalendarClock className={`shrink-0 text-teal-600 ${isSidebar ? "w-5 h-5" : "w-6 h-6"}`} />
            <div className="min-w-0">
              <h3 className={`font-bold text-gray-800 ${isSidebar ? "text-lg" : "text-xl"}`}>Call follow-ups</h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Scheduled from Call Data</p>
            </div>
          </div>
          <div className={`flex flex-wrap items-center gap-2 ${isSidebar ? "" : "sm:justify-end"}`}>
            {["upcoming", "past", "all"].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindowFilter(w)}
                className={`rounded-lg font-medium capitalize transition-colors ${
                  isSidebar ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
                } ${
                  windowFilter === w
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : error && items.length === 0 ? (
          <div className="py-8 text-center text-sm text-amber-800 bg-amber-50 rounded-lg border border-amber-100 px-4">
            {error}
            <p className="text-xs text-amber-700 mt-2">
              If this is new, the backend route may not be deployed yet.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className={`text-center text-gray-500 text-sm ${isSidebar ? "py-8" : "py-10"}`}>
            No {windowFilter === "all" ? "" : windowFilter} follow-ups with a scheduled time.
          </div>
        ) : (
          <ul
            className={`divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-y-auto overflow-x-hidden min-h-0 ${
              isSidebar ? "max-h-[380px]" : ""
            }`}
          >
            {items.map((row) => {
              const d = row.followUpDetails || {};
              const name = d.customerName || "—";
              const when = formatNextFollowUp(row.nextFollowUpAt, row.followUpTimeZone);
              const past = row.isPastDue === true;
              return (
                <li
                  key={String(row.callId)}
                  className={`flex gap-2 bg-white hover:bg-gray-50/80 px-3 py-2.5 sm:px-4 sm:py-3 ${
                    isSidebar ? "flex-col items-stretch" : "flex-col sm:flex-row sm:items-center sm:justify-between"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{name}</p>
                    <p className="text-sm text-gray-600">
                      {when}
                      {row.category ? (
                        <span className="text-gray-400"> · {row.category}</span>
                      ) : null}
                    </p>
                    {d.contactPerson ? (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">Contact: {d.contactPerson}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {past ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                        Past due
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openDetails(row)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100"
                    >
                      View
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {meta?.total != null && !loading && items.length > 0 ? (
          <p className="text-xs text-gray-400 mt-3 text-right">
            Showing {items.length} of {meta.total}
          </p>
        ) : null}
      </div>

      {selectedRow ? (
        <div
          className="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center p-4"
          onClick={closeDetails}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={saveFollowUp}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h3 className="text-lg font-semibold text-gray-900">Follow-up details</h3>
                <button
                  type="button"
                  onClick={closeDetails}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-sm">
                {saveError ? (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{saveError}</div>
                ) : null}

                <p className="text-xs text-gray-500">
                  Updates use the same save as Call Data. Pick a <strong>future</strong> date/time for the next reminder.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer name</label>
                  <input
                    type="text"
                    value={editForm.customerName}
                    onChange={setField("customerName")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.contactNumber}
                    onChange={setField("contactNumber")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editForm.emailAddress}
                    onChange={setField("emailAddress")}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 ${
                      fieldErrors.emailAddress ? "border-red-400" : "border-gray-300"
                    }`}
                  />
                  {fieldErrors.emailAddress ? (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.emailAddress}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.contactPerson}
                    onChange={setField("contactPerson")}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 ${
                      fieldErrors.contactPerson ? "border-red-400" : "border-gray-300"
                    }`}
                  />
                  {fieldErrors.contactPerson ? (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.contactPerson}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={setField("address")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up notes</label>
                  <textarea
                    value={editForm.followUpNotes}
                    onChange={setField("followUpNotes")}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize-y min-h-[72px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next follow-up date &amp; time</label>
                  <input
                    type="datetime-local"
                    step="1"
                    value={editForm.remark}
                    onChange={setField("remark")}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 ${
                      fieldErrors.remark ? "border-red-400" : "border-gray-300"
                    }`}
                  />
                  {fieldErrors.remark ? (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.remark}</p>
                  ) : null}
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedRow?.callId;
                    closeDetails();
                    if (id != null) goToCallData(id);
                  }}
                  className="text-sm text-teal-700 hover:text-teal-900 font-medium text-left"
                >
                  Open in Call Data
                </button>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDetails}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
