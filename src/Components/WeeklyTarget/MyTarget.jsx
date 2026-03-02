import React, { useCallback, useEffect, useState } from 'react';
import {
  getMyWeeklyTargets,
  getWeeklyTargetById,
  getWeeklyTargetProgress,
  patchWeeklyTargetProgress,
} from '../../services/weeklyTargetService';
import { WeeklyTargetDetail } from './WeeklyTargetSetup';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'alertifyjs/build/css/themes/default.min.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { format, addDays } from 'date-fns';
import { Target, BarChart3, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';

export default function MyTarget() {
  const [targets, setTargets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ weekStartDate: '', weekEndDate: '' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [target, setTarget] = useState(null);
  const [progress, setProgress] = useState(null);
  const [progressForm, setProgressForm] = useState({});
  const [patchingProgress, setPatchingProgress] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [range, setRange] = useState({ startDate: null, endDate: null, key: 'selection' });
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const presets = {
    'Today': [new Date(), new Date()],
    'Yesterday': [addDays(new Date(), -1), addDays(new Date(), -1)],
    'Last 7 Days': [addDays(new Date(), -6), new Date()],
    'Last 30 Days': [addDays(new Date(), -29), new Date()],
    'This Month': [
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    ],
    'Last Month': [
      new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      new Date(new Date().getFullYear(), new Date().getMonth(), 0),
    ],
  };
  const applyPreset = (label) => {
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setFilters((f) => ({
      ...f,
      weekStartDate: format(s, 'yyyy-MM-dd'),
      weekEndDate: format(e, 'yyyy-MM-dd'),
    }));
    setPagination((p) => ({ ...p, page: 1 }));
    setShowPresetMenu(false);
  };

  useEffect(() => {
    alertify.set('notifier', 'position', 'top-right');
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyWeeklyTargets({
        page: pagination.page,
        limit: pagination.limit,
        weekStartDate: filters.weekStartDate || undefined,
        weekEndDate: filters.weekEndDate || undefined,
      });
      setTargets(res?.data?.targets || []);
      setPagination((p) => ({
        ...p,
        total: res?.data?.pagination?.total ?? 0,
        totalPages: res?.data?.pagination?.totalPages ?? 1,
      }));
    } catch (err) {
      alertify.error(err?.message || 'Failed to load your targets');
      setTargets([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters.weekStartDate, filters.weekEndDate]);

  const fetchTargetAndProgress = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const [targetRes, progressRes] = await Promise.all([
        getWeeklyTargetById(id),
        getWeeklyTargetProgress(id),
      ]);
      setTarget(targetRes?.data ?? null);
      setProgress(progressRes?.data ?? null);
      if (progressRes?.data) {
        const p = progressRes.data;
        const manual = {};
        if (p.department === 'Sales' && p.salesTargets?.customerFollowUps != null)
          manual.customerFollowUpsCompleted = p.salesTargets.customerFollowUps?.completed ?? 0;
        if (p.department === 'CMT' && p.cmtTargets?.assignedDoImportantDateUpdates != null)
          manual.assignedDoImportantDateUpdatesCompleted =
            p.cmtTargets.assignedDoImportantDateUpdates?.completed ?? 0;
        setProgressForm(manual);
      }
    } catch (e) {
      alertify.error(e?.message || 'Failed to load target');
      setTarget(null);
      setProgress(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (showViewModal && selectedTargetId) {
      fetchTargetAndProgress(selectedTargetId);
    }
  }, [showViewModal, selectedTargetId, fetchTargetAndProgress]);

  const handleFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedTargetId(null);
    setTarget(null);
    setProgress(null);
    setProgressForm({});
  };

  const handleView = (id) => {
    setTarget(null);
    setProgress(null);
    setProgressForm({});
    setSelectedTargetId(id);
    setShowViewModal(true);
  };

  const filteredTargets = searchTerm.trim()
    ? targets.filter(
        (t) =>
          (t.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.empId || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : targets;

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Top Section - same as DeliveryOrder */}
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left: Stats Cards */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {pagination.total}
              </div>
              <span className="text-gray-700 font-semibold">Total Targets</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {targets.length}
              </div>
              <span className="text-gray-700 font-semibold">This Page</span>
            </div>
          </div>

          {/* Right: Date Range - same as DeliveryOrder */}
          <div className="flex flex-col gap-1 w-full xl:w-[350px]">
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setShowPresetMenu((v) => !v)}
                className="w-full text-left px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors"
              >
                <span>
                  {range.startDate && range.endDate
                    ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                    : 'Select Date Range'}
                </span>
                <span className="ml-3 text-gray-400">▼</span>
              </button>
              {showPresetMenu && (
                <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-100 bg-white shadow-lg py-1 right-0">
                  <button
                    onClick={() => {
                      setRange({ startDate: null, endDate: null, key: 'selection' });
                      setFilters((f) => ({ ...f, weekStartDate: '', weekEndDate: '' }));
                      setPagination((p) => ({ ...p, page: 1 }));
                      setShowPresetMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600"
                  >
                    Clear Filter
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  {Object.keys(presets).map((lbl) => (
                    <button
                      key={lbl}
                      onClick={() => applyPreset(lbl)}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                    >
                      {lbl}
                    </button>
                  ))}
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={() => {
                      setShowPresetMenu(false);
                      setShowCustomRange(true);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    Custom Range
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fetchList()}
              className="flex items-center justify-center gap-2 px-4 h-[45px] border border-gray-200 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 w-full"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Row 2: Search Bar - same as DeliveryOrder */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search targets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
          />
          <Search className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
        </div>
      </div>

      {/* View Target Modal - same as WeeklyTargetSetup / DeliveryOrder */}
      {showViewModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-2"
          onClick={closeViewModal}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Weekly Target Details</h2>
                    <p className="text-blue-100">
                      {target
                        ? `${target.employeeName || ''} (${target.empId || ''})`
                        : detailLoading
                        ? 'Loading...'
                        : 'Target details'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeViewModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4">
              {detailLoading ? (
                <div className="py-12 text-center text-gray-500">Loading...</div>
              ) : target || progress ? (
                <WeeklyTargetDetail
                  target={target}
                  progress={progress}
                  progressForm={progressForm}
                  setProgressForm={setProgressForm}
                  onPatchProgress={async (payload) => {
                    setPatchingProgress(true);
                    try {
                      await patchWeeklyTargetProgress(selectedTargetId, payload);
                      alertify.success('Progress updated');
                      fetchTargetAndProgress(selectedTargetId);
                    } catch (e) {
                      alertify.error(e?.message || 'Update failed');
                    } finally {
                      setPatchingProgress(false);
                    }
                  }}
                  onBack={closeViewModal}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  patchingProgress={patchingProgress}
                  inModal
                  hideEditDelete
                />
              ) : (
                <div className="py-12 text-center text-gray-500">Target not found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Date Range Modal */}
      {showCustomRange && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4"
          onClick={() => setShowCustomRange(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <DateRange
              ranges={[
                range.startDate && range.endDate
                  ? range
                  : { startDate: new Date(), endDate: new Date(), key: 'selection' },
              ]}
              onChange={(item) => {
                if (item.selection.startDate && item.selection.endDate) {
                  setRange(item.selection);
                }
              }}
              moveRangeOnFirstSelection={false}
              months={2}
              direction="horizontal"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  setRange({ startDate: null, endDate: null, key: 'selection' });
                  setFilters((f) => ({ ...f, weekStartDate: '', weekEndDate: '' }));
                  setShowCustomRange(false);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowCustomRange(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (range.startDate && range.endDate) {
                    setFilters((f) => ({
                      ...f,
                      weekStartDate: format(range.startDate, 'yyyy-MM-dd'),
                      weekEndDate: format(range.endDate, 'yyyy-MM-dd'),
                    }));
                    setPagination((p) => ({ ...p, page: 1 }));
                    setShowCustomRange(false);
                  }
                }}
                className={`px-4 py-2 rounded-lg ${
                  range.startDate && range.endDate
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!range.startDate || !range.endDate}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table - same card style as DeliveryOrder */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : filteredTargets.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No targets found matching your search' : 'No weekly targets found for you'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search' : 'Targets are set by your manager'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Department</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Week</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Status</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Progress</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTargets.map((t) => (
                  <tr key={t._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-800">{t.department}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">
                        {t.weekStartDate ? new Date(t.weekStartDate).toLocaleDateString() : '–'}
                        {' – '}
                        {t.weekEndDate ? new Date(t.weekEndDate).toLocaleDateString() : '–'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          t.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : t.status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {t.status || 'active'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-700">{t.progress ?? 0}%</span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => handleView(t._id)}
                        className="px-4 py-1 rounded border border-green-500 text-green-500 text-sm font-medium hover:bg-green-50 transition-colors min-w-[70px]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination - same as DeliveryOrder */}
      {pagination.totalPages > 1 && filteredTargets.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} targets
          </div>
          <div className="flex gap-1 items-center">
            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <div className="flex items-center gap-1 mx-4">
              <span className="px-2 text-gray-600 text-sm font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
