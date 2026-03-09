import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { FaDownload } from 'react-icons/fa';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  ChevronDown,
  FileText,
  User,
} from 'lucide-react';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';
import API_CONFIG from '../../config/api.js';
import { DetailsModal } from '../CMT/DODetails.jsx';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

const ITEMS_PER_PAGE = 20;

export default function FinalChargesReport() {
  const [doDocuments, setDoDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState({
    cmt_verified: 0,
    accountant_approved: 0,
    sales_verified: 0,
    sales_rejected: 0,
    accountant_rejected: 0,
    completed: 0,
    total: 0,
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: ITEMS_PER_PAGE,
  });
  const [appliedFilter, setAppliedFilter] = useState({});
  const [viewingOrder, setViewingOrder] = useState(null);

  const [filters, setFilters] = useState({
    page: 1,
    limit: ITEMS_PER_PAGE,
    cmtEmpId: '',
    search: '',
  });

  const [cmtUsers, setCmtUsers] = useState([]);
  const [cmtUsersLoading, setCmtUsersLoading] = useState(false);
  const [cmtFilterSearch, setCmtFilterSearch] = useState('');
  const [showCmtFilter, setShowCmtFilter] = useState(false);
  const cmtFilterRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [rangeForwarded, setRangeForwarded] = useState({ startDate: null, endDate: null, key: 'selection' });
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const dateRangeDropdownRef = useRef(null);
  const [showESignModal, setShowESignModal] = useState(false);
  const [eSignName, setESignName] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

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
    setRangeForwarded({ startDate: s, endDate: e, key: 'selection' });
    setShowPresetMenu(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        alertify.error('Please login again.');
        return;
      }
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v != null && v !== '') params[k] = v;
      });
      if (rangeForwarded.startDate) params.forwardedDateFrom = format(rangeForwarded.startDate, 'yyyy-MM-dd');
      if (rangeForwarded.endDate) params.forwardedDateTo = format(rangeForwarded.endDate, 'yyyy-MM-dd');
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/accountant/forwarded-report`,
        {
          params,
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = res.data?.data;
      if (res.data?.success && data) {
        setDoDocuments(Array.isArray(data.doDocuments) ? data.doDocuments : []);
        setStatistics(data.statistics || {});
        setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: ITEMS_PER_PAGE });
        setAppliedFilter(data.filter || {});
      } else {
        setDoDocuments([]);
      }
    } catch (err) {
      console.error(err);
      alertify.error(err.response?.data?.message || 'Failed to load Final Charges report');
      setDoDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    filters.page,
    filters.limit,
    filters.cmtEmpId,
    filters.search,
    rangeForwarded.startDate,
    rangeForwarded.endDate,
  ]);

  const fetchCmtUsers = async () => {
    setCmtUsersLoading(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/CMT`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
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

  const handleSearch = () => {
    updateFilter('search', searchTerm.trim());
  };

  const handleForwardedDateChange = (item) => {
    const sel = item.selection;
    if (sel && sel.startDate && sel.endDate) {
      setRangeForwarded(sel);
    }
  };

  const handleExportCSV = (dataToExport, signedByName = '') => {
    if (!dataToExport || dataToExport.length === 0) {
      alertify.error('No data to export');
      return;
    }
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Load No', 'Forwarded Date', 'CMT Employee', 'Carrier', 'Container No'];
    const rows = dataToExport.map((doc) => {
      const loadNo = doc.loadNo || doc.loadReference?.loadNo || '—';
      const forwardedAt = doc.forwardedToAccountant?.forwardedAt;
      const cmtBy = doc.forwardedToAccountant?.forwardedBy;
      const containerNo = doc.loadReference?.containerNo || doc.containerNo || (doc.customers?.[0]?.containerNo) || '—';
      return [
        esc(loadNo),
        esc(forwardedAt ? format(new Date(forwardedAt), 'MMM dd, yyyy HH:mm') : '—'),
        esc(cmtBy?.employeeName || cmtBy?.empId || '—'),
        esc(doc.carrierId?.compName || '—'),
        esc(containerNo),
      ];
    });
    let csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    if (signedByName && signedByName.trim()) {
      const signDate = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      csvContent += '\n\n"E-Sign","Signed By","Date"\n';
      csvContent += `"","${String(signedByName).replace(/"/g, '""')}","${signDate}"`;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Final_Charges_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchForExport = async (signedByName) => {
    setExportLoading(true);
    setShowESignModal(false);
    setESignName('');
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        alertify.error('Please login again.');
        return;
      }
      const params = { page: 1, limit: 10000 };
      Object.entries(filters).forEach(([k, v]) => {
        if (k !== 'page' && k !== 'limit' && v != null && v !== '') params[k] = v;
      });
      if (rangeForwarded.startDate) params.forwardedDateFrom = format(rangeForwarded.startDate, 'yyyy-MM-dd');
      if (rangeForwarded.endDate) params.forwardedDateTo = format(rangeForwarded.endDate, 'yyyy-MM-dd');
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/accountant/forwarded-report`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data?.data?.doDocuments;
      if (!res.data?.success || !Array.isArray(list) || list.length === 0) {
        alertify.error('No data to export');
        return;
      }
      handleExportCSV(list, signedByName);
      alertify.success(`Exported ${list.length} rows`);
    } catch (err) {
      console.error(err);
      alertify.error(err.response?.data?.message || 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCSVClick = () => {
    if (hasActiveFilters && doDocuments.length === 0) {
      alertify.error('No data to export');
      return;
    }
    setESignName('');
    setShowESignModal(true);
  };

  const handleESignConfirm = () => {
    const name = (eSignName || '').trim();
    if (!name) {
      alertify.error('Please enter your name for E-Sign');
      return;
    }
    fetchForExport(name);
  };

  const totalPages = Math.max(1, pagination.totalPages);
  const currentPage = pagination.currentPage || 1;
  const totalItems = pagination.totalItems || 0;
  const startIndex = (currentPage - 1) * (pagination.itemsPerPage || ITEMS_PER_PAGE);

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
    () =>
      filters.cmtEmpId
        ? cmtUsers.find((u) => (u.empId || u._id) === filters.cmtEmpId)
        : null,
    [cmtUsers, filters.cmtEmpId]
  );

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRangeForwarded({ startDate: null, endDate: null, key: 'selection' });
    setFilters({
      page: 1,
      limit: ITEMS_PER_PAGE,
      cmtEmpId: '',
      search: '',
    });
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setFilters((prev) => ({ ...prev, page }));
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

  const hasActiveFilters =
    filters.cmtEmpId ||
    filters.search ||
    (rangeForwarded.startDate && rangeForwarded.endDate);

  if (loading && doDocuments.length === 0) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading Final Charges report...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Top Section - same layout as Trucker Report */}
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        {/* Row 1: Stats & Actions */}
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {statistics.total ?? 0}
              </div>
              <span className="text-gray-700 font-semibold">Total</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {doDocuments.length}
              </div>
              <span className="text-gray-700 font-semibold">This Page</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full xl:w-auto xl:min-w-[200px]">
            <button
              type="button"
              onClick={handleExportCSVClick}
              disabled={(hasActiveFilters && doDocuments.length === 0) || exportLoading}
              className="flex items-center justify-center gap-2 px-4 h-[45px] bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full"
              title={hasActiveFilters ? 'Export filtered data' : 'Export report (E-Sign required)'}
            >
              {exportLoading ? 'Exporting...' : <><FaDownload size={18} /> Export CSV</>}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center justify-center gap-2 px-4 h-[45px] border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium w-full"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Search → Accountant → CMT → Date Range (like Trucker Report) */}
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full flex-wrap">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="Search (DO ID, shipper, carrier)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
              />
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="shrink-0 flex items-center justify-center gap-2 px-5 h-[45px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              title="Search"
            >
              <Search size={18} />
              Search
            </button>
            <div className="relative w-full sm:w-[280px] shrink-0" ref={cmtFilterRef}>
              <button
                type="button"
                onClick={() => setShowCmtFilter((v) => !v)}
                className="w-full h-[45px] px-4 py-2 border border-gray-200 rounded-xl bg-white hover:border-gray-300 flex items-center gap-2 text-gray-700 font-medium text-left"
              >
                <User size={18} className="text-gray-500 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {selectedCmtUser ? (selectedCmtUser.employeeName || selectedCmtUser.empName || selectedCmtUser.empId || 'CMT User') : 'All CMT Users'}
                </span>
                <ChevronDown size={16} className="text-gray-400 shrink-0" />
              </button>
              {showCmtFilter && (
                <div className="absolute z-50 left-0 mt-2 w-full min-w-[260px] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <input
                      type="text"
                      placeholder="Search CMT user..."
                      value={cmtFilterSearch}
                      onChange={(e) => setCmtFilterSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 placeholder-gray-400"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    <button
                      type="button"
                      onClick={() => { updateFilter('cmtEmpId', ''); setShowCmtFilter(false); setCmtFilterSearch(''); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium ${!filters.cmtEmpId ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      All CMT Users
                    </button>
                    {cmtUsersLoading ? (
                      <div className="px-4 py-4 text-sm text-gray-500 text-center">Loading...</div>
                    ) : (
                      filteredCmtUsers.map((u) => {
                        const id = u.empId || u._id;
                        const name = u.employeeName || u.empName || u.aliasName || id || '—';
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => { updateFilter('cmtEmpId', id); setShowCmtFilter(false); setCmtFilterSearch(''); }}
                            className={`w-full text-left px-4 py-2.5 text-sm ${filters.cmtEmpId === id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            <span className="block truncate">{name}</span>
                            {id && <span className="block text-xs text-gray-500 mt-0.5">ID: {id}</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="relative w-full sm:w-[300px] shrink-0" ref={dateRangeDropdownRef}>
              <button
                type="button"
                onClick={() => setShowPresetMenu((v) => !v)}
                className="w-full text-left px-4 h-[52px] border border-gray-200 rounded-xl bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors text-base"
              >
                <span className={!rangeForwarded.startDate || !rangeForwarded.endDate ? 'text-gray-800' : 'text-gray-800'}>
                  {rangeForwarded.startDate && rangeForwarded.endDate
                    ? `${format(rangeForwarded.startDate, 'MMM dd, yyyy')} - ${format(rangeForwarded.endDate, 'MMM dd, yyyy')}`
                    : 'Select Date Range'}
                </span>
                <span className="ml-3 text-gray-400 text-lg">▼</span>
              </button>
              {showPresetMenu && (
                <div className="absolute z-[100] mt-2 w-full min-w-[260px] rounded-xl border border-gray-100 bg-white shadow-lg py-2 right-0 text-base">
                  <button
                    type="button"
                    onClick={() => { setRangeForwarded({ startDate: null, endDate: null, key: 'selection' }); setShowPresetMenu(false); }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-600"
                  >
                    Clear Filter
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  {Object.keys(presets).map((lbl) => (
                    <button
                      type="button"
                      key={lbl}
                      onClick={() => applyPreset(lbl)}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700"
                    >
                      {lbl}
                    </button>
                  ))}
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={() => { setShowPresetMenu(false); setShowCustomRange(true); }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700"
                  >
                    Custom Range
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Date Range modal (forwarded date) */}
      {showCustomRange && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCustomRange(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="scale-110 origin-top" style={{ minWidth: 520 }}>
              <DateRange
                ranges={[rangeForwarded.startDate && rangeForwarded.endDate ? rangeForwarded : { startDate: new Date(), endDate: new Date(), key: 'selection' }]}
                onChange={handleForwardedDateChange}
                moveRangeOnFirstSelection={false}
                months={2}
                direction="horizontal"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => { setRangeForwarded({ startDate: null, endDate: null, key: 'selection' }); setShowCustomRange(false); }}
                className="px-5 py-2.5 border rounded-xl hover:bg-gray-50 text-base font-medium"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowCustomRange(false)}
                className="px-5 py-2.5 border rounded-xl hover:bg-gray-50 text-base font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { if (rangeForwarded.startDate && rangeForwarded.endDate) setShowCustomRange(false); }}
                className={`px-5 py-2.5 rounded-xl text-base font-medium ${rangeForwarded.startDate && rangeForwarded.endDate ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                disabled={!rangeForwarded.startDate || !rangeForwarded.endDate}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {doDocuments.length === 0 && !loading ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {hasActiveFilters ? 'No DOs match the current filters' : 'No DOs forwarded to accountant yet'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Load No</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Forwarded Date</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">CMT Employee</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Carrier</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Container No</th>
                  <th className="text-center py-4 px-4 text-gray-800 font-medium text-base">Action</th>
                </tr>
              </thead>
              <tbody>
                {doDocuments.map((doc) => {
                  const forwardedAt = doc.forwardedToAccountant?.forwardedAt;
                  const cmtForwardedBy = doc.forwardedToAccountant?.forwardedBy;
                  const containerNo = doc.loadReference?.containerNo || doc.containerNo || (doc.customers?.[0]?.containerNo) || '—';
                  const orderForModal = {
                    id: doc._id,
                    doId: doc.empId || `DO-${String(doc._id || '').slice(-6)}`,
                    loadNo: doc.loadReference?.loadNo || '—',
                    billTo: doc.shipperId?.compName || 'N/A',
                    raw: doc,
                  };
                  return (
                    <tr key={doc._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-800">{doc.loadNo || doc.loadReference?.loadNo || '—'}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {forwardedAt ? format(new Date(forwardedAt), 'MMM dd, yyyy HH:mm') : '—'}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {cmtForwardedBy?.employeeName || cmtForwardedBy?.empId || '—'}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {doc.carrierId?.compName || '—'}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {containerNo}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setViewingOrder(orderForModal)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          <Eye size={14} /> View
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

      {totalItems > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-4 mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(startIndex + doDocuments.length, totalItems)} of {totalItems}
            {filters.search && ` (searching: "${filters.search}")`}
          </div>
          <div className="flex gap-1 items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <ChevronLeft size={18} /> Previous
            </button>
            <div className="flex items-center gap-1 mx-4">
              {getPaginationPages().map((page, index) =>
                page === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                      currentPage === page ? 'bg-white border border-black shadow-sm text-black' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Next <ChevronRight size={18} />
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
        cmtEmpId={viewingOrder?.raw?.assignedToCMT?.empId || viewingOrder?.raw?.accountantApproval?.assignedTo?.empId || ''}
        onForwardSuccess={() => fetchData()}
        reportView={true}
      />
    </div>
  );
}
