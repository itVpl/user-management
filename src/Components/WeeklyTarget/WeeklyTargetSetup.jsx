import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import API_CONFIG from '../../config/api';
import {
  listWeeklyTargets,
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
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { format, addDays } from 'date-fns';
import {
  Target,
  Plus,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  Edit2,
  Trash2,
  BarChart3,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

const getToken = () =>
  sessionStorage.getItem('authToken') ||
  sessionStorage.getItem('token') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');

// Searchable Dropdown (Select2-style) - same as DeliveryOrder
const SearchableDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = '',
  searchPlaceholder = 'Search...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full h-[45px] px-3 border rounded-lg bg-white cursor-pointer border-gray-300 hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 flex items-center ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500 text-sm text-center">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function WeeklyTargetSetup() {
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
  const [searchTerm, setSearchTerm] = useState('');

  // Delete modal (like DeliveryOrder)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [targetToDelete, setTargetToDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Modal: 'create' | 'edit' | 'view' | null
  const [modalMode, setModalMode] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);

  // Single target (for detail / edit modal)
  const [target, setTarget] = useState(null);
  const [progress, setProgress] = useState(null);
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [progressForm, setProgressForm] = useState({});
  const [patchingProgress, setPatchingProgress] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Date range filter (like DeliveryOrder)
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
    } catch (err) {
      alertify.error(err?.message || 'Failed to load targets');
      setTargets([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchList();
  }, [pagination.page, pagination.limit, filters, fetchList]);

  const fetchTargetAndProgress = useCallback(async (id, forEdit) => {
    if (!id) return;
    setModalLoading(true);
    try {
      const [targetRes, progressRes] = await Promise.all([
        getWeeklyTargetById(id),
        getWeeklyTargetProgress(id),
      ]);
      const d = targetRes?.data ?? null;
      setTarget(d);
      setProgress(progressRes?.data ?? null);
      if (forEdit && d) {
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
          hrTargets: d?.hrTargets
            ? {
                calls: d.hrTargets.calls ?? 0,
                interviews: d.hrTargets.interviews ?? 0,
                candidateJoin: d.hrTargets.candidateJoin ?? 0,
                internalReviewFeedback: d.hrTargets.internalReviewFeedback ?? 0,
              }
            : undefined,
          status: d?.status ?? 'active',
          notes: d?.notes ?? '',
        });
      }
      const p = progressRes?.data;
      if (p) {
        const manual = {};
        if (p.salesTargets?.customerFollowUps != null)
          manual.customerFollowUpsCompleted = p.salesTargets.customerFollowUps?.completed;
        if (p.cmtTargets?.assignedDoImportantDateUpdates != null)
          manual.assignedDoImportantDateUpdatesCompleted =
            p.cmtTargets.assignedDoImportantDateUpdates?.completed;
        setProgressForm(manual);
      }
    } catch (err) {
      alertify.error(err?.message || 'Failed to load target');
      setTarget(null);
      setProgress(null);
      setFormData(null);
    } finally {
      setModalLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((modalMode === 'view' || modalMode === 'edit') && selectedTargetId) {
      setTarget(null);
      setProgress(null);
      setFormData(null);
      fetchTargetAndProgress(selectedTargetId, modalMode === 'edit');
    }
  }, [modalMode, selectedTargetId, fetchTargetAndProgress]);

  const closeModal = () => {
    setModalMode(null);
    setSelectedTargetId(null);
    setTarget(null);
    setProgress(null);
    setFormData(null);
  };

  const handleCreate = () => setModalMode('create');
  const handleEdit = (id) => {
    setSelectedTargetId(id);
    setModalMode('edit');
  };
  const handleView = (id) => {
    setSelectedTargetId(id);
    setModalMode('view');
  };

  const openDeleteModal = (id) => {
    setTargetToDelete(id);
    setDeleteReason('');
    setShowDeleteModal(true);
  };
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteReason('');
    setTargetToDelete(null);
  };
  const handleDeleteOrder = async () => {
    if (!targetToDelete || !deleteReason.trim()) return;
    setDeleteSubmitting(true);
    try {
      await deleteWeeklyTarget(targetToDelete);
      alertify.success('Weekly target deleted');
      if (selectedTargetId === targetToDelete) closeModal();
      closeDeleteModal();
      fetchList();
    } catch (err) {
      alertify.error(err?.message || 'Delete failed');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const filteredTargets = searchTerm.trim()
    ? targets.filter(
        (t) =>
          (t.employeeName || '')
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (t.empId || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : targets;

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px]">
            <div className="flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {pagination.total}
              </div>
              <div className="flex-1 text-center">
                <span className="text-gray-700 font-semibold text-lg">Total Targets</span>
              </div>
              <div className="w-12 shrink-0" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px]">
            <div className="flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {targets.filter((t) => (t.department || '').toLowerCase() === 'sales').length}
              </div>
              <div className="flex-1 text-center">
                <span className="text-gray-700 font-semibold text-lg">Sales</span>
              </div>
              <div className="w-12 shrink-0" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px]">
            <div className="flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {targets.filter((t) => (t.department || '').toLowerCase() === 'cmt').length}
              </div>
              <div className="flex-1 text-center">
                <span className="text-gray-700 font-semibold text-lg">CMT</span>
              </div>
              <div className="w-12 shrink-0" />
            </div>
          </div>
        </div>
        <div className="flex items-stretch gap-3">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search targets by employee name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[45px] pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-700 placeholder-gray-400 text-base"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="px-5 h-[45px] border border-blue-600 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Target
          </button>
        </div>
      </div>

       <div className="border border-gray-200 rounded-xl p-4 bg-white mb-6">
          <div className="flex items-center gap-2 flex-nowrap overflow-visible">
            <div className="relative w-[220px] shrink-0 z-10">
              <button
                type="button"
                onClick={() => setShowPresetMenu((v) => !v)}
                className="w-full text-left px-4 h-[45px] border border-gray-300 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <span className="truncate">
                  {range.startDate && range.endDate
                    ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                    : 'Select Date Range'}
                </span>
                <span className="ml-2 flex items-center gap-1 text-gray-500"><ChevronDown className="w-4 h-4" /></span>
              </button>
              {showPresetMenu && (
                <div className="absolute z-[9999] mt-2 w-full rounded-lg border border-gray-100 bg-white shadow-lg py-1 right-0">
                  <button
                    onClick={() => {
                      setRange({ startDate: null, endDate: null, key: 'selection' });
                      setFilters((f) => ({ ...f, weekStartDate: '', weekEndDate: '' }));
                      setPagination((p) => ({ ...p, page: 1 }));
                      setShowPresetMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-red-600"
                  >
                    Clear Date Filter
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  {Object.keys(presets).map((lbl) => (
                    <button
                      key={lbl}
                      onClick={() => applyPreset(lbl)}
                      className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700"
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
                    className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700"
                  >
                    Custom Range
                  </button>
                </div>
              )}
            </div>
            <div className="w-[220px] shrink-0">
              <SearchableDropdown
                value={filters.empId}
                onChange={(v) => handleFilterChange('empId', v)}
                options={[
                  { value: '', label: 'All employees' },
                  ...employees.map((emp) => ({
                    value: emp.empId,
                    label: `${emp.empId} – ${emp.employeeName || emp.name || 'N/A'}`,
                  })),
                ]}
                placeholder="All employees"
                searchPlaceholder="Search employees..."
              />
            </div>
            <div className="w-[200px] shrink-0">
              <SearchableDropdown
                value={filters.department}
                onChange={(v) => handleFilterChange('department', v)}
                options={[
                  { value: '', label: 'All departments' },
                  { value: 'Sales', label: 'Sales' },
                  { value: 'CMT', label: 'CMT' },
                ]}
                placeholder="All departments"
                searchPlaceholder="Search..."
              />
            </div>
            <div className="w-[200px] shrink-0">
              <SearchableDropdown
                value={filters.status}
                onChange={(v) => handleFilterChange('status', v)}
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                  { value: 'completed', label: 'Completed' },
                ]}
                placeholder="All statuses"
                searchPlaceholder="Search..."
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setRange({ startDate: null, endDate: null, key: 'selection' });
                setFilters({ empId: '', department: '', weekStartDate: '', weekEndDate: '', status: '' });
                setSearchTerm('');
                setPagination((p) => ({ ...p, page: 1 }));
                fetchList();
              }}
              className="ml-auto flex items-center gap-1 px-3 h-[45px] border border-gray-300 rounded-lg bg-white hover:bg-blue-50 text-gray-700 font-medium cursor-pointer shrink-0 text-sm"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
            <button
              type="button"
              onClick={() => fetchList()}
              className="px-3 h-[45px] rounded-lg border border-gray-300 hover:bg-blue-50 flex items-center gap-1 justify-center shrink-0 cursor-pointer text-gray-700 font-medium text-sm"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
              Refresh
            </button>
          </div>
        </div>

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
              <option value="HR">HR</option>
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
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : filteredTargets.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No targets found matching your search' : 'No weekly targets found'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search' : 'Create your first target to get started'}
              </p>
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-y-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-5 py-3 text-gray-700 font-medium first:rounded-l-xl border-y border-gray-200 first:border-l first:border-gray-200">
                    Employee
                  </th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    Department
                  </th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    Week
                  </th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    Progress
                  </th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    Set by
                  </th>
                  <th className="text-center px-5 py-3 text-gray-700 font-medium text-[15px] last:rounded-r-xl border-y border-gray-200 last:border-r last:border-gray-200">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTargets.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 border-y border-gray-200 first:rounded-l-xl first:border-l first:border-gray-200">
                      <span className="font-medium text-gray-700">{t.employeeName}</span>
                      <span className="text-gray-500 ml-1">({t.empId})</span>
                    </td>
                    <td className="px-5 py-3 border-y border-gray-200">
                      <span className="font-medium text-gray-700">{t.department}</span>
                    </td>
                    <td className="px-5 py-3 border-y border-gray-200">
                      <span className="font-medium text-gray-700">
                        {t.weekStartDate ? new Date(t.weekStartDate).toLocaleDateString() : '–'}
                        {' – '}
                        {t.weekEndDate ? new Date(t.weekEndDate).toLocaleDateString() : '–'}
                      </span>
                    </td>
                    <td className="px-5 py-3 border-y border-gray-200">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full font-medium ${
                          t.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : t.status === 'draft'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {t.status || 'active'}
                      </span>
                    </td>
                    <td className="px-5 py-3 border-y border-gray-200">
                      <span className="font-medium text-gray-700">{t.progress ?? 0}%</span>
                    </td>
                    <td className="px-5 py-3 border-y border-gray-200">
                      <span className="font-medium text-gray-700">
                        {t.setBy?.employeeName || t.setBy?.empId || '–'}
                      </span>
                    </td>
                    <td className="px-5 py-3 border-y border-gray-200 last:rounded-r-xl last:border-r last:border-gray-200">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleView(t._id)}
                          className="px-3 py-1 border border-green-600 text-green-700 bg-white rounded-xl text-base font-semibold transition-colors cursor-pointer hover:bg-green-600 hover:text-white hover:border-green-600"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(t._id)}
                          className="px-3 py-1 border border-orange-600 text-orange-700 bg-white rounded-xl text-base font-semibold transition-colors cursor-pointer hover:bg-orange-600 hover:text-white hover:border-orange-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(t._id)}
                          className="px-3 py-1 border border-red-600 text-red-700 bg-white rounded-xl text-base font-semibold transition-colors cursor-pointer hover:bg-red-600 hover:text-white hover:border-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {pagination.totalPages > 1 && filteredTargets.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} targets
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page <= 1}
              className="px-2 py-1 text-black-600 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors text-base font-medium cursor-pointer"
            >
              Previous
            </button>
            {(() => {
              const pages = [];
              const totalPages = pagination.totalPages || 1;
              const currentPage = pagination.page || 1;
              const maxVisible = 7;
              if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (currentPage <= 4) {
                  for (let i = 2; i <= 5; i++) pages.push(i);
                  pages.push('ellipsis');
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 3) {
                  pages.push('ellipsis');
                  for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push('ellipsis');
                  for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                  pages.push('ellipsis');
                  pages.push(totalPages);
                }
              }
              return pages.map((page, index) => {
                if (page === 'ellipsis') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-1 text-gray-800 select-none">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page }))}
                    className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors text-base font-medium cursor-pointer ${
                      pagination.page === page
                        ? 'border border-gray-400 text-gray-800 bg-white rounded-xl'
                        : 'text-gray-700 hover:text-blue-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              });
            })()}
            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2 py-1 text-black-600 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors text-base font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Target Modal - same style as DeliveryOrder */}
      {modalMode === 'create' && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-2"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Create Weekly Target</h2>
                    <p className="text-blue-100">Add a new weekly target for an employee</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4">
              <WeeklyTargetForm
                employees={employees}
                onSuccess={() => {
                  alertify.success('Weekly target created');
                  closeModal();
                  fetchList();
                }}
                onCancel={closeModal}
                fetchEmployees={fetchEmployees}
                inModal
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Target Modal - same style as DeliveryOrder */}
      {modalMode === 'edit' && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-2"
          onClick={closeModal}
        >
          <style>{`
            .weekly-target-edit-modal::-webkit-scrollbar { display: none; }
            .weekly-target-edit-modal { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div
            className="weekly-target-edit-modal bg-white rounded-3xl max-w-2xl w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Edit2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Edit Weekly Target</h2>
                    <p className="text-blue-100">
                      {target ? `${target.employeeName} (${target.empId})` : 'Loading...'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4">
              {modalLoading ? (
                <div className="py-12 text-center text-gray-500">Loading...</div>
              ) : target && formData ? (
                <WeeklyTargetEditForm
                  target={target}
                  formData={formData}
                  setFormData={setFormData}
                  onSuccess={() => {
                    alertify.success('Weekly target updated');
                    closeModal();
                    fetchList();
                  }}
                  onCancel={closeModal}
                  saving={saving}
                  setSaving={setSaving}
                  inModal
                />
              ) : (
                <div className="py-12 text-center text-gray-500">Target not found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View/Detail Target Modal */}
      {modalMode === 'view' && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-2"
          onClick={closeModal}
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
                        ? `${target.employeeName} (${target.empId})`
                        : modalLoading
                        ? 'Loading...'
                        : 'Target details'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4">
              {modalLoading ? (
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
                      fetchTargetAndProgress(selectedTargetId, false);
                    } catch (e) {
                      alertify.error(e?.message || 'Update failed');
                    } finally {
                      setPatchingProgress(false);
                    }
                  }}
                  onBack={closeModal}
                  onEdit={() => handleEdit(selectedTargetId)}
                  onDelete={() => openDeleteModal(selectedTargetId)}
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

      {/* Delete Target Modal - same as DeliveryOrder */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={closeDeleteModal}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] relative" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Delete Weekly Target</h2>
                    <p className="text-red-100">Confirm deletion</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-red-700 font-medium">Warning</span>
                  </div>
                  <p className="text-red-600 text-sm mt-2">
                    This action cannot be undone. The weekly target will be permanently deleted.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Deletion *</label>
                    <textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows="4"
                      placeholder="Please provide a reason for deleting this weekly target..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  disabled={!deleteReason.trim() || deleteSubmitting}
                  className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold transition-colors ${
                    !deleteReason.trim() || deleteSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-red-600 hover:to-red-700'
                  }`}
                >
                  {deleteSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Deleting...
                    </span>
                  ) : (
                    'Delete Weekly Target'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklyTargetForm({ employees, onSuccess, onCancel, fetchEmployees, inModal = false }) {
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
  const [hrTargets, setHrTargets] = useState({
    calls: 0,
    interviews: 0,
    candidateJoin: 0,
    internalReviewFeedback: 0,
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
  const setHr = (key, value) => {
    setHrTargets((h) => ({ ...h, [key]: Number(value) || 0 }));
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
      else if (department === 'CMT') payload.cmtTargets = cmtTargets;
      else if (department === 'HR') payload.hrTargets = hrTargets;
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
  const hrDept = employees.filter(
    (e) => (e.department || '').toLowerCase().includes('hr')
  );
  const options =
    department === 'Sales' ? salesDept : department === 'CMT' ? cmtDept : hrDept;
  if (options.length === 0 && employees.length) {
    options.push(...employees);
  }
  const allOptions = employees.length ? employees : options;

  return (
    <div className={inModal ? '' : 'p-6 max-w-2xl mx-auto'}>
      {!inModal && (
        <>
          <button
            type="button"
            onClick={onCancel}
            className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Create Weekly Target</h2>
        </>
      )}
      <form onSubmit={handleSubmit} className={inModal ? 'p-4 space-y-4' : 'p-6 space-y-6'}>
        {/* Section 1: Basic Info - header bar + white content box */}
        <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-orange-100 px-4 py-3">
            <h3 className="text-lg font-semibold text-orange-800">Basic Info</h3>
          </div>
          <div className="bg-white p-4 border-t border-gray-200">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="Sales">Sales</option>
                <option value="CMT">CMT</option>
                <option value="HR">HR</option>
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
          </div>
          </div>
        </div>

        {department === 'Sales' && (
          <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-blue-100 px-4 py-3">
              <h3 className="text-lg font-semibold text-blue-800">Sales Targets</h3>
            </div>
            <div className="bg-white p-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery orders</label>
                <input
                  type="number"
                  min={0}
                  value={salesTargets.deliveryOrders}
                  onChange={(e) => setSales('deliveryOrders', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer follow-ups</label>
                <input
                  type="number"
                  min={0}
                  value={salesTargets.customerFollowUps}
                  onChange={(e) => setSales('customerFollowUps', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New customers added</label>
                <input
                  type="number"
                  min={0}
                  value={salesTargets.newCustomersAdded}
                  onChange={(e) => setSales('newCustomersAdded', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Margin ($)</label>
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
          </div>
        )}

        {department === 'CMT' && (
          <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-green-100 px-4 py-3">
              <h3 className="text-lg font-semibold text-green-800">CMT Targets</h3>
            </div>
            <div className="bg-white p-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bids submitted</label>
                <input
                  type="number"
                  min={0}
                  value={cmtTargets.bidsSubmitted}
                  onChange={(e) => setCmt('bidsSubmitted', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carriers added</label>
                <input
                  type="number"
                  min={0}
                  value={cmtTargets.carriersAdded}
                  onChange={(e) => setCmt('carriersAdded', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Update Scheduling</label>
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
          </div>
        )}
        {department === 'HR' && (
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-medium text-gray-800">HR targets</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600">Calls</label>
                <input
                  type="number"
                  min={0}
                  value={hrTargets.calls}
                  onChange={(e) => setHr('calls', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Interviews</label>
                <input
                  type="number"
                  min={0}
                  value={hrTargets.interviews}
                  onChange={(e) => setHr('interviews', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Candidate join</label>
                <input
                  type="number"
                  min={0}
                  value={hrTargets.candidateJoin}
                  onChange={(e) => setHr('candidateJoin', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Internal review feedback</label>
                <input
                  type="number"
                  min={0}
                  value={hrTargets.internalReviewFeedback}
                  onChange={(e) => setHr('internalReviewFeedback', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
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

function WeeklyTargetEditForm({ target, formData, setFormData, onSuccess, onCancel, saving, setSaving, inModal = false }) {
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      if (formData.salesTargets) payload.salesTargets = formData.salesTargets;
      if (formData.cmtTargets) payload.cmtTargets = formData.cmtTargets;
      if (formData.hrTargets) payload.hrTargets = formData.hrTargets;
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
    <div className={inModal ? '' : 'p-6 max-w-2xl mx-auto'}>
      {!inModal && (
        <>
          <button type="button" onClick={onCancel} className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Edit Weekly Target</h2>
          <p className="text-sm text-gray-600 mb-4">
            {target.employeeName} ({target.empId}) · {target.department} ·{' '}
            {target.weekStartDate && new Date(target.weekStartDate).toLocaleDateString()} –{' '}
            {target.weekEndDate && new Date(target.weekEndDate).toLocaleDateString()}
          </p>
        </>
      )}
      <form onSubmit={handleSubmit} className={inModal ? 'p-4 space-y-4' : 'p-6 space-y-6'}>
        {/* Show only Sales section when target is Sales */}
        {(target.department || '').toLowerCase() === 'sales' && formData.salesTargets && (
          <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-blue-100 px-4 py-3">
              <h3 className="text-lg font-semibold text-blue-800">Sales Targets</h3>
            </div>
            <div className="bg-white p-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['deliveryOrders', 'customerFollowUps', 'newCustomersAdded', 'marginAmount'].map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
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
          </div>
        )}
        {/* Show only CMT section when target is CMT */}
        {(target.department || '').toLowerCase() === 'cmt' && formData.cmtTargets && (
          <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-green-100 px-4 py-3">
              <h3 className="text-lg font-semibold text-green-800">CMT Targets</h3>
            </div>
            <div className="bg-white p-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['bidsSubmitted', 'carriersAdded', 'assignedDoImportantDateUpdates'].map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{key.replace(/([A-Z])/g, ' $1').replace('Do ', 'DO ').trim()}</label>
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
          </div>
        )}
        {formData.hrTargets && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">HR targets</h3>
            <div className="grid grid-cols-2 gap-3">
              {['calls', 'interviews', 'candidateJoin', 'internalReviewFeedback'].map((key) => (
                <div key={key}>
                  <label className="block text-sm text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.hrTargets[key] ?? 0}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        hrTargets: { ...f.hrTargets, [key]: Number(e.target.value) || 0 },
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-orange-100 px-4 py-3">
            <h3 className="text-lg font-semibold text-orange-800">Status & Notes</h3>
          </div>
          <div className="bg-white p-4 border-t border-gray-200">
          <div className="grid grid-cols-1 gap-4">
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
          </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
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
  inModal = false,
}) {
  const progressData = progress || {};
  const sales = progressData.salesTargets || {};
  const cmt = progressData.cmtTargets || {};
  const hr = progressData.hrTargets || {};

  const computeOverallPercent = (items) => {
    let totalTarget = 0;
    let totalCompleted = 0;
    items.forEach((m) => {
      totalTarget += Number(m?.target ?? 0) || 0;
      totalCompleted += Number(m?.completed ?? 0) || 0;
    });
    if (totalTarget <= 0) return 0;
    return Math.round((totalCompleted / totalTarget) * 100);
  };

  /** Compute overall progress % from metrics so HR (and others) show correct percentage */
  const getComputedProgressPercentage = () => {
    const dept = (target?.department || progressData.department || '').toLowerCase();
    if (dept === 'sales') {
      const items = [
        sales.deliveryOrders,
        sales.customerFollowUps,
        sales.newCustomersAdded,
        sales.marginAmount,
      ].filter(Boolean);
      return computeOverallPercent(items);
    }
    if (dept === 'cmt') {
      const items = [
        cmt.bidsSubmitted,
        cmt.carriersAdded,
        cmt.assignedDoImportantDateUpdates,
      ].filter(Boolean);
      return computeOverallPercent(items);
    }
    if (dept === 'hr') {
      const items = [
        hr.calls,
        hr.interviews,
        hr.candidateJoin,
        hr.internalReviewFeedback,
      ].filter(Boolean);
      return computeOverallPercent(items);
    }
    return progressData.progressPercentage ?? null;
  };

  const computedProgressPct = getComputedProgressPercentage();

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

  const statusColor =
    target?.status === 'completed'
      ? 'bg-green-100 text-green-800'
      : target?.status === 'draft'
      ? 'bg-gray-100 text-gray-800'
      : 'bg-blue-100 text-blue-800';

  return (
    <div className={inModal ? '' : 'p-6 max-w-4xl mx-auto'}>
      {!inModal && (
        <button type="button" onClick={onBack} className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-1 text-base">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      )}
      {inModal ? (
        <>
          <div className="w-full rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-green-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Target className="text-green-700" size={20} />
                <h3 className="text-lg font-semibold text-green-800">Target Info</h3>
              </div>
            </div>
            <div className="bg-white p-4 border-t border-gray-200 flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2 text-gray-700">
                <User size={16} /> <span className="font-medium">Employee:</span>{' '}
                {target?.employeeName} ({target?.empId})
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <BarChart3 size={16} /> <span className="font-medium">Department:</span> {target?.department}
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar size={16} /> <span className="font-medium">Week:</span>{' '}
                {target?.weekStartDate ? new Date(target.weekStartDate).toLocaleDateString() : '–'} –{' '}
                {target?.weekEndDate ? new Date(target.weekEndDate).toLocaleDateString() : '–'}
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-medium">Set by:</span>{' '}
                {target?.setBy?.employeeName || target?.setBy?.empId || '–'}
              </div>
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2 ${statusColor}`}>
                {target?.status || 'active'}
              </div>
            </div>
          </div>
        </>
      ) : (
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
            <span className={`inline-flex mt-2 px-2.5 py-1 rounded text-sm font-medium ${statusColor}`}>
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
      )}

      <div className={`rounded-lg border border-gray-200 overflow-hidden shadow-sm ${inModal ? 'mt-5 mb-0' : 'mb-6'}`}>
        <div className="px-4 py-3 flex items-center gap-2 bg-blue-100">
          <BarChart3 className="w-5 h-5 text-blue-700" />
          <span className="font-semibold text-blue-800 text-base">
            {(target?.department || progressData.department || '').toLowerCase() === 'cmt'
              ? 'CMT Progress'
              : (target?.department || progressData.department || '').toLowerCase() === 'hr'
              ? 'HR Progress'
              : 'Sales Progress'}
          </span>
          {(computedProgressPct != null || progressData.progressPercentage != null) && (
            <span className="ml-auto text-lg font-semibold text-blue-700">
              {(computedProgressPct != null ? computedProgressPct : progressData.progressPercentage)}%
            </span>
          )}
        </div>
        <div className="bg-white border-t border-gray-200 overflow-hidden">
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
                ['Margin ($)', sales.marginAmount?.target, sales.marginAmount?.completed],
              ].map(([label, t, c, manualKey]) => renderRow(label, t, c, manualKey))}
            {progressData.department === 'CMT' &&
              [
                ['Bids submitted', cmt.bidsSubmitted?.target, cmt.bidsSubmitted?.completed],
                ['Carriers added', cmt.carriersAdded?.target, cmt.carriersAdded?.completed],
                ['Update Scheduling', cmt.assignedDoImportantDateUpdates?.target, cmt.assignedDoImportantDateUpdates?.completed],
              ].map(([label, t, c, manualKey]) => renderRow(label, t, c, manualKey))}
            {progressData.department === 'HR' &&
              [
                ['Calls', hr.calls?.target, hr.calls?.completed],
                ['Interviews', hr.interviews?.target, hr.interviews?.completed],
                ['Candidate join', hr.candidateJoin?.target, hr.candidateJoin?.completed],
                ['Internal review feedback', hr.internalReviewFeedback?.target, hr.internalReviewFeedback?.completed],
              ].map(([label, t, c]) => renderRow(label, t, c))}
          </tbody>
        </table>
        </div>
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
