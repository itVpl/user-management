import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import breakReportService from '../../services/breakReportService';
import { Clock, Filter, Search, Calendar, User, Users, Coffee, TrendingUp, RefreshCw, FileText, BarChart3, X, Eye, Activity, AlertCircle, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

/* ====================== Soft Theme (DO Design) ====================== */
const SOFT = {
  header: 'rounded-2xl bg-gradient-to-r from-[#6D5DF6] via-[#7A5AF8] to-[#19C3FB] text-white px-5 py-4',
  cardMint: 'p-4 rounded-2xl border bg-[#F3FBF6] border-[#B9E6C9]',
  cardPink: 'p-4 rounded-2xl border bg-[#FFF3F7] border-[#F7CADA]',
  cardBlue: 'p-4 rounded-2xl border bg-[#EEF4FF] border-[#C9D5FF]',
  cardButter: 'p-4 rounded-2xl border bg-[#FFF7E6] border-[#FFE2AD]',
  insetWhite: 'p-3 rounded-xl border bg-white',
};

const MS = {
  primaryBtn: 'bg-[#0078D4] hover:bg-[#106EBE] focus:ring-2 focus:ring-[#9CCCF5] text-white',
  subtleBtn: 'bg-white border border-[#D6D6D6] hover:bg-[#F5F5F5]',
  successPill: 'bg-[#DFF6DD] text-[#107C10]',
  neutralPill: 'bg-[#F3F2F1] text-[#323130]',
};

/**
 * Break Report Component
 * View employee break reports with filters
 */
const BreakReport = () => {
  const [reportData, setReportData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed', 'summary', or 'current'
  const [currentBreakStatus, setCurrentBreakStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    department: '',
    empId: ''
  });
  const [statistics, setStatistics] = useState({
    totalBreaks: 0,
    totalEmployees: 0,
    totalDuration: '00:00:00',
    averageDuration: '00:00:00'
  });
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeBreakData, setEmployeeBreakData] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);

  // Department options
  const departments = ['Sales', 'CMT', 'IT', 'HR', 'Finance'];

  // Reset page when filters or view mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.startDate, filters.endDate, filters.department, filters.empId, viewMode]);

  useEffect(() => {
    if (viewMode === 'current') {
      fetchCurrentBreakStatus();
      // Auto-refresh every 30 seconds if enabled
      if (autoRefresh) {
        const interval = setInterval(() => {
          fetchCurrentBreakStatus();
        }, 30000);
        return () => clearInterval(interval);
      }
    } else if (filters.startDate && filters.endDate) {
      fetchReport();
    }
  }, [filters.startDate, filters.endDate, filters.department, filters.empId, viewMode, autoRefresh]);

  // Fetch current status when department filter changes in current mode
  useEffect(() => {
    if (viewMode === 'current') {
      fetchCurrentBreakStatus();
    }
  }, [filters.department]);

  // Fetch current break status
  const fetchCurrentBreakStatus = async () => {
    setStatusLoading(true);
    try {
      const params = {
        ...(filters.department && { department: filters.department })
      };
      const response = await breakReportService.getCurrentBreakStatus(params);
      
      if (response.success) {
        setCurrentBreakStatus(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch current break status');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch current break status');
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...(filters.department && { department: filters.department }),
        ...(filters.empId && { empId: filters.empId })
      };

      let response;
      if (viewMode === 'summary') {
        response = await breakReportService.getSummaryReport(params);
      } else {
        response = await breakReportService.getDetailedReport(params);
      }

      if (response.success) {
        if (viewMode === 'summary') {
          // Summary view - response.data might be an array or object with employees array
          let summaryData = [];
          if (Array.isArray(response.data)) {
            summaryData = response.data;
          } else if (response.data && typeof response.data === 'object') {
            // Check if employees array exists
            summaryData = response.data.employees || response.data.summary || [];
            // If summary is an array, use it directly
            if (!Array.isArray(summaryData)) {
              summaryData = [];
            }
          }
          setSummaryData(summaryData);
          calculateSummaryStatistics(summaryData, response.data?.summary);
        } else {
          // Detailed view - extract employees array from response.data
          let employeesData = [];
          if (Array.isArray(response.data)) {
            employeesData = response.data;
          } else if (response.data && typeof response.data === 'object') {
            employeesData = response.data.employees || [];
            // Ensure it's an array
            if (!Array.isArray(employeesData)) {
              employeesData = [];
            }
          }
          setReportData(employeesData);
          calculateStatistics(employeesData);
          
          // Update statistics from summary if available
          if (response.data?.summary && typeof response.data.summary === 'object') {
            setStatistics({
              totalBreaks: response.data.summary.totalBreaks || 0,
              totalEmployees: response.data.summary.totalEmployees || 0,
              totalDuration: response.data.summary.totalDuration || '00:00:00',
              averageDuration: response.data.summary.averageDuration || '00:00:00'
            });
          }
        }
      } else {
        toast.error(response.message || 'Failed to fetch break report');
        setReportData([]);
        setSummaryData(null);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch break report');
      setReportData([]);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeReport = async (empId) => {
    setLoading(true);
    try {
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate
      };
      const response = await breakReportService.getEmployeeReport(empId, params);
      
      if (response.success) {
        // Employee report might return breaks array directly or nested in data
        const breaksData = Array.isArray(response.data)
          ? response.data
          : (response.data?.breaks || response.data?.employee?.breaks || []);
        setEmployeeBreakData(breaksData);
        setShowEmployeeModal(true);
      } else {
        toast.error(response.message || 'Failed to fetch employee break report');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch employee break report');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (data) => {
    // Ensure data is an array
    if (!data || !Array.isArray(data) || data.length === 0) {
      setStatistics({
        totalBreaks: 0,
        totalEmployees: 0,
        totalDuration: '00:00:00',
        averageDuration: '00:00:00'
      });
      return;
    }

    const uniqueEmployees = new Set(data.map(item => item.empId || item.employee?.empId));
    let totalSeconds = 0;
    let breakCount = 0;

    data.forEach(item => {
      if (item.breaks && Array.isArray(item.breaks)) {
        item.breaks.forEach(breakItem => {
          // Use durationSeconds if available (preferred)
          if (breakItem.durationSeconds !== undefined) {
            totalSeconds += breakItem.durationSeconds;
            breakCount++;
          } 
          // Fallback: use durationMinutes
          else if (breakItem.durationMinutes !== undefined) {
            totalSeconds += breakItem.durationMinutes * 60;
            breakCount++;
          }
          // Fallback: parse duration string if available
          else if (breakItem.duration) {
            const durationParts = breakItem.duration.split(':');
            if (durationParts.length === 3) {
              const hours = parseInt(durationParts[0]) || 0;
              const minutes = parseInt(durationParts[1]) || 0;
              const seconds = parseInt(durationParts[2]) || 0;
              totalSeconds += hours * 3600 + minutes * 60 + seconds;
              breakCount++;
            }
          }
          // Fallback: calculate from start and end time
          else if (breakItem.startTime && breakItem.endTime) {
            const start = new Date(breakItem.startTime);
            const end = new Date(breakItem.endTime);
            const diffSeconds = Math.floor((end - start) / 1000);
            totalSeconds += diffSeconds;
            breakCount++;
          }
        });
      }
    });

    const avgSeconds = breakCount > 0 ? Math.floor(totalSeconds / breakCount) : 0;
    const totalDuration = formatDuration(totalSeconds);
    const averageDuration = formatDuration(avgSeconds);

    setStatistics({
      totalBreaks: breakCount,
      totalEmployees: uniqueEmployees.size,
      totalDuration,
      averageDuration
    });
  };

  const calculateSummaryStatistics = (data, summaryObj) => {
    // Ensure data is an array
    if (!data || !Array.isArray(data) || data.length === 0) {
      setStatistics({
        totalBreaks: 0,
        totalEmployees: 0,
        totalDuration: '00:00:00',
        averageDuration: '00:00:00'
      });
      return;
    }

    let totalBreaks = 0;
    let totalDurationMinutes = 0;
    
    data.forEach(item => {
      totalBreaks += item.totalBreaks ?? item.breakCount ?? 0;
      totalDurationMinutes += item.totalDurationMinutes || 0;
    });

    // Use summary object if available (more accurate)
    if (summaryObj && typeof summaryObj === 'object') {
      const totalMinutes = summaryObj.totalDurationMinutes || totalDurationMinutes;
      const avgMinutes = summaryObj.averageDurationPerBreak 
        ? parseFloat(summaryObj.averageDurationPerBreak) 
        : (totalBreaks > 0 ? totalMinutes / totalBreaks : 0);
      
      // Format total duration (without seconds)
      const totalHours = Math.floor(totalMinutes / 60);
      const totalMins = totalMinutes % 60;
      const totalDurationFormatted = totalHours > 0 
        ? `${totalHours}h ${totalMins}m` 
        : `${totalMins}m`;
      
      // Format average duration (without seconds)
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = Math.floor(avgMinutes % 60);
      const avgDurationFormatted = avgHours > 0 
        ? `${avgHours}h ${avgMins}m` 
        : `${avgMins}m`;

      setStatistics({
        totalBreaks: summaryObj.totalBreaks || totalBreaks,
        totalEmployees: summaryObj.totalEmployees || data.length,
        totalDuration: totalDurationFormatted,
        averageDuration: avgDurationFormatted
      });
    } else {
      // Calculate from employees array
      const avgMinutes = totalBreaks > 0 ? totalDurationMinutes / totalBreaks : 0;
      
      // Format total duration (without seconds)
      const totalHours = Math.floor(totalDurationMinutes / 60);
      const totalMins = totalDurationMinutes % 60;
      const totalDurationFormatted = totalHours > 0 
        ? `${totalHours}h ${totalMins}m` 
        : `${totalMins}m`;
      
      // Format average duration (without seconds)
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = Math.floor(avgMinutes % 60);
      const avgDurationFormatted = avgHours > 0 
        ? `${avgHours}h ${avgMins}m` 
        : `${avgMins}m`;

      setStatistics({
        totalBreaks,
        totalEmployees: data.length,
        totalDuration: totalDurationFormatted,
        averageDuration: avgDurationFormatted
      });
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatBreakDurationFromMinutes = (minutes) => {
    if (!minutes && minutes !== 0) return '0m';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes > 0) {
        return `${hours}h ${remainingMinutes}m`;
      }
      return `${hours}h`;
    }
    return `${minutes}m`;
  };

  const formatBreakDuration = (breakItem) => {
    // Check if duration is already formatted
    if (breakItem.duration) {
      // Remove seconds from formatted duration if present
      return breakItem.duration.replace(/:\d{2}$/, '').replace(/\s*\d+s/g, '');
    }
    
    // Use durationMinutes and durationSeconds if available
    if (breakItem.durationMinutes !== undefined || breakItem.durationSeconds !== undefined) {
      const minutes = breakItem.durationMinutes || 0;
      
      // Format as "Xm" or "Xh Ym" (no seconds)
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes > 0) {
          return `${hours}h ${remainingMinutes}m`;
        }
        return `${hours}h`;
      } else if (minutes > 0) {
        return `${minutes}m`;
      } else {
        return '0m';
      }
    }
    
    // Fallback: calculate from start and end time
    if (breakItem.startTime && breakItem.endTime) {
      const start = new Date(breakItem.startTime);
      const end = new Date(breakItem.endTime);
      const diffMinutes = Math.floor((end - start) / 60000); // Convert to minutes
      
      if (diffMinutes >= 60) {
        const hours = Math.floor(diffMinutes / 60);
        const remainingMinutes = diffMinutes % 60;
        if (remainingMinutes > 0) {
          return `${hours}h ${remainingMinutes}m`;
        }
        return `${hours}h`;
      } else if (diffMinutes > 0) {
        return `${diffMinutes}m`;
      } else {
        return '0m';
      }
    }
    
    return 'N/A';
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      department: '',
      empId: ''
    });
  };

  const handleViewEmployee = (employee) => {
    const empId = employee.empId || employee.employee?.empId;
    if (empId) {
      setSelectedEmployee(employee);
      fetchEmployeeReport(empId);
    }
  };

  // Pagination helpers
  const paginated = (arr) => {
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    return arr.slice(start, end);
  };

  const getCurrentData = () => {
    if (viewMode === 'summary') {
      return summaryData || [];
    }
    return reportData || [];
  };

  const currentData = getCurrentData();
  const totalPages = Math.max(1, Math.ceil(currentData.length / recordsPerPage));
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = Math.min(startIndex + recordsPerPage, currentData.length);

  // Smart pagination: show limited page numbers
  const getPageNumbers = () => {
    const maxVisible = 7; // Maximum number of page buttons to show
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages = [];
    const halfVisible = Math.floor(maxVisible / 2);
    
    if (currentPage <= halfVisible + 1) {
      // Near the start
      for (let i = 1; i <= maxVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    } else if (currentPage >= totalPages - halfVisible) {
      // Near the end
      pages.push(1);
      for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // In the middle
      pages.push(1);
      for (let i = currentPage - halfVisible + 1; i <= currentPage + halfVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="p-6">
      <div className="w-full">
        {/* Top Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          
          {/* Stats Row */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  {/* Total Breaks */}
  <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
    <div className="flex items-center gap-4 w-full">
      <div className="w-14 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
        {statistics.totalBreaks}
      </div>
      <span className="text-gray-600 font-medium text-lg flex-1 text-center">Total Breaks</span>
    </div>
  </div>

  {/* Total Employees */}
  <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
    <div className="flex items-center gap-4 w-full">
      <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 font-bold text-2xl">
        {statistics.totalEmployees}
      </div>
      <span className="text-gray-600 font-medium text-lg flex-1 text-center">Total Employees</span>
    </div>
  </div>
</div>

          {/* Search & View Mode Row */}
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
             <div className="relative flex-1 w-full">
                <input 
                  type="text" 
                  name="empId"
                  value={filters.empId}
                  onChange={handleFilterChange}
                  placeholder="Search Employee ID..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
             </div>

             {/* View Mode Toggle */}
             <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="flex bg-gray-100 p-1.5 rounded-xl">
                    <button
                        onClick={() => setViewMode('detailed')}
                        className={`px-4 py-1.5 rounded-lg text-base font-medium transition-all ${
                            viewMode === 'detailed' 
                            ? 'bg-white text-gray-900' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Detailed
                    </button>
                    <button
                        onClick={() => setViewMode('summary')}
                        className={`px-4 py-1.5 rounded-lg text-base font-medium transition-all ${
                            viewMode === 'summary' 
                            ? 'bg-white text-gray-900' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Summary
                    </button>
                </div>
             </div>
          </div>

          {/* Filters & Actions Row */}
          <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
            
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-1 items-end">
               <div className="w-full md:flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Start Date</label>
                  <div className="relative">
                    <input 
                        type="date" 
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
               </div>

               <div className="w-full md:flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">End Date</label>
                  <div className="relative">
                    <input 
                        type="date" 
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
               </div>

               <div className="w-full md:flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Department</label>
                  <div className="relative">
                      <select
                        name="department"
                        value={filters.department}
                        onChange={handleFilterChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none text-sm"
                      >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
               </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full xl:w-auto justify-end mt-5">
               <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-xl transition-colors font-medium"
                  title="Clear Filters"
                >
                  <X className="w-5 h-5" />
                  Clear
                </button>
                <button
                  onClick={fetchReport}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-xl transition-colors font-medium"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading break report...</p>
            </div>
          ) : viewMode === 'summary' ? (
            summaryData && summaryData.length > 0 ? (
              <>
              <table className="w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">S.NO</th>
                    <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">EMPLOYEE</th>
                    <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">EMPLOYEE ID</th>
                    <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">DEPARTMENT</th>
                    <th className="text-center py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">BREAK COUNT</th>
                    <th className="text-center py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">STATUS</th>
                    <th className="text-center py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">ACTION</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginated(summaryData).map((item, index) => (
                    <tr key={item.empId || index} className="transition duration-100 border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap text-base font-medium text-gray-900">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-6 h-6 text-blue-600" />
                          <div>
                            <p className="text-base font-semibold text-gray-900">{item.employeeName || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-700">
                        {item.empId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-700">
                        {item.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 align-middle text-center">
                        <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                          {item.totalBreaks ?? item.breakCount ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle text-center">
                        {item.isCurrentlyOnBreak ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              ON BREAK
                            </span>
                            {item.currentBreak && (
                              <div className="text-xs text-gray-600 mt-1">
                                <p>Started: {new Date(item.currentBreak.startTime).toLocaleTimeString()}</p>
                                {item.currentBreak.durationMinutes !== undefined && (
                                  <p>Duration: {formatBreakDurationFromMinutes(item.currentBreak.durationMinutes)}</p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            AVAILABLE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewEmployee(item)}
                            className="flex items-center gap-1 bg-transparent text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500/30 transition border border-blue-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center">
                  <Coffee className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-lg font-medium text-gray-600">No break data found</p>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                </div>
              </div>
            )
          ) : (
            reportData && reportData.length > 0 ? (
              <>
              <table className="w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">S.NO</th>
                    <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">EMPLOYEE</th>
                    <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">EMPLOYEE ID</th>
                    <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">DEPARTMENT</th>
                    <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">BREAKS</th>
                    <th className="text-center py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">STATUS</th>
                    <th className="text-center py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">ACTION</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginated(reportData).map((item, index) => {
                    const employee = item.employee || item;
                    const breaks = item.breaks || [];
                    return (
                      <tr key={item.empId || employee?.empId || index} className="transition duration-100 border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap text-base font-medium text-gray-900">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-6 h-6 text-blue-600" />
                            <div>
                              <p className="text-base font-semibold text-gray-900">{employee?.employeeName || employee?.name || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-700">
                          {item.empId || employee?.empId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-700">
                          {employee?.department || item.department || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="mb-2">
                              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                                {breaks.length}
                              </span>
                            </div>
                            {breaks.length > 0 ? (
                              breaks.slice(0, 2).map((breakItem, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-semibold text-gray-700">
                                    {new Date(breakItem.startTime).toLocaleDateString()} {new Date(breakItem.startTime).toLocaleTimeString()}
                                  </span>
                                  <span className="text-gray-500 ml-2">({formatBreakDuration(breakItem)})</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400">No breaks</span>
                            )}
                            {breaks.length > 2 && (
                              <p className="text-xs text-blue-600 font-semibold">+{breaks.length - 2} more</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle text-center">
                          {item.isCurrentlyOnBreak ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                ON BREAK
                              </span>
                              {item.currentBreak && (
                                <div className="text-xs text-gray-600 mt-1">
                                  <p>Started: {new Date(item.currentBreak.startTime).toLocaleTimeString()}</p>
                                  {item.currentBreak.durationMinutes !== undefined && (
                                    <p>Duration: {formatBreakDurationFromMinutes(item.currentBreak.durationMinutes)}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              AVAILABLE
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewEmployee(item)}
                              className="flex items-center gap-1 bg-transparent text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500/30 transition border border-blue-200"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center">
                  <Coffee className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-lg font-medium text-gray-600">No break data found</p>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Pagination Controls */}
        {currentData.length > 0 && totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 px-4 py-3 border border-gray-200 rounded-xl bg-white">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {endIndex} of {currentData.length} entries
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <div className="hidden md:flex gap-1">
                {getPageNumbers().map((page, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsisBefore && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
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
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
           

      {/* Employee Break Details Modal */}
      {showEmployeeModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={SOFT.header}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Employee Break Details</h3>
                <button
                  onClick={() => {
                    setShowEmployeeModal(false);
                    setSelectedEmployee(null);
                    setEmployeeBreakData([]);
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Employee Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-6 h-6 text-blue-600" />
                  <h4 className="text-lg font-bold text-gray-800">
                    {selectedEmployee.employee?.employeeName || selectedEmployee.employeeName || 'N/A'}
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Employee ID:</span>
                    <span className="ml-2 font-semibold">{selectedEmployee.empId || selectedEmployee.employee?.empId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Department:</span>
                    <span className="ml-2 font-semibold">{selectedEmployee.employee?.department || selectedEmployee.department || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Break Details Table */}
              {employeeBreakData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase">Start Time</th>
                        <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase">End Time</th>
                        <th className="text-center py-3 px-6 text-gray-800 font-bold text-sm uppercase">Duration</th>
                        <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {employeeBreakData.map((breakItem, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {breakItem.startTime ? new Date(breakItem.startTime).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {breakItem.endTime ? new Date(breakItem.endTime).toLocaleString() : 'Ongoing'}
                          </td>
                          <td className="px-6 py-4 align-middle text-center">
                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                              {formatBreakDuration(breakItem)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              breakItem.status === 'completed' || breakItem.endTime 
                                ? 'bg-green-100 text-green-700' 
                                : breakItem.status === 'ongoing'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {breakItem.status === 'completed' ? 'Completed' : 
                               breakItem.status === 'ongoing' ? 'Ongoing' :
                               breakItem.status === 'overdue' ? 'Overdue' :
                               breakItem.endTime ? 'Completed' : 'Ongoing'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Coffee className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No break details available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreakReport;

