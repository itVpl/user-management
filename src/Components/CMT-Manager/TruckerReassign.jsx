import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload, FaEye, FaFileAlt } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar as CalendarIcon, Eye, Search, BarChart3, UserCog, ChevronDown } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import API_CONFIG from '../../config/api.js';
import DateRangeSelector from '../HRDashboard/DateRangeSelector';

export default function TruckerReassign() {
  const [truckers, setTruckers] = useState([]);
  const [statistics, setStatistics] = useState({
    totalTruckers: 0,
    approvedTruckers: 0,
    rejectedTruckers: 0,
    pendingApproval: 0,
    totalLoads: 0,
    completedLoads: 0,
    pendingLoads: 0,
    totalRevenue: 0
  });
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedTrucker, setSelectedTrucker] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [createdBySearch, setCreatedBySearch] = useState('');
  const [isCreatedByDropdownOpen, setIsCreatedByDropdownOpen] = useState(false);
  const [cmtUsers, setCmtUsers] = useState([]);
  const [selectedCmtUser, setSelectedCmtUser] = useState('');
  const [cmtUserSearch, setCmtUserSearch] = useState('');
  const [isCmtDropdownOpen, setIsCmtDropdownOpen] = useState(false);
  // Default to All Time (no date filter)
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    fetchTruckerReports();
    fetchCmtUsers();
  }, []);

  // Close CMT dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCmtDropdownOpen && !event.target.closest('.cmt-dropdown-container')) {
        setIsCmtDropdownOpen(false);
      }
      if (isCreatedByDropdownOpen && !event.target.closest('.created-by-dropdown-container')) {
        setIsCreatedByDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCmtDropdownOpen, isCreatedByDropdownOpen]);

  // Filter CMT users based on search
  const filteredCmtUsers = useMemo(() => {
    if (!cmtUserSearch.trim()) return cmtUsers;
    return cmtUsers.filter(user => 
      (user.employeeName?.toLowerCase() || '').includes(cmtUserSearch.toLowerCase()) ||
      (user.empId?.toLowerCase() || '').includes(cmtUserSearch.toLowerCase()) ||
      (user.designation?.toLowerCase() || '').includes(cmtUserSearch.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(cmtUserSearch.toLowerCase())
    );
  }, [cmtUsers, cmtUserSearch]);

  // Get selected CMT user name for display
  const selectedCmtUserName = useMemo(() => {
    const user = cmtUsers.find(u => u.empId === selectedCmtUser);
    return user ? `${user.employeeName} (${user.empId}) - ${user.designation}` : '';
  }, [cmtUsers, selectedCmtUser]);


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


  // Reset to first page when search term, filter, or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchFilter, statusFilter, dateRange, createdByFilter]);


  const fetchTruckerReports = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/truckers`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.data && res.data.success) {
        const truckersData = res.data.data || [];
        setTruckers(truckersData);

        // Calculate statistics from the actual data
        const approvedCount = truckersData.filter(t => t.status === 'approved' || t.status === 'accountant_approved').length;
        const rejectedCount = truckersData.filter(t => t.status === 'rejected').length;
        const pendingCount  = truckersData.filter(t => t.status === 'pending').length;

        setStatistics({
          totalTruckers: truckersData.length,
          approvedTruckers: approvedCount,
          rejectedTruckers: rejectedCount,
          pendingApproval: pendingCount,
          totalLoads: truckersData.reduce((sum, t) => sum + (t.totalLoads || 0), 0),
          completedLoads: truckersData.reduce((sum, t) => sum + (t.completedLoads || 0), 0),
          pendingLoads: truckersData.reduce((sum, t) => sum + (t.pendingLoads || 0), 0),
          totalRevenue: truckersData.reduce((sum, t) => sum + (t.totalRevenue || 0), 0)
        });
      } else {
        console.error('API response format error:', res.data);
        setTruckers([]);
        setStatistics({
          totalTruckers: 0,
          approvedTruckers: 0,
          rejectedTruckers: 0,
          pendingApproval: 0,
          totalLoads: 0,
          completedLoads: 0,
          pendingLoads: 0,
          totalRevenue: 0
        });
      }
    } catch (err) {
      console.error('Error fetching trucker reports:', err);
      setTruckers([]);
      setStatistics({
        totalTruckers: 0,
        approvedTruckers: 0,
        rejectedTruckers: 0,
        pendingApproval: 0,
        totalLoads: 0,
        completedLoads: 0,
        pendingLoads: 0,
        totalRevenue: 0
      });
    } finally {
      setLoading(false);
    }
  };

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
      fetchTruckerReports();
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

  const handleReassignClick = (trucker) => {
    setSelectedTrucker(trucker);
    setModalType('reassign');
    setReason('');
    setSelectedCmtUser('');
    setCmtUserSearch('');
    setIsCmtDropdownOpen(false);
  };

  const handleCmtUserSelect = (empId, displayName) => {
    setSelectedCmtUser(empId);
    setCmtUserSearch('');
    setIsCmtDropdownOpen(false);
  };

  const handleReassignSubmit = async () => {
    if (!selectedCmtUser) {
        alertify.error('Please select a CMT person');
        return;
    }

    try {
        const truckerId = selectedTrucker._id || selectedTrucker.userId;
        const response = await axios.put(
            `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/reassign-trucker/${truckerId}`,
            {
                newCmtEmpId: selectedCmtUser,
                reason: reason
            },
            {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true 
            }
        );

        if (response.data.success) {
            alertify.success('✅ Trucker reassigned successfully!');
            setModalType(null);
            fetchTruckerReports();
        } else {
             alertify.error(response.data.message || '❌ Reassignment failed');
        }
    } catch (error) {
        console.error('Reassign error:', error);
        alertify.error(error.response?.data?.message || '❌ Failed to reassign trucker');
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

  // -------- FILTER + SORT (memoized) --------
  const filteredTruckers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return (truckers || [])
      .filter(trucker => {
        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'approved' && !(trucker.status === 'approved' || trucker.status === 'accountant_approved')) return false;
          if (statusFilter === 'rejected' && trucker.status !== 'rejected') return false;
          if (statusFilter === 'pending'  && trucker.status !== 'pending')  return false;
        }

        // Date range filter
        if (dateRange.startDate && dateRange.endDate) {
          const truckerDate = new Date(trucker.createdAt);
          truckerDate.setHours(0, 0, 0, 0);
          
          const start = new Date(dateRange.startDate);
          start.setHours(0, 0, 0, 0);
          
          const end = new Date(dateRange.endDate);
          end.setHours(23, 59, 59, 999);

          if (truckerDate < start || truckerDate > end) return false;
        }

        // Created By filter
        if (createdByFilter) {
          const addedBy = trucker.addedBy;
          // Check against empId or _id, handling cases where addedBy might be just an ID string or an object
          const creatorId = typeof addedBy === 'object' ? (addedBy?.empId || addedBy?._id) : addedBy;
          if (creatorId !== createdByFilter) return false;
        }

        // Search filter
        if (!term) return true;

        const comp = trucker.compName?.toLowerCase() || '';
        const email = trucker.email?.toLowerCase() || '';
        const mcDot = trucker.mc_dot_no?.toLowerCase() || '';
        const state = trucker.state?.toLowerCase() || '';
        const city  = trucker.city?.toLowerCase() || '';

        switch (searchFilter) {
          case 'mc_dot':
            return mcDot.includes(term);
          case 'state':
            return state.startsWith(term) || state === term;
          case 'city':
            return city.includes(term);
          case 'all':
          default:
            return (
              comp.includes(term) ||
              email.includes(term) ||
              mcDot.includes(term) ||
              state.includes(term) ||
              city.includes(term)
            );
        }
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [truckers, statusFilter, searchFilter, searchTerm, dateRange, createdByFilter]);

  // -------- PAGINATION derived from FILTERED list (bug fix) --------
  const totalPages = Math.max(1, Math.ceil(filteredTruckers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTruckers = filteredTruckers.slice(startIndex, endIndex);

  // Format currency (reserved for any revenue cells later)
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  if (loading) {
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
    if (modalType === 'reassign') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-2xl p-8 border border-blue-100">
            <div className="bg-gradient-to-r from-orange-600 to-red-500 text-white px-6 py-4 rounded-xl shadow mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  Reassign Trucker
                </h2>
                <p className="text-sm text-blue-100 mt-1">
                  Select a CMT user to reassign this trucker
                </p>
              </div>
              <button 
                onClick={() => setModalType(null)} 
                type="button" 
                className="text-white text-3xl hover:text-gray-200"
              >
                ×
              </button>
            </div>

            {/* Trucker Details */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-700 bg-blue-50 px-4 py-3 rounded-lg mb-6">
              <div>
                <strong>Company Name:</strong>
                <br />
                {selectedTrucker?.compName || 'N/A'}
              </div>
              <div>
                <strong>MC/DOT No:</strong>
                <br />
                {selectedTrucker?.mc_dot_no || 'N/A'}
              </div>
              <div>
                <strong>Email:</strong>
                <br />
                {selectedTrucker?.email || 'N/A'}
              </div>
              <div>
                <strong>Phone:</strong>
                <br />
                {selectedTrucker?.phoneNo || 'N/A'}
              </div>
               <div>
                <strong>City:</strong>
                <br />
                {selectedTrucker?.city || 'N/A'}
              </div>
               <div>
                <strong>State:</strong>
                <br />
                {selectedTrucker?.state || 'N/A'}
              </div>
            </div>

            {/* CMT User Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Select CMT User <span className="text-red-500">*</span>
              </label>
              <div className="relative cmt-dropdown-container">
                <input
                  type="text"
                  value={cmtUserSearch}
                  onChange={(e) => {
                    setCmtUserSearch(e.target.value);
                    setIsCmtDropdownOpen(true);
                  }}
                  onFocus={() => setIsCmtDropdownOpen(true)}
                  onClick={() => setIsCmtDropdownOpen(true)}
                  placeholder="Search CMT user by name, ID, designation, or email..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                
                {isCmtDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {/* Clear/Unselect option */}
                    {selectedCmtUser && (
                      <div
                        onClick={() => {
                          setSelectedCmtUser('');
                          setCmtUserSearch('');
                          setIsCmtDropdownOpen(false);
                        }}
                        className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 transition-colors duration-150"
                      >
                        <div className="font-medium text-red-600 flex items-center gap-2">
                           <XCircle size={16} />
                          Clear Selection
                        </div>
                      </div>
                    )}
                    
                    {filteredCmtUsers.length > 0 ? (
                      filteredCmtUsers.map((user) => (
                        <div
                          key={user._id || user.empId}
                          onClick={() => handleCmtUserSelect(user.empId, `${user.employeeName} (${user.empId}) - ${user.designation}`)}
                          className={`px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                            selectedCmtUser === user.empId ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900">{user.employeeName}</div>
                          <div className="text-sm text-gray-600">{user.empId} - {user.designation}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        No CMT users found matching "{cmtUserSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {selectedCmtUser && (
                <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="text-sm text-blue-800">
                        <span className="font-semibold">Selected:</span> {selectedCmtUserName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCmtUser('');
                        setCmtUserSearch('');
                      }}
                      className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-all duration-150"
                      title="Clear Selection"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Reason (Optional)
                </label>
                <textarea
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                    rows={3}
                    placeholder="Reason for reassignment"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
            </div>

            <div className="flex justify-end gap-3">
                <button 
                    className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-all duration-200"
                    onClick={() => setModalType(null)}
                >
                    Cancel
                </button>
                <button
                    className="bg-gradient-to-r from-orange-600 to-red-500 text-white px-6 py-3 rounded-lg font-semibold shadow hover:from-orange-700 hover:to-red-700 transition-all duration-200"
                    onClick={handleReassignSubmit}
                >
                    Reassign
                </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center">
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
                {createdByFilter 
                  ? cmtUsers.find(u => (u.empId || u._id) === createdByFilter)?.employeeName 
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
                    setCreatedByFilter('');
                    setCreatedBySearch('');
                    setIsCreatedByDropdownOpen(false);
                  }}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${!createdByFilter ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
                >
                  Created All
                </div>
                {filteredCreatedByUsers.map((user) => (
                  <div
                    key={user._id || user.empId}
                    onClick={() => {
                      setCreatedByFilter(user.empId || user._id);
                      setCreatedBySearch('');
                      setIsCreatedByDropdownOpen(false);
                    }}
                    className={`px-4 py-2 text-md cursor-pointer hover:bg-blue-50 transition-colors ${createdByFilter === (user.empId || user._id) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={`Search by ${searchFilter === 'all' ? 'all fields' : searchFilter === 'mc_dot' ? 'MC/DOT No' : searchFilter}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
                {/* <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Trucker ID</th> */}
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Company Name</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">MC/DOT No</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Email</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Phone</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Created</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentTruckers.map((trucker, index) => (
                <tr key={trucker.userId} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  {/* <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{trucker.userId?.slice(-6) || 'N/A'}</span>
                  </td> */}
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
                  <td className="py-2 px-3">
                      <button
                          onClick={() => handleReassignClick(trucker)}
                          className="px-3 py-1 text-orange-600 text-xs rounded-md transition-colors border border-orange-300 hover:bg-orange-50"
                          title="Reassign Trucker"
                      >
                         Re-assign
                      </button>
                     
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
            Showing {filteredTruckers.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredTruckers.length)} of {filteredTruckers.length} truckers
            {searchTerm && ` (filtered from ${truckers.length} total)`}
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-1">
              {currentPage > 3 && (
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                  >
                    1
                  </button>
                  {currentPage > 4 && <span className="px-2 text-gray-400">...</span>}
                </>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 7) return true;
                  if (currentPage <= 4) return page <= 5;
                  if (currentPage >= totalPages - 3) return page >= totalPages - 4;
                  return page >= currentPage - 2 && page <= currentPage + 2;
                })
                .map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${currentPage === page
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}
                  >
                    {page}
                  </button>
                ))}

              {currentPage < totalPages - 2 && totalPages > 7 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-2 text-gray-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
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
