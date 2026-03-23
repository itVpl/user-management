import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CalendarClock, ChevronRight, Loader2 } from "lucide-react";
import API_CONFIG from "../../config/api";

const BASE_8X8 = `${API_CONFIG.BASE_URL}/api/v1/analytics/8x8`;

const getTokenHeaders = () => {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : {};
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
  const [windowFilter, setWindowFilter] = useState("upcoming");
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isSidebar = variant === "sidebar";

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = getTokenHeaders();
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

  const goToCallData = (callId) => {
    navigate(`/call-dashboard?focusCallId=${encodeURIComponent(String(callId))}`);
  };

  return (
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
          <button
            type="button"
            onClick={() => navigate("/call-dashboard")}
            className="text-teal-600 text-sm font-medium hover:text-teal-800 px-2"
          >
            Open Call Data
          </button>
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
                    onClick={() => goToCallData(row.callId)}
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
  );
}
