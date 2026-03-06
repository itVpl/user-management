import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload, FaEye, FaFileAlt } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Eye, Search, BarChart3, ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import API_CONFIG from '../../config/api.js';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  fetchTruckers, 
  setCurrentPage,
  selectTruckers,
  selectStatistics,
  selectPagination,
  selectLoading,
  selectError
} from '../../store/slices/truckerReportSlice';

export default function TruckerReport() {
  const dispatch = useAppDispatch();
  const truckers = useAppSelector(selectTruckers);
  const statistics = useAppSelector(selectStatistics);
  const pagination = useAppSelector(selectPagination);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);

  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedTrucker, setSelectedTrucker] = useState(null);
  const [reason, setReason] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [range, setRange] = useState({ startDate: null, endDate: null, key: 'selection' });
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [showESignModal, setShowESignModal] = useState(false);
  const [eSignName, setESignName] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [cmtUsers, setCmtUsers] = useState([]);
  const [cmtUsersLoading, setCmtUsersLoading] = useState(false);
  const [selectedCmtEmpId, setSelectedCmtEmpId] = useState('');
  const [showCmtFilter, setShowCmtFilter] = useState(false);
  const [cmtFilterSearch, setCmtFilterSearch] = useState('');
  const dateRangeDropdownRef = React.useRef(null);
  const cmtFilterRef = React.useRef(null);

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

  // Fetch CMT users from GET /api/v1/inhouseUser/department/CMT
  useEffect(() => {
    setCmtUsersLoading(true);
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/CMT`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    }).then((res) => {
      const list = res.data?.employees || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCmtUsers(Array.isArray(list) ? list : []);
    }).catch(() => setCmtUsers([])).finally(() => setCmtUsersLoading(false));
  }, []);

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

  const currentPage = pagination.currentPage;
  const itemsPerPage = 10;

  // API filters: page, limit, search, startDate, endDate, empId
  const buildSearchParams = useCallback(() => {
    const params = {
      page: currentPage,
      limit: itemsPerPage,
      forceRefresh: false
    };
    if (activeSearchTerm.trim()) params.search = activeSearchTerm.trim();
    if (range.startDate) params.startDate = format(range.startDate, 'yyyy-MM-dd');
    if (range.endDate) params.endDate = format(range.endDate, 'yyyy-MM-dd');
    if (selectedCmtEmpId && selectedCmtEmpId.trim()) params.empId = selectedCmtEmpId.trim();
    return params;
  }, [currentPage, itemsPerPage, activeSearchTerm, range.startDate, range.endDate, selectedCmtEmpId]);

  // Handle search button click
  const handleSearch = () => {
    setActiveSearchTerm(searchTerm);
    dispatch(setCurrentPage(1)); // Reset to first page when searching
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Fetch truckers when filters or page changes
  useEffect(() => {
    const searchParams = buildSearchParams();
    dispatch(fetchTruckers(searchParams));
  }, [dispatch, buildSearchParams]);

  // Show error messages
  useEffect(() => {
    if (error) {
      alertify.error(error);
    }
  }, [error]);


  // Reset to first page when filters change
  useEffect(() => {
    if (activeSearchTerm || range.startDate || range.endDate || selectedCmtEmpId) {
      dispatch(setCurrentPage(1));
    }
  }, [activeSearchTerm, range.startDate, range.endDate, selectedCmtEmpId, dispatch]);

  // Close date range preset menu on outside click
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

  // Close CMT filter dropdown on outside click
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

  const handleStatusUpdate = async (status) => {
    try {
      const { userId } = selectedTrucker || {};
      if (!userId) return;

      if (status === 'approved') {
        const response = await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/approval/accountant/${userId}`,
          { approvalReason: reason?.trim() || "Trucker report verified and approved" },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (response.data.success) {
          alertify.success('✅ Trucker report approved successfully!');
        }
      } else if (status === 'rejected') {
        const response = await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/approval/reject/${userId}`,
          { rejectionReason: reason?.trim() || "Trucker report verification failed", step: "accountant_rejection" },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (response.data.success) {
          alertify.error('❌ Trucker report rejected successfully!');
        }
      }
      setModalType(null);
      setReason('');
      setSelectedTrucker(null);
      setViewDoc(false);
      // Refresh current page data with current filters
      const searchParams = buildSearchParams();
      searchParams.forceRefresh = true;
      dispatch(fetchTruckers(searchParams));
    } catch (err) {
      console.error('Status update failed:', err);
      alertify.error(`❌ Error: ${err.response?.data?.message || err.message}`);
    }
  };


  // Helpers
  const statusColor = (status) => {
    if (!status) return 'bg-yellow-100 text-yellow-700';
    if (status === 'approved' || status === 'accountant_approved') return 'bg-green-100 text-green-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (status === 'active') return 'bg-blue-100 text-blue-700';
    if (status === 'inactive') return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
  };

  const handleDocumentPreview = (documentUrl, documentName) => {
    setSelectedDocument({ url: documentUrl, name: documentName });
  };

  const isImageFile = (fileType) => {
    return ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(fileType?.toUpperCase());
  };

  // dataToExport: when no filter = full list from API; when date/filter = filtered list
  const handleExportCSV = (dataToExport, signedByName = '') => {
    if (!dataToExport || dataToExport.length === 0) {
      alertify.error('No data to export');
      return;
    }

    const headers = ["Company Name", "MC/DOT No", "Email", "Phone", "City", "State", "Status", "Created Date", "Added By"];
    const createdStr = (t) => {
      const d = t?.createdAt ?? t?.created_at;
      return d ? new Date(d).toLocaleDateString() : 'N/A';
    };
    const rows = dataToExport.map(trucker => [
      `"${trucker.compName || 'N/A'}"`,
      `"${trucker.mc_dot_no || 'N/A'}"`,
      `"${trucker.email || 'N/A'}"`,
      `"${trucker.phoneNo || 'N/A'}"`,
      `"${trucker.city || 'N/A'}"`,
      `"${trucker.state || 'N/A'}"`,
      `"${trucker.status || 'N/A'}"`,
      `"${createdStr(trucker)}"`,
      `"${trucker.addedBy?.employeeName || 'System'}"`
    ]);

    let csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Append E-Sign line when signed
    if (signedByName && signedByName.trim()) {
      const signDate = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      csvContent += '\n\n"E-Sign","Signed By","Date"\n';
      csvContent += `"","${String(signedByName).replace(/"/g, '""')}","${signDate}"`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Truckers_Report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasAnyFilter = !!(activeSearchTerm.trim() || (range.startDate && range.endDate) || (selectedCmtEmpId && selectedCmtEmpId.trim()));

  const handleExportCSVClick = () => {
    if (hasAnyFilter && filteredTruckers.length === 0) {
      alertify.error('No data to export');
      return;
    }
    setESignName('');
    setShowESignModal(true);
  };

  const fetchAllTruckersAndExport = async (signedByName) => {
    setExportLoading(true);
    setShowESignModal(false);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const params = { page: 1, limit: 10000 };
      if (activeSearchTerm.trim()) params.search = activeSearchTerm.trim();
      if (range.startDate) params.startDate = format(range.startDate, 'yyyy-MM-dd');
      if (range.endDate) params.endDate = format(range.endDate, 'yyyy-MM-dd');
      if (selectedCmtEmpId && selectedCmtEmpId.trim()) params.empId = selectedCmtEmpId.trim();
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/truckers`, {
        params,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const list = res.data?.data || [];
      if (list.length === 0) {
        alertify.error('No data to export');
        return;
      }
      handleExportCSV(list, signedByName);
      alertify.success(`Exported ${list.length} truckers`);
    } catch (err) {
      alertify.error(err.response?.data?.message || err.message || 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const handleESignConfirm = () => {
    const name = (eSignName || '').trim();
    if (!name) {
      alertify.error('Please enter your name for E-Sign');
      return;
    }
    setShowESignModal(false);
    setESignName('');
    // Export uses current filters (search, startDate, endDate, empId) with high limit
    fetchAllTruckersAndExport(name);
  };

  // API returns filtered data; no client-side filtering
  const filteredTruckers = truckers || [];
  const totalPages = pagination.totalPages || 1;
  const currentTruckers = filteredTruckers;
  const totalItems = pagination.totalItems || 0;

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    dispatch(setCurrentPage(page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Format currency (reserved for any revenue cells later)
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  // Initial loading state (only when no truckers)
  if (loading && truckers.length === 0) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading trucker reports...</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading overlay for pagination (no blur)
  const showLoadingOverlay = loading && truckers.length > 0;

  if (previewImg) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden p-4">
          <img src={previewImg} alt="Document Preview" className="max-h-[80vh] rounded-xl shadow-lg" />
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute left-4 top-4 bg-white p-2 rounded-full shadow hover:bg-blue-100"
          >
            <FaArrowLeft />
          </button>
        </div>
      </div>
    );
  }

  if (modalType) {
    return (
      <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-[400px] relative flex flex-col items-center">
          <button className="absolute right-4 top-2 text-xl hover:text-red-500" onClick={() => setModalType(null)}>×</button>
          <textarea
            className="w-full border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg mb-4"
            rows={5}
            placeholder={`Type reason of ${modalType}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-semibold shadow hover:from-blue-700 hover:to-purple-700 transition"
            onClick={() => handleStatusUpdate(modalType === 'approval' ? 'approved' : 'rejected')}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  // Pagination page numbers (DeliveryOrder style)
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

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Loading overlay for pagination (no blur) */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold">Loading...</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Section - same as DeliveryOrder */}
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        {/* Row 1: Stats & Actions */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left: Stats Cards - same as DeliveryOrder */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {statistics.totalTruckers ?? 0}
              </div>
              <span className="text-gray-700 font-semibold">Total Truckers</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {currentTruckers.length}
              </div>
              <span className="text-gray-700 font-semibold">This Page</span>
            </div>
          </div>

          {/* Right: Export CSV */}
          <div className="flex flex-col gap-2 w-full xl:w-auto xl:min-w-[200px]">
            <button
              onClick={handleExportCSVClick}
              disabled={(hasAnyFilter && filteredTruckers.length === 0) || exportLoading}
              className="flex items-center justify-center gap-2 px-4 h-[45px] bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full"
              title={hasAnyFilter ? 'Export filtered data' : 'Export all truckers (E-Sign required)'}
            >
              {exportLoading ? 'Exporting...' : <><FaDownload size={18} /> Export CSV</>}
            </button>
          </div>
        </div>

        {/* Row 2: Search → CMT User → Date Range (last) */}
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full flex-wrap">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="Search (compName, MC/DOT, email)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
              />
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
            </div>
            <button
              onClick={handleSearch}
              className="shrink-0 flex items-center justify-center gap-2 px-5 h-[45px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              title="Search"
            >
              <Search size={18} />
              Search
            </button>
            {/* CMT User (empId) filter - just after Search */}
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
                      onClick={() => { setSelectedCmtEmpId(''); setShowCmtFilter(false); setCmtFilterSearch(''); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium ${!selectedCmtEmpId ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      All CMT Users
                    </button>
                    {cmtUsersLoading ? (
                      <div className="px-4 py-4 text-sm text-gray-500 text-center">Loading...</div>
                    ) : filteredCmtUsers.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-gray-500 text-center">No CMT user found</div>
                    ) : (
                      filteredCmtUsers.map((u) => {
                        const id = u.empId || u._id || '';
                        const name = u.employeeName || u.empName || u.aliasName || id || '—';
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => { setSelectedCmtEmpId(id); setShowCmtFilter(false); setCmtFilterSearch(''); }}
                            className={`w-full text-left px-4 py-2.5 text-sm ${selectedCmtEmpId === id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
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
            {/* Date Range - last */}
            <div className="relative w-full sm:w-[300px] shrink-0" ref={dateRangeDropdownRef}>
              <button
                type="button"
                onClick={() => setShowPresetMenu((v) => !v)}
                className="w-full text-left px-4 h-[52px] border border-gray-200 rounded-xl bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors text-base"
              >
                <span className={!range.startDate || !range.endDate ? 'text-gray-800' : 'text-gray-800'}>
                  {range.startDate && range.endDate
                    ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                    : 'Select Date Range'}
                </span>
                <span className="ml-3 text-gray-400 text-lg">▼</span>
              </button>
              {showPresetMenu && (
                <div className="absolute z-[100] mt-2 w-full min-w-[260px] rounded-xl border border-gray-100 bg-white shadow-lg py-2 right-0 text-base">
                  <button
                    type="button"
                    onClick={() => {
                      setRange({ startDate: null, endDate: null, key: 'selection' });
                      setShowPresetMenu(false);
                    }}
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

      {/* Custom Range Modal - larger calendar */}
      {showCustomRange && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCustomRange(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="scale-110 origin-top" style={{ minWidth: 520 }}>
              <DateRange
                ranges={[range.startDate && range.endDate ? range : { startDate: new Date(), endDate: new Date(), key: 'selection' }]}
                onChange={(item) => {
                  if (item.selection.startDate && item.selection.endDate) {
                    setRange(item.selection);
                  }
                }}
                moveRangeOnFirstSelection={false}
                months={2}
                direction="horizontal"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setRange({ startDate: null, endDate: null, key: 'selection' });
                  setShowCustomRange(false);
                }}
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
                onClick={() => {
                  if (range.startDate && range.endDate) {
                    setShowCustomRange(false);
                  }
                }}
                className={`px-5 py-2.5 rounded-xl text-base font-medium ${
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

      {/* Table - same as DeliveryOrder */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {filteredTruckers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {activeSearchTerm ? 'No truckers found matching your search' : 'No truckers found'}
              </p>
              <p className="text-gray-400 text-sm">
                {activeSearchTerm ? 'Try adjusting your search terms' : 'Truckers will appear here once they register'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Trucker ID</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Company Name</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">MC/DOT No</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Email</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Phone</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Status</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Created</th>
                </tr>
              </thead>
              <tbody>
                {currentTruckers.map((trucker) => (
                  <tr key={trucker.userId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600 font-medium">{trucker.userId?.slice(-6) || 'N/A'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{trucker.compName}</span>
                        <p className="text-sm text-gray-600">{trucker.city}, {trucker.state}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-800">{trucker.mc_dot_no}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-700">{trucker.email}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-700">{trucker.phoneNo}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(trucker.status)}`}>
                        {(trucker.status === 'approved' || trucker.status === 'accountant_approved') && <CheckCircle size={14} />}
                        {trucker.status === 'rejected' && <XCircle size={14} />}
                        {trucker.status === 'pending' && <Clock size={14} />}
                        {trucker.status === 'approved' ? 'Approved' :
                          trucker.status === 'accountant_approved' ? 'Accountant Approved' :
                          trucker.status === 'rejected' ? 'Rejected' :
                          trucker.status === 'pending' ? 'Pending' :
                          trucker.status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-sm text-gray-800">{new Date(trucker.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">by {trucker.addedBy?.employeeName || 'System'}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination - 10 per page; when date filter on = client-side pages */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Showing {totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} truckers
            {activeSearchTerm && ` (searching: "${activeSearchTerm}")`}
          </div>
          <div className="flex gap-1 items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <div className="flex items-center gap-1 mx-4">
              {getPaginationPages().map((page, index) => {
                if (page === 'ellipsis') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                  );
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                      currentPage === page
                        ? 'bg-white border border-black shadow-sm text-black'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <span>Next</span>
              <ChevronRight size={18} />
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

      {selectedDocument && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">{selectedDocument.name}</h3>
              <button
                onClick={() => setSelectedDocument(null)}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              {isImageFile(selectedDocument.url.split('.').pop()) ? (
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.name}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <FaFileAlt className="text-6xl text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Document preview not available</p>
                    <a
                      href={selectedDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                    >
                      Download Document
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
