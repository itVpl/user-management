import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTruck, FaBox, FaCalendar, FaClock, FaUser, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaSearch, FaEdit, FaEye, FaUserCheck } from 'react-icons/fa';
import API_CONFIG from '../../config/api.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  sessionStorage.getItem('authToken') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('token');

// Helper function to format date and time
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  } catch (error) {
    return { date: 'N/A', time: 'N/A' };
  }
};

export default function AssignDo() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [reassignModal, setReassignModal] = useState({ visible: false, assignment: null });
  const [cmtUsers, setCmtUsers] = useState([]);
  const [selectedCmtUser, setSelectedCmtUser] = useState('');
  const [reassignDescription, setReassignDescription] = useState('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [cmtUserSearch, setCmtUserSearch] = useState('');
  const [isCmtDropdownOpen, setIsCmtDropdownOpen] = useState(false);

  // Pagination states (server-side: API page & limit)
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({ total: 0, pages: 1, limit: 50 });
  const API_PAGE_LIMIT = 50;
  const SEARCH_FETCH_LIMIT = 1200; // when user searches, fetch more records to search in

  // Fetch assignments from API with page and limit
  const fetchAssignments = async (page = 1, limit = API_PAGE_LIMIT) => {
    try {
      setLoading(true);
      
      const token = getAuthToken();
      
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/assignment-mapping`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { page, limit }
      });

      if (response.data && response.data.success) {
        const resData = response.data.data || response.data;
        const assignmentsData = resData.assignments || [];

        if (Array.isArray(assignmentsData)) {
          const transformedData = assignmentsData.map((assignment, index) => ({
            id: assignment.doId || index,
            sNo: (page - 1) * limit + index + 1,
            doId: assignment.doId,
            date: assignment.date,
            loadType: assignment.loadType || 'N/A',
            customerName: assignment.customerName || 'N/A',
            loadNumbers: assignment.loadNumbers || [],
            containerNo: assignment.containerNo ?? assignment.shipper?.containerNo ?? null,
            containerType: assignment.shipper?.containerType ?? null,
            shipper: assignment.shipper || null,
            carrier: assignment.carrier || null,
            loadReference: assignment.loadReference || null,
            assignedToCMT: assignment.assignedToCMT || null,
            assignmentStatus: assignment.assignmentStatus || 'N/A',
            doStatus: assignment.doStatus || 'N/A',
            loadReferenceStatus: assignment.loadReference?.status || assignment.doStatus || 'N/A',
            createdAt: assignment.createdAt || new Date().toISOString()
          }));

          setAssignments(transformedData);
        }

        const pagination = resData.pagination || {};
        setPaginationInfo({
          total: pagination.total ?? assignmentsData.length,
          pages: Math.max(1, pagination.pages ?? 1),
          limit: pagination.limit ?? limit
        });
      } else {
        toast.error('Unexpected response structure from API');
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        toast.error(`Error: ${error.response.data?.message || `HTTP ${error.response.status}`}`);
      } else if (error.request) {
        console.error('Request error:', error.request);
        toast.error('Network error. Please check your connection.');
      } else {
        console.error('Other error:', error.message);
        toast.error(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch CMT users from API
  const fetchCmtUsers = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Please login to access this resource');
        return;
      }
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/CMT`,
        { headers }
      );
      setCmtUsers(res.data?.employees || []);
    } catch (error) {
      console.error('Error fetching CMT users:', error);
      if (error.response?.data?.message) toast.error(error.response.data.message);
      else toast.error('Failed to fetch CMT users data');
    }
  };

  useEffect(() => {
    fetchCmtUsers();
  }, []);

  // When user searches, fetch more records (1200) so search can find load no / etc. across many rows
  useEffect(() => {
    if ((searchTerm || '').trim()) {
      setCurrentPage(1);
      fetchAssignments(1, SEARCH_FETCH_LIMIT);
    }
  }, [searchTerm]);

  // Normal pagination when not searching
  useEffect(() => {
    if (!(searchTerm || '').trim()) {
      fetchAssignments(currentPage, API_PAGE_LIMIT);
    }
  }, [currentPage, searchTerm]);

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
  const filteredCmtUsers = React.useMemo(() => {
    if (!cmtUserSearch.trim()) return cmtUsers.filter(user => user.status === 'active');
    return cmtUsers.filter(user => 
      user.status === 'active' && (
        user.employeeName?.toLowerCase().includes(cmtUserSearch.toLowerCase()) ||
        user.empId?.toLowerCase().includes(cmtUserSearch.toLowerCase()) ||
        user.designation?.toLowerCase().includes(cmtUserSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(cmtUserSearch.toLowerCase())
      )
    );
  }, [cmtUsers, cmtUserSearch]);

  // Get selected CMT user name for display
  const selectedCmtUserName = React.useMemo(() => {
    const user = cmtUsers.find(u => u._id === selectedCmtUser);
    return user ? `${user.employeeName} (${user.empId}) - ${user.designation}` : '';
  }, [cmtUsers, selectedCmtUser]);

  const handleCmtUserSelect = (userId, userName) => {
    setSelectedCmtUser(userId);
    setCmtUserSearch(userName);
    setIsCmtDropdownOpen(false);
  };

  // Handle view assignment details
  const handleViewAssignment = (assignment) => {

    setSelectedAssignment(assignment);
    setShowViewModal(true);
  };

  // Handle Re-Assign
  const handleReAssign = (assignment) => {
    setReassignModal({ visible: true, assignment });
    setSelectedCmtUser('');
    setReassignDescription('');
    setCmtUserSearch('');
    setIsCmtDropdownOpen(false);
  };

  const closeReassignModal = () => {
    setReassignModal({ visible: false, assignment: null });
    setSelectedCmtUser('');
    setReassignDescription('');
    setReassignSubmitting(false);
    setCmtUserSearch('');
    setIsCmtDropdownOpen(false);
  };

  const handleReassignSubmit = async () => {
    if (!selectedCmtUser) {
      toast.error('Please select a CMT user to assign the DO to');
      return;
    }

    if (!reassignDescription.trim()) {
      toast.error('Please provide a description for re-assignment');
      return;
    }

    try {
      setReassignSubmitting(true);
      const token = getAuthToken();
      const empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');
      
      if (!token || !empId) {
        toast.error('Missing token or empId. Please log in again.');
        return;
      }

      // Get the selected CMT user details
      const selectedUser = cmtUsers.find(user => user._id === selectedCmtUser);
      if (!selectedUser) {
        toast.error('Selected CMT user not found');
        return;
      }

      // Prepare API payload
      const payload = {
        doId: reassignModal.assignment?.doId,
        newCmtUserId: selectedUser.empId,
        reason: reassignDescription.trim()
      };

      // Make API call to re-assign DO
      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/do/do/reassign-to-cmt`,
        payload,
        { 
          headers: { 
            Authorization: `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          } 
        }
      );

      if (response.data.success || response.status === 200) {
        toast.success(`DO re-assigned successfully to ${selectedUser.employeeName}!`);
        
        closeReassignModal();
        
        // Refresh the data immediately and then again after a delay to ensure updated data

        fetchAssignments();
        setTimeout(() => {

          fetchAssignments();
        }, 2000);
      } else {
        toast.error(response.data.message || 'Failed to re-assign DO');
      }

    } catch (error) {
      console.error('Re-assign error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to re-assign DO. Please try again.');
      }
    } finally {
      setReassignSubmitting(false);
    }
  };

  // Filter assignments based on search term and sort by creation date (latest first - LIFO)
  const filteredAssignments = assignments
    .filter(assignment => {
      const q = (searchTerm || '').trim().toLowerCase();
      if (!q) return true;
      return (
        assignment.doId?.toLowerCase().includes(q) ||
        assignment.customerName?.toLowerCase().includes(q) ||
        assignment.loadNumbers?.some(ln => String(ln || '').toLowerCase().includes(q)) ||
        (assignment.containerNo && String(assignment.containerNo).toLowerCase().includes(q)) ||
        (assignment.shipper?.containerNo && String(assignment.shipper.containerNo).toLowerCase().includes(q)) ||
        (assignment.loadReference?.loadNumber && String(assignment.loadReference.loadNumber).toLowerCase().includes(q)) ||
        (assignment.shipper?.name || '').toLowerCase().includes(q) ||
        (assignment.shipper?.email || '').toLowerCase().includes(q) ||
        (assignment.carrier?.name || '').toLowerCase().includes(q) ||
        (assignment.assignedToCMT?.employeeName || '').toLowerCase().includes(q) ||
        (assignment.assignedToCMT?.empId || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const isSearchMode = (searchTerm || '').trim().length > 0;
  const searchPageSize = API_PAGE_LIMIT;
  const totalFiltered = filteredAssignments.length;
  const totalPages = isSearchMode
    ? Math.max(1, Math.ceil(totalFiltered / searchPageSize))
    : paginationInfo.pages;
  const totalRecords = isSearchMode ? totalFiltered : paginationInfo.total;
  const currentAssignments = isSearchMode
    ? filteredAssignments.slice((currentPage - 1) * searchPageSize, currentPage * searchPageSize)
    : filteredAssignments;
  const startIndex = totalRecords === 0 ? 0 : (currentPage - 1) * (isSearchMode ? searchPageSize : paginationInfo.limit) + 1;
  const endIndex = totalRecords === 0 ? 0 : startIndex + currentAssignments.length - 1;

  // Handle page change (fetches new page from API via useEffect)
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPaginationRange = () => {
    const siblingCount = 1;
    const totalPageNumbers = siblingCount * 2 + 5;

    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < totalPages - 1;

    if (!showLeftEllipsis && showRightEllipsis) {
      const leftItemCount = 3 + siblingCount * 2;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, 'ellipsis', totalPages];
    }

    if (showLeftEllipsis && !showRightEllipsis) {
      const rightItemCount = 3 + siblingCount * 2;
      const start = totalPages - rightItemCount + 1;
      const rightRange = Array.from({ length: rightItemCount }, (_, i) => start + i);
      return [1, 'ellipsis', ...rightRange];
    }

    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
  };

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'assigned': return 'bg-green-100 text-green-800 border border-green-200';
      case 'sales_verified': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'accountant_approved': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'in_progress': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'unassigned': return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'active': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  // Get load numbers as string
  const getLoadNumbersString = (loadNumbers) => {
    if (!loadNumbers || !Array.isArray(loadNumbers)) return 'N/A';
    return loadNumbers.join(', ');
  };

  // Get origin information
  const getOriginInfo = (loadReference) => {
    if (!loadReference) return { city: 'N/A', state: 'N/A' };
    if (loadReference.origin && typeof loadReference.origin === 'object') {
      return {
        city: loadReference.origin.city || 'N/A',
        state: loadReference.origin.state || 'N/A'
      };
    }
    return { city: 'N/A', state: 'N/A' };
  };

  // Get destination information
  const getDestinationInfo = (loadReference) => {
    if (!loadReference) return { city: 'N/A', state: 'N/A' };
    if (loadReference.destination && typeof loadReference.destination === 'object') {
      return {
        city: loadReference.destination.city || 'N/A',
        state: loadReference.destination.state || 'N/A'
      };
    }
    return { city: 'N/A', state: 'N/A' };
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Stats and Actions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="bg-white rounded-2xl px-6 py-4 border border-gray-200 w-full max-w-xs">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xl font-medium">Total DO Assignments</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{assignments.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                <FaBox className="text-green-600" size={20} />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search DOs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchAssignments}
            disabled={loading}
            className="bg-white text-gray-700 px-4 py-2.5 rounded-xl border border-blue-300 hover:bg-blue-500 hover:text-white transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading DO assignments...</p>
            <p className="text-gray-400 text-sm">Please wait while we fetch the data</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-3">
                <thead className="bg-white">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-16 bg-gray-50 border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">S.No</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-24 bg-gray-50 border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">DO ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-40 bg-gray-50 border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">Load Numbers</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-36 bg-gray-50 border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">Container No</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-40 bg-gray-50 border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">Carrier</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-24 bg-gray-50 border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">Load Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-24 bg-gray-50 border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">Assignment Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-48 bg-gray-50 border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">CMT Assignment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-40 bg-gray-50 border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">Date & Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-24 bg-gray-50 border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">DO Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-24 bg-gray-50 border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAssignments.map((assignment, index) => {
                    const originInfo = getOriginInfo(assignment.loadReference);
                    const destinationInfo = getDestinationInfo(assignment.loadReference);
                    
                    return (
                      <tr key={assignment.id} className="text-sm">
                        <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">
                          <span className="font-medium text-gray-700">{assignment.sNo}</span>
                        </td>
                        <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">
                          <span className="font-medium text-gray-700">{assignment.doId ? `DO-${assignment.doId.slice(-5)}` : 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">
                          <span className="font-medium text-gray-700">{getLoadNumbersString(assignment.loadNumbers)}</span>
                        </td>
                        <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">
                          <div className="space-y-0.5">
                            <span className="font-medium text-gray-700">{assignment.containerNo || '—'}</span>
                            {assignment.containerType && (
                              <p className="text-xs text-gray-500">{assignment.containerType}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">
                        <div className="space-y-1">

{/* Carrier Name */}
<div className="relative group max-w-[100px]">
  <span className="font-medium text-gray-700 truncate block">
    {assignment.carrier?.name || 'N/A'}
  </span>

  {assignment.carrier?.name && (
    <div className="absolute left-0 top-full mt-1 hidden group-hover:block 
                    bg-gray-800 text-white text-xs px-2 py-1 
                    rounded shadow-lg whitespace-nowrap z-50">
      {assignment.carrier?.name}
    </div>
  )}
</div>

{/* Carrier Email */}
{assignment.carrier?.email && (
  <div className="relative group max-w-[100px]">
    <p className="text-sm text-gray-500 truncate block">
      {assignment.carrier.email}
    </p>

    <div className="absolute left-0 top-full mt-1 hidden group-hover:block 
                    bg-gray-800 text-white text-xs px-2 py-1 
                    rounded shadow-lg whitespace-nowrap z-50">
      {assignment.carrier.email}
    </div>
  </div>
)}

</div>
                        </td>
                        <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">
                          <span className="font-medium text-gray-700">{assignment.loadType}</span>
                        </td>
                        <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">
                          <span className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(assignment.assignmentStatus)}`}>
                            {assignment.assignmentStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">
                          {assignment.assignedToCMT ? (
                            <div>
                              <span className="font-medium text-gray-700">{assignment.assignedToCMT.employeeName}</span>
                              <p className="text-sm text-gray-500">{assignment.assignedToCMT.empId}</p>
                              {/* <p className="text-xs text-gray-500">Assigned by: {assignment.assignedToCMT.assignedBy?.employeeName}</p> */}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Not Assigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">
                          <div>
                            <span className="font-medium text-gray-700">{formatDateTime(assignment.date).date}</span>
                            <p className="text-sm text-gray-500">{formatDateTime(assignment.date).time}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">
                          <span className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(assignment.loadReferenceStatus)}`}>
                            {assignment.loadReferenceStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r">
                          <button
                            onClick={() => handleReAssign(assignment)}
                            disabled={reassignSubmitting}
                            className={`px-3 py-1.5 font-medium whitespace-nowrap text-orange-700 text-sm rounded-md transition-colors border border-orange-300 hover:bg-orange-500 hover:text-white cursor-pointer ${
                              reassignSubmitting 
                                ? 'opacity-50 cursor-not-allowed' 
                                : ''
                            }`}
                          >
                            {reassignSubmitting ? 'Processing...' : 'Re-Assign'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredAssignments.length === 0 && (
              <div className="text-center py-12">
                <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm ? 'No DO assignments found matching your search' : 'No DO assignments found'}
                </p>
                <p className="text-gray-400 text-sm">
                  {searchTerm ? 'Try adjusting your search terms' : 'No DO assignments available'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {(totalPages > 1 || totalRecords > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 bg-white rounded-2xl px-5 py-4 border border-gray-200">
          <div className="text-[13px] text-gray-600">
            Showing {totalRecords === 0 ? 0 : currentAssignments.length === 0 ? 0 : startIndex} to {currentAssignments.length === 0 ? 0 : endIndex} of {totalRecords} assignments
            {searchTerm && currentAssignments.length < assignments.length && ` (filtered on this page)`}
          </div>
          <div className="flex items-center gap-1 text-[13px] text-gray-700">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              Previous
            </button>
            {getPaginationRange().map((page, index) => (
              page === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 select-none">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    currentPage === page
                      ? 'border border-gray-900 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedAssignment && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaEye className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">DO Assignment Details</h2>
                    <p className="text-blue-100">Complete DO assignment information and CMT assignment details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* DO Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaBox className="text-blue-600" size={16} />
                    DO Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">DO ID:</span> {selectedAssignment.doId ? `DO-${selectedAssignment.doId.slice(-5)}` : 'N/A'}</div>
                    <div><span className="font-medium">Load Numbers:</span> {getLoadNumbersString(selectedAssignment.loadNumbers)}</div>
                    <div><span className="font-medium">Container No:</span> {selectedAssignment.containerNo || selectedAssignment.shipper?.containerNo || 'N/A'}</div>
                    {selectedAssignment.containerType && <div><span className="font-medium">Container Type:</span> {selectedAssignment.containerType}</div>}
                    <div><span className="font-medium">Load Type:</span> {selectedAssignment.loadType}</div>
                    <div><span className="font-medium">Customer:</span> {selectedAssignment.customerName}</div>
                    <div><span className="font-medium">Assignment Status:</span> 
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full font-bold ${getStatusColor(selectedAssignment.assignmentStatus)}`}>
                        {selectedAssignment.assignmentStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div><span className="font-medium">DO Status:</span> 
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full font-bold ${getStatusColor(selectedAssignment.doStatus)}`}>
                        {selectedAssignment.doStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaTruck className="text-green-600" size={16} />
                    Shipper & Carrier Information
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="font-medium">Shipper:</span>
                      <div className="ml-2">
                        <div>{selectedAssignment.shipper?.name || 'N/A'}</div>
                        <div className="text-gray-500">{selectedAssignment.shipper?.email || ''}</div>
                        <div className="text-gray-500">{selectedAssignment.shipper?.phone || ''}</div>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Carrier:</span>
                      <div className="ml-2">
                        <div>{selectedAssignment.carrier?.name || 'N/A'}</div>
                        <div className="text-gray-500">{selectedAssignment.carrier?.email || ''}</div>
                        <div className="text-gray-500">{selectedAssignment.carrier?.phone || ''}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaCalendar className="text-purple-600" size={16} />
                    Date Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">DO Date:</span> {formatDate(selectedAssignment.date)}</div>
                    <div><span className="font-medium">Created At:</span> {formatDate(selectedAssignment.createdAt)}</div>
                    {selectedAssignment.loadReference && (
                      <>
                        <div><span className="font-medium">Origin:</span> {getOriginInfo(selectedAssignment.loadReference).city}, {getOriginInfo(selectedAssignment.loadReference).state}</div>
                        <div><span className="font-medium">Destination:</span> {getDestinationInfo(selectedAssignment.loadReference).city}, {getDestinationInfo(selectedAssignment.loadReference).state}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* CMT Assignment Details */}
              {selectedAssignment.assignedToCMT && (
                <div className="bg-blue-50 p-6 rounded-xl mb-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaUserCheck className="text-blue-600" size={20} />
                    CMT Assignment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Assigned To:</span> {selectedAssignment.assignedToCMT.employeeName}</div>
                      <div><span className="font-medium">Employee ID:</span> {selectedAssignment.assignedToCMT.empId}</div>
                      <div><span className="font-medium">Department:</span> {selectedAssignment.assignedToCMT.department}</div>
                      <div><span className="font-medium">Assignment Type:</span> {selectedAssignment.assignedToCMT.assignmentType}</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Assigned At:</span> {formatDate(selectedAssignment.assignedToCMT.assignedAt)}</div>
                      <div><span className="font-medium">Assigned By:</span> {selectedAssignment.assignedToCMT.assignedBy?.employeeName}</div>
                      <div><span className="font-medium">Assigned By Dept:</span> {selectedAssignment.assignedToCMT.assignedBy?.department}</div>
                      <div><span className="font-medium">Assigned By ID:</span> {selectedAssignment.assignedToCMT.assignedBy?.empId}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Re-Assign Modal */}
      {reassignModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-2xl p-8 border border-orange-100">
            <div className="bg-gradient-to-r from-orange-600 to-red-500 text-white px-6 py-4 rounded-xl shadow mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  Re-Assign Delivery Order
                </h2>
                <p className="text-sm text-orange-100 mt-1">
                  Select a CMT user to reassign this DO
                </p>
              </div>
              <button 
                onClick={closeReassignModal} 
                type="button" 
                className="text-white text-3xl hover:text-gray-200"
              >
                ×
              </button>
            </div>

            {/* DO Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700 bg-orange-50 px-4 py-3 rounded-lg mb-6">
              <div>
                <strong>DO ID:</strong>
                <br />
                {reassignModal.assignment?.doId ? `DO-${reassignModal.assignment.doId.slice(-5)}` : 'N/A'}
              </div>
              <div>
                <strong>Load Numbers:</strong>
                <br />
                {getLoadNumbersString(reassignModal.assignment?.loadNumbers)}
              </div>
              <div>
                <strong>Container No:</strong>
                <br />
                {reassignModal.assignment?.containerNo || reassignModal.assignment?.shipper?.containerNo || 'N/A'}
              </div>
              <div>
                <strong>Load Type:</strong>
                <br />
                {reassignModal.assignment?.loadType || 'N/A'}
              </div>
              <div>
                <strong>Carrier:</strong>
                <br />
                {reassignModal.assignment?.carrier?.name || 'N/A'}
              </div>
              <div>
                <strong>Assignment Status:</strong>
                <br />
                {reassignModal.assignment?.assignmentStatus || 'N/A'}
              </div>
              <div>
                <strong>DO Status:</strong>
                <br />
                {reassignModal.assignment?.doStatus || 'N/A'}
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
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
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
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Clear Selection
                        </div>
                      </div>
                    )}
                    
                    {filteredCmtUsers.length > 0 ? (
                      filteredCmtUsers.map((user) => (
                        <div
                          key={user._id}
                          onClick={() => handleCmtUserSelect(user._id, `${user.employeeName} (${user.empId}) - ${user.designation}`)}
                          className={`px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                            selectedCmtUser === user._id ? 'bg-orange-50' : ''
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
                <div className="mt-3 p-3 bg-orange-50 border-2 border-orange-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div className="text-sm text-orange-800">
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reassignDescription}
                onChange={(e) => setReassignDescription(e.target.value)}
                rows={4}
                placeholder="Please provide a description for re-assigning this DO..."
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={closeReassignModal}
                disabled={reassignSubmitting}
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassignSubmit}
                disabled={reassignSubmitting}
                className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                  reassignSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {reassignSubmitting ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Re-assigning...
                  </div>
                ) : (
                  'Re-Assign DO'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}