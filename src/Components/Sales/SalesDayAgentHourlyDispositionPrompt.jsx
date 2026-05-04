import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { X, Pencil } from 'lucide-react';
import {
  fetchSalesDayDispositions,
  fetchSalesDayToday,
  patchSalesDayDisposition,
} from '../../services/salesDayAgentService';
import {
  getSavedDispositionNotesForRow,
  getUserFromStorage,
  isSalesDayShiftTiming,
  userHasAddAgentModuleSync,
} from '../../utils/salesDayAgentEligibility';
import { employeeHasMenuModule } from '../../utils/employeeModuleAccess';
import SalesDayCustomerEditModal from './SalesDayCustomerEditModal.jsx';

const LS_PREFIX = 'salesDayDispositionPromptHour';

function storageKey(empId, dateStr) {
  return `${LS_PREFIX}:${empId}:${dateStr}`;
}

function isoToDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultFollowUpDatetimeLocal() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getFollowUpPrefillFromCustomer(row) {
  if (!row || typeof row !== 'object') return { notes: '', datetimeLocal: '' };
  const log = Array.isArray(row.salesDispositionLog) ? row.salesDispositionLog : [];
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const e = log[i];
    if (!e || typeof e !== 'object') continue;
    if (e.disposition === 'follow_up' && e.nextFollowUpAt) {
      return {
        notes: typeof e.notes === 'string' ? e.notes : '',
        datetimeLocal: isoToDatetimeLocalValue(e.nextFollowUpAt),
      };
    }
  }
  const top = row.nextFollowUpAt || row.remindAt || row.salesDayNextFollowUpAt;
  if (top) return { notes: '', datetimeLocal: isoToDatetimeLocalValue(top) };
  return { notes: '', datetimeLocal: '' };
}

function extractTodayCustomers(resp) {
  const candidates = [
    resp?.customers,
    resp?.data?.customers,
    resp?.rows,
    resp?.data?.rows,
    Array.isArray(resp?.data) ? resp.data : null,
  ];
  for (const list of candidates) {
    if (Array.isArray(list)) return list;
  }
  return [];
}

function localTodayParam() {
  return { date: format(new Date(), 'yyyy-MM-dd') };
}

/**
 * Once per local clock hour while logged in: prompt Sales day-shift users with
 * today's imports and disposition controls (spec: frontend timer + localStorage).
 */
export default function SalesDayAgentHourlyDispositionPrompt() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [dispositions, setDispositions] = useState([]);
  const [eligible, setEligible] = useState(false);
  const [checkingModule, setCheckingModule] = useState(true);

  const user = useMemo(() => getUserFromStorage(), [location.key, location.pathname]);
  const empId = user?.empId || user?.employeeId || '';

  const maybeOpenForHour = useCallback(async () => {
    if (!eligible || !empId) return;

    const now = new Date();
    const hour = now.getHours();
    const dateStr = format(now, 'yyyy-MM-dd');
    const key = storageKey(empId, dateStr);
    let lastHour = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        lastHour = typeof parsed?.hour === 'number' ? parsed.hour : null;
      }
    } catch {
      localStorage.removeItem(key);
    }

    if (lastHour === hour) return;

    setLoading(true);
    try {
      const [dispRes, todayRes] = await Promise.all([
        fetchSalesDayDispositions(),
        fetchSalesDayToday(localTodayParam()),
      ]);
      if (dispRes?.success && Array.isArray(dispRes.dispositions)) {
        setDispositions(dispRes.dispositions);
      }
      const list = extractTodayCustomers(todayRes);
      setCustomers(list);
      localStorage.setItem(key, JSON.stringify({ hour }));
      setOpen(true);
    } catch (e) {
      if (e?.response?.status === 403) {
        setEligible(false);
        return;
      }
      console.warn('Sales day disposition prompt:', e);
    } finally {
      setLoading(false);
    }
  }, [eligible, empId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCheckingModule(true);
      const u = getUserFromStorage();
      if (!isSalesDayShiftTiming(u)) {
        if (!cancelled) {
          setEligible(false);
          setCheckingModule(false);
        }
        return;
      }
      if (userHasAddAgentModuleSync(u)) {
        if (!cancelled) {
          setEligible(true);
          setCheckingModule(false);
        }
        return;
      }
      try {
        const ok = await employeeHasMenuModule('Add Agent');
        if (!cancelled) setEligible(!!ok);
      } catch {
        if (!cancelled) setEligible(false);
      } finally {
        if (!cancelled) setCheckingModule(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.key, location.pathname]);

  useEffect(() => {
    if (checkingModule || !eligible) return;
    maybeOpenForHour();
  }, [checkingModule, eligible, location.pathname, maybeOpenForHour]);

  /** Detect clock hour changes without relying only on navigation (spec: hourly prompt). */
  useEffect(() => {
    if (checkingModule || !eligible) return;
    const id = window.setInterval(() => {
      maybeOpenForHour();
    }, 60 * 1000);
    return () => window.clearInterval(id);
  }, [checkingModule, eligible, maybeOpenForHour]);

  if (!eligible || checkingModule) return null;

  return (
    <>
      {open && (
        <SalesDayDispositionModal
          customers={customers}
          dispositions={dispositions}
          loading={loading}
          onClose={() => setOpen(false)}
          onRefresh={async () => {
            setLoading(true);
            try {
              const todayRes = await fetchSalesDayToday(localTodayParam());
              setCustomers(extractTodayCustomers(todayRes));
            } catch (e) {
              toast.error('Could not refresh list.');
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
    </>
  );
}

function SalesDayDispositionModal({ customers, dispositions, loading, onClose, onRefresh }) {
  const [followUp, setFollowUp] = useState(null);
  const [followUpModalIsEdit, setFollowUpModalIsEdit] = useState(false);
  const [followNotes, setFollowNotes] = useState('');
  const [followAt, setFollowAt] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [dispositionNotesById, setDispositionNotesById] = useState({});

  const applyDisposition = async (customerId, disposition, extra = {}) => {
    setSavingId(customerId);
    try {
      await patchSalesDayDisposition(customerId, { disposition, ...extra });
      toast.success('Saved');
      setDispositionNotesById((m) => {
        const next = { ...m };
        delete next[customerId];
        return next;
      });
      await onRefresh();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Save failed';
      toast.error(msg);
    } finally {
      setSavingId(null);
    }
  };

  const openFollowUpEditor = (row) => {
    const pre = getFollowUpPrefillFromCustomer(row);
    setFollowUpModalIsEdit(true);
    setFollowUp(row);
    setFollowNotes(pre.notes || '');
    setFollowAt(pre.datetimeLocal || defaultFollowUpDatetimeLocal());
  };

  const onSelectDisposition = async (row, value) => {
    if (!value) return;
    if (value === 'follow_up') {
      if (row.salesDayDisposition === 'follow_up') {
        openFollowUpEditor(row);
      } else {
        setFollowUpModalIsEdit(false);
        setFollowUp(row);
        setFollowNotes('');
        setFollowAt(defaultFollowUpDatetimeLocal());
      }
      return;
    }
    const notes = (dispositionNotesById[row._id] ?? '').trim() || undefined;
    await applyDisposition(row._id, value, notes ? { notes } : {});
  };

  const saveDispositionNotes = async (row) => {
    const disp = row.salesDayDisposition;
    if (!disp) {
      toast.error('Choose a disposition first.');
      return;
    }
    if (disp === 'follow_up') {
      toast.error('Use the follow-up dialog for follow-up notes.');
      return;
    }
    const raw =
      dispositionNotesById[row._id] !== undefined
        ? dispositionNotesById[row._id]
        : getSavedDispositionNotesForRow(row);
    const notes = raw.trim() || undefined;
    await applyDisposition(row._id, disp, notes ? { notes } : {});
  };

  const submitFollowUp = async () => {
    if (!followUp?._id) return;
    if (!followAt) {
      toast.error('Choose date and time for follow-up.');
      return;
    }
    const iso = new Date(followAt).toISOString();
    await applyDisposition(followUp._id, 'follow_up', {
      notes: followNotes.trim() || undefined,
      nextFollowUpAt: iso,
    });
    setFollowUp(null);
    setFollowUpModalIsEdit(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s imports — disposition</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {!loading && customers.length === 0 && (
            <p className="text-sm text-gray-600">No imports for today yet.</p>
          )}
          {!loading && customers.length > 0 && (
            <div className="overflow-x-auto border rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Person</th>
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Commodity</th>
                    <th className="px-3 py-2 font-medium">City</th>
                    <th className="px-3 py-2 font-medium">St</th>
                    <th className="px-3 py-2 font-medium">Disposition</th>
                    <th className="px-3 py-2 font-medium w-16">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c._id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{c.personName || '—'}</td>
                      <td className="px-3 py-2">{c.companyName || '—'}</td>
                      <td className="px-3 py-2">{c.commodity || '—'}</td>
                      <td className="px-3 py-2">{c.city || '—'}</td>
                      <td className="px-3 py-2">{c.state || '—'}</td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          <select
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-full"
                            value={c.salesDayDisposition || ''}
                            disabled={savingId === c._id}
                            onChange={(e) => onSelectDisposition(c, e.target.value)}
                          >
                            <option value="">Select…</option>
                            {dispositions.map((d) => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1 items-stretch">
                            <input
                              type="text"
                              className="border border-gray-200 rounded px-2 py-0.5 text-[11px] min-w-0 flex-1"
                              placeholder="Notes (optional)"
                              value={
                                dispositionNotesById[c._id] !== undefined
                                  ? dispositionNotesById[c._id]
                                  : getSavedDispositionNotesForRow(c)
                              }
                              disabled={savingId === c._id}
                              onChange={(e) =>
                                setDispositionNotesById((m) => ({ ...m, [c._id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveDispositionNotes(c);
                                }
                              }}
                            />
                            <button
                              type="button"
                              title="Save note without changing disposition"
                              disabled={
                                savingId === c._id ||
                                !c.salesDayDisposition ||
                                c.salesDayDisposition === 'follow_up'
                              }
                              onClick={() => saveDispositionNotes(c)}
                              className="shrink-0 px-1.5 py-0.5 rounded border border-gray-200 bg-slate-50 text-[10px] font-semibold text-gray-700 hover:bg-slate-100 disabled:opacity-40"
                            >
                              Save
                            </button>
                          </div>
                          {c.salesDayDisposition === 'follow_up' && (
                            <button
                              type="button"
                              className="text-[10px] text-blue-600 font-semibold text-left hover:underline disabled:opacity-40"
                              disabled={savingId === c._id}
                              onClick={() => openFollowUpEditor(c)}
                            >
                              Edit follow-up (date &amp; notes)
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          title="Edit fields"
                          className="inline-flex p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                          onClick={() => setEditCustomer(c)}
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="border-t px-4 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>

      <SalesDayCustomerEditModal
        open={!!editCustomer}
        customer={editCustomer}
        onClose={() => setEditCustomer(null)}
        onSaved={() => onRefresh()}
      />

      {followUp && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">
              {followUpModalIsEdit ? 'Edit follow-up' : 'Follow-up'}
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <span className="font-medium">Person:</span> {followUp.personName || '—'}
              </p>
              <p>
                <span className="font-medium">Company:</span> {followUp.companyName || '—'}
              </p>
            </div>
            <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              rows={3}
              value={followNotes}
              onChange={(e) => setFollowNotes(e.target.value)}
            />
            <label className="block text-sm font-medium text-gray-700">Next follow-up</label>
            <input
              type="datetime-local"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={followAt}
              onChange={(e) => setFollowAt(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3 py-2 rounded-lg border text-sm"
                onClick={() => {
                  setFollowUp(null);
                  setFollowUpModalIsEdit(false);
                  onRefresh();
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingId === followUp._id}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
                onClick={submitFollowUp}
              >
                {followUpModalIsEdit ? 'Save changes' : 'Save follow-up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
