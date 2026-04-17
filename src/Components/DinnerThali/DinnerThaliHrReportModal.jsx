import React, { useEffect, useState, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  X,
  UtensilsCrossed,
  RefreshCw,
  Calendar,
  Users,
  UserMinus,
  ChefHat,
  CircleSlash,
} from "lucide-react";
import API_CONFIG from "../../config/api";
import { DINNER_THALI_CHOICE_LABELS } from "./dinnerThaliUtils";

/**
 * HR-only modal: GET /api/v1/dinner-thali/hr-report
 */
const DinnerThaliHrReportModal = ({ defaultDate, onClose }) => {
  const dateInputId = useId();
  const [reportDate, setReportDate] = useState(defaultDate || "");
  const [reportLoading, setReportLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fetchHrReport = useCallback(async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const q = reportDate ? `?date=${encodeURIComponent(reportDate)}` : "";
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/dinner-thali/hr-report${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && res.data.data) {
        setReport(res.data.data);
      } else {
        setReport(null);
        setReportError("Unexpected report response.");
      }
    } catch (e) {
      setReport(null);
      setReportError(e.response?.data?.message || "Could not load HR report.");
    } finally {
      setReportLoading(false);
    }
  }, [reportDate]);

  useEffect(() => {
    fetchHrReport();
  }, [fetchHrReport]);

  const countTiles = report
    ? [
        {
          label: "Rice + roti",
          value: report.counts?.rice_roti ?? 0,
          icon: UtensilsCrossed,
          bar: "from-amber-500 to-orange-500",
          bg: "bg-amber-50",
          border: "border-amber-100",
        },
        {
          label: "Only rotis",
          value: report.counts?.only_roti ?? 0,
          icon: ChefHat,
          bar: "from-orange-500 to-amber-600",
          bg: "bg-orange-50",
          border: "border-orange-100",
        },
        {
          label: "No thali",
          value: report.counts?.no_thali ?? 0,
          icon: CircleSlash,
          bar: "from-slate-400 to-slate-500",
          bg: "bg-slate-50",
          border: "border-slate-200",
        },
        {
          label: "Submitted total",
          value: report.counts?.total ?? 0,
          icon: Calendar,
          bar: "from-emerald-500 to-teal-600",
          bg: "bg-emerald-50",
          border: "border-emerald-100",
        },
      ]
    : [];

  return createPortal(
    <div
      className="fixed inset-0 z-[10055] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dinner-thali-hr-report-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header — matches dinner thali strip / HR cards */}
        <div className="relative flex items-center justify-between gap-3 border-b border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/25">
              <UtensilsCrossed className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <h2 id="dinner-thali-hr-report-title" className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
                Dinner thali report
              </h2>
              <p className="truncate text-xs text-gray-600 sm:text-sm">Counts by option · office timezone</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-amber-200/80 bg-white/80 p-2.5 text-gray-600 shadow-sm transition hover:bg-white hover:text-gray-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/80 px-4 py-5 sm:px-6">
          {/* Toolbar */}
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor={dateInputId} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 text-amber-600" />
                Report date
              </label>
              <input
                id={dateInputId}
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchHrReport()}
              disabled={reportLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${reportLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {reportLoading && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-white py-16">
              <div className="h-11 w-11 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
              <p className="mt-4 text-sm font-medium text-gray-600">Loading report…</p>
            </div>
          )}

          {!reportLoading && reportError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 shadow-sm">
              {reportError}
            </div>
          )}

          {report && !reportLoading && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-800 shadow-sm">
                  {report.forDateKey}
                </span>
                {report.timezone && (
                  <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50/90 px-3 py-1 text-amber-900">
                    {report.timezone}
                  </span>
                )}
              </div>

              {/* Stat tiles — HR-style cards */}
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {countTiles.map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <div
                      key={tile.label}
                      className={`relative overflow-hidden rounded-2xl border ${tile.border} ${tile.bg} p-4 shadow-sm transition hover:shadow-md`}
                    >
                      <div
                        className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${tile.bar}`}
                        aria-hidden
                      />
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{tile.label}</span>
                        <div className="rounded-lg bg-white/80 p-1.5 text-gray-700 shadow-sm">
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold tabular-nums text-gray-900">{tile.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Workforce summary */}
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Active employees</p>
                    <p className="text-2xl font-bold text-emerald-900">{report.counts?.activeEmployees ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
                    <UserMinus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">Not submitted</p>
                    <p className="text-2xl font-bold text-orange-900">{report.counts?.notSubmitted ?? 0}</p>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-gray-50/90 px-4 py-3 sm:px-5">
                  <h3 className="text-sm font-bold text-gray-800">Employee submissions</h3>
                  <p className="text-xs text-gray-500">Latest choice per row for selected date</p>
                </div>
                <div className="max-h-[min(52vh,420px)] overflow-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-gradient-to-b from-gray-100 to-gray-50 shadow-sm">
                      <tr className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        <th className="whitespace-nowrap px-4 py-3 sm:px-5">Emp ID</th>
                        <th className="whitespace-nowrap px-2 py-3">Name</th>
                        <th className="whitespace-nowrap px-2 py-3">Department</th>
                        <th className="whitespace-nowrap px-2 py-3">Choice</th>
                        <th className="whitespace-nowrap px-4 py-3 sm:px-5">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(report.employees || []).map((row, idx) => (
                        <tr
                          key={`${row.empId}-${idx}`}
                          className="bg-white transition hover:bg-amber-50/40 even:bg-gray-50/50"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-gray-800 sm:px-5">
                            {row.empId}
                          </td>
                          <td className="max-w-[140px] truncate px-2 py-3 font-medium text-gray-900">{row.employeeName}</td>
                          <td className="whitespace-nowrap px-2 py-3 text-gray-700">{row.department}</td>
                          <td className="px-2 py-3">
                            <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                              {DINNER_THALI_CHOICE_LABELS[row.choice] || row.choice}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 sm:px-5">
                            {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(report.employees || []).length === 0 && (
                    <p className="px-5 py-10 text-center text-sm text-gray-500">No submissions for this date.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DinnerThaliHrReportModal;
