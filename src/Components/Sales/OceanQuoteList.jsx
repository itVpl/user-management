import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ship, ChevronLeft, ChevronRight, RefreshCw, User, Users, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { listOceanQuotes } from '../../services/oceanQuoteService.js';
import Loader from '../common/Loader.jsx';
import { toast } from 'react-toastify';

const LIMIT = 20;

export default function OceanQuoteList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, totalItems: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [mineOnly, setMineOnly] = useState(true);
  const [accessError, setAccessError] = useState(null);

  const fetchPage = useCallback(
    async (page) => {
      setLoading(true);
      setAccessError(null);
      try {
        const res = await listOceanQuotes({ page, limit: LIMIT, mine: mineOnly });
        if (res.data?.success) {
          setItems(Array.isArray(res.data.data) ? res.data.data : []);
          const p = res.data.pagination || {};
          setPagination({
            page: p.page ?? page,
            limit: p.limit ?? LIMIT,
            totalItems: p.totalItems ?? 0,
            totalPages: Math.max(p.totalPages ?? 1, 1),
          });
        } else {
          setItems([]);
          toast.error(res.data?.message || 'Failed to load quotes');
        }
      } catch (err) {
        console.error(err);
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.message || 'Failed to load quotes';
        if (status === 403) {
          setAccessError(msg);
        } else {
          toast.error(msg);
        }
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [mineOnly],
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const goPage = (next) => {
    const p = pagination.page + next;
    if (p < 1 || p > pagination.totalPages) return;
    fetchPage(p);
  };

  const formatWhen = (d) => {
    if (!d) return '—';
    try {
      return format(new Date(d), 'dd MMM yyyy, HH:mm');
    } catch {
      return '—';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Ship className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Quote request</h1>
              <p className="text-sm text-gray-500">Ocean quote leads (round-robin assignment)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setMineOnly(true)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                  mineOnly ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User size={16} aria-hidden /> My queue
              </button>
              <button
                type="button"
                onClick={() => setMineOnly(false)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                  !mineOnly ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users size={16} aria-hidden /> Team inbox
              </button>
            </div>
            <button
              type="button"
              onClick={() => fetchPage(pagination.page)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <RefreshCw size={16} aria-hidden /> Refresh
            </button>
          </div>
        </div>

        {accessError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {accessError}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <Loader message="Loading quotes…" />
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">No ocean quotes yet for this view.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Lane</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50/80">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatWhen(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.name || '—'}</div>
                        <div className="text-xs text-gray-500">{row.email || '—'}</div>
                        {row.phoneNumber ? (
                          <div className="text-xs text-gray-500">{row.phoneNumber}</div>
                        ) : null}
                      </td>
                      <td className="max-w-[200px] px-4 py-3 text-gray-700">
                        <div className="truncate" title={row.originPort}>
                          {row.originPort || '—'}
                        </div>
                        <div className="truncate text-xs text-gray-500" title={row.destinationPort}>
                          → {row.destinationPort || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="truncate max-w-[180px]" title={row.cargoType}>
                          {row.cargoType || '—'}
                        </div>
                        <div className="text-xs text-gray-500">{row.containerType || ''}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {row.assignedTo?.employeeName || (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                        {row.assignedTo?.empId ? (
                          <span className="ml-1 text-xs text-gray-500">({row.assignedTo.empId})</span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/quote-request/${row._id}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          aria-label={`View customer details for ${row.name || 'quote'}`}
                        >
                          <Eye size={14} aria-hidden />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => goPage(-1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16} aria-hidden /> Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => goPage(1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
