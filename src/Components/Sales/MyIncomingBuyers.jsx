import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchMyIncomingBuyers } from '../../services/salesBuyerHandoffService.js';
import { getUserFromStorage, isEmployeeActiveForHandoff, isSalesDepartment } from '../../utils/salesDayAgentEligibility.js';
import usFlagImg from '../../assets/Flag_of_the_United_States.png';
import indiaFlagImg from '../../assets/Flag_of_India.png';

const PAGE_LIMIT = 50;

function FlagUs({ className = 'h-4 w-auto max-w-[1.375rem] rounded-sm border border-black/10 object-cover shrink-0' }) {
  return <img src={usFlagImg} alt="" width={22} height={14} className={className} aria-hidden draggable={false} />;
}

function FlagIn({ className = 'h-4 w-auto max-w-[1.375rem] rounded-sm border border-black/10 object-cover shrink-0' }) {
  return <img src={indiaFlagImg} alt="" width={22} height={14} className={className} aria-hidden draggable={false} />;
}

function formatDt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

function agentCompanyOnly(agent) {
  if (!agent || typeof agent !== 'object') return '—';
  return agent.companyName || '—';
}

function creatorLabel(c) {
  if (!c || typeof c !== 'object') return '—';
  return c.employeeName || c.email || c.empId || '—';
}

export default function MyIncomingBuyers() {
  const user = getUserFromStorage();
  const sales = isSalesDepartment(user);
  const active = isEmployeeActiveForHandoff(user);
  const allowed = sales && active;

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_LIMIT));

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      const res = await fetchMyIncomingBuyers({ page, limit: PAGE_LIMIT });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setTotal(typeof res?.total === 'number' ? res.total : res?.count ?? 0);
    } catch (e) {
      toast.error(e.message || 'Failed to load incoming buyers');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [allowed, page]);

  useEffect(() => {
    load();
  }, [load]);

  if (!sales) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">My Incoming Buyers</h1>
          <p className="text-gray-600 text-sm mt-2">This page is only for the Sales department.</p>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">My Incoming Buyers</h1>
          <p className="text-gray-600 text-sm mt-2">This account is not active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastContainer position="top-right" />

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Incoming Buyers</h1>
            <p className="text-gray-600 mt-2 text-sm max-w-3xl leading-relaxed">
              Buyers forwarded to you from day-shift Sales (newest assignment first). Day-shift users create and send
              buyers from{' '}
              <Link to="/sales/buyer-handoff" className="text-blue-600 font-medium hover:underline">
                Sales Buyer Handoff
              </Link>
              .
            </p>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {loading && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-slate-50 px-4 py-10 text-center text-sm text-gray-600">
            Loading…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50 px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-800">No incoming buyers</p>
            <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
              When day-shift forwards buyers to you, they appear here. You must be logged in today to receive assignments.
            </p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            <div className="overflow-x-auto border border-gray-200 rounded-2xl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <FlagUs className="h-3.5 w-auto max-w-[1.2rem]" />
                        US Buyer
                      </span>
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Contact</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <FlagIn className="h-3.5 w-auto max-w-[1.2rem]" />
                        Indian Customer
                      </span>
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">From</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id} className="border-t border-gray-100 odd:bg-white even:bg-slate-50/40">
                      <td className="px-3 py-2 font-medium text-gray-900">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <FlagUs />
                          <span className="truncate">{row.buyerName || '—'}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        <div>{row.buyerEmail || '—'}</div>
                        <div className="text-xs text-gray-500">{row.buyerPhone || ''}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <FlagIn />
                          <span className="truncate">{agentCompanyOnly(row.agentId)}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{creatorLabel(row.createdBy)}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDt(row.assignedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-sm text-gray-600">
              <span>
                Page {page} of {totalPages} · {total} total
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
