import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, MapPin, Truck, Calendar, DollarSign, Search, Package, TrendingUp, Eye, X, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';

export default function AssignedRateRequest() {
  const [assignments, setAssignments] = useState([]);
  const [overallStatistics, setOverallStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cmtUsers, setCmtUsers] = useState([]);
  
  // Date range state - default to Today
  const [range, setRange] = useState({
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
  });
  const [dateFilterApplied, setDateFilterApplied] = useState(true);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);

  // CMT User filter
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [cmtUserSearch, setCmtUserSearch] = useState('');
  const [isCmtDropdownOpen, setIsCmtDropdownOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showESignModal, setShowESignModal] = useState(false);
  const [eSignName, setESignName] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const dateRangeDropdownRef = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Presets
  const presets = {
    'Today': [new Date(), new Date()],
    'Yesterday': [addDays(new Date(), -1), addDays(new Date(), -1)],
    'Last 7 Days': [addDays(new Date(), -6), new Date()],
    'Last 30 Days': [addDays(new Date(), -29), new Date()],
    'This Month': [new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)],
    'Last Month': [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    new Date(new Date().getFullYear(), new Date().getMonth(), 0)],
  };
  const applyPreset = (label) => {
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setDateFilterApplied(true);
    setShowPresetMenu(false);
  };
  const ymd = (d) => d ? format(d, 'yyyy-MM-dd') : null;

  // Fetch CMT users
  const fetchCmtUsers = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/CMT`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const employees = res.data?.employees || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCmtUsers(employees);
    } catch (err) {
      console.error('Error fetching CMT users:', err);
      alertify.error('Failed to load CMT users');
    }
  };

  // Fetch assignments data
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      const params = {};
      if (dateFilterApplied && range.startDate && range.endDate) {
        params.startDate = ymd(range.startDate);
        params.endDate = ymd(range.endDate);
      }
      if (selectedEmpId && selectedEmpId.trim()) {
        params.empId = selectedEmpId.trim();
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/cmt-assignments/loads-with-bid-status`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          params
        }
      );

      if (response.data?.success) {
        const responseData = response.data.data;
        
        // Handle new API structure: single object with cmtUser, loads, statistics
        if (responseData?.loads && Array.isArray(responseData.loads)) {
          // Transform single CMT user response to array format for consistency
          setAssignments([{
            cmtUser: responseData.cmtUser,
            loads: responseData.loads,
            statistics: responseData.statistics
          }]);
          setOverallStatistics(responseData.statistics || null);
        } 
        // Handle old API structure: array of assignments
        else if (responseData?.assignments && Array.isArray(responseData.assignments)) {
          setAssignments(responseData.assignments);
          setOverallStatistics(responseData.overallStatistics || null);
        } 
        else {
          setAssignments([]);
          setOverallStatistics(null);
        }
      } else {
        alertify.error('Failed to load assignments');
        setAssignments([]);
        setOverallStatistics(null);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      alertify.error(error.response?.data?.message || 'Failed to fetch assignments');
      setAssignments([]);
      setOverallStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCmtUsers();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [dateFilterApplied, range.startDate, range.endDate, selectedEmpId]);

  // Close CMT dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCmtDropdownOpen && !event.target.closest('.cmt-dropdown-container')) {
        setIsCmtDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCmtDropdownOpen]);

  // Filter CMT users based on search
  const filteredCmtUsers = useMemo(() => {
    let users = [...cmtUsers];
    users.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''));
    if (cmtUserSearch.trim()) {
      users = users.filter(user => 
        (user.employeeName?.toLowerCase() || '').includes(cmtUserSearch.toLowerCase()) ||
        (user.empId?.toLowerCase() || '').includes(cmtUserSearch.toLowerCase())
      );
    }
    return users;
  }, [cmtUsers, cmtUserSearch]);

  // Flatten loads from all assignments for table display
  const allLoads = useMemo(() => {
    const loads = [];
    assignments.forEach(assignment => {
      if (assignment.loads && Array.isArray(assignment.loads)) {
        assignment.loads.forEach(load => {
          loads.push({
            ...load,
            cmtUser: assignment.cmtUser,
            statistics: assignment.statistics
          });
        });
      }
    });
    return loads;
  }, [assignments]);

  // Calculate total CMT users from assignments
  const totalCMTUsers = useMemo(() => {
    const uniqueCMTUsers = new Set();
    assignments.forEach(assignment => {
      if (assignment.cmtUser?.empId) {
        uniqueCMTUsers.add(assignment.cmtUser.empId);
      }
    });
    return uniqueCMTUsers.size || overallStatistics?.totalCMTUsers || 0;
  }, [assignments, overallStatistics]);

  // Pagination calculations
  const totalPages = Math.ceil(allLoads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLoads = allLoads.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilterApplied, selectedEmpId]);

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

  const hasAnyFilter = dateFilterApplied || !!selectedEmpId;

  // Export to Excel (CSV) with E-Sign
  const getOriginText = (load) => {
    const origin = load.loadDetails?.origin;
    if (!origin) return 'N/A';
    const parts = [origin.city, origin.state, origin.zip].filter(Boolean);
    return parts.length ? parts.join(', ') : (origin.addressLine1 || 'N/A');
  };
  const getDestinationText = (load) => {
    const dest = load.loadDetails?.destination;
    if (!dest) return 'N/A';
    const parts = [dest.city, dest.state, dest.zip].filter(Boolean);
    return parts.length ? parts.join(', ') : (dest.addressLine1 || 'N/A');
  };

  // Build bid status for Excel: only Total Rate and Created per bid
  const getBidsDetailForExport = (load) => {
    const bids = load.bidStatus?.bids;
    if (!Array.isArray(bids) || bids.length === 0) return '';
    return bids.map((bid) => {
      const total = bid.totalrates != null ? `$${Number(bid.totalrates).toLocaleString()}` : 'N/A';
      const created = bid.createdAt
        ? format(new Date(bid.createdAt), 'MMM dd, yyyy HH:mm')
        : 'N/A';
      return `Total: ${total}, Created: ${created}`;
    }).join('; ');
  };

  const handleExportCSV = (dataToExport, signedByName = '') => {
    if (!dataToExport || dataToExport.length === 0) {
      alertify.error('No data to export');
      return;
    }
    const headers = ['Load ID', 'Assigned CMT', 'CMT Emp ID', 'Origin', 'Destination', 'Load Type', 'Agent Name', 'Created Date', 'Bid Count', 'Has Bid', 'Bids Detail'];
    const rows = dataToExport.map((load) => {
      const cmtName = load.cmtUser?.empName || load.assignedCMTUser?.empName || 'N/A';
      const cmtId = load.cmtUser?.empId || load.assignedCMTUser?.empId || 'N/A';
      const agentName = load.createdBy?.createdBySalesUser?.empName || 'N/A';
      const bidCount = load.bidStatus?.bidCount ?? 0;
      const hasBid = load.bidStatus?.hasBid ? 'Yes' : 'No';
      const filterDate = load.assignedAt ?? load.assignedCMTUser?.assignedAt ?? load.createdAt ?? load.createdDate;
      const createdDateStr = filterDate ? format(new Date(filterDate), 'MMM dd, yyyy') : 'N/A';
      const bidsDetail = getBidsDetailForExport(load);
      return [
        `"${(load.loadId || 'N/A').toString().replace(/"/g, '""')}"`,
        `"${(cmtName || '').toString().replace(/"/g, '""')}"`,
        `"${(cmtId || '').toString().replace(/"/g, '""')}"`,
        `"${(getOriginText(load) || '').replace(/"/g, '""')}"`,
        `"${(getDestinationText(load) || '').replace(/"/g, '""')}"`,
        `"${(load.loadDetails?.loadType || 'N/A').toString().replace(/"/g, '""')}"`,
        `"${(agentName || '').toString().replace(/"/g, '""')}"`,
        `"${createdDateStr}"`,
        `"${bidCount}"`,
        `"${hasBid}"`,
        `"${(bidsDetail || '').replace(/"/g, '""')}"`
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
    link.setAttribute('download', 'Assigned_Rate_Request_Report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSVClick = () => {
    if (hasAnyFilter && allLoads.length === 0) {
      alertify.error('No data to export');
      return;
    }
    setESignName('');
    setShowESignModal(true);
  };

  const fetchAllAndExport = async (signedByName) => {
    setExportLoading(true);
    setShowESignModal(false);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/cmt-assignments/loads-with-bid-status`, {
        params: { limit: 10000 },
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.data;
      let list = [];
      if (data?.loads && Array.isArray(data.loads)) {
        list = data.loads.map((l) => ({ ...l, cmtUser: data.cmtUser }));
      } else if (data?.assignments && Array.isArray(data.assignments)) {
        data.assignments.forEach((a) => {
          if (a.loads) a.loads.forEach((l) => list.push({ ...l, cmtUser: a.cmtUser }));
        });
      }
      if (list.length === 0) {
        alertify.error('No data to export');
        return;
      }
      handleExportCSV(list, signedByName);
      alertify.success(`Exported ${list.length} loads`);
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
    if (!hasAnyFilter) {
      fetchAllAndExport(name);
    } else {
      handleExportCSV(allLoads, name);
    }
  };

  // Handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination page numbers (TruckerReport style)
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

  const totalItems = allLoads.length;
  const showLoadingOverlay = loading && assignments.length > 0;

  if (loading && assignments.length === 0) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assigned rate requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
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

      {/* Top Section - same as TruckerReport */}
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {overallStatistics?.totalLoads ?? 0}
              </div>
              <span className="text-gray-700 font-semibold">Total Loads</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {currentLoads.length}
              </div>
              <span className="text-gray-700 font-semibold">This Page</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full xl:w-auto xl:min-w-[280px]">
            <div className="relative cmt-dropdown-container">
              <button
                onClick={() => setIsCmtDropdownOpen(!isCmtDropdownOpen)}
                className="w-full px-4 h-[45px] border border-gray-200 rounded-lg bg-white text-left flex items-center justify-between text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              >
                <span className="truncate">
                  {selectedEmpId ? cmtUsers.find(u => u.empId === selectedEmpId)?.employeeName || selectedEmpId : 'All CMT Users'}
                </span>
                <ChevronDown size={16} className={`text-gray-500 shrink-0 ${isCmtDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isCmtDropdownOpen && (
                <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                    <div className="relative">
                      <input
                        type="text"
                        value={cmtUserSearch}
                        onChange={(e) => setCmtUserSearch(e.target.value)}
                        placeholder="Search CMT user..."
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    </div>
                  </div>
                  <div
                    onClick={() => { setSelectedEmpId(''); setCmtUserSearch(''); setIsCmtDropdownOpen(false); }}
                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 ${!selectedEmpId ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
                  >
                    All CMT Users
                  </div>
                  {filteredCmtUsers.map((user) => (
                    <div
                      key={user._id || user.empId}
                      onClick={() => { setSelectedEmpId(user.empId); setCmtUserSearch(''); setIsCmtDropdownOpen(false); }}
                      className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 ${selectedEmpId === user.empId ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      {user.employeeName} ({user.empId})
                    </div>
                  ))}
                  {filteredCmtUsers.length === 0 && <div className="px-4 py-3 text-gray-500 text-center text-sm">No users found</div>}
                </div>
              )}
            </div>
            <button
              onClick={handleExportCSVClick}
              disabled={(hasAnyFilter && allLoads.length === 0) || exportLoading}
              className="flex items-center justify-center gap-2 px-4 h-[45px] bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full"
              title={hasAnyFilter ? 'Export filtered data' : 'Export all (E-Sign required)'}
            >
              {exportLoading ? 'Exporting...' : <><FaDownload size={18} /> Export to Excel</>}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full">
          <div className="relative w-full sm:w-[300px] shrink-0" ref={dateRangeDropdownRef}>
            <button
              type="button"
              onClick={() => setShowPresetMenu((v) => !v)}
              className="w-full text-left px-4 h-[52px] border border-gray-200 rounded-xl bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors text-base"
            >
              <span>
                {dateFilterApplied && range.startDate && range.endDate
                  ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                  : 'Select Date Range'}
              </span>
              <span className="ml-3 text-gray-400 text-lg">▼</span>
            </button>
            {showPresetMenu && (
              <div className="absolute z-[100] mt-2 w-full min-w-[260px] rounded-xl border border-gray-100 bg-white shadow-lg py-2 right-0 text-base">
                <button
                  type="button"
                  onClick={() => { setDateFilterApplied(false); setRange({ startDate: null, endDate: null, key: 'selection' }); setShowPresetMenu(false); }}
                  className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-600"
                >
                  Clear Filter
                </button>
                <div className="my-1 border-t border-gray-100" />
                {Object.keys(presets).map((lbl) => (
                  <button type="button" key={lbl} onClick={() => applyPreset(lbl)} className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700">{lbl}</button>
                ))}
                <div className="my-1 border-t border-gray-100" />
                <button type="button" onClick={() => { setShowPresetMenu(false); setShowCustomRange(true); }} className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700">Custom Range</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCustomRange && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCustomRange(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="scale-110 origin-top" style={{ minWidth: 520 }}>
              <DateRange
                ranges={[range.startDate && range.endDate ? range : { startDate: new Date(), endDate: new Date(), key: 'selection' }]}
                onChange={(item) => { if (item.selection?.startDate && item.selection?.endDate) setRange(item.selection); }}
                moveRangeOnFirstSelection={false}
                months={2}
                direction="horizontal"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => { setRange({ startDate: null, endDate: null, key: 'selection' }); setShowCustomRange(false); }} className="px-5 py-2.5 border rounded-xl hover:bg-gray-50 text-base font-medium">Clear</button>
              <button type="button" onClick={() => setShowCustomRange(false)} className="px-5 py-2.5 border rounded-xl hover:bg-gray-50 text-base font-medium">Cancel</button>
              <button type="button" onClick={() => { setDateFilterApplied(true); setShowCustomRange(false); }} className="px-5 py-2.5 rounded-xl text-base font-medium bg-blue-600 text-white hover:bg-blue-700">OK</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {allLoads.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">{dateFilterApplied || selectedEmpId ? 'No loads found matching your filters' : 'No assigned loads found'}</p>
              <p className="text-gray-400 text-sm">{dateFilterApplied || selectedEmpId ? 'Try adjusting your filters' : 'Loads assigned to CMT users will appear here'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Load ID</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Assigned CMT</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Origin</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Destination</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Load Type</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Agent Name</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Created Date</th>
                  <th className="text-center py-4 px-4 text-gray-800 font-medium text-base">Bid Count</th>
                  <th className="text-center py-4 px-4 text-gray-800 font-medium text-base">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentLoads.map((load) => {
                  const origin = load.loadDetails?.origin;
                  const destination = load.loadDetails?.destination;
                  const originText = origin ? `${origin.city || ''}${origin.state ? `, ${origin.state}` : ''}${origin.zip ? ` ${origin.zip}` : ''}`.trim() || origin.addressLine1 || 'N/A' : 'N/A';
                  const destinationText = destination ? `${destination.city || ''}${destination.state ? `, ${destination.state}` : ''}${destination.zip ? ` ${destination.zip}` : ''}`.trim() || destination.addressLine1 || 'N/A' : 'N/A';
                  const agentName = load.createdBy?.createdBySalesUser?.empName || 'N/A';
                  const bidCount = load.bidStatus?.bidCount || 0;
                  const hasBid = load.bidStatus?.hasBid || false;
                  // Same date field used by Date Range filter (backend typically filters on assignedAt/createdAt)
                  const filterDate = load.assignedAt ?? load.assignedCMTUser?.assignedAt ?? load.createdAt ?? load.createdDate;
                  const filterDateStr = filterDate
                    ? format(new Date(filterDate), 'MMM dd, yyyy')
                    : 'N/A';
                  return (
                    <tr key={load.loadId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4"><span className="text-sm text-gray-600 font-medium">{load.loadId?.slice(-8) || 'N/A'}</span></td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-800">{load.cmtUser?.empName || load.assignedCMTUser?.empName || 'N/A'}</span>
                        {(load.cmtUser?.empId || load.assignedCMTUser?.empId) && <p className="text-xs text-gray-500">{load.cmtUser?.empId || load.assignedCMTUser?.empId}</p>}
                      </td>
                      <td className="py-4 px-4"><span className="text-sm text-gray-700">{originText}</span></td>
                      <td className="py-4 px-4"><span className="text-sm text-gray-700">{destinationText}</span></td>
                      <td className="py-4 px-4"><span className="text-sm text-gray-700">{load.loadDetails?.loadType || 'N/A'}</span></td>
                      <td className="py-4 px-4"><span className="text-sm text-gray-700">{agentName}</span></td>
                      <td className="py-4 px-4"><span className="text-sm text-gray-700">{filterDateStr}</span></td>
                      <td className="py-4 px-4 text-center"><span className={`text-sm font-semibold ${hasBid ? 'text-green-600' : 'text-orange-600'}`}>{bidCount}</span></td>
                      <td className="py-4 px-4">
                        <button onClick={() => { setSelectedLoad(load); setShowLoadModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 mx-auto">
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

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Showing {totalItems === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} loads
          </div>
          <div className="flex gap-1 items-center">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
              <ChevronLeft size={18} /><span>Previous</span>
            </button>
            <div className="flex items-center gap-1 mx-4">
              {getPaginationPages().map((page, index) => (
                page === 'ellipsis' ? <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span> : (
                  <button key={page} onClick={() => handlePageChange(page)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${currentPage === page ? 'bg-white border border-black shadow-sm text-black' : 'text-gray-600 hover:bg-gray-50'}`}>{page}</button>
                )
              ))}
            </div>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
              <span>Next</span><ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {showESignModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">E-Sign for Export</h3>
            <p className="text-sm text-gray-600 mb-4">Enter your name to sign the report. It will be included in the exported file.</p>
            <input type="text" value={eSignName} onChange={(e) => setESignName(e.target.value)} placeholder="Your full name" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-gray-800 placeholder-gray-400 mb-4" onKeyDown={(e) => e.key === 'Enter' && handleESignConfirm()} />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowESignModal(false); setESignName(''); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
              <button type="button" onClick={handleESignConfirm} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">Sign & Export</button>
            </div>
          </div>
        </div>
      )}

      {/* Load Details Modal */}
      {showLoadModal && selectedLoad && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4" onClick={() => setShowLoadModal(false)}>
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Package className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Load Details</h2>
                    <p className="text-indigo-100">Assigned Rate Request</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowLoadModal(false);
                    setSelectedLoad(null);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Load Information */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="text-indigo-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Load Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Load ID</p>
                    <p className="font-medium text-gray-800">{selectedLoad.loadId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Load Number</p>
                    <p className="font-medium text-gray-800">{selectedLoad.loadNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Load Type</p>
                    <p className="font-medium text-gray-800">{selectedLoad.loadDetails?.loadType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vehicle Type</p>
                    <p className="font-medium text-gray-800">{selectedLoad.loadDetails?.vehicleType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Weight</p>
                    <p className="font-medium text-gray-800">{selectedLoad.loadDetails?.weight ? `${selectedLoad.loadDetails.weight.toLocaleString()} lbs` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Commodity</p>
                    <p className="font-medium text-gray-800">{selectedLoad.loadDetails?.commodity || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rate</p>
                    <p className="font-medium text-gray-800">${selectedLoad.loadDetails?.rate ? selectedLoad.loadDetails.rate.toLocaleString() : '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rate Type</p>
                    <p className="font-medium text-gray-800">{selectedLoad.loadDetails?.rateType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      selectedLoad.loadDetails?.status === 'Bidding' ? 'bg-blue-100 text-blue-700' :
                      selectedLoad.loadDetails?.status === 'Assigned' ? 'bg-green-100 text-green-700' :
                      selectedLoad.loadDetails?.status === 'Delivered' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedLoad.loadDetails?.status || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pickup Date</p>
                    <p className="font-medium text-gray-800">
                      {selectedLoad.loadDetails?.pickupDate 
                        ? new Date(selectedLoad.loadDetails.pickupDate).toLocaleString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Delivery Date</p>
                    <p className="font-medium text-gray-800">
                      {selectedLoad.loadDetails?.deliveryDate 
                        ? new Date(selectedLoad.loadDetails.deliveryDate).toLocaleString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assigned CMT User */}
              {selectedLoad.cmtUser && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="text-purple-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Assigned CMT User</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-purple-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Employee ID</p>
                        <p className="font-semibold text-gray-800">{selectedLoad.cmtUser.empId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Employee Name</p>
                        <p className="font-semibold text-gray-800">{selectedLoad.cmtUser.empName || 'N/A'}</p>
                      </div>
                      {selectedLoad.assignedCMTUser?.assignedAt && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Assigned At</p>
                          <p className="font-semibold text-gray-800">
                            {new Date(selectedLoad.assignedCMTUser.assignedAt).toLocaleString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Origin Information */}
              {selectedLoad.loadDetails?.origin && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="text-blue-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Origin</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-blue-200">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLoad.loadDetails.origin.addressLine1 && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.origin.addressLine1}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.origin.addressLine2 && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Address Line 2</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.origin.addressLine2}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.origin.city && (
                        <div>
                          <p className="text-sm text-gray-600">City</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.origin.city}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.origin.state && (
                        <div>
                          <p className="text-sm text-gray-600">State</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.origin.state}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.origin.zip && (
                        <div>
                          <p className="text-sm text-gray-600">ZIP Code</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.origin.zip}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.origin.weight && (
                        <div>
                          <p className="text-sm text-gray-600">Weight</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.origin.weight.toLocaleString()} lbs</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.origin.commodity && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Commodity</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.origin.commodity}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.origin.pickupDate && (
                        <div>
                          <p className="text-sm text-gray-600">Pickup Date</p>
                          <p className="font-semibold text-gray-800">
                            {new Date(selectedLoad.loadDetails.origin.pickupDate).toLocaleString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Destination Information */}
              {selectedLoad.loadDetails?.destination && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Destination</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-green-200">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLoad.loadDetails.destination.addressLine1 && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.destination.addressLine1}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.destination.addressLine2 && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Address Line 2</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.destination.addressLine2}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.destination.city && (
                        <div>
                          <p className="text-sm text-gray-600">City</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.destination.city}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.destination.state && (
                        <div>
                          <p className="text-sm text-gray-600">State</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.destination.state}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.destination.zip && (
                        <div>
                          <p className="text-sm text-gray-600">ZIP Code</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.destination.zip}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.destination.weight && (
                        <div>
                          <p className="text-sm text-gray-600">Weight</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.destination.weight.toLocaleString()} lbs</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.destination.commodity && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Commodity</p>
                          <p className="font-semibold text-gray-800">{selectedLoad.loadDetails.destination.commodity}</p>
                        </div>
                      )}
                      {selectedLoad.loadDetails.destination.deliveryDate && (
                        <div>
                          <p className="text-sm text-gray-600">Delivery Date</p>
                          <p className="font-semibold text-gray-800">
                            {new Date(selectedLoad.loadDetails.destination.deliveryDate).toLocaleString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bid Status */}
              {selectedLoad.bidStatus && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Bid Status</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-green-200">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Has Bid</p>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                          selectedLoad.bidStatus.hasBid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {selectedLoad.bidStatus.hasBid ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Bid Count</p>
                        <p className="font-semibold text-gray-800">{selectedLoad.bidStatus.bidCount || 0}</p>
                      </div>
                    </div>

                    {/* Bids List */}
                    {selectedLoad.bidStatus.bids && selectedLoad.bidStatus.bids.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Bids</h4>
                        <div className="space-y-3">
                          {selectedLoad.bidStatus.bids.map((bid, index) => (
                            <div key={bid.bidId || index} className="bg-gray-50 rounded-lg p-3 border border-green-200">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-gray-600">Rate</p>
                                  <p className="font-bold text-lg text-green-600">${bid.rate ? bid.rate.toLocaleString() : '0.00'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Total Rates</p>
                                  <p className="font-bold text-lg text-green-600">${bid.totalrates ? bid.totalrates.toLocaleString() : '0.00'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Status</p>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                    bid.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                    bid.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {bid.status || 'Pending'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Created At</p>
                                  <p className="font-medium text-gray-800">
                                    {bid.createdAt ? new Date(bid.createdAt).toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

