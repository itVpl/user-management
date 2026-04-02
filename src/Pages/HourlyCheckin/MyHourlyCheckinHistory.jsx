import { useEffect, useMemo, useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { getMyHourlyCheckinHistory } from "../../services/hourlyCheckinService";

function ymd(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MyHourlyCheckinHistory() {
  const [date, setDate] = useState(() => ymd(new Date()));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const titleDate = useMemo(() => date, [date]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await getMyHourlyCheckinHistory({ date, limit: 200 });
        const data = res?.data || [];
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : data?.records || []);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load history");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [date]);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Hourly Check-ins</h1>
          <div className="text-sm text-gray-600">Date: {titleDate}</div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-500" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center text-gray-500">No check-ins found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
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

