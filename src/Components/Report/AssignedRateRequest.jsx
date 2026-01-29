import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, MapPin, Truck, Calendar, DollarSign, Search, Package, TrendingUp, Eye, X, ChevronDown } from 'lucide-react';
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

  // Handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate smart pagination page numbers
  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 7; // Maximum visible page numbers
    
    if (totalPages <= maxVisible) {
      // If total pages are less than maxVisible, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 4) {
        // Near the beginning
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near the end
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Loading state
  if (loading && assignments.length === 0) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assigned rate requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          {/* Total Loads Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Package className="text-indigo-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Loads</p>
                <p className="text-xl font-bold text-gray-800">{overallStatistics?.totalLoads || 0}</p>
              </div>
            </div>
          </div>

          {/* Loads with Bid Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Loads with Bid</p>
                <p className="text-xl font-bold text-green-600">{overallStatistics?.loadsWithBid || overallStatistics?.totalLoadsWithBid || 0}</p>
              </div>
            </div>
          </div>

          {/* Loads without Bid Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <XCircle className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Loads without Bid</p>
                <p className="text-xl font-bold text-orange-600">{overallStatistics?.loadsWithoutBid || overallStatistics?.totalLoadsWithoutBid || 0}</p>
              </div>
            </div>
          </div>

          {/* Total CMT Users Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <User className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total CMT Users</p>
                <p className="text-xl font-bold text-purple-600">{totalCMTUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* CMT User Filter */}
          <div className="relative cmt-dropdown-container">
            <button
              onClick={() => setIsCmtDropdownOpen(!isCmtDropdownOpen)}
              className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg bg-white w-64 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            >
              <span className="truncate text-md text-gray-700">
                {selectedEmpId 
                  ? cmtUsers.find(u => u.empId === selectedEmpId)?.employeeName || selectedEmpId
                  : 'All CMT Users'}
              </span>
              <ChevronDown 
                size={16} 
                className={`text-gray-500 transition-transform duration-200 ${isCmtDropdownOpen ? 'transform rotate-180' : ''}`} 
              />
            </button>

            {isCmtDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>
                  {`
                    .cmt-dropdown-container div::-webkit-scrollbar {
                      display: none;
                    }
                  `}
                </style>
                
                {/* Search Input */}
                <div className="sticky top-0 bg-white p-2 border-b border-gray-100 z-10">
                  <div className="relative">
                    <input
                      type="text"
                      value={cmtUserSearch}
                      onChange={(e) => setCmtUserSearch(e.target.value)}
                      placeholder="Search CMT user..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setSelectedEmpId('');
                    setCmtUserSearch('');
                    setIsCmtDropdownOpen(false);
                  }}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-indigo-50 transition-colors ${!selectedEmpId ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-700'}`}
                >
                  All CMT Users
                </div>
                {filteredCmtUsers.map((user) => (
                  <div
                    key={user._id || user.empId}
                    onClick={() => {
                      setSelectedEmpId(user.empId);
                      setCmtUserSearch('');
                      setIsCmtDropdownOpen(false);
                    }}
                    className={`px-4 py-2 text-md cursor-pointer hover:bg-indigo-50 transition-colors ${selectedEmpId === user.empId ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-700'}`}
                  >
                    {user.employeeName} ({user.empId})
                  </div>
                ))}
                {filteredCmtUsers.length === 0 && (
                  <div className="px-4 py-3 text-gray-500 text-center text-xs">
                    No users found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date Range dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetMenu(v => !v)}
              className="w-[300px] text-left px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between"
            >
              <span>
                {dateFilterApplied && range.startDate && range.endDate
                  ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                  : 'Select Date Range'}
              </span>
              <span className="ml-3">▼</span>
            </button>

            {showPresetMenu && (
              <div className="absolute z-50 mt-2 w-56 rounded-md border bg-white shadow-lg">
                {dateFilterApplied && (
                  <>
                    <button
                      onClick={() => {
                        setDateFilterApplied(false);
                        setRange({ startDate: null, endDate: null, key: 'selection' });
                        setShowPresetMenu(false);
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
                    >
                      Clear Date Filter
                    </button>
                    <div className="my-1 border-t" />
                  </>
                )}
                {Object.keys(presets).map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => applyPreset(lbl)}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                  >
                    {lbl}
                  </button>
                ))}
                <div className="my-1 border-t" />
                <button
                  onClick={() => { setShowPresetMenu(false); setShowCustomRange(true); }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  Custom Range
                </button>
              </div>
            )}
          </div>

          {/* Custom Range calendars */}
          {showCustomRange && (
            <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCustomRange(false)}>
              <div className="bg-white rounded-xl shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
                <DateRange
                  ranges={[range]}
                  onChange={(item) => setRange(item.selection)}
                  moveRangeOnFirstSelection={false}
                  months={2}
                  direction="horizontal"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomRange(false);
                      if (!dateFilterApplied) {
                        setRange({ startDate: null, endDate: null, key: 'selection' });
                      }
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterApplied(true);
                      setShowCustomRange(false);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loads Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load ID</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Assigned CMT</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Origin</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Destination</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load Type</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Agent Name</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bid Count</th>
                <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentLoads.map((load, index) => {
                const origin = load.loadDetails?.origin;
                const destination = load.loadDetails?.destination;
                const originText = origin 
                  ? `${origin.city || ''}${origin.state ? `, ${origin.state}` : ''}${origin.zip ? ` ${origin.zip}` : ''}`.trim() || origin.addressLine1 || 'N/A'
                  : 'N/A';
                const destinationText = destination
                  ? `${destination.city || ''}${destination.state ? `, ${destination.state}` : ''}${destination.zip ? ` ${destination.zip}` : ''}`.trim() || destination.addressLine1 || 'N/A'
                  : 'N/A';
                const agentName = load.createdBy?.createdBySalesUser?.empName || 'N/A';
                const bidCount = load.bidStatus?.bidCount || 0;
                const hasBid = load.bidStatus?.hasBid || false;
                
                return (
                  <tr key={load.loadId} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3">
                      <span className="font-mono text-sm text-gray-700">{load.loadId?.slice(-8) || 'N/A'}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <span className="font-medium text-indigo-600">{load.cmtUser?.empName || load.assignedCMTUser?.empName || 'N/A'}</span>
                        {(load.cmtUser?.empId || load.assignedCMTUser?.empId) && (
                          <p className="text-xs text-gray-500 mt-1">{load.cmtUser?.empId || load.assignedCMTUser?.empId}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <span className="font-medium text-gray-700">{originText}</span>
                        {origin?.addressLine1 && originText !== origin.addressLine1 && (
                          <p className="text-xs text-gray-500 mt-1">{origin.addressLine1}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <span className="font-medium text-gray-700">{destinationText}</span>
                        {destination?.addressLine1 && destinationText !== destination.addressLine1 && (
                          <p className="text-xs text-gray-500 mt-1">{destination.addressLine1}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{load.loadDetails?.loadType || 'N/A'}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <span className="font-medium text-gray-700">{agentName}</span>
                        {load.createdBy?.createdBySalesUser?.empId && (
                          <p className="text-xs text-gray-500 mt-1">{load.createdBy.createdBySalesUser.empId}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`font-semibold ${hasBid ? 'text-green-600' : 'text-orange-600'}`}>
                        {bidCount}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => {
                          setSelectedLoad(load);
                          setShowLoadModal(true);
                        }}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {allLoads.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {dateFilterApplied || selectedEmpId ? 'No loads found matching your filters' : 'No assigned loads found'}
            </p>
            <p className="text-gray-400 text-sm">
              {dateFilterApplied || selectedEmpId ? 'Try adjusting your filters' : 'Loads assigned to CMT users will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {allLoads.length > 0 && totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, allLoads.length)} of {allLoads.length} loads
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              }`}
            >
              Previous
            </button>
            
            {getPaginationPages().map((page, index) => {
              if (page === 'ellipsis') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              }`}
            >
              Next
            </button>
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

