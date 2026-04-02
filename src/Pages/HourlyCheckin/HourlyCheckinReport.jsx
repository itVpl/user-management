import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { getHourlyCheckinReport } from "../../services/hourlyCheckinService";

function ymd(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function HourlyCheckinReport() {
  const [department, setDepartment] = useState("");
  const [empId, setEmpId] = useState("");
  const [startDate, setStartDate] = useState(() => ymd(new Date()));
  const [endDate, setEndDate] = useState(() => ymd(new Date()));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

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
                      <div className="max-w-[900px] whitespace-pre-wrap">{r.responseText || "—"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

