import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Truck,
  User,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_CONFIG from '../../config/api';

const BASE = `${API_CONFIG.BASE_URL}/api/v1/trucker-assignments`;

function authHeaders() {
  const token =
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function formatDateShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

export default function TruckerAssign() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [cmtEmployees, setCmtEmployees] = useState([]);
  const [empFilter, setEmpFilter] = useState('');
  const [employeeNameFilter, setEmployeeNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [windowStartFilter, setWindowStartFilter] = useState('');
  const [windowEndFilter, setWindowEndFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [includeCancelled, setIncludeCancelled] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formEmpId, setFormEmpId] = useState('');
  const [formStart, setFormStart] = useState('');
  const [endMode, setEndMode] = useState('endDate');
  const [formEnd, setFormEnd] = useState('');
  const [formDuration, setFormDuration] = useState('7');
  const [formNotes, setFormNotes] = useState('');
  const [formTargetCount, setFormTargetCount] = useState('4');
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignmentList = useCallback(async (params) => {
    setListLoading(true);
    try {
      const res = await axios.get(BASE + '/', { params, headers: authHeaders(), withCredentials: true });
      if (res.data?.success) {
        setAssignments(res.data.assignments || res.data.data || []);
      } else {
        setAssignments([]);
      }
    } catch (e) {
      if (e.response?.status === 403) {
        toast.error(e.response?.data?.message || 'You do not have access to Trucker Assign.');
      } else {
        toast.error(e.response?.data?.message || e.message || 'Failed to load assignments');
      }
      setAssignments([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    const hasStart = windowStartFilter.trim().length > 0;
    const hasEnd = windowEndFilter.trim().length > 0;
    if (hasStart !== hasEnd) {
      toast.error('Window range needs both start and end dates (or clear both).');
      return;
    }

    const params = {};
    if (empFilter.trim()) params.empId = empFilter.trim();
    if (employeeNameFilter.trim()) params.employeeName = employeeNameFilter.trim();
    if (dateFilter.trim()) params.date = dateFilter.trim();
    if (hasStart && hasEnd) {
      params.windowStart = windowStartFilter.trim();
      params.windowEnd = windowEndFilter.trim();
    }
    if (activeOnly) params.activeOnly = 'true';
    if (includeCancelled) params.includeCancelled = 'true';
    await fetchAssignmentList(params);
  }, [
    empFilter,
    employeeNameFilter,
    dateFilter,
    windowStartFilter,
    windowEndFilter,
    activeOnly,
    includeCancelled,
    fetchAssignmentList,
  ]);

  const loadCmtEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/cmt-employees`, { headers: authHeaders(), withCredentials: true });
      if (res.data?.success) {
        setCmtEmployees(res.data.employees || []);
      }
    } catch (e) {
      if (e.response?.status === 403) {
        toast.error(e.response?.data?.message || 'You do not have access to load CMT employees.');
      }
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    loadCmtEmployees();
  }, [loadCmtEmployees]);

  const openCreate = () => {
    setEditId(null);
    setFormEmpId('');
    setFormStart('');
    setFormEnd('');
    setFormDuration('7');
    setFormNotes('');
    setFormTargetCount('4');
    setEndMode('endDate');
    setCreateOpen(true);
  };

  const openEdit = async (id) => {
    try {
      const res = await axios.get(`${BASE}/${id}`, { headers: authHeaders(), withCredentials: true });
      const a = res.data?.assignment;
      if (!a) {
        toast.error('Assignment not found');
        return;
      }
      setEditId(id);
      setFormEmpId(a.empId || a.employee?.empId || '');
      const start = a.startDate ? new Date(a.startDate).toISOString().slice(0, 10) : '';
      const end = a.endDate ? new Date(a.endDate).toISOString().slice(0, 16) : '';
      setFormStart(start);
      setFormEnd(end);
      setFormNotes(a.notes || '');
      setFormTargetCount(String(a.targetNewTruckerCount ?? 4));
      setEndMode('endDate');
      setCreateOpen(true);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load assignment');
    }
  };

  const buildPayload = () => {
    if (!formEmpId.trim()) {
      toast.error('Select a CMT employee');
      return null;
    }
    const targetN = parseInt(formTargetCount, 10);
    if (!Number.isFinite(targetN) || targetN < 1 || targetN > 999) {
      toast.error('Target new truckers must be between 1 and 999');
      return null;
    }
    if (!formStart) {
      toast.error('Enter start date');
      return null;
    }
    const body = {
      empId: formEmpId.trim(),
      targetNewTruckerCount: targetN,
      startDate: formStart.length <= 10 ? `${formStart}T00:00:00.000Z` : new Date(formStart).toISOString(),
      notes: formNotes.trim() || undefined,
    };
    if (endMode === 'duration') {
      const d = parseInt(formDuration, 10);
      if (!d || d < 1 || d > 3660) {
        toast.error('Duration must be between 1 and 3660 days');
        return null;
      }
      body.durationDays = d;
    } else {
      if (!formEnd) {
        toast.error('Enter end date/time');
        return null;
      }
      body.endDate = formEnd.length <= 10 ? `${formEnd}T23:59:59.999Z` : new Date(formEnd).toISOString();
    }
    return body;
  };

  const handleSubmit = async () => {
    const body = buildPayload();
    if (!body) return;
    setSubmitting(true);
    try {
      if (editId) {
        const patch = { ...body };
        delete patch.empId;
        await axios.patch(`${BASE}/${editId}`, patch, { headers: authHeaders(), withCredentials: true });
        toast.success('Assignment updated');
      } else {
        await axios.post(`${BASE}/`, body, { headers: authHeaders(), withCredentials: true });
        toast.success('Assignment created');
      }
      setCreateOpen(false);
      loadAssignments();
    } catch (e) {
      if (e.response?.status === 403) {
        toast.error(e.response?.data?.message || 'Access denied');
      } else {
        toast.error(e.response?.data?.message || e.message || 'Save failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAssignment = async (id) => {
    if (!window.confirm('Cancel this assignment? This target window will no longer apply.')) return;
    try {
      await axios.delete(`${BASE}/${id}`, { headers: authHeaders(), withCredentials: true });
      toast.success('Assignment cancelled');
      loadAssignments();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Cancel failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Trucker Assign</h1>
              <p className="text-sm text-gray-500">
                Set how many new truckers each CMT employee should onboard in a date window
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            New assignment
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 space-y-4">
          <p className="text-xs text-gray-500">
            Filters combine with <span className="font-medium text-gray-700">AND</span> on the server. Use a full window
            range only when both start and end are set.
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">empId</label>
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36"
                value={empFilter}
                onChange={(e) => setEmpFilter(e.target.value)}
                placeholder="VPL003"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Employee name (contains)</label>
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-44"
                value={employeeNameFilter}
                onChange={(e) => setEmployeeNameFilter(e.target.value)}
                placeholder="prash"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Overlap day (UTC)
              </label>
              <input
                type="date"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-40"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Window start</label>
              <input
                type="date"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-40"
                value={windowStartFilter}
                onChange={(e) => setWindowStartFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Window end</label>
              <input
                type="date"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-40"
                value={windowEndFilter}
                onChange={(e) => setWindowEndFilter(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
              <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
              Active only
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={includeCancelled}
                onChange={(e) => setIncludeCancelled(e.target.checked)}
              />
              Include cancelled
            </label>
            <button
              type="button"
              onClick={() => loadAssignments()}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={() => {
                setEmpFilter('');
                setEmployeeNameFilter('');
                setDateFilter('');
                setWindowStartFilter('');
                setWindowEndFilter('');
                setActiveOnly(false);
                setIncludeCancelled(false);
                void fetchAssignmentList({});
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {listLoading ? (
            <div className="flex justify-center py-16 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No assignments found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Target</th>
                    <th className="px-4 py-3 font-semibold">Progress</th>
                    <th className="px-4 py-3 font-semibold">Start</th>
                    <th className="px-4 py-3 font-semibold">End</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((row) => {
                    const id = row._id || row.id;
                    const emp =
                      row.employeeName ||
                      row.employee?.employeeName ||
                      row.employee?.aliasName ||
                      row.empId ||
                      '—';
                    const target = row.targetNewTruckerCount;
                    const added = row.addedCount ?? 0;
                    const cancelled = row.isCancelled === true;
                    return (
                      <tr key={id} className="border-t border-gray-100 hover:bg-gray-50/80">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{emp}</span>
                            <span className="text-gray-500 text-xs">{row.empId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{target ?? '—'}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {added} / {target ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateShort(row.startDate)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateShort(row.endDate)}</td>
                        <td className="px-4 py-3 max-w-xs truncate" title={row.notes}>
                          {row.notes || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {cancelled ? (
                            <span className="text-red-600 text-xs font-medium">Cancelled</span>
                          ) : (
                            <span className="text-emerald-600 text-xs font-medium">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(id)}
                              disabled={cancelled}
                              className="p-2 rounded-lg hover:bg-gray-100 text-indigo-600 disabled:opacity-40"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelAssignment(id)}
                              disabled={cancelled}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-40"
                              title="Cancel assignment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Edit assignment' : 'New assignment'}</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CMT employee *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={formEmpId}
                  onChange={(e) => setFormEmpId(e.target.value)}
                  disabled={!!editId}
                >
                  <option value="">Select employee…</option>
                  {cmtEmployees.map((e) => (
                    <option key={e.empId} value={e.empId}>
                      {e.employeeName || e.aliasName || e.empId} ({e.empId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Target new truckers * <span className="text-gray-400 font-normal">(1–999)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={formTargetCount}
                  onChange={(e) => setFormTargetCount(e.target.value)}
                  placeholder="e.g. 4"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CMT users reach this by onboarding new carriers in the app; carriers are not picked here.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Start date *
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={formStart.length > 10 ? formStart.slice(0, 10) : formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                />
              </div>

              <div>
                <div className="flex gap-4 mb-2 text-sm">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="endMode"
                      checked={endMode === 'endDate'}
                      onChange={() => setEndMode('endDate')}
                    />
                    End date
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="endMode"
                      checked={endMode === 'duration'}
                      onChange={() => setEndMode('duration')}
                    />
                    Duration (days)
                  </label>
                </div>
                {endMode === 'endDate' ? (
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={formEnd.length > 16 ? formEnd.slice(0, 16) : formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                  />
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={3660}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[72px]"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? 'Save changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
