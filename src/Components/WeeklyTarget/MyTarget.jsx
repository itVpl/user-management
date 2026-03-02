import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Target, Filter, ChevronLeft, RefreshCw } from 'lucide-react';

export default function MyTarget() {
  const navigate = useNavigate();
  const { targetId } = useParams();
  const [targets, setTargets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ weekStartDate: '', weekEndDate: '' });
  const [loading, setLoading] = useState(false);

  const [target, setTarget] = useState(null);
  const [progress, setProgress] = useState(null);
  const [progressForm, setProgressForm] = useState({});
  const [patchingProgress, setPatchingProgress] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

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
    if (targetId) {
      fetchTargetAndProgress(targetId);
    } else {
      fetchList();
    }
  }, [targetId, fetchTargetAndProgress, fetchList]);

  const handleFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const goToList = () => {
    setTarget(null);
    setProgress(null);
    setProgressForm({});
    navigate('/my-target');
  };

  const handleView = (id) => navigate(`/my-target/${id}`);

  // Detail view
  if (targetId) {
    if (detailLoading) {
      return (
        <div className="p-6">
          <div className="text-gray-500">Loading...</div>
        </div>
      );
    }
    if (target || progress) {
      return (
        <WeeklyTargetDetail
          target={target}
          progress={progress}
          progressForm={progressForm}
          setProgressForm={setProgressForm}
          onPatchProgress={async (payload) => {
            setPatchingProgress(true);
            try {
              await patchWeeklyTargetProgress(targetId, payload);
              alertify.success('Progress updated');
              fetchTargetAndProgress(targetId);
            } catch (e) {
              alertify.error(e?.message || 'Update failed');
            } finally {
              setPatchingProgress(false);
            }
          }}
          onBack={goToList}
          onEdit={() => {}}
          onDelete={() => {}}
          patchingProgress={patchingProgress}
          hideEditDelete
        />
      );
    }
  }

  if (targetId && !target && !progress && !detailLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Target not found.</p>
        <button
          type="button"
          onClick={goToList}
          className="mt-2 text-blue-600 hover:underline flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
        <Target className="w-7 h-7 text-blue-600" />
        My Target
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Filters</span>
          </div>
          <input
            type="date"
            value={filters.weekStartDate}
            onChange={(e) => handleFilterChange('weekStartDate', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            placeholder="Week start"
          />
          <input
            type="date"
            value={filters.weekEndDate}
            onChange={(e) => handleFilterChange('weekEndDate', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            placeholder="Week end"
          />
          <button
            type="button"
            onClick={() => fetchList()}
            className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : targets.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No weekly targets found for you. Targets are set by your manager.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Week</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Progress</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {targets.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{t.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {t.weekStartDate ? new Date(t.weekStartDate).toLocaleDateString() : '–'}
                      {' – '}
                      {t.weekEndDate ? new Date(t.weekEndDate).toLocaleDateString() : '–'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
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
                    <td className="px-4 py-3 text-sm text-gray-700">{t.progress ?? 0}%</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleView(t._id)}
                        className="text-blue-600 hover:underline text-sm"
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

        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-2 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-2 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
