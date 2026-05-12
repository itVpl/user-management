import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ship,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User,
  Users,
  Eye,
  Search,
  Package,
  FileText,
  ClipboardList,
  Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import { listOceanQuotes, getOceanQuoteById } from '../../services/oceanQuoteService.js';
import { formatEmployeeRefForDisplay } from '../../utils/oceanQuoteDisplay.js';
import Loader from '../common/Loader.jsx';
import { toast } from 'react-toastify';

const LIMIT = 20;

function StatCard({ label, value, compact }) {
  return (
    <div
      className={`bg-white border border-gray-200 ${
        compact
          ? 'rounded-lg px-3 min-w-[88px] h-14 min-h-14 flex flex-col justify-center shrink-0'
          : 'rounded-xl p-3'
      }`}
    >
      <p className={`text-gray-500 ${compact ? 'text-[10px] leading-tight' : 'text-xs'}`}>{label}</p>
      <p className={`font-semibold leading-tight ${compact ? 'text-lg mt-0.5' : 'text-2xl'} text-gray-800`}>
        {value}
      </p>
    </div>
  );
}

function DetailField({ label, value, multiline }) {
  const display =
    value === undefined || value === null || String(value).trim() === '' ? 'N/A' : String(value);
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold text-gray-900 ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {display}
      </p>
    </div>
  );
}

function formatWhen(d) {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy, HH:mm');
  } catch {
    return '—';
  }
}

function formatDateOnly(d) {
  if (!d) return null;
  try {
    return format(new Date(d), 'dd MMM yyyy');
  } catch {
    return null;
  }
}

function rowMatchesQuery(row, q) {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  const haystack = [
    row.name,
    row.email,
    row.phoneNumber,
    row.originPort,
    row.destinationPort,
    row.cargoType,
    row.containerType,
    row.assignedTo?.employeeName,
    row.assignedTo?.empId != null ? String(row.assignedTo.empId) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

export default function OceanQuoteList() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: LIMIT,
    totalItems: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [mineOnly, setMineOnly] = useState(true);
  const [accessError, setAccessError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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
        if (status === 403) setAccessError(msg);
        else toast.error(msg);
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

  const filteredItems = useMemo(() => items.filter((row) => rowMatchesQuery(row, searchQuery)), [items, searchQuery]);

  const goPage = (next) => {
    const p = pagination.page + next;
    if (p < 1 || p > pagination.totalPages) return;
    fetchPage(p);
  };

  const handleViewRequest = async (id) => {
    setShowDetailModal(true);
    setSelectedDetail(null);
    setLoadingDetail(true);
    try {
      const res = await getOceanQuoteById(id);
      if (res.data?.success) setSelectedDetail(res.data.data);
      else toast.error(res.data?.message || 'Failed to load detail');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load detail');
    } finally {
      setLoadingDetail(false);
    }
  };

  const searchTrim = searchQuery.trim();
  const statTotal = searchTrim ? filteredItems.length : pagination.totalItems;

  const quote = selectedDetail;

  return (
    <div className="p-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-stretch gap-3">
          <StatCard label="Total" value={statTotal} compact />

          <div className="relative flex-1 min-w-[180px] max-w-lg h-14 min-h-14">
            <input
              type="text"
              placeholder="Search name / email / route / cargo / assignee"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-full w-full min-h-0 box-border pl-3 pr-9 text-sm leading-none bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto shrink-0 min-h-14">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button
                type="button"
                onClick={() => setMineOnly(true)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mineOnly ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'
                }`}
              >
                <User size={16} aria-hidden /> My queue
              </button>
              <button
                type="button"
                onClick={() => setMineOnly(false)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  !mineOnly ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'
                }`}
              >
                <Users size={16} aria-hidden /> Team inbox
              </button>
            </div>
            <button
              type="button"
              onClick={() => fetchPage(pagination.page)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <RefreshCw size={16} aria-hidden /> Refresh
            </button>
          </div>
        </div>
        {searchTrim ? (
          <p className="mt-2 text-xs text-gray-500">
            Showing {filteredItems.length} match{filteredItems.length === 1 ? '' : 'es'} on this page (client filter).
          </p>
        ) : null}
      </div>

      {accessError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {accessError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ocean Quote Inbox</h2>

        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading quotes...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-spacing-0">
              <thead>
                <tr className="bg-[#F1F4F9]">
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base rounded-l-2xl">Quote ID</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Customer</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Route</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Submitted</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base rounded-r-2xl">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td
                      className="py-4 px-4 text-sm font-medium text-gray-700 font-mono"
                      title={item._id ? String(item._id) : undefined}
                    >
                      {item._id ? String(item._id).slice(-8) : '—'}
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm font-medium text-gray-900">{item.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{item.email || 'N/A'}</p>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">
                      {item.originPort || '-'} to {item.destinationPort || '-'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">{formatWhen(item.createdAt)}</td>
                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => handleViewRequest(item._id)}
                        className="px-3 py-1 border border-blue-500 text-blue-500 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No quotes found</p>
            <p className="text-gray-400 text-sm">Try Team inbox or adjust filters</p>
          </div>
        )}

        {!loading && items.length > 0 && filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No rows match your search on this page.</p>
          </div>
        )}

        {!loading && pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
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

      {showDetailModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-gray-200 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-5 rounded-t-3xl shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Quote detail</h3>
                    <p className="text-blue-100 text-sm">Ocean quote — customer and shipment details</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-white/80 hover:text-white text-xl font-bold leading-none px-1"
                  onClick={() => setShowDetailModal(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 bg-gray-50">
              {loadingDetail ? (
                <p className="text-sm text-gray-500">Loading detail...</p>
              ) : !quote ? (
                <p className="text-sm text-red-600">Failed to load detail.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quote ID</p>
                      <p className="mt-1 font-mono text-lg font-bold text-slate-900 break-all">
                        {quote._id || 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/80 p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                        Preferred shipping
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {formatDateOnly(quote.preferredShippingDate) ?? 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-5">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-900">
                      <FileText size={18} className="text-blue-600" />
                      Customer details
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DetailField label="Name" value={quote.name} />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Email</p>
                        {quote.email ? (
                          <a
                            href={`mailto:${quote.email}`}
                            className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
                          >
                            <Mail size={14} aria-hidden />
                            {quote.email}
                          </a>
                        ) : (
                          <p className="mt-0.5 text-sm font-semibold text-gray-900">N/A</p>
                        )}
                      </div>
                      <DetailField label="Phone" value={quote.phoneNumber} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                      <Ship size={18} className="text-emerald-600" />
                      Shipment details
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DetailField label="Origin port" value={quote.originPort} />
                      <DetailField label="Destination port" value={quote.destinationPort} />
                      <DetailField label="Cargo type" value={quote.cargoType} />
                      <DetailField label="Container type" value={quote.containerType} />
                      <DetailField
                        label="Weight (kg)"
                        value={quote.weightKg != null ? String(quote.weightKg) : undefined}
                      />
                      <DetailField
                        label="Volume (CBM)"
                        value={quote.volumeCbm != null ? String(quote.volumeCbm) : undefined}
                      />
                      <DetailField label="Incoterms" value={quote.incoterms} />
                      <DetailField label="Preferred shipping date" value={quote.preferredShippingDate} />
                      <div className="md:col-span-2">
                        <DetailField label="Additional information" value={quote.additionalInformation} multiline />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-5">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                      <ClipboardList size={18} className="text-indigo-600" />
                      Assignment &amp; system
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DetailField label="Assignee (name)" value={quote.assignedTo?.employeeName} />
                      <DetailField label="Assignee emp ID" value={quote.assignedTo?.empId} />
                      <DetailField
                        label="Assignee employee"
                        value={formatEmployeeRefForDisplay(quote.assignedTo?.employeeId)}
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Assignee email</p>
                        {quote.assignedTo?.email ? (
                          <a
                            href={`mailto:${quote.assignedTo.email}`}
                            className="mt-0.5 text-sm font-semibold text-blue-600 hover:underline"
                          >
                            {quote.assignedTo.email}
                          </a>
                        ) : (
                          <p className="mt-0.5 text-sm font-semibold text-gray-900">N/A</p>
                        )}
                      </div>
                      <DetailField
                        label="Assignment email sent at"
                        value={formatWhen(quote.assignmentNoticeEmailSentAt)}
                      />
                      <DetailField
                        label="Assignment email error"
                        value={quote.assignmentNoticeEmailError}
                        multiline
                      />
                      <DetailField label="Created" value={formatWhen(quote.createdAt)} />
                      <DetailField label="Updated" value={formatWhen(quote.updatedAt)} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
