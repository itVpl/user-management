import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Calendar, RefreshCw, User, Phone, Mail, Briefcase } from "lucide-react";
import API_CONFIG from "../../config/api.js";

function localYMD(d) {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatInterviewDisplay(iso) {
  if (!iso) return "—";
  const x = new Date(iso);
  if (Number.isNaN(x.getTime())) return String(iso);
  return x.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const TodaysCandidateInterviews = ({ embedded = false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  const todayHeading = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const load = useCallback(async () => {
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      setError("Please log in to view interviews.");
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/candidate/all`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );
      const raw =
        res.data?.candidates ??
        res.data?.data?.candidates ??
        res.data?.data ??
        [];
      const list = Array.isArray(raw) ? raw : [];
      const today = localYMD(new Date());
      const filtered = list.filter((c) => {
        if (!c?.interviewDate) return false;
        return localYMD(c.interviewDate) === today;
      });
      setRows(filtered);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Failed to load today’s interviews.",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cardClass = embedded
    ? "bg-white border border-[#C8C8C8] rounded-[17.59px] p-6 h-full flex flex-col"
    : "bg-white rounded-2xl border border-gray-200 overflow-hidden";
  const cardStyle = embedded
    ? { boxShadow: "7.54px 7.54px 67.85px 0px rgba(0, 0, 0, 0.05)" }
    : { boxShadow: "7.54px 7.54px 67.85px 0px rgba(0, 0, 0, 0.05)" };
  const thClass = embedded
    ? "text-left py-2.5 px-2 text-gray-600 font-semibold text-xs"
    : "text-left py-4 px-4 text-gray-600 font-semibold text-sm";
  const tdClass = embedded ? "py-2.5 px-2" : "py-4 px-4";

  const tableBody = (
    <>
      {error && (
        <div
          className={
            embedded
              ? "mb-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100 px-3 py-2"
              : "p-4 m-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100"
          }
        >
          {error}
        </div>
      )}

      <div className="overflow-x-auto flex-1 min-h-0 -mx-1">
        <table className={`w-full ${embedded ? "min-w-[520px]" : "min-w-[720px]"}`}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={thClass}>Candidate</th>
              <th className={thClass}>Contact</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>Interview</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Video</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className={`${embedded ? "py-8" : "py-16"} text-center text-gray-500 text-sm`}
                >
                  Loading today&apos;s interviews…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className={`${embedded ? "py-8" : "py-16"} text-center text-gray-500 text-sm`}
                >
                  No interviews scheduled for today.
                </td>
              </tr>
            ) : (
              rows.map((c, idx) => {
                const name = c.candidateName ?? c.name ?? "—";
                const phone = c.phone ?? c.mobileNo ?? "—";
                const email = c.email ?? "—";
                const profile =
                  c.profile ?? (c.department ? String(c.department) : "—");
                const status = c.status ? String(c.status) : "—";
                const videoStatus = c.videoInterviewStatus ?? "—";
                const textSm = embedded ? "text-xs" : "text-sm";

                return (
                  <tr
                    key={c._id ?? c.id ?? idx}
                    className={`border-b border-gray-100 hover:bg-gray-50/80 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    }`}
                  >
                    <td className={tdClass}>
                      <div className="flex items-center gap-1.5">
                        <User
                          className="text-gray-400 shrink-0"
                          size={embedded ? 14 : 18}
                        />
                        <span className={`font-medium text-gray-900 ${textSm}`}>
                          {name}
                        </span>
                      </div>
                    </td>
                    <td className={`${tdClass} text-gray-700 ${textSm}`}>
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} className="text-gray-400 shrink-0" />
                          {phone}
                        </span>
                        <span className="inline-flex items-center gap-1 text-gray-600 truncate max-w-[140px]">
                          <Mail size={12} className="text-gray-400 shrink-0" />
                          {email}
                        </span>
                      </div>
                    </td>
                    <td className={`${tdClass} text-gray-800 ${textSm}`}>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase size={12} className="text-gray-400 shrink-0" />
                        {profile}
                      </span>
                    </td>
                    <td className={`${tdClass} text-gray-800 ${textSm}`}>
                      {formatInterviewDisplay(c.interviewDate)}
                    </td>
                    <td className={tdClass}>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                        {status}
                      </span>
                    </td>
                    <td className={`${tdClass} text-gray-700 ${textSm}`}>
                      {videoStatus}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <div
          className={
            embedded
              ? "mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600"
              : "px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-600"
          }
        >
          <span className="font-medium text-gray-800">{rows.length}</span>{" "}
          interview{rows.length === 1 ? "" : "s"} today
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className={cardClass} style={cardStyle}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Today&apos;s candidate interview
            </h3>
            <p className="text-xs text-gray-500 mt-1">{todayHeading}</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            title="Refresh"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-xs font-semibold hover:bg-gray-100 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {tableBody}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shrink-0">
            <Calendar className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Today&apos;s candidate interviews
            </h2>
            <p className="text-gray-600 mt-1">{todayHeading}</p>
            <p className="text-sm text-gray-500 mt-1">
              Candidates with an interview date scheduled for today.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className={cardClass} style={cardStyle}>
        {tableBody}
      </div>
    </div>
  );
};

export default TodaysCandidateInterviews;
