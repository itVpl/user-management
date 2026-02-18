import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  AlertCircle,
  DollarSign,
  Loader2,
  Send,
  Paperclip,
  Search,
} from 'lucide-react';
import API_CONFIG from '../../config/api';
import {
  getEmployeesLeaveSummary,
  getSandwichDays,
  addSandwichLeave,
  updateSandwichLeave,
  getMySalary,
  submitSandwichLeaveRemovalRequest,
} from '../../services/salaryModificationService';

const formatDateWithDay = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const options = { day: 'numeric', month: 'short', year: 'numeric', weekday: 'long' };
  return d.toLocaleDateString('en-US', options);
};

const toMonthYear = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return { month: `${y}-${m}`, year: y };
};

const getCurrentMonthYear = () => {
  const now = new Date();
  return toMonthYear(now);
};

const getPageNumbers = (currentPage, totalPages) => {
  if (!currentPage || !totalPages) return [];

  const maxVisible = 7;
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];
  const halfVisible = Math.floor(maxVisible / 2);

  if (currentPage <= halfVisible + 1) {
    for (let i = 1; i <= maxVisible - 1; i += 1) {
      pages.push(i);
    }
    pages.push(totalPages);
  } else if (currentPage >= totalPages - halfVisible) {
    pages.push(1);
    for (let i = totalPages - (maxVisible - 2); i <= totalPages; i += 1) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    for (let i = currentPage - halfVisible + 1; i <= currentPage + halfVisible - 1; i += 1) {
      pages.push(i);
    }
    pages.push(totalPages);
  }

  return pages;
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
  const [activeTab, setActiveTab] = useState('leaveSummary'); // leaveSummary | sandwichLeave
  const [leaveSummary, setLeaveSummary] = useState({ employees: [], pagination: null });
  const [leaveSummaryLoading, setLeaveSummaryLoading] = useState(false);
  const [expandedLeaveSummaryEmpId, setExpandedLeaveSummaryEmpId] = useState(null);
  const [sandwichForm, setSandwichForm] = useState({ empId: '', date: '', remarks: '' });
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [sandwichSubmitting, setSandwichSubmitting] = useState(false);
  const [sandwichEditing, setSandwichEditing] = useState(null);
  const [editingLeave, setEditingLeave] = useState({ id: '', date: '', remarks: '' });
  const [selectedEmpForSandwich, setSelectedEmpForSandwich] = useState(null);
  const [sandwichDaysData, setSandwichDaysData] = useState(null);
  const [sandwichDaysLoading, setSandwichDaysLoading] = useState(false);
  const [leaveSummaryPage, setLeaveSummaryPage] = useState(1);
  const [removalRequest, setRemovalRequest] = useState(null);
  const [removalReason, setRemovalReason] = useState('');
  const [removalFiles, setRemovalFiles] = useState([]);
  const [removalSubmitting, setRemovalSubmitting] = useState(false);
  const [leaveSummarySearch, setLeaveSummarySearch] = useState('');

  const leaveSummaryPages =
    leaveSummary.pagination && leaveSummary.pagination.totalPages > 0
      ? getPageNumbers(leaveSummary.pagination.currentPage, leaveSummary.pagination.totalPages)
      : [];

  const filteredLeaveSummaryEmployees = (leaveSummary.employees || []).filter((emp) => {
    const query = leaveSummarySearch.trim().toLowerCase();
    if (!query) return true;
    const values = [
      emp.employeeName,
      emp.empId,
      emp.department,
    ];
    return values.some((val) => (val || '').toString().toLowerCase().includes(query));
  });

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

  useEffect(() => {
    if (isHR) {
      setLeaveSummaryPage(1);
      fetchLeaveSummary(1);
      fetchEmployees();
    } else {
      fetchMySalary();
    }
  }, [isHR, monthYear.month, monthYear.year]);

  useEffect(() => {
    if (isHR && activeTab === 'leaveSummary') fetchLeaveSummary(leaveSummaryPage);
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
    } catch (err) {
      setError(err.message || err.data?.message || 'Failed to update sandwich leave');
    } finally {
      setSandwichSubmitting(false);
    }
  };

  const handleEmployeeSelectForSandwich = (empId) => {
    setSelectedEmpForSandwich(empId);
    if (empId) fetchSandwichDays(empId);
    else setSandwichDaysData(null);
  };

  const handleSubmitRemovalRequest = async (e) => {
    e.preventDefault();
    if (!removalRequest?.sandwichLeaveId || !removalReason.trim()) return;
    try {
      setRemovalSubmitting(true);
      setError(null);
      await submitSandwichLeaveRemovalRequest(removalRequest.sandwichLeaveId, removalReason.trim(), removalFiles);
      setRemovalRequest(null);
      setRemovalReason('');
      setRemovalFiles([]);
      if (selectedEmpForSandwich) fetchSandwichDays(selectedEmpForSandwich);
      fetchLeaveSummary(leaveSummaryPage);
    } catch (err) {
      setError(err.message || err.data?.message || 'Failed to submit removal request');
    } finally {
      setRemovalSubmitting(false);
    }
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
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Days in Month</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {mySalary.totalDaysInMonth ?? mySalary.workingDays ?? '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Present Days</p>
                  <p className="text-2xl font-bold text-green-600">
                    {typeof mySalary.presentDays === 'number' && mySalary.presentDays % 1 !== 0
                      ? mySalary.presentDays.toFixed(1)
                      : mySalary.presentDays ?? '-'}
                  </p>
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
                  ₹{(mySalary.salary?.salaryPayable || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
    { id: 'sandwichLeave', label: 'Sandwich Leave', icon: Plus },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex flex-1 flex-wrap gap-4">
            {tabs.map((tb) => {
              const Icon = tb.icon;
              const isActive = activeTab === tb.id;
              return (
                <button
                  key={tb.id}
                  onClick={() => setActiveTab(tb.id)}
                  className={`min-w-[400px] flex items-center justify-between px-6 py-3 rounded-2xl border transition-all text-left ${
                    isActive
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`text-lg font-medium ${
                      isActive ? 'text-blue-800' : 'text-gray-900'
                    }`}
                  >
                    {tb.label}
                  </span>
                  <span
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </span>
                </button>
              );
            })}
          </div>
          <div>
            <select
              value={monthYear.month}
              onChange={(e) => {
                const [y] = e.target.value.split('-').map(Number);
                setMonthYear({ month: e.target.value, year: y });
              }}
              className="border border-gray-300 rounded-2xl min-w-[220px] px-5 py-4 text-base font-medium bg-gray-50 focus:bg-white"
            >
              {monthOptions.slice(0, 24).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeTab === 'leaveSummary' && (
          <div className="mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by employee name, Emp ID or department"
                value={leaveSummarySearch}
                onChange={(e) => setLeaveSummarySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border text-base border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        )}
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
      <div className="mb-4 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-lg">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>1 sandwich leave = 3 days for salary deduction</span>
      </div>

      {/* Leave Summary Tab */}
      {activeTab === 'leaveSummary' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {leaveSummaryLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto p-4">
              <table className="min-w-full text-sm border-separate border-spacing-y-4">
                <thead>
                  <tr>
                    <th
                      className="w-9 px-4 py-3 border-y border-l border-gray-200 rounded-l-2xl bg-gray-50"
                      aria-label="Expand"
                    />
                    <th className="text-left px-6 py-3 border-y border-gray-200 bg-gray-50 text-base font-semibold text-gray-700">
                      Employee
                    </th>
                    <th className="text-left px-6 py-3 border-y border-gray-200 bg-gray-50 text-base font-semibold text-gray-700">
                      Emp ID
                    </th>
                    <th className="text-left px-6 py-3 border-y border-gray-200 bg-gray-50 text-base font-semibold text-gray-700">
                      Department
                    </th>
                    <th className="text-right px-6 py-3 border-y border-gray-200 bg-gray-50 text-base font-semibold text-gray-700">
                      Approved
                    </th>
                    <th className="text-right px-6 py-3 border-y border-gray-200 bg-gray-50 text-base font-semibold text-gray-700">
                      Sandwich
                    </th>
                    <th className="text-right px-6 py-3 border-y border-r border-gray-200 rounded-r-2xl bg-gray-50 text-base font-semibold text-gray-700">
                      Total Leave Days (Approved + Sandwich)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaveSummaryEmployees.map((emp) => {
                    const attendance = emp.attendanceByLogin || {};
                    const presentDates = attendance.presentDates || [];
                    const absentDates = attendance.absentDates || [];
                    const absentCount = attendance.absentCount ?? absentDates.length;
                    const monFriLeaves = emp.leavesOnMondayOrFriday || [];
                    const hasDetails = presentDates.length > 0 || absentDates.length > 0 || monFriLeaves.length > 0;
                    const isExpanded = expandedLeaveSummaryEmpId === emp.empId;
                    return (
                      <React.Fragment key={emp.empId}>
                        <tr className="bg-white hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 border-y border-l border-gray-200 rounded-l-2xl align-middle">
                            {hasDetails ? (
                              <button
                                type="button"
                                title='Expand and see details'
                                onClick={() => setExpandedLeaveSummaryEmpId(isExpanded ? null : emp.empId)}
                                className="p-1 rounded hover:bg-gray-200 text-gray-600"
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <span className="inline-block w-6" />
                            )}
                          </td>
                          <td className="px-6 py-3 border-y border-gray-200 text-left font-semibold text-gray-900 align-middle">
                            {emp.employeeName}
                          </td>
                          <td className="px-6 py-3 border-y border-gray-200 text-left font-semibold text-gray-900 align-middle">
                            {emp.empId}
                          </td>
                          <td className="px-6 py-3 border-y border-gray-200 text-left font-semibold text-gray-900 align-middle">
                            {emp.department || '-'}
                          </td>
                          <td className="px-13 py-3 border-y border-gray-200 text-right font-semibold text-gray-900 align-middle">
                            {emp.approvedLeaveDays ?? 0}
                          </td>
                          <td className="px-13 py-3 border-y border-gray-200 text-right font-semibold text-gray-900 align-middle">
                            {Math.round((emp.sandwichLeaveDays ?? 0) / 3)}
                          </td>
                          <td className="px-6 py-3 border-y border-r border-gray-200 text-right font-semibold text-gray-900 rounded-r-2xl align-middle">
                            {emp.totalLeaveDaysForSalary ?? 0}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                                {/* Attendance by login */}
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Attendance by login
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <p className="text-gray-700">
                                      <span className="font-medium">Present (had login):</span>{' '}
                                      {presentDates.length} day{presentDates.length !== 1 ? 's' : ''}
                                    </p>
                                    <p className="text-gray-700">
                                      <span className="font-medium">Absent (no login):</span>{' '}
                                      {absentCount} day{absentCount !== 1 ? 's' : ''}
                                    </p>
                                    {absentDates.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        {absentDates.map((date) => (
                                          <span
                                            key={date}
                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-800 border border-red-100"
                                          >
                                            {date} – Absent
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Leaves on Monday or Friday */}
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Leaves on Monday or Friday
                                  </h4>
                                  {monFriLeaves.length > 0 ? (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="bg-gray-100 text-left">
                                            <th className="px-3 py-2 font-semibold text-gray-600">Date</th>
                                            <th className="px-3 py-2 font-semibold text-gray-600">Day</th>
                                            <th className="px-3 py-2 font-semibold text-gray-600">Type</th>
                                            <th className="px-3 py-2 font-semibold text-gray-600">Status</th>
                                            <th className="px-3 py-2 font-semibold text-gray-600">Sandwich</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {monFriLeaves.map((lv, i) => (
                                            <tr key={i} className="border-t border-gray-100">
                                              <td className="px-3 py-2">{lv.date}</td>
                                              <td className="px-3 py-2">{lv.dayOfWeek || '-'}</td>
                                              <td className="px-3 py-2">{lv.leaveType || '-'}</td>
                                              <td className="px-3 py-2">{lv.status || '-'}</td>
                                              <td className="px-3 py-2">
                                                {lv.isSandwichLeave ? (
                                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">Yes</span>
                                                ) : (
                                                  '-'
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 text-sm">No leaves on Monday or Friday.</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              {leaveSummarySearch.trim() && filteredLeaveSummaryEmployees.length === 0 && !leaveSummaryLoading && (
                <div className="text-center py-12 text-gray-500">No matching records for this search.</div>
              )}
              {!leaveSummarySearch.trim() &&
                (!leaveSummary.employees || leaveSummary.employees.length === 0) &&
                !leaveSummaryLoading && (
                  <div className="text-center py-12 text-gray-500">No leave data for this month.</div>
                )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaveSummary' &&
        leaveSummary.pagination &&
        leaveSummary.pagination.totalPages > 1 &&
        !leaveSummaryLoading && (
        <div className="mt-4 flex justify-between items-center px-4 border border-gray-200 p-2 rounded-xl bg-white">
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
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {leaveSummaryPages.map((page, idx, arr) => {
                const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsisBefore && <span className="px-2 text-gray-400">...</span>}
                    <button
                      onClick={() => fetchLeaveSummaryForPage(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        leaveSummary.pagination.currentPage === page
                          ? 'border border-gray-900 text-gray-900 bg-white'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <button
              onClick={() => fetchLeaveSummaryForPage(leaveSummaryPage + 1)}
              disabled={!leaveSummary.pagination.hasNextPage}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Sandwich Leave Tab */}
      {activeTab === 'sandwichLeave' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                                    setRemovalRequest({ sandwichLeaveId: lv.sandwichLeaveId, date: lv.date });
                                    setRemovalReason('');
                                    setRemovalFiles([]);
                                  }}
                                  className="text-amber-600 hover:text-amber-800 mr-3 inline-flex items-center gap-1"
                                  title="Request removal (for manager approval)"
                                >
                                  <Send className="w-4 h-4" /> Request removal
                                </button>
                                <button
                                  onClick={() => {
                                    setSandwichEditing({ id: lv.sandwichLeaveId, date: lv.date });
                                    setEditingLeave({ id: lv.sandwichLeaveId, date: lv.date, remarks: '' });
                                  }}
                                  className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                >
                                  <Edit2 className="w-4 h-4" /> Edit
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

          {/* Request removal of sandwich leave – sent to Leave Approval for manager */}
          {removalRequest && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-lg w-full p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Request removal of sandwich leave</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This request will be sent to Leave Approval. A manager can accept (remove the sandwich leave) or reject it. Leave date: <strong>{removalRequest.date}</strong>.
                </p>
                <form onSubmit={handleSubmitRemovalRequest}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-600">*</span></label>
                      <textarea
                        value={removalReason}
                        onChange={(e) => setRemovalReason(e.target.value)}
                        required
                        rows={3}
                        placeholder="e.g. Medical certificate provided; not a sandwich leave."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Paperclip className="w-4 h-4 inline mr-1" /> Attachments (optional)
                      </label>
                      <input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => setRemovalFiles(Array.from(e.target.files || []))}
                        className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">Max 10 files, 10MB each. JPG, PNG, PDF.</p>
                      {removalFiles.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1">{removalFiles.length} file(s) selected.</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => { setRemovalRequest(null); setRemovalReason(''); setRemovalFiles([]); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={removalSubmitting}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {removalSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Submit request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Sandwich Leave Modal */}
          {sandwichEditing && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6">
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

          {/* Employees with Sandwich Leaves */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-800 px-6 py-4 border-b border-gray-200">
              Employees with Sandwich Leaves
            </h3>
            <div className="overflow-x-auto p-4">
              <table className="min-w-full text-sm border-separate border-spacing-y-4">
                <thead>
                  <tr>
                    <th className="text-left px-6 py-3 border-y border-l border-gray-200 rounded-l-2xl bg-gray-50 text-base font-semibold text-gray-700">
                      Employee
                    </th>
                    <th className="text-left px-6 py-3 border-y border-gray-200 bg-gray-50 text-base font-semibold text-gray-700">
                      Emp ID
                    </th>
                    <th className="text-right px-6 py-3 border-y border-r border-gray-200 rounded-r-2xl bg-gray-50 text-base font-semibold text-gray-700">
                      Sandwich Leave Days
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(leaveSummary.employees || [])
                    .filter((e) => (e.sandwichLeaveDays || 0) > 0)
                    .map((emp) => (
                      <tr key={emp.empId} className="bg-white hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 border-y border-l border-gray-200 text-sm font-semibold text-gray-900 rounded-l-2xl align-middle">
                          {emp.employeeName}
                        </td>
                        <td className="px-6 py-3 border-y border-gray-200 text-sm text-gray-900 align-middle font-semibold">
                          {emp.empId}
                        </td>
                        <td className="px-6 py-3 border-y border-r border-gray-200 text-sm text-right font-semibold text-amber-900 rounded-r-2xl align-middle">
                          {Math.round((emp.sandwichLeaveDays ?? 0) / 3)}
                        </td>
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
