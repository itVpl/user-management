import React from 'react';
import { Truck, RefreshCw, Target } from 'lucide-react';
import { useMyAssignedTruckers } from '../../hooks/useMyAssignedTruckers';
import { shouldShowMyAssignedTruckersWidget } from '../../utils/truckerAssignmentStorage';

function formatRange(start, end) {
  if (!start && !end) return '—';
  const opts = { year: 'numeric', month: 'short', day: 'numeric' };
  try {
    const a = start ? new Date(start).toLocaleDateString(undefined, opts) : '?';
    const b = end ? new Date(end).toLocaleDateString(undefined, opts) : '?';
    return `${a} – ${b}`;
  } catch {
    return '—';
  }
}

export default function MyAssignedTruckersWidget() {
  const userRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const visible = shouldShowMyAssignedTruckersWidget(user);
  const { truckers, windows, loading, error, refresh } = useMyAssignedTruckers({
    enabled: visible,
  });

  if (!visible) return null;

  const hasQuotas = windows.length > 0;
  const hasLegacyTruckers = Array.isArray(truckers) && truckers.length > 0;
  const showEmpty = !loading && !hasQuotas && !hasLegacyTruckers;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">New trucker targets</h2>
            <p className="text-xs text-gray-500">Quota progress for each active assignment window</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg border border-indigo-100 hover:bg-indigo-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="p-5 space-y-5">
        {loading && !hasQuotas && !hasLegacyTruckers ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading…</p>
        ) : showEmpty ? (
          <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <Truck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600 font-medium">No active targets</p>
            <p className="text-sm text-gray-500 mt-1">
              When your manager sets a new-trucker quota for you, it will show here with progress.
            </p>
          </div>
        ) : null}

        {hasQuotas && (
          <ul className="space-y-4">
            {windows.map((w) => {
              const targetNumRaw = Number(w.targetNewTruckerCount);
              const hasTarget = Number.isFinite(targetNumRaw) && targetNumRaw > 0;
              const targetNum = hasTarget ? targetNumRaw : 0;
              const added = Math.max(0, Number(w.addedCount ?? 0));
              const pct = hasTarget ? Math.min(100, Math.round((added / targetNum) * 100)) : 0;

              return (
                <li
                  key={w.assignmentId || `${w.startDate}-${w.endDate}`}
                  className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-900">{formatRange(w.startDate, w.endDate)}</span>
                    <span className="text-sm font-bold text-indigo-700 tabular-nums">
                      {added} of {hasTarget ? targetNum : '—'} done
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${hasTarget ? pct : 0}%` }}
                    />
                  </div>
                  {w.notes ? <p className="text-xs text-gray-600">{w.notes}</p> : null}
                </li>
              );
            })}
          </ul>
        )}

        {hasLegacyTruckers && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Linked carriers (legacy)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600">
                    <th className="px-3 py-2.5 font-semibold">Company</th>
                    <th className="px-3 py-2.5 font-semibold">MC#</th>
                    <th className="px-3 py-2.5 font-semibold">Phone</th>
                    <th className="px-3 py-2.5 font-semibold">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {truckers.map((t) => (
                    <tr key={t._id || t.userId} className="border-t border-gray-100 hover:bg-gray-50/80">
                      <td className="px-3 py-2.5 font-medium text-gray-900">{t.compName || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700">{t.mc_dot_no || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700">{t.phoneNo || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700 break-all max-w-[200px]">{t.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
