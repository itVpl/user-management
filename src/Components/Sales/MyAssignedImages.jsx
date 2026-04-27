import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchMyAssignments, resolveHandoffImageUrl } from '../../services/salesShiftHandoffService.js';
import { getUserFromStorage, isEmployeeActiveForHandoff, isSalesDepartment } from '../../utils/salesDayAgentEligibility.js';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}

export default function MyAssignedImages() {
  const user = getUserFromStorage();
  const sales = isSalesDepartment(user);
  const active = isEmployeeActiveForHandoff(user);
  const allowed = sales && active;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      const res = await fetchMyAssignments();
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      toast.error(e.message || 'Failed to load assignments');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  if (!sales) {
    return (
      <div className="p-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-lg shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">My Assigned Images</h1>
          <p className="text-gray-600 text-sm mt-2 leading-relaxed">
            This page is only for the <strong>Sales</strong> department. If you believe this is an error, ask HR to
            verify your employee profile.
          </p>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="p-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-lg shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">My Assigned Images</h1>
          <p className="text-gray-600 text-sm mt-2 leading-relaxed">
            This account is not active — assigned images are not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">My Assigned Images</h1>
            <p className="text-gray-600 mt-1.5 text-sm max-w-3xl leading-relaxed">
              Incoming handoff from the other shift (newest first). Upload and send to colleagues from{' '}
              <Link to="/sales/shift-image-handoff" className="text-blue-600 font-medium hover:underline">
                Shift Image Handoff
              </Link>
              . Click a card image to open the full file in a new tab.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-40"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        {loading && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-slate-50/80 px-4 py-10 text-center">
            <p className="text-xs font-medium text-gray-700">Loading…</p>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm font-medium text-gray-800">No assigned images yet</p>
            <p className="text-xs text-gray-600 mt-2 max-w-md mx-auto leading-relaxed">
              When day shift distributes images to you, they will appear here. You must be logged in to appear in the
              receiver pool.
            </p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {rows.map((row) => {
              const uploader = row.uploadedBy && typeof row.uploadedBy === 'object' ? row.uploadedBy : null;
              const url = resolveHandoffImageUrl(row.imageUrl);
              return (
                <article
                  key={row._id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative flex h-28 items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 sm:h-32"
                  >
                    <img
                      src={url}
                      alt={row.originalName || 'Assigned image'}
                      className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                    <span className="absolute bottom-1.5 right-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-700 shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
                      Open
                    </span>
                  </a>
                  <div className="flex flex-1 flex-col gap-0.5 border-t border-gray-100 p-3">
                    <p className="text-sm font-semibold text-gray-900 truncate" title={row.originalName}>
                      {row.originalName || 'Image'}
                    </p>
                    <p className="text-[14px] text-gray-500">Assigned {formatDate(row.assignedAt)}</p>
                    {uploader && (
                      <p className="mt-1 text-[14px] leading-snug text-gray-600">
                        From{' '}
                        <span className="font-medium text-gray-800">
                          {uploader.employeeName || uploader.email || '—'}
                        </span>
                        {uploader.empId ? <span className="text-gray-500"> · {uploader.empId}</span> : null}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}
