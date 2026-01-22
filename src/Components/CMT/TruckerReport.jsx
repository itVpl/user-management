import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload, FaEye, FaFileAlt } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, Eye, Search, BarChart3, ChevronDown } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import API_CONFIG from '../../config/api.js';
import DateRangeSelector from '../HRDashboard/DateRangeSelector';
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
  const [searchTerm, setSearchTerm] = useState(''); // Input value (what user types)
  const [activeSearchTerm, setActiveSearchTerm] = useState(''); // Active search term (what's actually being searched)
  const [searchFilter, setSearchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  // Created By filters - using API parameters
  const [createdByEmpId, setCreatedByEmpId] = useState('');
  const [createdByEmployeeName, setCreatedByEmployeeName] = useState('');
  const [createdByDepartment, setCreatedByDepartment] = useState('');
  const [createdBySearch, setCreatedBySearch] = useState('');
  const [isCreatedByDropdownOpen, setIsCreatedByDropdownOpen] = useState(false);
  const [cmtUsers, setCmtUsers] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  const currentPage = pagination.currentPage;
  const itemsPerPage = pagination.itemsPerPage || 15;

  useEffect(() => {
    fetchCmtUsers();
  }, []);

  // Build search parameters for API
  const buildSearchParams = useCallback(() => {
    const params = {
      page: currentPage,
      limit: itemsPerPage,
      forceRefresh: false
    };

    // Handle search term based on searchFilter (use activeSearchTerm instead of searchTerm)
    const searchTermTrimmed = activeSearchTerm.trim();
    
    if (searchTermTrimmed) {
      // Map searchFilter to API parameters
      if (searchFilter === 'mc_dot') {
        // Use individual field filter for MC/DOT
        params.mcDotNo = searchTermTrimmed;
      } else if (searchFilter === 'all') {
        // Use general search (searches across multiple fields)
        params.search = searchTermTrimmed;
      } else {
        // For 'state' and 'city', use general search (API doesn't have specific filters for these)
        // We'll do client-side filtering for state/city after fetching
        params.search = searchTermTrimmed;
      }
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      params.status = statusFilter;
    }

    // Date range filters
    if (dateRange.startDate) {
      params.createdFrom = dateRange.startDate instanceof Date 
        ? dateRange.startDate.toISOString().split('T')[0]
        : dateRange.startDate;
    }
    if (dateRange.endDate) {
      params.createdTo = dateRange.endDate instanceof Date 
        ? dateRange.endDate.toISOString().split('T')[0]
        : dateRange.endDate;
    }

    // Created By filters
    if (createdByEmpId && createdByEmpId.trim()) {
      params.createdByEmpId = createdByEmpId.trim();
    }
    if (createdByEmployeeName && createdByEmployeeName.trim()) {
      params.createdByEmployeeName = createdByEmployeeName.trim();
    }
    if (createdByDepartment && createdByDepartment.trim()) {
      params.createdByDepartment = createdByDepartment.trim();
    }

    return params;
  }, [currentPage, itemsPerPage, activeSearchTerm, searchFilter, statusFilter, dateRange.startDate, dateRange.endDate, createdByEmpId, createdByEmployeeName, createdByDepartment]);

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

  // Close Created By dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCreatedByDropdownOpen && !event.target.closest('.created-by-dropdown-container')) {
        setIsCreatedByDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCreatedByDropdownOpen]);

  // Filter and Sort CMT Users for Created By Dropdown
  const filteredCreatedByUsers = useMemo(() => {
    let users = [...cmtUsers];
    // Sort alphabetically
    users.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''));
    
    // Filter by search term
    if (createdBySearch.trim()) {
      users = users.filter(user => 
        (user.employeeName?.toLowerCase() || '').includes(createdBySearch.toLowerCase())
      );
    }
    return users;
  }, [cmtUsers, createdBySearch]);

  // Reset to first page when filters change (but not when searchTerm changes - only when activeSearchTerm changes)
  useEffect(() => {
    if (activeSearchTerm || searchFilter !== 'all' || statusFilter !== 'all' || dateRange.startDate || createdByEmpId || createdByEmployeeName || createdByDepartment) {
      dispatch(setCurrentPage(1));
    }
  }, [activeSearchTerm, searchFilter, statusFilter, dateRange.startDate, dateRange.endDate, createdByEmpId, createdByEmployeeName, createdByDepartment, dispatch]);

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

  const fetchCmtUsers = async () => {
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/CMT`);
      if (res.data) {
          const employees = res.data.employees || res.data.data || (Array.isArray(res.data) ? res.data : []);
          setCmtUsers(employees);
      }
    } catch (err) {
      console.error('Error fetching CMT users:', err);
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

  const handleExportCSV = () => {
    if (filteredTruckers.length === 0) {
      alertify.error('No data to export');
      return;
    }

    const headers = ["Company Name", "MC/DOT No", "Email", "Phone", "City", "State", "Status", "Created Date", "Added By"];
    
    // Map data to rows, ensuring each value is wrapped in double quotes
    const rows = filteredTruckers.map(trucker => [
      `"${trucker.compName || 'N/A'}"`,
      `"${trucker.mc_dot_no || 'N/A'}"`,
      `"${trucker.email || 'N/A'}"`,
      `"${trucker.phoneNo || 'N/A'}"`,
      `"${trucker.city || 'N/A'}"`,
      `"${trucker.state || 'N/A'}"`,
      `"${trucker.status || 'N/A'}"`,
      `"${new Date(trucker.createdAt).toLocaleDateString()}"`,
      `"${trucker.addedBy?.employeeName || 'System'}"`
    ]);

    // Join headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Truckers_Report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------- CLIENT-SIDE FILTERING (only for fields not supported by API) --------
  // Note: Most filtering is done server-side. This only handles:
  // State/City search when searchFilter is 'state' or 'city' (API search doesn't include these fields)
  const filteredTruckers = useMemo(() => {
    let result = [...(truckers || [])];
    const term = activeSearchTerm.trim().toLowerCase();

    // State/City search (client-side only - API search doesn't include these fields)
    if (term && (searchFilter === 'state' || searchFilter === 'city')) {
      result = result.filter(trucker => {
        const state = trucker.state?.toLowerCase() || '';
        const city = trucker.city?.toLowerCase() || '';
        
        if (searchFilter === 'state') {
          return state.startsWith(term) || state === term;
        } else if (searchFilter === 'city') {
          return city.includes(term);
        }
        return true;
      });
    }

    return result;
  }, [truckers, activeSearchTerm, searchFilter]);

  // -------- PAGINATION (server-side pagination with server-side filtering) --------
  const totalPages = pagination.totalPages || 1;
  const currentTruckers = filteredTruckers; // Server-side filtered, with optional client-side filters applied

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
      <div className="p-6">
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

  return (
    <div className="p-6">
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
      {/* Stats Cards */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div
            className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Truck className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Truckers</p>
                <p className="text-xl font-bold text-gray-800">{statistics.totalTruckers}</p>
              </div>
            </div>
          </div>

          

         
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-4">
          <div className="relative text-md">
            <DateRangeSelector dateRange={dateRange} setDateRange={setDateRange} />
          </div>
          <div className="relative created-by-dropdown-container">
            <button
              onClick={() => setIsCreatedByDropdownOpen(!isCreatedByDropdownOpen)}
              className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg bg-white w-48 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            >
              <span className="truncate text-md text-gray-700">
                {createdByEmpId 
                  ? cmtUsers.find(u => (u.empId || u._id) === createdByEmpId)?.employeeName 
                  : createdByEmployeeName
                  ? createdByEmployeeName
                  : createdByDepartment
                  ? `Dept: ${createdByDepartment}`
                  : 'Created By'}
              </span>
              <ChevronDown 
                size={16} 
                className={`text-gray-500 transition-transform duration-200 ${isCreatedByDropdownOpen ? 'transform rotate-180' : ''}`} 
              />
            </button>

            {isCreatedByDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>
                  {`
                    .created-by-dropdown-container div::-webkit-scrollbar {
                      display: none;
                    }
                  `}
                </style>
                
                {/* Search Input */}
                <div className="sticky top-0 bg-white p-2 border-b border-gray-100 z-10">
                  <div className="relative">
                    <input
                      type="text"
                      value={createdBySearch}
                      onChange={(e) => setCreatedBySearch(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setCreatedByEmpId('');
                    setCreatedByEmployeeName('');
                    setCreatedByDepartment('');
                    setCreatedBySearch('');
                    setIsCreatedByDropdownOpen(false);
                  }}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${!createdByEmpId && !createdByEmployeeName && !createdByDepartment ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
                >
                  Created All
                </div>
                {filteredCreatedByUsers.map((user) => (
                  <div
                    key={user._id || user.empId}
                    onClick={() => {
                      setCreatedByEmpId(user.empId || user._id);
                      setCreatedByEmployeeName(''); // Clear name filter when selecting by ID
                      setCreatedByDepartment(''); // Clear department filter when selecting by ID
                      setCreatedBySearch('');
                      setIsCreatedByDropdownOpen(false);
                    }}
                    className={`px-4 py-2 text-md cursor-pointer hover:bg-blue-50 transition-colors ${createdByEmpId === (user.empId || user._id) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
                  >
                    {user.employeeName}
                  </div>
                ))}
                {filteredCreatedByUsers.length === 0 && (
                   <div className="px-4 py-3 text-gray-500 text-center text-xs">
                     No users found
                   </div>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <select
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Fields</option>
              <option value="mc_dot">MC/DOT No</option>
              <option value="state">State</option>
              <option value="city">City</option>
            </select>
          </div>
          <div className="relative flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={`Search by ${searchFilter === 'all' ? 'all fields' : searchFilter === 'mc_dot' ? 'MC/DOT No' : searchFilter}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm"
              title="Search"
            >
              <Search size={16} />
              Search
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={filteredTruckers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to CSV"
          >
            <FaDownload size={16} />Export CSV
          </button>
        </div>
      </div>

      {/* Table with Sticky Header + Scroll */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="relative max-h-[70vh] overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Trucker ID</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Company Name</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">MC/DOT No</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Email</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Phone</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Created</th>
              </tr>
            </thead>
            <tbody>
              {currentTruckers.map((trucker, index) => (
                <tr key={trucker.userId} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{trucker.userId?.slice(-6) || 'N/A'}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-medium text-gray-700">{trucker.compName}</p>
                      <p className="text-sm text-gray-600">{trucker.city}, {trucker.state}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-mono text-sm text-gray-600">{trucker.mc_dot_no}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-sm text-gray-700">{trucker.email}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-sm text-gray-700">{trucker.phoneNo}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusColor(trucker.status)}`}>
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
                  <td className="py-2 px-3">
                    <div>
                      <p className="text-sm text-gray-800">{new Date(trucker.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">by {trucker.addedBy?.employeeName || 'System'}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTruckers.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No truckers found matching your search' : 'No truckers found'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Truckers will appear here once they register'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredTruckers.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total truckers)
            {searchTerm && ` (${filteredTruckers.length} filtered on this page)`}
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-1">
              {/* Always show first page if not near the beginning */}
              {currentPage > 4 && pagination.totalPages > 7 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    1
                  </button>
                  {currentPage > 5 && (
                    <span className="px-2 text-gray-500">...</span>
                  )}
                </>
              )}

              {/* Show page numbers around current page */}
              {(() => {
                const pages = [];
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(pagination.totalPages, currentPage + 2);

                // Adjust if we're near the beginning
                if (currentPage <= 3) {
                  startPage = 1;
                  endPage = Math.min(5, pagination.totalPages);
                }

                // Adjust if we're near the end
                if (currentPage >= pagination.totalPages - 2) {
                  startPage = Math.max(1, pagination.totalPages - 4);
                  endPage = pagination.totalPages;
                }

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(i);
                }

                return pages.map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                ));
              })()}

              {/* Always show last page if not near the end */}
              {currentPage < pagination.totalPages - 3 && pagination.totalPages > 7 && (
                <>
                  {currentPage < pagination.totalPages - 4 && (
                    <span className="px-2 text-gray-500">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    {pagination.totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
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
