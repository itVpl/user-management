import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  distributeHandoffImages,
  fetchMyDistributions,
  fetchMyPendingUploads,
  fetchReceiverPool,
  resolveHandoffImageUrl,
  uploadHandoffImages,
} from '../../services/salesShiftHandoffService.js';
import { getUserFromStorage, isEmployeeActiveForHandoff, isSalesDepartment } from '../../utils/salesDayAgentEligibility.js';

const PAGE_SIZE = 10;

function receiverGroupLabel(group) {
  if (group === 'day_shift') return 'Day shift (logged in today)';
  if (group === 'non_day_shift') return 'Non–day shift (logged in today)';
  return null;
}

function formatAssignedAt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

function assigneeCell(assignedTo) {
  if (!assignedTo || typeof assignedTo !== 'object') return { name: '—', detail: '' };
  const name = assignedTo.employeeName || assignedTo.email || '—';
  const parts = [];
  if (assignedTo.empId) parts.push(assignedTo.empId);
  if (assignedTo.salesShiftTiming) parts.push(String(assignedTo.salesShiftTiming).replace(/_/g, ' '));
  return { name, detail: parts.join(' · ') };
}

function useHandoffEligibility() {
  const user = getUserFromStorage();
  const sales = isSalesDepartment(user);
  const active = isEmployeeActiveForHandoff(user);
  return { user, sales, active, allowed: sales && active };
}

export default function ShiftImageHandoff() {
  const { allowed, sales, active } = useHandoffEligibility();
  const [receiverCount, setReceiverCount] = useState(null);
  const [receiverGroup, setReceiverGroup] = useState(null);
  const [pending, setPending] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [distPage, setDistPage] = useState(1);
  const [activeTab, setActiveTab] = useState('pending');
  const selectAllRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      const [poolRes, pendRes, distRes] = await Promise.all([
        fetchReceiverPool(),
        fetchMyPendingUploads(),
        fetchMyDistributions(),
      ]);
      setReceiverCount(poolRes?.data?.receiverCount ?? 0);
      setReceiverGroup(poolRes?.data?.receiverGroup ?? null);
      setPending(Array.isArray(pendRes?.data) ? pendRes.data : []);
      setDistributions(Array.isArray(distRes?.data) ? distRes.data : []);
      setSelectedIds(new Set());
      setPage(1);
      setDistPage(1);
    } catch (e) {
      toast.error(e.message || 'Failed to load handoff data');
      setReceiverCount(null);
      setReceiverGroup(null);
      setPending([]);
      setDistributions([]);
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalPages = Math.max(1, Math.ceil(pending.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [pending.length, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return pending.slice(start, start + PAGE_SIZE);
  }, [pending, page]);

  const distTotalPages = Math.max(1, Math.ceil(distributions.length / PAGE_SIZE));

  useEffect(() => {
    setDistPage((p) => Math.min(Math.max(1, p), distTotalPages));
  }, [distributions.length, distTotalPages]);

  const distPageRows = useMemo(() => {
    const start = (distPage - 1) * PAGE_SIZE;
    return distributions.slice(start, start + PAGE_SIZE);
  }, [distributions, distPage]);

  const allPendingSelected =
    pending.length > 0 && pending.every((row) => selectedIds.has(row._id));
  const somePendingSelected = pending.some((row) => selectedIds.has(row._id));

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = somePendingSelected && !allPendingSelected;
  }, [somePendingSelected, allPendingSelected, pending.length]);

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPendingSelected) {
        pending.forEach((row) => next.delete(row._id));
      } else {
        pending.forEach((row) => next.add(row._id));
      }
      return next;
    });
  };

  const orderedSelectedIds = pending.filter((row) => selectedIds.has(row._id)).map((row) => row._id);

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []).filter(Boolean);
    e.target.value = '';
    if (!files.length) return;
    if (files.length > 20) {
      toast.warn('Maximum 20 files per upload.');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadHandoffImages(files);
      toast.success(res.message || 'Uploaded');
      await refresh();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDistribute = async () => {
    if (orderedSelectedIds.length === 0) {
      toast.info('Select at least one pending image.');
      return;
    }
    if (!receiverCount) {
      toast.error('No logged-in receivers in the pool. Ask eligible colleagues to log in.');
      return;
    }
    setDistributing(true);
    try {
      const res = await distributeHandoffImages(orderedSelectedIds);
      toast.success(res.message || 'Distributed');
      await refresh();
      setActiveTab('post');
    } catch (err) {
      if (err.status === 409) {
        toast.warn(err.message || 'Conflict — try again');
      } else {
        toast.error(err.message || 'Distribute failed');
      }
    } finally {
      setDistributing(false);
    }
  };

  if (!sales) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg">
          <h1 className="text-lg font-semibold text-gray-900">Shift Image Handoff</h1>
          <p className="text-gray-600 text-sm mt-2">
            This screen is only for the <strong>Sales</strong> department. If you are on Sales and still see this
            message, your profile may be missing a populated department — ask HR to verify your employee record.
          </p>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg">
          <h1 className="text-lg font-semibold text-gray-900">Shift Image Handoff</h1>
          <p className="text-gray-600 text-sm mt-2">This account is not active — handoff is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Shift Image Handoff</h1>
        <p className="text-gray-600 mt-2 text-base max-w-3xl leading-relaxed">
          Active Sales on <strong>either</strong> shift can upload images (JPG, PNG, WebP — up to 20 files and 10 MB each
          per request) and distribute in round-robin to the <strong>opposite</strong> side: day shift sends to non–day
          receivers; night / rotational / unset sends to day-shift receivers. Only colleagues <strong>logged in
          today</strong> count in the pool. Use{' '}
          <Link to="/sales/my-assigned-images" className="text-blue-600 font-medium hover:underline">
            My Assigned Images
          </Link>{' '}
          for files assigned <em>to</em> you. Order of selection follows the full pending list (newest first).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-800">
            Logged-in receivers:{' '}
            {loading ? '…' : receiverCount == null ? '—' : <strong className="ml-1">{receiverCount}</strong>}
          </span>
          {!loading && receiverGroup && receiverGroupLabel(receiverGroup) && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-900 ring-1 ring-blue-100">
              {receiverGroupLabel(receiverGroup)}
            </span>
          )}
          {receiverCount === 0 && !loading && (
            <span className="text-amber-700">
              No receivers in the pool — distribution will fail until an eligible user is logged in.
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div
          className="flex flex-wrap gap-0 border-b border-gray-200 bg-slate-50/80 px-2 pt-2"
          role="tablist"
          aria-label="Handoff sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pending'}
            id="tab-pending-distribution"
            aria-controls="panel-pending-distribution"
            className={`relative rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              activeTab === 'pending'
                ? 'bg-white text-blue-700 shadow-[0_1px_0_0_white] ring-1 ring-gray-200 ring-b-0'
                : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            Pending distribution
            {!loading && (
              <span className="ml-1.5 tabular-nums text-xs font-medium text-gray-500">({pending.length})</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'post'}
            id="tab-post-distribution"
            aria-controls="panel-post-distribution"
            className={`relative rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              activeTab === 'post'
                ? 'bg-white text-blue-700 shadow-[0_1px_0_0_white] ring-1 ring-gray-200 ring-b-0'
                : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('post')}
          >
            Post distribution
            {!loading && (
              <span className="ml-1.5 tabular-nums text-xs font-medium text-gray-500">({distributions.length})</span>
            )}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'pending' && (
            <div
              id="panel-pending-distribution"
              role="tabpanel"
              aria-labelledby="tab-pending-distribution"
            >
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Upload images</h2>
                <p className="text-gray-600 mt-2 text-sm max-w-3xl leading-relaxed">
                  Choose files from your computer. After upload, each file appears in the pending table below.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      disabled={uploading}
                      onChange={onFiles}
                    />
                    {uploading ? 'Uploading…' : 'Choose files'}
                  </label>
                  <span className="text-xs text-gray-500">Up to 20 files per request · 10 MB per file (server limit)</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Pending uploads</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
                      onClick={refresh}
                      disabled={loading}
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-40"
                      onClick={onDistribute}
                      disabled={loading || distributing || orderedSelectedIds.length === 0}
                    >
                      {distributing ? 'Distributing…' : 'Distribute selected'}
                    </button>
                  </div>
                </div>

                {loading && <p className="text-sm text-gray-500">Loading…</p>}

                {!loading && pending.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50 px-6 py-12 text-center">
                    <p className="text-sm font-medium text-gray-800">No pending images</p>
                    <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
                      Upload images using the section above. Pending rows appear here until you distribute them.
                    </p>
                  </div>
                )}

                {!loading && pending.length > 0 && (
                  <>
                    <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm [scrollbar-width:thin] bg-white">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gradient-to-r from-slate-50 to-blue-50/50 text-left shadow-[0_1px_0_0_rgb(226_232_240)]">
                          <tr>
                            <th className="px-3 py-2.5 w-12">
                              <input
                                ref={selectAllRef}
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={allPendingSelected}
                                onChange={toggleSelectAll}
                                title="Select all pending images"
                                aria-label="Select all pending images"
                              />
                            </th>
                            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                              Preview
                            </th>
                            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                              File name
                            </th>
                            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                              ID
                            </th>
                            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((row) => {
                            const checked = selectedIds.has(row._id);
                            return (
                              <tr
                                key={row._id}
                                className="border-t border-gray-100 odd:bg-white even:bg-slate-50/30 hover:bg-blue-50/50 transition-colors"
                              >
                                <td className="px-3 py-2 align-middle">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300"
                                    checked={checked}
                                    onChange={() => toggle(row._id)}
                                    aria-label={`Select ${row.originalName || 'image'}`}
                                  />
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  <a
                                    href={resolveHandoffImageUrl(row.imageUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block h-14 w-20 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
                                  >
                                    <img
                                      src={resolveHandoffImageUrl(row.imageUrl)}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  </a>
                                </td>
                                <td className="px-3 py-2 align-middle font-medium text-gray-900 max-w-[200px] truncate">
                                  {row.originalName || '—'}
                                </td>
                                <td className="px-3 py-2 align-middle text-xs text-gray-500 font-mono max-w-[140px] truncate">
                                  {row._id}
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                    {row.status || '—'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 pt-4">
                      <span className="font-medium text-gray-700">
                        Page {page} of {totalPages}{' '}
                        <span className="font-normal text-gray-500">
                          ({pending.length} row{pending.length === 1 ? '' : 's'} · {orderedSelectedIds.length} selected)
                        </span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={page <= 1}
                          className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Prev
                        </button>
                        <button
                          type="button"
                          disabled={page >= totalPages}
                          className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-gray-500">
                      Round-robin uses the order of selected rows in the full pending list (not only the current page).
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'post' && (
            <div
              id="panel-post-distribution"
              role="tabpanel"
              aria-labelledby="tab-post-distribution"
            >
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-1">Past distributions</h2>
              <p className="text-sm text-gray-600 max-w-3xl leading-relaxed mb-4">
                Images you already distributed (status <strong>assigned</strong>), with who received each file.
              </p>

              {loading && <p className="text-sm text-gray-500">Loading…</p>}

              {!loading && distributions.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50 px-6 py-10 text-center">
                  <p className="text-sm font-medium text-gray-800">No distributions yet</p>
                  <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
                    After you distribute pending images, they will appear here with the assignee details.
                  </p>
                </div>
              )}

              {!loading && distributions.length > 0 && (
                <>
                  <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm [scrollbar-width:thin] bg-white">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gradient-to-r from-slate-50 to-blue-50/50 text-left shadow-[0_1px_0_0_rgb(226_232_240)]">
                        <tr>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                            Preview
                          </th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                            File name
                          </th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                            Assigned to
                          </th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                            Assigned at
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {distPageRows.map((row) => {
                          const url = resolveHandoffImageUrl(row.imageUrl);
                          const { name, detail } = assigneeCell(row.assignedTo);
                          return (
                            <tr
                              key={row._id}
                              className="border-t border-gray-100 odd:bg-white even:bg-slate-50/30 hover:bg-blue-50/50 transition-colors"
                            >
                              <td className="px-3 py-2 align-middle">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block h-14 w-20 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
                                >
                                  <img src={url} alt="" className="h-full w-full object-cover" />
                                </a>
                              </td>
                              <td className="px-3 py-2 align-middle font-medium text-gray-900 max-w-[200px] truncate">
                                {row.originalName || '—'}
                              </td>
                              <td className="px-3 py-2 align-middle text-gray-800 max-w-[220px]">
                                <div className="font-medium truncate" title={name}>
                                  {name}
                                </div>
                                {detail ? (
                                  <div className="text-xs text-gray-500 truncate" title={detail}>
                                    {detail}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 align-middle text-gray-600 whitespace-nowrap text-xs sm:text-sm">
                                {formatAssignedAt(row.assignedAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 pt-4">
                    <span className="font-medium text-gray-700">
                      Page {distPage} of {distTotalPages}{' '}
                      <span className="font-normal text-gray-500">
                        ({distributions.length} row{distributions.length === 1 ? '' : 's'})
                      </span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={distPage <= 1}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        onClick={() => setDistPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={distPage >= distTotalPages}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        onClick={() => setDistPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
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
