import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import API_CONFIG from '../../config/api';
import {
  listWeeklyTargets,
  getMyWeeklyTargets,
  getWeeklyTargetById,
  getWeeklyTargetProgress,
  createWeeklyTarget,
  updateWeeklyTarget,
  patchWeeklyTargetProgress,
  deleteWeeklyTarget,
} from '../../services/weeklyTargetService';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'alertifyjs/build/css/themes/default.min.css';
import {
  Target,
  Plus,
  Calendar,
  User,
  ChevronLeft,
  Filter,
  Edit2,
  Trash2,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

const getToken = () =>
  sessionStorage.getItem('authToken') ||
  sessionStorage.getItem('token') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');

export default function WeeklyTargetSetup() {
  const navigate = useNavigate();
  const { targetId } = useParams();
  const location = useLocation();
  const isEdit = location.pathname.includes('/edit/');
  const isCreate = location.pathname.includes('/create');
  const isDetail = targetId && !isEdit;

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my'
  const [targets, setTargets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    empId: '',
    department: '',
    weekStartDate: '',
    weekEndDate: '',
    status: '',
  });
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Single target (detail / edit)
  const [target, setTarget] = useState(null);
  const [progress, setProgress] = useState(null);
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [progressForm, setProgressForm] = useState({});
  const [patchingProgress, setPatchingProgress] = useState(false);

  useEffect(() => {
    alertify.set('notifier', 'position', 'top-right');
  }, []);

  const fetchEmployees = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setEmployees(res.data?.employees || []);
    } catch (e) {
      console.error('Failed to fetch employees', e);
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'my') {
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
      } else {
        const res = await listWeeklyTargets({
          page: pagination.page,
          limit: pagination.limit,
          empId: filters.empId || undefined,
          department: filters.department || undefined,
          weekStartDate: filters.weekStartDate || undefined,
          weekEndDate: filters.weekEndDate || undefined,
          status: filters.status || undefined,
        });
        setTargets(res?.data?.targets || []);
        setPagination((p) => ({
          ...p,
          total: res?.data?.pagination?.total ?? 0,
          totalPages: res?.data?.pagination?.totalPages ?? 1,
        }));
      }
    } catch (err) {
      alertify.error(err?.message || 'Failed to load targets');
      setTargets([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.page, pagination.limit, filters]);

  useEffect(() => {
    if (!targetId && !isCreate) {
      fetchEmployees();
      fetchList();
    }
  }, [targetId, isCreate, activeTab, pagination.page, filters, fetchList, fetchEmployees]);

  const fetchTargetAndProgress = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const [targetRes, progressRes] = await Promise.all([
        getWeeklyTargetById(targetId),
        getWeeklyTargetProgress(targetId),
      ]);
      setTarget(targetRes?.data ?? null);
      setProgress(progressRes?.data ?? null);
      if (isEdit) {
        const d = targetRes?.data;
        setFormData({
          salesTargets: d?.salesTargets
            ? {
                deliveryOrders: d.salesTargets.deliveryOrders ?? 0,
                customerFollowUps: d.salesTargets.customerFollowUps ?? 0,
                newCustomersAdded: d.salesTargets.newCustomersAdded ?? 0,
                marginAmount: d.salesTargets.marginAmount ?? 0,
              }
            : undefined,
          cmtTargets: d?.cmtTargets
            ? {
                bidsSubmitted: d.cmtTargets.bidsSubmitted ?? 0,
                carriersAdded: d.cmtTargets.carriersAdded ?? 0,
                assignedDoImportantDateUpdates: d.cmtTargets.assignedDoImportantDateUpdates ?? 0,
              }
            : undefined,
          status: d?.status ?? 'active',
          notes: d?.notes ?? '',
        });
      }
      if (progressRes?.data) {
        const p = progressRes.data;
        const manual = {};
        if (p.salesTargets) {
          if (p.salesTargets.customerFollowUps != null)
            manual.customerFollowUpsCompleted = p.salesTargets.customerFollowUps?.completed;
        }
        if (p.cmtTargets?.assignedDoImportantDateUpdates != null)
          manual.assignedDoImportantDateUpdatesCompleted =
            p.cmtTargets.assignedDoImportantDateUpdates?.completed;
        setProgressForm(manual);
      }
    } catch (err) {
      alertify.error(err?.message || 'Failed to load target');
      setTarget(null);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [targetId, isEdit]);

  useEffect(() => {
    if (targetId) fetchTargetAndProgress();
  }, [targetId, isEdit, fetchTargetAndProgress]);

  const goToList = () => {
    navigate('/weekly-target');
    setTarget(null);
    setProgress(null);
    setFormData(null);
  };

  const handleCreate = () => navigate('/weekly-target/create');
  const handleEdit = (id) => navigate(`/weekly-target/edit/${id}`);
  const handleView = (id) => navigate(`/weekly-target/${id}`);

  const handleDelete = (id) => {
    alertify.confirm(
      'Delete Weekly Target',
      'Are you sure you want to delete this weekly target?',
      async () => {
        try {
          await deleteWeeklyTarget(id);
          alertify.success('Weekly target deleted');
          if (targetId === id) goToList();
          else fetchList();
        } catch (err) {
          alertify.error(err?.message || 'Delete failed');
        }
      },
      () => {}
    );
  };

  const handleFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  if (isCreate) {
    return (
      <WeeklyTargetForm
        employees={employees}
        onSuccess={() => {
          alertify.success('Weekly target created');
          goToList();
        }}
        onCancel={goToList}
        fetchEmployees={fetchEmployees}
      />
    );
  }

  if (isEdit && target && formData) {
    return (
      <WeeklyTargetEditForm
        target={target}
        formData={formData}
        setFormData={setFormData}
        onSuccess={() => {
          alertify.success('Weekly target updated');
          goToList();
        }}
        onCancel={goToList}
        saving={saving}
        setSaving={setSaving}
      />
    );
  }

  if (isDetail && (target || progress)) {
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
            fetchTargetAndProgress();
          } catch (e) {
            alertify.error(e?.message || 'Update failed');
          } finally {
            setPatchingProgress(false);
          }
        }}
        onBack={goToList}
        onEdit={() => handleEdit(targetId)}
        onDelete={() => handleDelete(targetId)}
        patchingProgress={patchingProgress}
      />
    );
  }

  if (targetId && !target && !loading) {
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <Target className="w-7 h-7 text-blue-600" />
          Weekly Target Setup
        </h1>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Target
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Targets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'my'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            My Targets
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Filters</span>
            </div>
            <select
              value={filters.empId}
              onChange={(e) => handleFilterChange('empId', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All employees</option>
              {employees.map((emp) => (
                <option key={emp._id || emp.empId} value={emp.empId}>
                  {emp.empId} – {emp.employeeName || emp.name || 'N/A'}
                </option>
              ))}
            </select>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All departments</option>
              <option value="Sales">Sales</option>
              <option value="CMT">CMT</option>
            </select>
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
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            <button
              type="button"
              onClick={() => fetchList()}
              className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : targets.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No weekly targets found. Create one to get started.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Week</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Set by</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {targets.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-gray-900">{t.employeeName}</span>
                      <span className="text-gray-500 ml-1">({t.empId})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {t.weekStartDate
                        ? new Date(t.weekStartDate).toLocaleDateString()
                        : '–'}
                      {' – '}
                      {t.weekEndDate
                        ? new Date(t.weekEndDate).toLocaleDateString()
                        : '–'}
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
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {t.setBy?.employeeName || t.setBy?.empId || '–'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleView(t._id)}
                        className="text-blue-600 hover:underline text-sm mr-2"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(t._id)}
                        className="text-gray-600 hover:text-gray-900 p-1"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t._id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
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

function WeeklyTargetForm({ employees, onSuccess, onCancel, fetchEmployees }) {
  const [department, setDepartment] = useState('Sales');
  const [empId, setEmpId] = useState('');
  const [weekStartDate, setWeekStartDate] = useState('');
  const [weekEndDate, setWeekEndDate] = useState('');
  const [salesTargets, setSalesTargets] = useState({
    deliveryOrders: 0,
    customerFollowUps: 0,
    newCustomersAdded: 0,
    marginAmount: 0,
  });
  const [cmtTargets, setCmtTargets] = useState({
    bidsSubmitted: 0,
    carriersAdded: 0,
    assignedDoImportantDateUpdates: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const setSales = (key, value) => {
    setSalesTargets((s) => ({ ...s, [key]: Number(value) || 0 }));
  };
  const setCmt = (key, value) => {
    setCmtTargets((c) => ({ ...c, [key]: Number(value) || 0 }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!empId || !weekStartDate || !weekEndDate) {
      alertify.error('Please select employee and week dates.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        empId,
        weekStartDate,
        weekEndDate,
        department,
      };
      if (department === 'Sales') payload.salesTargets = salesTargets;
      else payload.cmtTargets = cmtTargets;
      await createWeeklyTarget(payload);
      onSuccess();
    } catch (err) {
      alertify.error(err?.message || 'Failed to create target');
    } finally {
      setSaving(false);
    }
  };

  const salesDept = employees.filter(
    (e) => (e.department || '').toLowerCase().includes('sales')
  );
  const cmtDept = employees.filter(
    (e) => (e.department || '').toLowerCase().includes('cmt')
  );
  const options = department === 'Sales' ? salesDept : cmtDept;
  if (options.length === 0 && employees.length) {
    const fallback = department === 'Sales' ? employees : employees;
    options.push(...fallback);
  }
  const allOptions = employees.length ? employees : options;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={onCancel}
        className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Create Weekly Target</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="Sales">Sales</option>
            <option value="CMT">CMT</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
          <select
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          >
            <option value="">Select employee</option>
            {(allOptions.length ? allOptions : employees).map((emp) => (
              <option key={emp._id || emp.empId} value={emp.empId}>
                {emp.empId} – {emp.employeeName || emp.name || 'N/A'}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Week start</label>
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Week end</label>
            <input
              type="date"
              value={weekEndDate}
              onChange={(e) => setWeekEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
        </div>
        {department === 'Sales' && (
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-medium text-gray-800">Sales targets</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600">Delivery orders</label>
                <input
                  type="number"
                  min={0}
                  value={salesTargets.deliveryOrders}
                  onChange={(e) => setSales('deliveryOrders', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Customer follow-ups</label>
                <input
                  type="number"
                  min={0}
                  value={salesTargets.customerFollowUps}
                  onChange={(e) => setSales('customerFollowUps', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">New customers added</label>
                <input
                  type="number"
                  min={0}
                  value={salesTargets.newCustomersAdded}
                  onChange={(e) => setSales('newCustomersAdded', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Margin (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={salesTargets.marginAmount}
                  onChange={(e) => setSales('marginAmount', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}
        {department === 'CMT' && (
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-medium text-gray-800">CMT targets</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600">Bids submitted</label>
                <input
                  type="number"
                  min={0}
                  value={cmtTargets.bidsSubmitted}
                  onChange={(e) => setCmt('bidsSubmitted', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Carriers added</label>
                <input
                  type="number"
                  min={0}
                  value={cmtTargets.carriersAdded}
                  onChange={(e) => setCmt('carriersAdded', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Assigned DO date updates</label>
                <input
                  type="number"
                  min={0}
                  value={cmtTargets.assignedDoImportantDateUpdates}
                  onChange={(e) => setCmt('assignedDoImportantDateUpdates', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function WeeklyTargetEditForm({ target, formData, setFormData, onSuccess, onCancel, saving, setSaving }) {
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      if (formData.salesTargets) payload.salesTargets = formData.salesTargets;
      if (formData.cmtTargets) payload.cmtTargets = formData.cmtTargets;
      if (formData.status != null) payload.status = formData.status;
      if (formData.notes != null) payload.notes = formData.notes;
      await updateWeeklyTarget(target._id, payload);
      onSuccess();
    } catch (err) {
      alertify.error(err?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button type="button" onClick={onCancel} className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Edit Weekly Target</h2>
      <p className="text-sm text-gray-600 mb-4">
        {target.employeeName} ({target.empId}) · {target.department} ·{' '}
        {target.weekStartDate && new Date(target.weekStartDate).toLocaleDateString()} –{' '}
        {target.weekEndDate && new Date(target.weekEndDate).toLocaleDateString()}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        {formData.salesTargets && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">Sales targets</h3>
            <div className="grid grid-cols-2 gap-3">
              {['deliveryOrders', 'customerFollowUps', 'newCustomersAdded', 'marginAmount'].map((key) => (
                <div key={key}>
                  <label className="block text-sm text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.salesTargets[key] ?? 0}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        salesTargets: { ...f.salesTargets, [key]: Number(e.target.value) || 0 },
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {formData.cmtTargets && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">CMT targets</h3>
            <div className="grid grid-cols-2 gap-3">
              {['bidsSubmitted', 'carriersAdded', 'assignedDoImportantDateUpdates'].map((key) => (
                <div key={key}>
                  <label className="block text-sm text-gray-600">{key.replace(/([A-Z])/g, ' $1').replace('Do ', 'DO ').trim()}</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.cmtTargets[key] ?? 0}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        cmtTargets: { ...f.cmtTargets, [key]: Number(e.target.value) || 0 },
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input
            type="text"
            value={formData.notes || ''}
            onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Optional"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export function WeeklyTargetDetail({
  target,
  progress,
  progressForm,
  setProgressForm,
  onPatchProgress,
  onBack,
  onEdit,
  onDelete,
  patchingProgress,
  hideEditDelete = false,
}) {
  const progressData = progress || {};
  const sales = progressData.salesTargets || {};
  const cmt = progressData.cmtTargets || {};

  const handleSaveProgress = () => {
    const payload = {};
    if (progressData.department === 'Sales' && progressForm.customerFollowUpsCompleted != null)
      payload.customerFollowUpsCompleted = Number(progressForm.customerFollowUpsCompleted) || 0;
    if (progressData.department === 'CMT' && progressForm.assignedDoImportantDateUpdatesCompleted != null)
      payload.assignedDoImportantDateUpdatesCompleted =
        Number(progressForm.assignedDoImportantDateUpdatesCompleted) || 0;
    if (Object.keys(payload).length) onPatchProgress(payload);
  };

  const renderRow = (label, targetVal, completedVal, manualKey) => {
    const t = targetVal ?? 0;
    const c = completedVal ?? 0;
    const pct = t > 0 ? Math.round((c / t) * 100) : 0;
    const isManual = manualKey && (progressData.department === 'Sales' ? manualKey === 'customerFollowUpsCompleted' : manualKey === 'assignedDoImportantDateUpdatesCompleted');
    return (
      <tr key={label}>
        <td className="px-5 py-3 text-base text-gray-700">{label}</td>
        <td className="px-5 py-3 text-base text-gray-900">{t}</td>
        <td className="px-5 py-3 text-base text-gray-900">
          {isManual ? (
            <input
              type="number"
              min={0}
              value={progressForm[manualKey] ?? c}
              onChange={(e) => setProgressForm((f) => ({ ...f, [manualKey]: e.target.value }))}
              className="min-w-[6rem] w-full max-w-[8rem] border border-gray-300 rounded-lg px-3 py-2 text-base"
            />
          ) : (
            c
          )}
        </td>
        <td className="px-5 py-3 text-base text-gray-600">{pct}%</td>
      </tr>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button type="button" onClick={onBack} className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-1 text-base">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            {target?.employeeName} ({target?.empId})
          </h2>
          <p className="text-base text-gray-600 mt-1">
            {target?.department} · Week:{' '}
            {target?.weekStartDate && new Date(target.weekStartDate).toLocaleDateString()} –{' '}
            {target?.weekEndDate && new Date(target.weekEndDate).toLocaleDateString()}
          </p>
          <span
            className={`inline-flex mt-2 px-2.5 py-1 rounded text-sm font-medium ${
              target?.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : target?.status === 'draft'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {target?.status || 'active'}
          </span>
        </div>
        {!hideEditDelete && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-base font-medium"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 text-base font-medium"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-800 text-base">Progress</span>
          {progressData.progressPercentage != null && (
            <span className="ml-auto text-lg font-semibold text-blue-600">
              {progressData.progressPercentage}%
            </span>
          )}
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wide">Metric</th>
              <th className="px-5 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wide">Target</th>
              <th className="px-5 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wide">Completed</th>
              <th className="px-5 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wide">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {progressData.department === 'Sales' &&
              [
                ['Delivery orders', sales.deliveryOrders?.target, sales.deliveryOrders?.completed],
                ['Customer follow-ups', sales.customerFollowUps?.target, sales.customerFollowUps?.completed], // manualKey removed – read-only
                ['New customers added', sales.newCustomersAdded?.target, sales.newCustomersAdded?.completed],
                ['Margin (₹)', sales.marginAmount?.target, sales.marginAmount?.completed],
              ].map(([label, t, c, manualKey]) => renderRow(label, t, c, manualKey))}
            {progressData.department === 'CMT' &&
              [
                ['Bids submitted', cmt.bidsSubmitted?.target, cmt.bidsSubmitted?.completed],
                ['Carriers added', cmt.carriersAdded?.target, cmt.carriersAdded?.completed],
                ['Assigned DO date updates', cmt.assignedDoImportantDateUpdates?.target, cmt.assignedDoImportantDateUpdates?.completed], // manualKey removed – read-only
              ].map(([label, t, c, manualKey]) => renderRow(label, t, c, manualKey))}
          </tbody>
        </table>
        {/* Save manual progress button - commented out
        {((progressData.department === 'Sales' && sales.customerFollowUps != null) ||
          (progressData.department === 'CMT' && cmt.assignedDoImportantDateUpdates != null)) && (
          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              type="button"
              onClick={handleSaveProgress}
              disabled={patchingProgress}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-base font-medium"
            >
              {patchingProgress ? 'Saving...' : 'Save manual progress'}
            </button>
          </div>
        )}
        */}
      </div>

      {target?.notes && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-600 mb-1">Notes</p>
          <p className="text-sm text-gray-800">{target.notes}</p>
        </div>
      )}
    </div>
  );
}
