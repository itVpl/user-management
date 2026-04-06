import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { Search, Truck, ChevronLeft, ChevronRight, Eye, Download, ChevronDown, User } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import { DetailsModal } from '../CMT/DODetails.jsx';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';

/** Horizontal scroll only — keeps the bar visible (not trapped under a tall vertical scroll). */
const TABLE_SCROLL_H =
  'w-full min-w-0 max-w-full overflow-x-scroll overflow-y-visible overscroll-x-contain [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184)_rgb(241_245_249)] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:rounded-md [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-md [&::-webkit-scrollbar-thumb]:bg-slate-400 hover:[&::-webkit-scrollbar-thumb]:bg-slate-500';
/** Vertical scroll for tall tables; horizontal overflow is handled by TABLE_SCROLL_H parent. */
const TABLE_SCROLL_V =
  'max-h-[min(72vh,800px)] overflow-y-auto overflow-x-visible [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184)_rgb(241_245_249)] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:rounded-md [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-md [&::-webkit-scrollbar-thumb]:bg-slate-400 hover:[&::-webkit-scrollbar-thumb]:bg-slate-500';
const CELL_SCROLL =
  'max-h-56 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184)_rgb(248_250_252)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400';

export default function DOAndSchedulingReport() {
  const [assignedDOs, setAssignedDOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [range, setRange] = useState({
    startDate: addDays(new Date(), -29),
    endDate: new Date(),
    key: 'selection'
  });
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const dateRangeDropdownRef = useRef(null);
  const [showESignModal, setShowESignModal] = useState(false);
  const [eSignName, setESignName] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [cmtUsers, setCmtUsers] = useState([]);
  const [cmtUsersLoading, setCmtUsersLoading] = useState(false);
  const [selectedCmtEmpId, setSelectedCmtEmpId] = useState('');
  const [showCmtFilter, setShowCmtFilter] = useState(false);
  const [cmtFilterSearch, setCmtFilterSearch] = useState('');
  const cmtFilterRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const itemsPerPage = 10;
  const prevFiltersRef = useRef({ start: null, end: null, cmt: '', isSearching: false });

  const presets = {
    'Today': [new Date(), new Date()],
    'Yesterday': [addDays(new Date(), -1), addDays(new Date(), -1)],
    'Last 7 Days': [addDays(new Date(), -6), new Date()],
    'Last 30 Days': [addDays(new Date(), -29), new Date()],
    'This Month': [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)],
    'Last Month': [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), new Date(new Date().getFullYear(), new Date().getMonth(), 0)],
  };

  const applyPreset = (label) => {
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setShowPresetMenu(false);
  };

  const ymd = (d) => (d ? format(d, 'yyyy-MM-dd') : null);

  const fetchData = async (page = currentPage, limit = itemsPerPage, startDateParam = null, endDateParam = null) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        alertify.error('Please login again.');
        return;
      }
      const startDate = startDateParam ?? ymd(range.startDate);
      const endDate = endDateParam ?? ymd(range.endDate);
      if (!startDate || !endDate) {
        setAssignedDOs([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      const isSearching = (searchTerm || '').trim() !== '';
      const baseParams = { startDate, endDate };
      if (selectedCmtEmpId) baseParams.empId = selectedCmtEmpId;

      if (isSearching) {
        const pageSize = 500;
        let allRows = [];
        let nextPage = 1;
        let totalFromApi = null;
        let totalPagesFromApi = null;
        let itemsPerPageFromApi = pageSize;
        let firstTodayCount = 0;

        while (true) {
          const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/all-cmt-assignments`, {
            params: { ...baseParams, page: nextPage, limit: pageSize },
            headers: { Authorization: `Bearer ${token}` }
          });

          const data = res.data?.data || res.data;
          const assigned = Array.isArray(data?.assignedDOs) ? data.assignedDOs : [];
          if (nextPage === 1) firstTodayCount = data?.todayCount ?? 0;

          const pagination = data?.pagination || res.data?.pagination || {};
          if (totalFromApi == null) {
            const maybeTotal = pagination.totalItems ?? data.totalCount ?? data.total ?? res.data?.pagination?.totalItems ?? null;
            totalFromApi = typeof maybeTotal === 'number' ? maybeTotal : null;
          }
          if (totalPagesFromApi == null) {
            const maybePages = pagination.totalPages ?? data.totalPages ?? res.data?.pagination?.totalPages ?? null;
            totalPagesFromApi = typeof maybePages === 'number' ? maybePages : null;
          }
          if (typeof pagination.itemsPerPage === 'number' && Number.isFinite(pagination.itemsPerPage)) {
            itemsPerPageFromApi = pagination.itemsPerPage;
          }

          allRows = allRows.concat(assigned);

          if (totalPagesFromApi != null && nextPage >= totalPagesFromApi) break;
          if (totalFromApi != null && allRows.length >= totalFromApi) break;
          if (assigned.length === 0) break;
          if (totalPagesFromApi == null && totalFromApi == null && assigned.length < itemsPerPageFromApi) break;

          nextPage += 1;
          if (nextPage > 2000) break;
        }

        setAssignedDOs(allRows);
        setTotalCount(totalFromApi ?? allRows.length);
        setTodayCount(firstTodayCount);
      } else {
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/all-cmt-assignments`, {
          params: { ...baseParams, page, limit },
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data?.data || res.data;
        if (res.data?.success && Array.isArray(data?.assignedDOs)) {
          setAssignedDOs(data.assignedDOs);
          const pagination = data?.pagination || res.data?.pagination || {};
          const total = pagination.totalItems ?? data.totalCount ?? data.total ?? res.data?.pagination?.totalItems ?? data.assignedDOs?.length ?? 0;
          setTotalCount(typeof total === 'number' ? total : data.assignedDOs.length);
          setTodayCount(data.todayCount ?? 0);
        } else {
          setAssignedDOs([]);
          setTotalCount(0);
          setTodayCount(0);
        }
      }
    } catch (err) {
      console.error(err);
      alertify.error(err.response?.data?.message || 'Failed to load DO and Scheduling report');
      setAssignedDOs([]);
      setTotalCount(0);
      setTodayCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const startDate = ymd(range.startDate);
    const endDate = ymd(range.endDate);
    if (!startDate || !endDate) {
      setAssignedDOs([]);
      setTotalCount(0);
      setTodayCount(0);
      setLoading(false);
      return;
    }
    const isSearching = (searchTerm || '').trim() !== '';
    const cmt = selectedCmtEmpId || '';
    const prev = prevFiltersRef.current;
    const filtersChanged =
      prev.start !== startDate || prev.end !== endDate || prev.cmt !== cmt || prev.isSearching !== isSearching;
    if (filtersChanged) {
      prevFiltersRef.current = { start: startDate, end: endDate, cmt, isSearching };
      setCurrentPage(1);
      fetchData(1, itemsPerPage, startDate, endDate);
    } else if (!isSearching) {
      fetchData(currentPage, itemsPerPage, startDate, endDate);
    }
  }, [range.startDate, range.endDate, currentPage, searchTerm, selectedCmtEmpId]);

  const fetchCmtUsers = async () => {
    setCmtUsersLoading(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/CMT`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const list = res.data?.employees || [];
      setCmtUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setCmtUsers([]);
    } finally {
      setCmtUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchCmtUsers();
  }, []);

  useEffect(() => {
    if (!showCmtFilter) return;
    const handleClickOutside = (e) => {
      if (cmtFilterRef.current && !cmtFilterRef.current.contains(e.target)) {
        setShowCmtFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCmtFilter]);

  useEffect(() => {
    if (!showPresetMenu) return;
    const handleClickOutside = (e) => {
      if (dateRangeDropdownRef.current && !dateRangeDropdownRef.current.contains(e.target)) {
        setShowPresetMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPresetMenu]);

  const isSearching = (searchTerm || '').trim() !== '';

  const filteredAssignedDOs = useMemo(() => {
    const norm = (v) => String(v ?? '').trim().toLowerCase();
    const q = norm(searchTerm);
    if (!q) return assignedDOs;
    return assignedDOs.filter((order) => {
      const cust0 = order.customers?.[0] || {};
      const loadNo = norm(cust0.loadNo);
      const dispatcherName = norm(cust0.dispatcherName);
      const carrierName = norm(order.carrier?.carrierName || order.carrierId?.compName);
      const carrierNumber = norm(order.carrier?.carrierNumber);
      const carrierEmail = norm(order.carrierId?.email || order.carrier?.email);
      const loadType = norm(order.loadType);
      const createdBy = norm(
        order.createdBySalesUser?.employeeName ||
        order.createdBySalesUser?.empName ||
        order.createdBySalesUser?.name ||
        order.createdBy?.employeeName ||
        order.createdBy?.name
      );
      const assignedTo = norm(
        order.assignedToCMT?.employeeName ||
        order.assignedToCMT?.empName ||
        order.assignedToCMT?.name ||
        order.assignedToCMT?.empId
      );
      const assignedAt = norm(order.assignedToCMT?.assignedAt ? format(new Date(order.assignedToCMT.assignedAt), 'MMM dd, yyyy HH:mm') : '');
      const rawStatus = norm(order.loadReference?.status);
      const displayStatus = norm(rawStatus.replace(/-|_/g, ' '));
      const doId = norm(order._id || order.doId);
      const doLabel = norm(order._id ? `do-${String(order._id).slice(-6)}` : '');
      const billTo = norm(cust0.billTo || order.customerName);
      return (
        loadNo.includes(q) ||
        dispatcherName.includes(q) ||
        carrierName.includes(q) ||
        carrierNumber.includes(q) ||
        carrierEmail.includes(q) ||
        loadType.includes(q) ||
        createdBy.includes(q) ||
        assignedTo.includes(q) ||
        assignedAt.includes(q) ||
        rawStatus.includes(q) ||
        displayStatus.includes(q) ||
        doId.includes(q) ||
        doLabel.includes(q) ||
        billTo.includes(q)
      );
    });
  }, [assignedDOs, searchTerm]);

  const totalItems = isSearching ? filteredAssignedDOs.length : totalCount;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentOrders = isSearching
    ? filteredAssignedDOs.slice(startIndex, startIndex + itemsPerPage)
    : assignedDOs;

  useEffect(() => {
    if (!isSearching) return;
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
  }, [currentPage, isSearching, totalPages]);

  const filteredCmtUsers = useMemo(() => {
    const q = (cmtFilterSearch || '').trim().toLowerCase();
    if (!q) return cmtUsers;
    return cmtUsers.filter((u) => {
      const name = (u.employeeName || u.empName || u.aliasName || '').toLowerCase();
      const empIdStr = String(u.empId || u._id || '').toLowerCase();
      return name.includes(q) || empIdStr.includes(q);
    });
  }, [cmtUsers, cmtFilterSearch]);

  const selectedCmtUser = useMemo(
    () => (selectedCmtEmpId ? cmtUsers.find((u) => (u.empId || u._id) === selectedCmtEmpId) : null),
    [cmtUsers, selectedCmtEmpId]
  );

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPaginationPages = () => {
    const total = totalPages;
    const current = currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    if (current > 3) pages.push(1, 'ellipsis');
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('ellipsis', total);
    return pages;
  };

  const getImportantDateHistoryList = (order) => {
    const lr = order?.loadReference || {};
    const h =
      lr.importantDateUpdateHistory ??
      order?.importantDateUpdateHistory ??
      order?.raw?.loadReference?.importantDateUpdateHistory;
    return Array.isArray(h) ? h : [];
  };

  /** loadReference + importantDates — same fields as DO details modal */
  const buildImportantDateEntries = (order) => {
    const lr = order?.loadReference || {};
    const imp = lr.importantDates || order?.importantDates || {};
    const pick = (a, b, c) => a ?? b ?? c ?? null;
    const entries = [];
    const add = (label, rawVal) => {
      if (rawVal == null || rawVal === '') return;
      try {
        const dt = new Date(rawVal);
        if (Number.isNaN(dt.getTime())) return;
        entries.push({ label, value: format(dt, 'MMM dd, yyyy') });
      } catch {
        /* skip invalid */
      }
    };
    add('Vessel ETA', pick(lr.vesselETA, imp.vesselETA, imp.vesselDate));
    add('Last free', pick(lr.latfreeDate, imp.latfreeDate, imp.lastFreeDate));
    add('Discharge', pick(lr.dischargeDate, imp.dischargeDate));
    add('Outgate', pick(lr.outgateDate, imp.outgateDate));
    add('Empty', pick(lr.emptyDate, imp.emptyDate));
    add('Per diem free', pick(lr.perDiemFreeDay, imp.perDiemFreeDay, imp.perDiemFreeDate));
    add('Ingate', pick(lr.ingateDate, imp.ingateDate));
    add('Ready return', pick(lr.readyToReturnDate, imp.readyToReturnDate));
    add('Delivery', imp.dlvyDate);
    return entries;
  };

  const getImportantDatesSummaryForExport = (order) => {
    const e = buildImportantDateEntries(order);
    return e.length ? e.map((x) => `${x.label}: ${x.value}`).join('; ') : '';
  };

  // Build Important Date Update History for Excel (same as View popup: Employee, Emp ID, Updated At, Updated Dates)
  const getImportantDateHistoryForExport = (order) => {
    const history = getImportantDateHistoryList(order);
    if (history.length === 0) return '';
    return history
      .map((entry) => {
        const name = entry.employeeName || '—';
        const empId = entry.empId || '—';
        const updatedAt = entry.updatedAt
          ? format(new Date(entry.updatedAt), 'MMM dd, yyyy HH:mm')
          : '—';
        const labels = Array.isArray(entry.updatedFieldLabels) && entry.updatedFieldLabels.length > 0
          ? entry.updatedFieldLabels.join(', ')
          : '—';
        return `${name} (${empId}) - ${updatedAt} - ${labels}`;
      })
      .join('; ');
  };

  const handleExportCSV = (dataToExport, signedByName = '') => {
    if (!dataToExport || dataToExport.length === 0) {
      alertify.error('No data to export');
      return;
    }
    const headers = [
      'Load No',
      'Dispatcher Name',
      'Carrier Name',
      'Carrier Email',
      'Carrier Number',
      'Load Type',
      'Created By (Sales)',
      'Assigned To (CMT)',
      'Assigned At',
      'Status',
      'Important Dates',
      'Important Date History',
    ];
    const rows = dataToExport.map((order) => {
      const cust0 = order.customers?.[0] || {};
      const loadNo = cust0.loadNo || 'N/A';
      const dispatcherName = cust0.dispatcherName || 'N/A';
      const carrierName = order.carrier?.carrierName || 'N/A';
      const carrierEmail = order.carrierId?.email || order.carrier?.email || 'N/A';
      const carrierNumber = order.carrier?.carrierNumber || 'N/A';
      const loadType = order.loadType || 'N/A';
      const createdBy = order.createdBySalesUser?.employeeName || 'N/A';
      const assignedTo = order.assignedToCMT?.employeeName || 'N/A';
      const assignedAt = order.assignedToCMT?.assignedAt
        ? format(new Date(order.assignedToCMT.assignedAt), 'MMM dd, yyyy HH:mm')
        : 'N/A';
      const status = order.loadReference?.status
        ? (order.loadReference.status[0].toUpperCase() + order.loadReference.status.slice(1).toLowerCase().replace(/-|_/g, ' '))
        : 'N/A';
      const importantDatesSummary = getImportantDatesSummaryForExport(order);
      const importantDateHistory = getImportantDateHistoryForExport(order);
      return [
        `"${String(loadNo).replace(/"/g, '""')}"`,
        `"${String(dispatcherName).replace(/"/g, '""')}"`,
        `"${String(carrierName).replace(/"/g, '""')}"`,
        `"${String(carrierEmail).replace(/"/g, '""')}"`,
        `"${String(carrierNumber).replace(/"/g, '""')}"`,
        `"${String(loadType).replace(/"/g, '""')}"`,
        `"${String(createdBy).replace(/"/g, '""')}"`,
        `"${String(assignedTo).replace(/"/g, '""')}"`,
        `"${String(assignedAt).replace(/"/g, '""')}"`,
        `"${String(status).replace(/"/g, '""')}"`,
        `"${String(importantDatesSummary).replace(/"/g, '""')}"`,
        `"${String(importantDateHistory).replace(/"/g, '""')}"`,
      ];
    });
    let csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    if (signedByName && signedByName.trim()) {
      const signDate = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      csvContent += '\n\n"E-Sign","Signed By","Date"\n';
      csvContent += `"","${String(signedByName).replace(/"/g, '""')}","${signDate}"`;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'DO_and_Scheduling_Report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSVClick = () => {
    const isSearchingNow = (searchTerm || '').trim() !== '';
    const exportCount = isSearchingNow ? filteredAssignedDOs.length : totalCount;
    if (exportCount === 0) {
      alertify.error('No data to export');
      return;
    }
    setESignName('');
    setShowESignModal(true);
  };

  const handleESignConfirm = async () => {
    const name = (eSignName || '').trim();
    if (!name) {
      alertify.error('Please enter your name for E-Sign');
      return;
    }
    setExportLoading(true);
    setShowESignModal(false);
    setESignName('');
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        alertify.error('Please login again.');
        setExportLoading(false);
        return;
      }
      const startDate = ymd(range.startDate);
      const endDate = ymd(range.endDate);
      if (!startDate || !endDate) {
        alertify.error('Select date range');
        setExportLoading(false);
        return;
      }
      const isSearchingNow = (searchTerm || '').trim() !== '';
      if (isSearchingNow) {
        if (filteredAssignedDOs.length === 0) {
          alertify.error('No data to export');
          setExportLoading(false);
          return;
        }
        handleExportCSV(filteredAssignedDOs, name);
        alertify.success(`Exported ${filteredAssignedDOs.length} orders`);
        setExportLoading(false);
        return;
      }
      const params = { startDate, endDate, limit: 0 };
      if (searchTerm?.trim()) params.search = searchTerm.trim();
      if (selectedCmtEmpId) params.empId = selectedCmtEmpId;
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/all-cmt-assignments`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data?.success && Array.isArray(res.data?.data?.assignedDOs) ? res.data.data.assignedDOs : [];
      if (list.length === 0) {
        alertify.error('No data to export');
        setExportLoading(false);
        return;
      }
      handleExportCSV(list, name);
      alertify.success(`Exported ${list.length} orders`);
    } catch (err) {
      console.error(err);
      alertify.error(err.response?.data?.message || 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const showLoadingOverlay = loading && assignedDOs.length > 0;

  const displayCell = (value, { empty = '—' } = {}) => {
    if (value == null) return empty;
    const s = String(value).trim();
    return s === '' ? empty : s;
  };

  if (loading && assignedDOs.length === 0) {
    return (
      <div className="p-6 bg-white min-h-screen w-full min-w-0 max-w-full">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading DO and Scheduling report...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen w-full min-w-0 max-w-full">
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-700 font-semibold">Loading...</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Section - same as DeliveryOrder */}
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[105px] flex items-center relative">
              <div className="w-16 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {totalCount}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Total Orders
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[105px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {todayCount}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Today
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full xl:w-[350px]">
            <div className="relative w-full" ref={dateRangeDropdownRef}>
              <button
                type="button"
                onClick={() => setShowPresetMenu((v) => !v)}
                className="cursor-pointer w-full text-left px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors"
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
                    onClick={() => { setShowPresetMenu(false); setShowCustomRange(true); }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    Custom Range
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleExportCSVClick}
              disabled={totalCount === 0 || exportLoading}
              className="cursor-pointer mt-2 w-full flex items-center justify-center gap-2 px-4 h-[45px] bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export report to CSV (E-Sign required)"
            >
              {exportLoading ? 'Exporting...' : <><Download size={18} /> Export to CSV</>}
            </button>
          </div>
        </div>

        <div className="flex gap-2 w-full items-stretch">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search Orders"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
          </div>
          <div className="relative shrink-0 min-w-[320px]" ref={cmtFilterRef}>
            <button
              type="button"
              onClick={() => setShowCmtFilter((v) => !v)}
              className="cursor-pointer h-full min-h-[48px] w-full px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-gray-300 flex items-center gap-2 text-gray-700 font-medium whitespace-nowrap"
            >
              {/* <User size={18} className="text-gray-500 shrink-0" /> */}
              <span className="min-w-0 flex-1 text-left truncate max-w-[280px]">
                {selectedCmtUser ? (selectedCmtUser.employeeName || selectedCmtUser.empName || selectedCmtUser.empId || 'CMT User') : 'CMT User (All)'}
              </span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
            {showCmtFilter && (
              <div className="absolute z-50 right-0 mt-2 w-80 min-w-[280px] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    placeholder="Search CMT user..."
                    value={cmtFilterSearch}
                    onChange={(e) => setCmtFilterSearch(e.target.value)}
                    className="w-full px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 placeholder-gray-400"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  <button
                    type="button"
                    onClick={() => { setSelectedCmtEmpId(''); setShowCmtFilter(false); setCmtFilterSearch(''); }}
                    className={`w-full text-left px-4 py-2.5 text-base font-medium ${!selectedCmtEmpId ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    All CMT Users
                  </button>
                  {cmtUsersLoading ? (
                    <div className="px-4 py-4 text-sm text-gray-500 text-center">Loading...</div>
                  ) : filteredCmtUsers.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-500 text-center">No CMT user found</div>
                  ) : (
                    filteredCmtUsers.map((u) => {
                      const id = u.empId || u._id;
                      const name = u.employeeName || u.empName || u.aliasName || id || '—';
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => { setSelectedCmtEmpId(id); setShowCmtFilter(false); setCmtFilterSearch(''); }}
                          className={`cursor-pointer w-full text-left px-4 py-2.5 text-base ${selectedCmtEmpId === id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          <span className="block truncate">{name}</span>
                          {id && <span className="block text-sm text-gray-500 mt-0.5">ID: {id}</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCustomRange && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCustomRange(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <DateRange
              ranges={[range.startDate && range.endDate ? { ...range, startDate: range.startDate, endDate: range.endDate, key: 'selection' } : { startDate: new Date(), endDate: new Date(), key: 'selection' }]}
              onChange={(item) => {
                const sel = item.selection;
                if (sel?.startDate && sel?.endDate) setRange({ startDate: sel.startDate, endDate: sel.endDate, key: 'selection' });
              }}
              moveRangeOnFirstSelection={false}
              months={2}
              direction="horizontal"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => { setRange({ startDate: null, endDate: null, key: 'selection' }); setShowCustomRange(false); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Clear</button>
              <button type="button" onClick={() => setShowCustomRange(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                type="button"
                onClick={() => { if (range.startDate && range.endDate) setShowCustomRange(false); }}
                className={`px-4 py-2 rounded-lg ${range.startDate && range.endDate ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                disabled={!range.startDate || !range.endDate}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="do-report-scroll-x scrollbar-show max-w-full rounded-xl [scrollbar-gutter:stable]">
          {currentOrders.length === 0 && !loading ? (
            <div className="text-center py-12 min-w-0">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No orders found matching your search' : !ymd(range.startDate) || !ymd(range.endDate) ? 'Select a date range' : 'No DO assignments in this period'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search' : 'Change date range or check back later'}
              </p>
            </div>
          ) : (
            <table className="w-max min-w-[2000px] max-w-none text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-800 font-semibold whitespace-nowrap">Load No</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-semibold whitespace-nowrap">Dispatcher</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-semibold whitespace-nowrap">Carrier</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-semibold whitespace-nowrap">Carrier email</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-semibold whitespace-nowrap">Carrier #</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-semibold whitespace-nowrap">Load type</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-semibold whitespace-nowrap">Created by (sales)</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-semibold whitespace-nowrap">Assigned (CMT)</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-semibold whitespace-nowrap">Assigned at</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-semibold whitespace-nowrap">Status</th>
                  <th className="text-center py-3 px-4 text-gray-800 font-semibold whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {currentOrders.map((order) => {
                  const createdBy = displayCell(order.createdBySalesUser?.employeeName);
                  const assignedTo = displayCell(order.assignedToCMT?.employeeName);
                  const assignedAt = order.assignedToCMT?.assignedAt
                    ? format(new Date(order.assignedToCMT.assignedAt), 'MMM dd, yyyy HH:mm')
                    : '—';
                  const carrierName = displayCell(order.carrier?.carrierName);
                  const carrierEmail = displayCell(order.carrierId?.email || order.carrier?.email);
                  const carrierNumber = displayCell(order.carrier?.carrierNumber);
                  const cust0 = order.customers?.[0] || {};
                  const loadNo = displayCell(cust0.loadNo);
                  const dispatcherName = displayCell(cust0.dispatcherName);
                  const loadStatusRaw = order.loadReference?.status
                    ? (order.loadReference.status[0].toUpperCase() + order.loadReference.status.slice(1).toLowerCase().replace(/-|_/g, ' '))
                    : '';
                  const loadStatus = displayCell(loadStatusRaw);
                  const statusLower = String(loadStatusRaw).toLowerCase();
                  const isAssignedStatus =
                    statusLower === 'assigned' ||
                    (statusLower.includes('assigned') && !statusLower.includes('unassigned'));
                  const orderForModal = {
                    id: order._id,
                    doId: `DO-${String(order._id || '').slice(-6) || '—'}`,
                    loadNo: cust0.loadNo || 'N/A',
                    billTo: cust0.billTo || order.customerName || 'N/A',
                    raw: order
                  };
                  return (
                    <tr key={order._id} className="hover:bg-gray-50/90 transition-colors">
                      <td className="py-3 px-4 text-gray-800 font-medium whitespace-nowrap">{loadNo}</td>
                      <td className="py-3 px-4 text-gray-800">{dispatcherName}</td>
                      <td className="py-3 px-4">
                        <div className="relative group max-w-[160px]">
                          <span className="text-gray-800 block truncate">{carrierName}</span>
                          {carrierName !== '—' && (
                            <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl max-w-[220px] break-words">
                              {carrierName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="relative group max-w-[200px]">
                          <span className="text-gray-800 block truncate">{carrierEmail}</span>
                          {carrierEmail !== '—' && (
                            <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl max-w-[280px] break-words">
                              {carrierEmail}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-800 whitespace-nowrap">{carrierNumber}</td>
                      <td className="py-3 px-4 text-gray-800">{displayCell(order.loadType)}</td>
                      <td className="py-3 px-4 text-gray-800">{createdBy}</td>
                      <td className="py-3 px-4 text-gray-800">{assignedTo}</td>
                      <td className="py-3 px-4 text-gray-800 whitespace-nowrap">{assignedAt}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center max-w-full truncate rounded-full px-3 py-1 text-xs font-medium ${
                            statusLower === 'delivered'
                              ? 'bg-emerald-50 text-emerald-800'
                              : statusLower.includes('transit')
                              ? 'bg-amber-50 text-amber-800'
                              : isAssignedStatus
                              ? 'bg-sky-100 text-sky-800 border border-sky-200/80'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                          title={loadStatus !== '—' ? loadStatus : undefined}
                        >
                          <span className="truncate">{loadStatus}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setViewingOrder(orderForModal)}
                          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          </div>
        </div>
      </div>

      {totalItems > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-4 mt-4 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium text-gray-800">{startIndex + 1}</span> to{' '}
            <span className="font-medium text-gray-800">{startIndex + currentOrders.length}</span> of{' '}
            <span className="font-medium text-gray-800">{totalItems}</span> entries
            {searchTerm ? (
              <span className="text-gray-500"> (filtered by &quot;{searchTerm}&quot;)</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <div className="flex items-center gap-1 px-1">
              {getPaginationPages().map((page, index) =>
                page === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-400 text-sm">
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-2 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                      currentPage === page
                        ? 'border border-gray-300 bg-white text-gray-900 shadow-sm'
                        : 'border border-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* E-Sign modal for CSV export */}
      {showESignModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">E-Sign for Export</h3>
            <p className="text-sm text-gray-600 mb-4">Enter your name to sign the report. It will be included in the exported CSV.</p>
            <input
              type="text"
              value={eSignName}
              onChange={(e) => setESignName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-gray-800 placeholder-gray-400 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleESignConfirm()}
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowESignModal(false); setESignName(''); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              > 
                Cancel
              </button>
              <button
                type="button"
                onClick={handleESignConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Sign & Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      <DetailsModal
        open={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        order={viewingOrder}
        cmtEmpId={viewingOrder?.raw?.assignedToCMT?.empId || ''}
        onForwardSuccess={() => { const s = ymd(range.startDate); const e = ymd(range.endDate); if (s && e) fetchData(1, itemsPerPage, s, e); }}
        reportView={true}
      />
    </div>
  );
}
