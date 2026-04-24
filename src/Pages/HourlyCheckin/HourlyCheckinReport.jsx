import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import { getHourlyCheckinReport } from "../../services/hourlyCheckinService";

function ymd(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

/** CMT metrics from report row (camelCase or nested shapes). */
function getCmtMetrics(row) {
  const m = row?.metrics?.cmt ?? row?.metrics?.CMT ?? row?.cmtMetrics;
  return m && typeof m === "object" ? m : null;
}

function getNoOfLoadAssignOrReassign(row) {
  const cmt = getCmtMetrics(row);
  const block =
    cmt?.noOfLoadAssignOrReassign ??
    cmt?.no_of_load_assign_or_reassign ??
    null;
  if (!block || typeof block !== "object") return null;
  const count =
    typeof block.count === "number"
      ? block.count
      : Number(block.count) || 0;
  const refs = Array.isArray(block.refs) ? block.refs : [];
  return { count, refs };
}

export default function HourlyCheckinReport() {
  const [department, setDepartment] = useState("");
  const [empId, setEmpId] = useState("");
  const [startDate, setStartDate] = useState(() => ymd(new Date()));
  const [endDate, setEndDate] = useState(() => ymd(new Date()));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [viewRow, setViewRow] = useState(null);

  const params = useMemo(() => {
    const p = {};
    if (department) p.department = department;
    if (empId.trim()) p.empId = empId.trim();
    if (startDate && endDate) {
      p.startDate = startDate;
      p.endDate = endDate;
    }
    return p;
  }, [department, empId, startDate, endDate]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await getHourlyCheckinReport(params);
        const data = res?.data || [];
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : data?.records || []);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load report");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [params]);

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Hourly Check-in Report</h1>
        <div className="text-sm text-gray-600">HR/Admin report</div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="Sales">Sales</option>
              <option value="CMT">CMT</option>
              <option value="HR">HR</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Emp ID
            </label>
            <input
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="e.g. VPL023"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center text-gray-500">No records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Emp
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Department
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Hour
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Submitted At
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Response
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide w-[100px]">
                    View
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id || `${r.empId}-${r.hourBucketStart}`} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="font-semibold">{r.empId || "—"}</div>
                      <div className="text-xs text-gray-500">
                        {r.employee?.employeeName || r.employeeName || ""}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                      {r.department || "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800 whitespace-nowrap">
                      {r.hourBucketStart
                        ? `${new Date(r.hourBucketStart).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} – ${new Date(r.hourBucketEnd).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800">
                      <div className="max-w-[520px] line-clamp-3 whitespace-pre-wrap text-gray-700">
                        {r.responseText || "—"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setViewRow(r)}
                        className="text-sm font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50"
                      >
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

      {/* Detail view: data from row only — no extra API (CMT metrics from list payload) */}
      {viewRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hourly-checkin-view-title"
          onClick={() => setViewRow(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
              <h2 id="hourly-checkin-view-title" className="text-lg font-bold text-gray-900">
                Check-in detail
              </h2>
              <button
                type="button"
                onClick={() => setViewRow(null)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-200"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Emp ID</div>
                  <div className="font-medium text-gray-900">{viewRow.empId || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Department</div>
                  <div className="font-medium text-gray-900">{viewRow.department || "—"}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Created at</div>
                <div className="text-sm text-gray-900">
                  {formatDateTime(viewRow.createdAt || viewRow.submittedAt)}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Response text</div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 max-h-[240px] overflow-y-auto">
                  {viewRow.responseText || "—"}
                </div>
              </div>

              {(String(viewRow.department || "").toUpperCase() === "CMT" ||
                getNoOfLoadAssignOrReassign(viewRow) ||
                getCmtMetrics(viewRow)) && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="text-sm font-bold text-indigo-900 mb-2">
                    Load assign / reassign (CMT)
                  </div>
                  {(() => {
                    const block = getNoOfLoadAssignOrReassign(viewRow);
                    if (!block) {
                      return (
                        <p className="text-sm text-gray-600">No assign/reassign metrics on this record.</p>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">Count:</span> {block.count}
                        </p>
                        <div>
                          <span className="text-sm font-semibold text-gray-800">Refs:</span>
                          {block.refs.length === 0 ? (
                            <span className="text-sm text-gray-600 ml-2">—</span>
                          ) : (
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {block.refs.map((ref, i) => (
                                <li
                                  key={`${ref}-${i}`}
                                  className="text-sm font-mono bg-white border border-indigo-200 text-indigo-900 px-2.5 py-1 rounded-md"
                                >
                                  {String(ref)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

