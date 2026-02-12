import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Calendar,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  DollarSign,
  Filter,
  Loader2,
} from 'lucide-react';
import API_CONFIG from '../../config/api';
import {
  getEmployeesLeaveSummary,
  getEmployeesTakenLeaves,
  getSandwichDays,
  addSandwichLeave,
  updateSandwichLeave,
  deleteSandwichLeave,
  getMySalary,
} from '../../services/salaryModificationService';

// Format date for display: "6 Jan 2026 (Monday)"
const formatDateWithDay = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const options = { day: 'numeric', month: 'short', year: 'numeric', weekday: 'long' };
  return d.toLocaleDateString('en-US', options);
};

// Format YYYY-MM from Date
const toMonthYear = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return { month: `${y}-${m}`, year: y };
};

// Get current month/year
const getCurrentMonthYear = () => {
  const now = new Date();
  return toMonthYear(now);
};

const SalaryModification = () => {
  const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const department = typeof user?.department === 'string' ? user.department : user?.department?.name || '';
  const isHR = department?.toLowerCase() === 'hr';

  const [monthYear, setMonthYear] = useState(getCurrentMonthYear());
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Employee view state
  const [mySalary, setMySalary] = useState(null);
  const [mySalaryLoading, setMySalaryLoading] = useState(false);

  // HR view state
  const [activeTab, setActiveTab] = useState('leaveSummary'); // leaveSummary | takenLeaves | sandwichLeave
  const [leaveSummary, setLeaveSummary] = useState({ employees: [], pagination: null });
  const [leaveSummaryLoading, setLeaveSummaryLoading] = useState(false);
  const [takenLeaves, setTakenLeaves] = useState({ employees: [], pagination: null });
  const [takenLeavesLoading, setTakenLeavesLoading] = useState(false);
  const [expandedEmpId, setExpandedEmpId] = useState(null);
  const [sandwichForm, setSandwichForm] = useState({ empId: '', date: '', remarks: '' });
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [sandwichSubmitting, setSandwichSubmitting] = useState(false);
  const [sandwichEditing, setSandwichEditing] = useState(null);
  const [editingLeave, setEditingLeave] = useState({ id: '', date: '', remarks: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedEmpForSandwich, setSelectedEmpForSandwich] = useState(null);
  const [sandwichDaysData, setSandwichDaysData] = useState(null);
  const [sandwichDaysLoading, setSandwichDaysLoading] = useState(false);
  const [leaveSummaryPage, setLeaveSummaryPage] = useState(1);
  const [takenLeavesPage, setTakenLeavesPage] = useState(1);

  const getToken = () =>
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('token');

  const fetchEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.data?.employees) {
        const active = res.data.employees
          .filter((e) => e.status === 'active')
          .map((e) => ({ empId: e.empId, employeeName: e.employeeName, department: e.department }));
        setEmployees(active);
      }
    } catch (err) {
      console.error('Fetch employees error:', err);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const fetchMySalary = useCallback(async () => {
    try {
      setMySalaryLoading(true);
      setError(null);
      const data = await getMySalary({ month: monthYear.month, year: monthYear.year });
      if (data.success && data.data) {
        setMySalary(data.data);
      }
    } catch (err) {
      if (err.status === 403) {
        setAccessDenied(true);
      } else {
        setError(err.message || 'Failed to load salary');
      }
    } finally {
      setMySalaryLoading(false);
    }
  }, [monthYear.month, monthYear.year]);

  const fetchLeaveSummary = useCallback(async (page = 1) => {
    try {
      setLeaveSummaryLoading(true);
      setError(null);
      const data = await getEmployeesLeaveSummary({
        month: monthYear.month,
        year: monthYear.year,
        page,
        limit: 10,
      });
      if (data.success && data.data) {
        setLeaveSummary({
          employees: data.data.employees || [],
          pagination: data.pagination || null,
        });
      }
    } catch (err) {
      if (err.status === 403) {
        setAccessDenied(true);
      } else {
        setError(err.message || 'Failed to load leave summary');
      }
    } finally {
      setLeaveSummaryLoading(false);
    }
  }, [monthYear.month, monthYear.year]);

  const fetchLeaveSummaryForPage = useCallback((page) => {
    setLeaveSummaryPage(page);
    fetchLeaveSummary(page);
  }, [fetchLeaveSummary]);

  const fetchSandwichDays = useCallback(
    async (empId) => {
      if (!empId) return;
      try {
        setSandwichDaysLoading(true);
        const data = await getSandwichDays(empId, {
          month: monthYear.month,
          year: monthYear.year,
        });
        if (data.success && data.data) {
          setSandwichDaysData(data.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load sandwich days');
      } finally {
        setSandwichDaysLoading(false);
      }
    },
    [monthYear.month, monthYear.year]
  );

  const fetchTakenLeaves = useCallback(async (page = 1) => {
    try {
      setTakenLeavesLoading(true);
      setError(null);
      const data = await getEmployeesTakenLeaves({
        month: monthYear.month,
        year: monthYear.year,
        page,
        limit: 10,
      });
      if (data.success && data.data) {
        setTakenLeaves({
          employees: data.data.employees || [],
          pagination: data.pagination || null,
        });
      }
    } catch (err) {
      if (err.status === 403) {
        setAccessDenied(true);
      } else {
        setError(err.message || 'Failed to load taken leaves');
      }
    } finally {
      setTakenLeavesLoading(false);
    }
  }, [monthYear.month, monthYear.year]);

  const fetchTakenLeavesForPage = useCallback((page) => {
    setTakenLeavesPage(page);
    fetchTakenLeaves(page);
  }, [fetchTakenLeaves]);

  useEffect(() => {
    if (isHR) {
      setLeaveSummaryPage(1);
      setTakenLeavesPage(1);
      fetchLeaveSummary(1);
      fetchTakenLeaves(1);
      fetchEmployees();
    } else {
      fetchMySalary();
    }
  }, [isHR, monthYear.month, monthYear.year]);

  useEffect(() => {
    if (isHR && activeTab === 'leaveSummary') fetchLeaveSummary(leaveSummaryPage);
    if (isHR && activeTab === 'takenLeaves') fetchTakenLeaves(takenLeavesPage);
  }, [isHR, activeTab]);

  const handleAddSandwichLeave = async (e) => {
    e.preventDefault();
    if (!sandwichForm.empId || !sandwichForm.date) return;
    try {
      setSandwichSubmitting(true);
      await addSandwichLeave(sandwichForm.empId, {
        date: sandwichForm.date,
        remarks: sandwichForm.remarks || '',
      });
      setSandwichForm({ empId: '', date: '', remarks: '' });
      fetchLeaveSummary();
      fetchTakenLeaves();
    } catch (err) {
      setError(err.message || err.data?.message || 'Failed to add sandwich leave');
    } finally {
      setSandwichSubmitting(false);
    }
  };

  const handleUpdateSandwichLeave = async (e) => {
    e.preventDefault();
    if (!sandwichEditing?.id) return;
    try {
      setSandwichSubmitting(true);
      await updateSandwichLeave(sandwichEditing.id, {
        date: editingLeave.date,
        remarks: editingLeave.remarks || '',
      });
      setSandwichEditing(null);
      setEditingLeave({ id: '', date: '', remarks: '' });
      fetchLeaveSummary();
      fetchTakenLeaves();
    } catch (err) {
      setError(err.message || err.data?.message || 'Failed to update sandwich leave');
    } finally {
      setSandwichSubmitting(false);
    }
  };

  const handleDeleteSandwichLeave = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteSandwichLeave(deleteConfirm);
      setDeleteConfirm(null);
      fetchLeaveSummary();
      fetchTakenLeaves();
      if (selectedEmpForSandwich) fetchSandwichDays(selectedEmpForSandwich);
    } catch (err) {
      setError(err.message || err.data?.message || 'Failed to delete sandwich leave');
    }
  };

  const handleEmployeeSelectForSandwich = (empId) => {
    setSelectedEmpForSandwich(empId);
    if (empId) fetchSandwichDays(empId);
    else setSandwichDaysData(null);
  };

  const monthOptions = [];
  for (let y = new Date().getFullYear(); y >= new Date().getFullYear() - 2; y--) {
    for (let m = 1; m <= 12; m++) {
      const val = `${y}-${String(m).padStart(2, '0')}`;
      const label = new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthOptions.push({ value: val, label });
    }
  }

  if (accessDenied) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="w-10 h-10 text-amber-600 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-semibold text-amber-800">Access Denied</h2>
            <p className="text-amber-700 mt-1">
              You do not have permission to access the Salary Modification module. Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Employee View: My Salary ─────────────────────────────────────────────
  if (!isHR) {
    return (
      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800">My Salary</h1>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={monthYear.month}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                setMonthYear({ month: e.target.value, year: y });
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {monthOptions.slice(0, 24).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {mySalaryLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          </div>
        ) : mySalary ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{mySalary.employeeName}</h2>
                  <p className="text-sm text-gray-600">
                    {mySalary.month} • {mySalary.year}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Working Days</p>
                  <p className="text-2xl font-bold text-gray-800">{mySalary.workingDays}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Present Days</p>
                  <p className="text-2xl font-bold text-green-600">{mySalary.presentDays}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Basic Salary</p>
                  <p className="text-xl font-bold text-gray-800">
                    ₹{(mySalary.salary?.basicSalary || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Per Day Rate</p>
                  <p className="text-xl font-bold text-gray-800">
                    ₹{(mySalary.salary?.perDayRate || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                <p className="text-sm font-medium text-green-800 mb-1">Salary Payable</p>
                <p className="text-3xl font-bold text-green-700">
                  ₹{(mySalary.salary?.salaryPayable || 0).toLocaleString()}
                </p>
                {mySalary.salary?.message && (
                  <p className="text-sm text-green-700 mt-2">{mySalary.salary.message}</p>
                )}
              </div>
            </div>
          </div>
        ) : !mySalaryLoading && !error ? (
          <div className="text-center py-12 text-gray-500">No salary data available for this month.</div>
        ) : null}
      </div>
    );
  }

  // ─── HR View: Full Dashboard ──────────────────────────────────────────────
  const tabs = [
    { id: 'leaveSummary', label: 'Leave Summary', icon: Users },
    { id: 'takenLeaves', label: 'Taken Leaves', icon: Calendar },
    { id: 'sandwichLeave', label: 'Sandwich Leave', icon: Plus },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Salary Modification</h1>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={monthYear.month}
            onChange={(e) => {
              const [y] = e.target.value.split('-').map(Number);
              setMonthYear({ month: e.target.value, year: y });
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {monthOptions.slice(0, 24).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setActiveTab(tb.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-colors ${
              activeTab === tb.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tb.icon className="w-4 h-4" />
            {tb.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Info badge: 1 sandwich leave = 3 days */}
      <div className="mb-4 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>1 sandwich leave = 3 days for salary deduction</span>
      </div>

      {/* Leave Summary Tab */}
      {activeTab === 'leaveSummary' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {leaveSummaryLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Employee</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Emp ID</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Department</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Approved</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Sandwich</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Total for Salary</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Present</th>
                  </tr>
                </thead>
                <tbody>
                  {(leaveSummary.employees || []).map((emp) => (
                    <tr key={emp.empId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{emp.employeeName}</td>
                      <td className="px-4 py-3 text-gray-600">{emp.empId}</td>
                      <td className="px-4 py-3 text-gray-600">{emp.department || '-'}</td>
                      <td className="px-4 py-3 text-right">{emp.approvedLeaveDays ?? 0}</td>
                      <td className="px-4 py-3 text-right">{emp.sandwichLeaveDays ?? 0}</td>
                      <td className="px-4 py-3 text-right font-medium">{emp.totalLeaveDaysForSalary ?? 0}</td>
                      <td className="px-4 py-3 text-right">{emp.presentDays ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!leaveSummary.employees || leaveSummary.employees.length === 0) && !leaveSummaryLoading && (
                <div className="text-center py-12 text-gray-500">No leave data for this month.</div>
              )}
            </div>
          )}
          {leaveSummary.pagination && leaveSummary.pagination.totalPages > 1 && !leaveSummaryLoading && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing {(leaveSummary.pagination.currentPage - 1) * leaveSummary.pagination.limit + 1} to{' '}
                {Math.min(
                  leaveSummary.pagination.currentPage * leaveSummary.pagination.limit,
                  leaveSummary.pagination.totalCount
                )}{' '}
                of {leaveSummary.pagination.totalCount} entries
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => fetchLeaveSummaryForPage(leaveSummaryPage - 1)}
                  disabled={!leaveSummary.pagination.hasPrevPage}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors text-sm font-medium text-gray-600"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {leaveSummary.pagination.currentPage} of {leaveSummary.pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchLeaveSummaryForPage(leaveSummaryPage + 1)}
                  disabled={!leaveSummary.pagination.hasNextPage}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors text-sm font-medium text-gray-600"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Taken Leaves Tab */}
      {activeTab === 'takenLeaves' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {takenLeavesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {(takenLeaves.employees || []).map((emp) => (
                <div key={emp.empId}>
                  <button
                    onClick={() => setExpandedEmpId(expandedEmpId === emp.empId ? null : emp.empId)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {expandedEmpId === emp.empId ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="font-medium text-gray-800">{emp.employeeName}</span>
                      <span className="text-gray-500 text-sm">({emp.empId})</span>
                      <span className="text-gray-400 text-sm">• {emp.department || '-'}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span>Approved: {emp.approvedLeaveCount ?? 0}</span>
                      <span>Sandwich: {emp.sandwichLeaveCount ?? 0}</span>
                      <span className="font-medium">Total: {emp.totalLeaveDaysForSalary ?? 0}</span>
                    </div>
                  </button>
                  {expandedEmpId === emp.empId && emp.leaves && emp.leaves.length > 0 && (
                    <div className="bg-gray-50 px-4 py-3 pl-12">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-600">
                            <th className="text-left py-1">Date</th>
                            <th className="text-left py-1">Day</th>
                            <th className="text-left py-1">Type</th>
                            <th className="text-left py-1">Status</th>
                            <th className="text-left py-1">Sandwich</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emp.leaves.map((lv, i) => (
                            <tr key={i}>
                              <td className="py-1.5">{formatDateWithDay(lv.date)}</td>
                              <td className="py-1.5">{lv.dayOfWeek || '-'}</td>
                              <td className="py-1.5">{lv.leaveType || '-'}</td>
                              <td className="py-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${
                                    lv.isSandwichLeave ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {lv.status || (lv.isSandwichLeave ? 'sandwich' : 'approved')}
                                </span>
                              </td>
                              <td className="py-1.5">{lv.isSandwichLeave ? 'Yes' : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
              {(!takenLeaves.employees || takenLeaves.employees.length === 0) && !takenLeavesLoading && (
                <div className="text-center py-12 text-gray-500">No taken leaves for this month.</div>
              )}
            </div>
          )}
          {takenLeaves.pagination && takenLeaves.pagination.totalPages > 1 && !takenLeavesLoading && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing {(takenLeaves.pagination.currentPage - 1) * takenLeaves.pagination.limit + 1} to{' '}
                {Math.min(
                  takenLeaves.pagination.currentPage * takenLeaves.pagination.limit,
                  takenLeaves.pagination.totalCount
                )}{' '}
                of {takenLeaves.pagination.totalCount} entries
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => fetchTakenLeavesForPage(takenLeavesPage - 1)}
                  disabled={!takenLeaves.pagination.hasPrevPage}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors text-sm font-medium text-gray-600"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {takenLeaves.pagination.currentPage} of {takenLeaves.pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchTakenLeavesForPage(takenLeavesPage + 1)}
                  disabled={!takenLeaves.pagination.hasNextPage}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors text-sm font-medium text-gray-600"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sandwich Leave Tab */}
      {activeTab === 'sandwichLeave' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Sandwich Leave</h3>
            <form onSubmit={handleAddSandwichLeave} className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={sandwichForm.empId}
                  onChange={(e) => setSandwichForm((f) => ({ ...f, empId: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select employee</option>
                  {employees.map((e) => (
                    <option key={e.empId} value={e.empId}>
                      {e.employeeName} ({e.empId})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={sandwichForm.date}
                  onChange={(e) => setSandwichForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
                <input
                  type="text"
                  value={sandwichForm.remarks}
                  onChange={(e) => setSandwichForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="e.g. Emergency leave"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={sandwichSubmitting || employeesLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sandwichSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Sandwich Leave
              </button>
            </form>
          </div>

          {/* View/Manage Sandwich Days by Employee */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-800 px-6 py-4 border-b border-gray-200">
              View & Manage Sandwich Days by Employee
            </h3>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select employee</label>
                <select
                  value={selectedEmpForSandwich || ''}
                  onChange={(e) => handleEmployeeSelectForSandwich(e.target.value || null)}
                  className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select employee --</option>
                  {employees.map((e) => (
                    <option key={e.empId} value={e.empId}>
                      {e.employeeName} ({e.empId})
                    </option>
                  ))}
                </select>
              </div>
              {sandwichDaysLoading && (
                <div className="flex items-center gap-2 text-gray-600 py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </div>
              )}
              {sandwichDaysData?.mondayFridayLeaves && sandwichDaysData.mondayFridayLeaves.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Day</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Sandwich</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sandwichDaysData.mondayFridayLeaves.map((lv, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">{lv.date}</td>
                          <td className="px-4 py-3">{lv.dayOfWeek || '-'}</td>
                          <td className="px-4 py-3">{lv.leaveType || '-'}</td>
                          <td className="px-4 py-3">{lv.status || '-'}</td>
                          <td className="px-4 py-3">
                            {lv.isManuallyMarkedSandwich ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">Yes</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {lv.isManuallyMarkedSandwich && lv.sandwichLeaveId ? (
                              <>
                                <button
                                  onClick={() => {
                                    setSandwichEditing({ id: lv.sandwichLeaveId, date: lv.date });
                                    setEditingLeave({ id: lv.sandwichLeaveId, date: lv.date, remarks: '' });
                                  }}
                                  className="text-blue-600 hover:text-blue-800 mr-3 inline-flex items-center gap-1"
                                >
                                  <Edit2 className="w-4 h-4" /> Edit
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(lv.sandwichLeaveId)}
                                  className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </>
                            ) : (
                              <span className="text-gray-400 text-xs">Use Add form above</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {sandwichDaysData && (!sandwichDaysData.mondayFridayLeaves || sandwichDaysData.mondayFridayLeaves.length === 0) && (
                <p className="text-gray-500 py-4">No Monday/Friday leaves for this employee in the selected month.</p>
              )}
            </div>
          </div>

          {/* Edit Sandwich Leave Modal */}
          {sandwichEditing && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Sandwich Leave</h3>
                <form onSubmit={handleUpdateSandwichLeave}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={editingLeave.date}
                        onChange={(e) => setEditingLeave((l) => ({ ...l, date: e.target.value }))}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
                      <input
                        type="text"
                        value={editingLeave.remarks}
                        onChange={(e) => setEditingLeave((l) => ({ ...l, remarks: e.target.value }))}
                        placeholder="e.g. Emergency leave"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSandwichEditing(null);
                        setEditingLeave({ id: '', date: '', remarks: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sandwichSubmitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sandwichSubmitting ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Sandwich Leave</h3>
                <p className="text-gray-600 mb-6">Are you sure you want to remove this sandwich leave? (3 days deduction will be reverted.)</p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteSandwichLeave}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Employees with Sandwich Leaves */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-800 px-6 py-4 border-b border-gray-200">
              Employees with Sandwich Leaves
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Employee</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Emp ID</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Sandwich Leave Days</th>
                  </tr>
                </thead>
                <tbody>
                  {(leaveSummary.employees || [])
                    .filter((e) => (e.sandwichLeaveDays || 0) > 0)
                    .map((emp) => (
                      <tr key={emp.empId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{emp.employeeName}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.empId}</td>
                        <td className="px-4 py-3 text-right font-medium text-amber-700">{emp.sandwichLeaveDays}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {(leaveSummary.employees || []).filter((e) => (e.sandwichLeaveDays || 0) > 0).length === 0 && (
                <div className="text-center py-8 text-gray-500">No sandwich leaves for this month.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryModification;
