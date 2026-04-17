import React, { useState, useEffect, useCallback, useId } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import { X } from "lucide-react";
import API_CONFIG from "../../config/api";
import { readDinnerThaliUser, isHrOrSuperadmin, DINNER_THALI_CHOICE_LABELS } from "./dinnerThaliUtils";

/**
 * @param {{ onClose?: () => void, onSaved?: () => void, scrollClassName?: string, showHrReport?: boolean }} props
 * `showHrReport` — set false for employee-only modals (e.g. dashboard View). Full `/dinner-thali` page keeps HR block.
 */
const DinnerThaliPanel = ({ onClose, onSaved, scrollClassName = "", showHrReport = true }) => {
  const user = readDinnerThaliUser();
  const enableHrReport = showHrReport && isHrOrSuperadmin(user);
  const reportDateId = useId();

  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [saving, setSaving] = useState(false);

  const [reportDate, setReportDate] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState(null);

  const authHeaders = () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const fetchStatus = useCallback(async () => {
    setStatusError(null);
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/dinner-thali/status`, {
        headers: authHeaders(),
      });
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setStatus(d);
        setSelectedChoice(d.myChoice ?? null);
        if (enableHrReport) {
          setReportDate((prev) => prev || d.forDateKey || "");
        }
      } else {
        setStatus(null);
        setStatusError("Unexpected response from server.");
      }
    } catch (e) {
      const msg = e.response?.data?.message;
      if (e.response?.status === 403) {
        setStatus(null);
        setStatusError(msg || "This feature is not available for your account.");
      } else {
        setStatus(null);
        setStatusError(msg || "Failed to load dinner thali status.");
      }
    } finally {
      setStatusLoading(false);
    }
  }, [enableHrReport]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!onClose) {
      const onWinFocus = () => fetchStatus();
      const onVisible = () => {
        if (document.visibilityState === "visible") fetchStatus();
      };
      window.addEventListener("focus", onWinFocus);
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        window.removeEventListener("focus", onWinFocus);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }
  }, [fetchStatus, onClose]);

  const fetchHrReport = useCallback(async () => {
    if (!enableHrReport) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const q = reportDate ? `?date=${encodeURIComponent(reportDate)}` : "";
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/dinner-thali/hr-report${q}`, {
        headers: authHeaders(),
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
  }, [enableHrReport, reportDate]);

  useEffect(() => {
    if (enableHrReport) {
      fetchHrReport();
    }
  }, [enableHrReport, reportDate, fetchHrReport]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!status?.canSubmit) {
      alertify.warning("The submission window is closed.");
      return;
    }
    if (!selectedChoice) {
      alertify.error("Please select an option.");
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/dinner-thali`,
        { choice: selectedChoice },
        { headers: authHeaders() }
      );
      if (res.data?.success) {
        alertify.success(res.data.message || "Saved.");
        await fetchStatus();
        if (enableHrReport) fetchHrReport();
        if (onSaved) onSaved();
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      alertify.error(msg || "Could not save your choice.");
    } finally {
      setSaving(false);
    }
  };

  const cutoffLabel = (s) => {
    if (s == null) return "";
    const h = s.cutoffHour;
    const m = s.cutoffMinute;
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    const mm = String(m).padStart(2, "0");
    return `${hour12}:${mm} ${ampm}`;
  };

  if (statusLoading) {
    return (
      <div className={`flex min-h-[200px] items-center justify-center p-6 ${scrollClassName}`}>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (statusError || !status) {
    return (
      <div className={`p-4 ${scrollClassName}`}>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{statusError || "Unable to load dinner thali."}</div>
      </div>
    );
  }

  return (
    <div className={scrollClassName}>
      {onClose && (
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-gray-100 bg-white pb-3">
          <h2 id="dinner-thali-modal-title" className="text-lg font-bold text-gray-900">
            Dinner thali
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {!onClose && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dinner thali</h1>
          <p className="mt-1 text-sm text-gray-600">
            Office date: <span className="font-medium">{status.forDateKey}</span> ({status.timezone}) · Cutoff{" "}
            {cutoffLabel(status)} local time
          </p>
        </div>
      )}

      {onClose && !status.canSubmit && (
        <div
          className="mb-4 rounded-xl border-2 border-amber-400 bg-amber-100 px-4 py-4 text-center shadow-sm sm:text-left"
          role="status"
        >
          <p className="text-lg font-bold uppercase tracking-wide text-amber-950">
            Dinner thali window is closed
          </p>
          <p className="mt-2 text-sm font-medium text-amber-900">
            Choices are accepted only until {cutoffLabel(status)} office time ({status.timezone}).
          </p>
        </div>
      )}

      {onClose && (
        <p className="mb-4 text-sm text-gray-600">
          Office date: <span className="font-medium">{status.forDateKey}</span> ({status.timezone}) · Cutoff{" "}
          {cutoffLabel(status)} local time
        </p>
      )}

      {!onClose && !status.canSubmit && (
        <div
          className="mb-4 rounded-xl border-2 border-amber-400 bg-amber-100 px-4 py-4 shadow-sm"
          role="status"
        >
          <p className="text-lg font-bold uppercase tracking-wide text-amber-950">
            Dinner thali window is closed
          </p>
          <p className="mt-2 text-sm font-medium text-amber-900">
            Choices are accepted only until {cutoffLabel(status)} office time ({status.timezone}).
          </p>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={!status.canSubmit || saving} className="space-y-3">
            <legend className="sr-only">Thali option</legend>
            {(status.choices || []).map((c) => (
              <label
                key={c.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                  selectedChoice === c.value ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:bg-gray-50"
                } ${!status.canSubmit ? "cursor-default opacity-90" : ""}`}
              >
                <input
                  type="radio"
                  name="thali"
                  value={c.value}
                  checked={selectedChoice === c.value}
                  onChange={() => setSelectedChoice(c.value)}
                  className="h-4 w-4 text-amber-600"
                  disabled={!status.canSubmit}
                />
                <span className="font-medium text-gray-900">{c.label}</span>
              </label>
            ))}
          </fieldset>

          {status.canSubmit && (
            <button
              type="submit"
              disabled={saving || !selectedChoice}
              className="rounded-lg bg-amber-600 px-6 py-2.5 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save choice"}
            </button>
          )}
        </form>

        {status.myChoice && (
          <p className="mt-4 text-sm text-gray-600">
            Current saved choice:{" "}
            <span className="font-medium text-gray-900">
              {status.choices?.find((x) => x.value === status.myChoice)?.label || status.myChoice}
            </span>
            {status.mySubmittedAt && (
              <span className="ml-2">· Submitted {new Date(status.mySubmittedAt).toLocaleString()}</span>
            )}
          </p>
        )}
      </div>

      {enableHrReport && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <h2 className="text-xl font-semibold text-gray-900">HR report</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={reportDateId} className="text-sm text-gray-600">
                Date
              </label>
              <input
                id={reportDateId}
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => fetchHrReport()}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {reportLoading && <p className="text-sm text-gray-500">Loading report…</p>}
          {reportError && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{reportError}</div>}

          {report && !reportLoading && (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Rice + roti", report.counts?.rice_roti],
                  ["Only rotis", report.counts?.only_roti],
                  ["No thali", report.counts?.no_thali],
                  ["Submitted total", report.counts?.total],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <div className="text-2xl font-bold text-gray-900">{val ?? 0}</div>
                    <div className="text-xs text-gray-600">{label}</div>
                  </div>
                ))}
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Active employees: <strong>{report.counts?.activeEmployees ?? 0}</strong> · Not submitted:{" "}
                <strong>{report.counts?.notSubmitted ?? 0}</strong>
              </p>
              <div className="max-h-[40vh] overflow-x-auto overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="py-2 pr-2">Emp ID</th>
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Department</th>
                      <th className="py-2 pr-2">Choice</th>
                      <th className="py-2">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.employees || []).map((row) => (
                      <tr key={row.empId} className="border-b border-gray-100">
                        <td className="py-2 pr-2 font-mono text-xs">{row.empId}</td>
                        <td className="py-2 pr-2">{row.employeeName}</td>
                        <td className="py-2 pr-2">{row.department}</td>
                        <td className="py-2 pr-2">{DINNER_THALI_CHOICE_LABELS[row.choice] || row.choice}</td>
                        <td className="py-2 text-gray-600">
                          {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DinnerThaliPanel;
