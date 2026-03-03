// Employee Target Report – list all employees' weekly targets with filters and summary (requires "Employee Target Report" module)
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getEmployeeTargetReportList,
  getEmployeeTargetReportSummary,
} from '../../services/employeeTargetReportService';
import {
  Target,
  Filter,
  User,
  TrendingUp,
  CheckCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { toast } from 'react-toastify';

const STATUS_OPTIONS = [
  { value: '', label: 'All status' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

const DEPARTMENT_OPTIONS = [
  { value: '', label: 'All departments' },
  { value: 'Sales', label: 'Sales' },
  { value: 'CMT', label: 'CMT' },
  { value: 'HR', label: 'HR' },
];

const formatDate = (raw) => {
  if (!raw) return '—';
  const d = typeof raw === 'string' ? new Date(raw) : raw;
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusBadge = (status) => {
  const s = (status || '').toLowerCase();
  const config = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-700',
  };
  const cls = config[s] || config.active;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'}
    </span>
  );
};

export default function EmployeeTargetReport() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [filters, setFilters] = useState({
    empId: '',
    department: '',
    weekStartDate: '',
    weekEndDate: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await getEmployeeTargetReportSummary({
        empId: filters.empId || undefined,
        department: filters.department || undefined,
        weekStartDate: filters.weekStartDate || undefined,
        weekEndDate: filters.weekEndDate || undefined,
        status: filters.status || undefined,
      });
      if (res.success && res.data) setSummary(res.data);
      else setSummary(null);
    } catch (err) {
      if (err.status === 403) {
        toast.error(err?.message || 'You do not have permission to access the Employee Target Report.');
      } else {
        toast.error(err?.message || 'Failed to load summary');
      }
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [filters.empId, filters.department, filters.weekStartDate, filters.weekEndDate, filters.status]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmployeeTargetReportList({
        page: pagination.page,
        limit: pagination.limit,
        empId: filters.empId || undefined,
        department: filters.department || undefined,
        weekStartDate: filters.weekStartDate || undefined,
        weekEndDate: filters.weekEndDate || undefined,
        status: filters.status || undefined,
      });
      if (res.success && res.data) {
        setTargets(res.data.targets || []);
        const p = res.data.pagination || {};
        setPagination((prev) => ({
          ...prev,
          total: p.total ?? 0,
          totalPages: p.totalPages ?? 1,
        }));
      } else {
        setTargets([]);
      }
    } catch (err) {
      if (err.status === 403) {
        toast.error(err?.message || 'You do not have permission to access the Employee Target Report.');
      } else {
        toast.error(err?.message || 'Failed to load report');
      }
      setTargets([]);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    filters.empId,
    filters.department,
    filters.weekStartDate,
    filters.weekEndDate,
    filters.status,
  ]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleRefresh = () => {
    fetchSummary();
    fetchList();
  };

  const handleViewTarget = (targetId) => {
    navigate(`/weekly-target/${targetId}`);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <Target className="w-7 h-7 text-blue-600" />
          Employee Target Report
        </h1>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Employee ID</label>
            <input
              type="text"
              value={filters.empId}
              onChange={(e) => handleFilterChange('empId', e.target.value)}
              placeholder="e.g. VPL001"
              className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Department</label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {DEPARTMENT_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Week start</label>
            <input
              type="date"
              value={filters.weekStartDate}
              onChange={(e) => handleFilterChange('weekStartDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Week end</label>
            <input
              type="date"
              value={filters.weekEndDate}
              onChange={(e) => handleFilterChange('weekEndDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Total targets</span>
          </div>
          {summaryLoading ? (
            <div className="h-8 w-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <p className="text-2xl font-bold text-gray-800">{summary?.total ?? 0}</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Completed</span>
          </div>
          {summaryLoading ? (
            <div className="h-8 w-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <p className="text-2xl font-bold text-green-700">{summary?.completed ?? 0}</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Average progress</span>
          </div>
          {summaryLoading ? (
            <div className="h-8 w-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <p className="text-2xl font-bold text-blue-600">{summary?.averageProgress ?? 0}%</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">By department</span>
          </div>
          {summaryLoading ? (
            <div className="h-8 w-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <div className="text-sm text-gray-700">
              {summary?.byDepartment && typeof summary.byDepartment === 'object'
                ? Object.entries(summary.byDepartment).map(([dept, count]) => (
                    <span key={dept} className="mr-2">{dept}: <strong>{count}</strong></span>
                  ))
                : '—'}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-4 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Employee</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Department</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Week</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Set by</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Progress</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Targets (target / completed)</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((t, idx) => (
                    <tr key={t._id || idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-800">{t.employeeName || '—'}</p>
                          <p className="text-xs text-gray-500">{t.empId || '—'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{t.department || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {formatDate(t.weekStartDate)} – {formatDate(t.weekEndDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {t.setBy?.employeeName || '—'}
                        {t.setBy?.empId && <span className="text-gray-500"> ({t.setBy.empId})</span>}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-blue-600">{t.progress ?? 0}%</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {t.department === 'Sales' && t.salesTargets && (
                          <div className="space-y-0.5">
                            <p>DOs: {t.salesTargets.deliveryOrders ?? 0} / {t.salesTargets.deliveryOrdersCompleted ?? 0}</p>
                            <p>Follow-ups: {t.salesTargets.customerFollowUps ?? 0} / {t.salesTargets.customerFollowUpsCompleted ?? 0}</p>
                            <p>New customers: {t.salesTargets.newCustomersAdded ?? 0} / {t.salesTargets.newCustomersAddedCompleted ?? 0}</p>
                            <p>Margin: {t.salesTargets.marginAmount ?? 0} / {t.salesTargets.marginAmountCompleted ?? 0}</p>
                          </div>
                        )}
                        {t.department === 'CMT' && t.cmtTargets && (
                          <div className="space-y-0.5">
                            <p>Bids: {t.cmtTargets.bidsSubmitted ?? 0} / {t.cmtTargets.bidsSubmittedCompleted ?? 0}</p>
                            <p>Carriers: {t.cmtTargets.carriersAdded ?? 0} / {t.cmtTargets.carriersAddedCompleted ?? 0}</p>
                            <p>DO important date updates: {t.cmtTargets.assignedDoImportantDateUpdates ?? 0} / {t.cmtTargets.assignedDoImportantDateUpdatesCompleted ?? 0}</p>
                          </div>
                        )}
                        {t.department === 'HR' && t.hrTargets && (
                          <div className="space-y-0.5">
                            <p>Calls: {t.hrTargets.calls ?? 0} / {t.hrTargets.callsCompleted ?? 0}</p>
                            <p>Interviews: {t.hrTargets.interviews ?? 0} / {t.hrTargets.interviewsCompleted ?? 0}</p>
                            <p>Candidate join: {t.hrTargets.candidateJoin ?? 0} / {t.hrTargets.candidateJoinCompleted ?? 0}</p>
                            <p>Internal review feedback: {t.hrTargets.internalReviewFeedback ?? 0} / {t.hrTargets.internalReviewFeedbackCompleted ?? 0}</p>
                          </div>
                        )}
                        {(!t.department || (t.department !== 'Sales' && t.department !== 'CMT' && t.department !== 'HR')) && '—'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleViewTarget(t._id)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {targets.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No targets found</p>
                <p className="text-gray-400 text-sm">Try adjusting filters or date range</p>
              </div>
            )}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 bg-gray-50/50">
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    disabled={pagination.page <= 1}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
