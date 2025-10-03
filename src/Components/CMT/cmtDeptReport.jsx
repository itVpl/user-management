import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload, FaEye, FaFileAlt } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Users, Calendar, Eye, Search, BarChart3 } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import API_CONFIG from '../../config/api.js';

export default function CmtDeptReport() {
  const [reportData, setReportData] = useState([]);
  const [statistics, setStatistics] = useState({
    totalReports: 0,
    approvedReports: 0,
    rejectedReports: 0,
    pendingReports: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    totalValue: 0
  });
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reportNameFilter, setReportNameFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [cmtEmployees, setCmtEmployees] = useState([]);
  const [reportNameSearch, setReportNameSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [isReportNameDropdownOpen, setIsReportNameDropdownOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    fetchCmtEmployees();
  }, []);

  // Fetch report data when filters change
  useEffect(() => {
    if (reportNameFilter && employeeFilter && dateFilter) {
      fetchReportData();
    } else {
      setReportData([]);
      setStatistics({
        totalReports: 0,
        approvedReports: 0,
        rejectedReports: 0,
        pendingReports: 0,
        totalEmployees: 0,
        activeEmployees: 0,
        inactiveEmployees: 0,
        totalValue: 0
      });
    }
  }, [reportNameFilter, employeeFilter, dateFilter]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setIsEmployeeDropdownOpen(false);
        setIsReportNameDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset to first page when search term, filter, or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, reportNameFilter, employeeFilter, dateFilter]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const selectedEmployee = cmtEmployees.find(emp => emp.employeeName === employeeFilter);
      const empId = selectedEmployee?.empId;
      
      if (!empId) {
        console.error('Employee ID not found for:', employeeFilter);
        return;
      }

      console.log('Fetching report data for:', {
        reportName: reportNameFilter,
        employee: employeeFilter,
        empId: empId,
        date: dateFilter
      });

      let apiEndpoint = '';
      let reportType = '';

      // Determine API endpoint based on report name
      switch (reportNameFilter) {
        case 'Daily Carries Added Report':
          apiEndpoint = `/api/v1/cmt-reports/carries-added?date=${dateFilter}&empId=${empId}`;
          reportType = 'carries';
          break;
        case 'Daily Talktime Report':
          apiEndpoint = `/api/v1/cmt-reports/talktime?date=${dateFilter}&empId=${empId}`;
          reportType = 'talktime';
          break;
        case 'Daily Target Completion Report':
          apiEndpoint = `/api/v1/cmt-reports/target-completion?date=${dateFilter}&empId=${empId}`;
          reportType = 'target';
          break;
        case 'Daily Bids Placed Report':
          apiEndpoint = `/api/v1/cmt-reports/bids-placed?date=${dateFilter}&empId=${empId}`;
          reportType = 'bids';
          break;
        default:
          console.error('Unknown report type:', reportNameFilter);
          return;
      }

      const res = await axios.get(`${API_CONFIG.BASE_URL}${apiEndpoint}`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      console.log('Report API Response:', res.data);

      if (res.data && res.data.success) {
        const data = res.data.data;
        const processedData = processReportData(data, reportType, reportNameFilter);
        setReportData(processedData);
        
        // Calculate statistics based on report type
        const stats = calculateStatistics(processedData, reportType);
        setStatistics(stats);
      } else {
        console.error('API response format error:', res.data);
        setReportData([]);
        setStatistics({
          totalReports: 0,
          approvedReports: 0,
          rejectedReports: 0,
          pendingReports: 0,
          totalEmployees: 0,
          activeEmployees: 0,
          inactiveEmployees: 0,
          totalValue: 0
        });
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setReportData([]);
      setStatistics({
        totalReports: 0,
        approvedReports: 0,
        rejectedReports: 0,
        pendingReports: 0,
        totalEmployees: 0,
        activeEmployees: 0,
        inactiveEmployees: 0,
        totalValue: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to process report data based on type
  const processReportData = (data, reportType, reportName) => {
    const baseData = {
      reportName: reportName,
      date: data.date,
      employee: data.employee,
      createdAt: new Date().toISOString()
    };

    switch (reportType) {
      case 'carries':
        return data.carriersAdded.details.map(carrier => ({
          ...baseData,
          id: carrier._id,
          status: carrier.status,
          compName: carrier.compName,
          mcDotNo: carrier.mc_dot_no,
          phoneNo: carrier.phoneNo,
          email: carrier.email,
          userId: carrier.userId,
          type: 'carrier'
        }));
      
      case 'talktime':
        return data.talktime.callRecords.map(call => ({
          ...baseData,
          id: call.callId,
          status: call.answered === 'Answered' ? 'answered' : 'missed',
          caller: call.caller,
          callerName: call.callerName,
          callee: call.callee,
          talkTime: call.talkTime,
          startTime: call.startTime,
          direction: call.direction,
          type: 'call'
        }));
      
      case 'target':
        return [{
          ...baseData,
          id: 'target-' + data.date,
          status: data.overallCompletion.completed ? 'completed' : 'incomplete',
          talkTimeTarget: data.targets.talkTime.target,
          talkTimeActual: data.targets.talkTime.actual,
          truckersTarget: data.targets.truckers.target,
          truckersActual: data.targets.truckers.actual,
          overallProgress: data.overallCompletion.progress,
          type: 'target'
        }];
      
      case 'bids':
        return data.bidsPlaced.details.map(bid => ({
          ...baseData,
          id: bid._id,
          status: bid.status.toLowerCase(),
          carrierName: bid.carrier.compName,
          mcDotNo: bid.carrier.mc_dot_no,
          rate: bid.rate,
          message: bid.message,
          pickupDate: bid.load.pickupDate,
          deliveryDate: bid.load.deliveryDate,
          type: 'bid'
        }));
      
      default:
        return [];
    }
  };

  // Helper function to calculate statistics
  const calculateStatistics = (data, reportType) => {
    const total = data.length;
    let approved = 0, rejected = 0, pending = 0, totalValue = 0;

    switch (reportType) {
      case 'carries':
        approved = data.filter(d => d.status === 'accountant_approved' || d.status === 'approved').length;
        rejected = data.filter(d => d.status === 'rejected').length;
        pending = data.filter(d => d.status === 'pending').length;
        break;
      
      case 'talktime':
        approved = data.filter(d => d.status === 'answered').length;
        rejected = data.filter(d => d.status === 'missed').length;
        pending = 0;
        // Calculate total talk time in hours
        totalValue = data.reduce((sum, d) => {
          if (d.talkTime) {
            const timeStr = d.talkTime.toString().toLowerCase();
            
            // Handle different time formats
            if (timeStr.includes('h') && timeStr.includes('m')) {
              // Format: "2h 30m" or "2h30m"
              const hoursMatch = timeStr.match(/(\d+)h/);
              const minutesMatch = timeStr.match(/(\d+)m/);
              const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
              const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
              return sum + hours + (minutes / 60);
            } else if (timeStr.includes('h')) {
              // Format: "2h" or "2.5h"
              const hoursMatch = timeStr.match(/(\d+(?:\.\d+)?)h/);
              return sum + (hoursMatch ? parseFloat(hoursMatch[1]) : 0);
            } else if (timeStr.includes('m')) {
              // Format: "30m" or "90m"
              const minutesMatch = timeStr.match(/(\d+(?:\.\d+)?)m/);
              return sum + (minutesMatch ? parseFloat(minutesMatch[1]) / 60 : 0);
            } else if (!isNaN(parseFloat(timeStr))) {
              // Format: just numbers (assume minutes if < 100, hours if >= 100)
              const num = parseFloat(timeStr);
              return sum + (num < 100 ? num / 60 : num);
            }
          }
          return sum;
        }, 0);
        break;
      
      case 'target':
        approved = data.filter(d => d.status === 'completed').length;
        rejected = data.filter(d => d.status === 'incomplete').length;
        pending = 0;
        // Calculate total talktime and truckers for target completion
        totalValue = data.reduce((sum, d) => sum + (d.talkTimeActual || 0), 0);
        break;
      
      case 'bids':
        approved = data.filter(d => d.status === 'accepted').length;
        rejected = data.filter(d => d.status === 'rejected').length;
        pending = data.filter(d => d.status === 'pending').length;
        totalValue = data.reduce((sum, d) => sum + (d.rate || 0), 0);
        break;
    }

    return {
      totalReports: total,
      approvedReports: approved,
      rejectedReports: rejected,
      pendingReports: pending,
      totalEmployees: reportType === 'target' ? data.reduce((sum, d) => sum + (d.truckersActual || 0), 0) : 1, // For target: total truckers, others: single employee per report
      activeEmployees: approved,
      inactiveEmployees: rejected,
      totalValue: totalValue
    };
  };

  const fetchCmtEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      console.log('Fetching CMT employees with token:', token ? 'Token exists' : 'No token');
      
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/CMT`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      console.log('Full API Response:', res);
      console.log('Response Status:', res.status);
      console.log('Response Data:', res.data);
      console.log('Data Type:', typeof res.data);
      console.log('Is Array:', Array.isArray(res.data));
      
      if (res.data && Array.isArray(res.data)) {
        console.log(`✅ Loaded ${res.data.length} CMT employees directly from array`);
        console.log('First employee:', res.data[0]);
        setCmtEmployees(res.data);
      } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
        console.log(`✅ Loaded ${res.data.data.length} CMT employees from data property`);
        console.log('First employee:', res.data.data[0]);
        setCmtEmployees(res.data.data);
      } else if (res.data && res.data.employees && Array.isArray(res.data.employees)) {
        console.log(`✅ Loaded ${res.data.employees.length} CMT employees from employees property`);
        console.log('First employee:', res.data.employees[0]);
        setCmtEmployees(res.data.employees);
      } else {
        console.error('❌ Unexpected API response format:', res.data);
        // Fallback: Use hardcoded data for testing
        console.log('🔄 Using fallback hardcoded data');
        const fallbackEmployees = [
          {
            _id: "6851489a7cedeb7a7360481b",
            empId: "VPL003",
            employeeName: "Prashu",
            designation: "Frontend Developer",
            department: "CMT"
          },
          {
            _id: "685514b6451d0d5b8c679445", 
            empId: "VPL012",
            employeeName: "Varun Taneja",
            designation: "Ops Executive",
            department: "CMT"
          },
          {
            _id: "685515d6451d0d5b8c679455",
            empId: "VPL013", 
            employeeName: "Maheshwar",
            designation: "Operation Executive",
            department: "CMT"
          }
        ];
        setCmtEmployees(fallbackEmployees);
      }
    } catch (err) {
      console.error('❌ API Error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      // Fallback: Use hardcoded data for testing
      console.log('🔄 Using fallback hardcoded data due to API error');
      const fallbackEmployees = [
        {
          _id: "6851489a7cedeb7a7360481b",
          empId: "VPL003",
          employeeName: "Prashu",
          designation: "Frontend Developer",
          department: "CMT"
        },
        {
          _id: "685514b6451d0d5b8c679445", 
          empId: "VPL012",
          employeeName: "Varun Taneja",
          designation: "Ops Executive",
          department: "CMT"
        },
        {
          _id: "685515d6451d0d5b8c679455",
          empId: "VPL013", 
          employeeName: "Maheshwar",
          designation: "Operation Executive",
          department: "CMT"
        }
      ];
      setCmtEmployees(fallbackEmployees);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      const { departmentId } = selectedDepartment || {};
      if (!departmentId) return;

      if (status === 'approved') {
        const response = await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/department/approval/accountant/${departmentId}`,
          { approvalReason: reason?.trim() || "Department report verified and approved" },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (response.data.success) {
          alertify.success('✅ Department report approved successfully!');
        }
      } else if (status === 'rejected') {
        const response = await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/department/approval/reject/${departmentId}`,
          { rejectionReason: reason?.trim() || "Department report verification failed", step: "accountant_rejection" },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (response.data.success) {
          alertify.error('❌ Department report rejected successfully!');
        }
      }
      setModalType(null);
      setReason('');
      setSelectedDepartment(null);
      setViewDoc(false);
      fetchDepartmentReports();
    } catch (err) {
      console.error('Status update failed:', err);
      alertify.error(`❌ Error: ${err.response?.data?.message || err.message}`);
    }
  };

  // Helpers
  const statusColor = (status) => {
    if (!status) return 'bg-yellow-100 text-yellow-700';
    if (status === 'approved' || status === 'accountant_approved') return 'bg-green-100 text-green-700';
    if (status === 'rejected' || status === 'missed') return 'bg-red-100 text-red-700';
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

  // CSV Export Function
  const exportToCSV = () => {
    if (filteredReports.length === 0) {
      return;
    }

    let csvContent = '';
    let headers = [];
    let filename = '';

    // Generate headers and filename based on report type
    switch (reportNameFilter) {
      case 'Daily Carries Added Report':
        headers = ['Company Name', 'MC/DOT No', 'Phone No', 'Email', 'Status', 'Date'];
        filename = `Daily_Carries_Added_Report_${dateFilter || 'All_Dates'}.csv`;
        break;
      
      case 'Daily Talktime Report':
        headers = ['Called No', 'Call Time', 'Call Duration', 'Call Status', 'Date'];
        filename = `Daily_Talktime_Report_${dateFilter || 'All_Dates'}.csv`;
        break;
      
      case 'Daily Target Completion Report':
        headers = ['Talktime', 'Truckers', 'Status', 'Date'];
        filename = `Daily_Target_Completion_Report_${dateFilter || 'All_Dates'}.csv`;
        break;
      
      case 'Daily Bids Placed Report':
        headers = ['Company Name', 'MC/DOT No', 'Rate', 'Status', 'Date'];
        filename = `Daily_Bids_Placed_Report_${dateFilter || 'All_Dates'}.csv`;
        break;
      
      default:
        headers = ['Report Type', 'Employee', 'Details', 'Status', 'Date'];
        filename = `CMT_Reports_${dateFilter || 'All_Dates'}.csv`;
    }

    // Add headers to CSV
    csvContent += headers.join(',') + '\n';

    // Add data rows
    filteredReports.forEach(report => {
      let row = [];
      
      switch (reportNameFilter) {
        case 'Daily Carries Added Report':
          row = [
            `"${report.compName || ''}"`,
            `"${report.mcDotNo || ''}"`,
            `"${report.phoneNo || ''}"`,
            `"${report.email || ''}"`,
            `"${report.status || ''}"`,
            `"${new Date(report.date).toLocaleDateString()}"`
          ];
          break;
        
        case 'Daily Talktime Report':
          row = [
            `"${report.caller || ''}"`,
            `"${report.startTime || ''}"`,
            `"${report.talkTime || ''}"`,
            `"${report.status === 'answered' ? 'Answered' : 'Missed'}"`,
            `"${new Date(report.date).toLocaleDateString()}"`
          ];
          break;
        
        case 'Daily Target Completion Report':
          row = [
            `"${report.talkTimeActual}h / ${report.talkTimeTarget}h"`,
            `"${report.truckersActual} / ${report.truckersTarget}"`,
            `"${report.status === 'completed' ? 'Completed' : 'Incomplete'}"`,
            `"${new Date(report.date).toLocaleDateString()}"`
          ];
          break;
        
        case 'Daily Bids Placed Report':
          row = [
            `"${report.carrierName || ''}"`,
            `"${report.mcDotNo || ''}"`,
            `"${report.rate || 0}"`,
            `"${report.status || ''}"`,
            `"${new Date(report.date).toLocaleDateString()}"`
          ];
          break;
        
        default:
          row = [
            `"${report.reportName || ''}"`,
            `"${report.employee?.employeeName || ''}"`,
            `"${report.type === 'carrier' ? report.compName : 
               report.type === 'call' ? report.callerName : 
               report.type === 'target' ? `Talk Time: ${report.talkTimeActual}h / ${report.talkTimeTarget}h` :
               report.type === 'bid' ? report.carrierName : ''}"`,
            `"${report.status || ''}"`,
            `"${new Date(report.date).toLocaleDateString()}"`
          ];
      }
      
      csvContent += row.join(',') + '\n';
    });

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------- FILTER + SORT (memoized) --------
  const filteredReports = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return (reportData || [])
      .filter(report => {
        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'approved' && !(report.status === 'approved' || report.status === 'accountant_approved' || report.status === 'answered' || report.status === 'accepted' || report.status === 'completed')) return false;
          if (statusFilter === 'rejected' && !(report.status === 'rejected' || report.status === 'missed' || report.status === 'incomplete')) return false;
          if (statusFilter === 'pending' && report.status !== 'pending') return false;
        }

        // Search filter - search across all fields
        if (!term) return true;

        const reportName = report.reportName?.toLowerCase() || '';
        const employeeName = report.employee?.employeeName?.toLowerCase() || '';
        const compName = report.compName?.toLowerCase() || '';
        const mcDotNo = report.mcDotNo?.toLowerCase() || '';
        const carrierName = report.carrierName?.toLowerCase() || '';

        return (
          reportName.includes(term) ||
          employeeName.includes(term) ||
          compName.includes(term) ||
          carrierName.includes(term) ||
          mcDotNo.includes(term)
        );
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [reportData, statusFilter, searchTerm]);

  // -------- PAGINATION derived from FILTERED list (bug fix) --------
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReports = filteredReports.slice(startIndex, endIndex);

  // Format currency (reserved for any budget cells later)
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  if (employeesLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading CMT employees...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading CMT reports...</p>
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
          {/* Daily Carries Added Report - Only Total */}
          {reportNameFilter === 'Daily Carries Added Report' && (
            <div
              className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold text-gray-800">{statistics.totalReports}</p>
                </div>
              </div>
            </div>
          )}

          {/* Daily Talktime Report - Total Calls, Answered, Missed */}
          {reportNameFilter === 'Daily Talktime Report' && (
            <>
              <div
                className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Phone className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Calls</p>
                    <p className="text-xl font-bold text-gray-800">{statistics.totalReports}</p>
                  </div>
                </div>
              </div>

              <div
                className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'approved' ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
                onClick={() => setStatusFilter('approved')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Answered</p>
                    <p className="text-xl font-bold text-green-600">{statistics.approvedReports}</p>
                  </div>
                </div>
              </div>

              <div
                className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'rejected' ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                onClick={() => setStatusFilter('rejected')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <XCircle className="text-red-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Missed</p>
                    <p className="text-xl font-bold text-red-600">{statistics.rejectedReports}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Daily Target Completion Report - Talktime, Truckers */}
          {reportNameFilter === 'Daily Target Completion Report' && (
            <>
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Clock className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Talktime</p>
                    <p className="text-xl font-bold text-purple-600">{parseFloat(statistics.totalValue).toFixed(2)}h</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Truckers</p>
                    <p className="text-xl font-bold text-blue-600">{statistics.totalEmployees}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Daily Bids Placed Report - Total, Accepted, Rejected */}
          {reportNameFilter === 'Daily Bids Placed Report' && (
            <>
              <div
                className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-800">{statistics.totalReports}</p>
                  </div>
                </div>
              </div>

              <div
                className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'approved' ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
                onClick={() => setStatusFilter('approved')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Accepted</p>
                    <p className="text-xl font-bold text-green-600">{statistics.approvedReports}</p>
                  </div>
                </div>
              </div>

              <div
                className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${statusFilter === 'rejected' ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                onClick={() => setStatusFilter('rejected')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <XCircle className="text-red-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rejected</p>
                    <p className="text-xl font-bold text-red-600">{statistics.rejectedReports}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search and Export */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Export to CSV Button */}
          {filteredReports.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium"
            >
              <FaDownload size={16} />
              Export to CSV
            </button>
          )}
        </div>
      </div>

      {/* Additional Filter Options */}
      <div className="flex items-center gap-4 mb-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Report Name:</label>
          <div className="relative w-48 dropdown-container">
            {/* Input Field */}
            <input
              type="text"
              placeholder="Select Report"
              value={reportNameFilter || ''}
              readOnly
              onClick={() => setIsReportNameDropdownOpen(!isReportNameDropdownOpen)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${isReportNameDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Dropdown Menu */}
            {isReportNameDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden">
                {/* Search Bar */}
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search reports..."
                      value={reportNameSearch}
                      onChange={(e) => setReportNameSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                {/* Options List */}
                <div className="max-h-48 overflow-y-auto">
                  <div
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setReportNameFilter('');
                      setIsReportNameDropdownOpen(false);
                      setReportNameSearch('');
                    }}
                  >
                    All Reports
                  </div>
                  {[
                    "Daily Carries Added Report",
                    "Daily Talktime Report", 
                    "Daily Target Completion Report",
                    "Daily Bids Placed Report"
                  ]
                  .filter(report => report.toLowerCase().includes(reportNameSearch.toLowerCase()))
                  .map((report, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setReportNameFilter(report);
                        setIsReportNameDropdownOpen(false);
                        setReportNameSearch('');
                      }}
                    >
                      {report}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Employee:</label>
          <div className="relative w-48 dropdown-container">
            {/* Input Field */}
            <input
              type="text"
              placeholder="Select Employee"
              value={employeeFilter || ''}
              readOnly
              onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${isEmployeeDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Dropdown Menu */}
            {isEmployeeDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden">
                {/* Search Bar */}
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                {/* Options List */}
                <div className="max-h-48 overflow-y-auto">
                  <div
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setEmployeeFilter('');
                      setIsEmployeeDropdownOpen(false);
                      setEmployeeSearch('');
                    }}
                  >
                    All Employees
                  </div>
                  {cmtEmployees
                    .filter(employee => {
                      const name = (employee.employeeName || employee.name || '').toLowerCase();
                      return name.includes(employeeSearch.toLowerCase());
                    })
                    .map((employee, index) => (
                      <div
                        key={employee._id || index}
                        className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setEmployeeFilter(employee.employeeName || employee.name);
                          setIsEmployeeDropdownOpen(false);
                          setEmployeeSearch('');
                        }}
                      >
                        {employee.employeeName || employee.name} ({employee.empId || 'N/A'})
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Date:</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 bg-white"
          />
        </div>
        
        <button
          onClick={() => {
            setReportNameFilter('');
            setEmployeeFilter('');
            setDateFilter('');
            setSearchTerm('');
            setStatusFilter('all');
            setReportNameSearch('');
            setEmployeeSearch('');
            setIsEmployeeDropdownOpen(false);
            setIsReportNameDropdownOpen(false);
          }}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 text-sm font-medium"
        >
          Clear All Filters
        </button>
      </div>

      {/* Table with Sticky Header + Scroll */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="relative max-h-[70vh] overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
              <tr>
                {/* Daily Carries Added Report Columns */}
                {reportNameFilter === 'Daily Carries Added Report' && (
                  <>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Company Name</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">MC/DOT No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Phone No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Email</th>
                  </>
                )}

                {/* Daily Talktime Report Columns */}
                {reportNameFilter === 'Daily Talktime Report' && (
                  <>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Called No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Call Time</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Call Duration</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Call Status</th>
                  </>
                )}

                {/* Daily Target Completion Report Columns */}
                {reportNameFilter === 'Daily Target Completion Report' && (
                  <>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Talktime</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Truckers</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Date</th>
                  </>
                )}

                {/* Daily Bids Placed Report Columns */}
                {reportNameFilter === 'Daily Bids Placed Report' && (
                  <>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Company Name</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">MC/DOT No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                  </>
                )}

                {/* Default columns when no report is selected */}
                {!reportNameFilter && (
                  <>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Report Type</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Employee</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Details</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Date</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {currentReports.map((report, index) => (
                <tr key={report.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  {/* Daily Carries Added Report Content */}
                  {reportNameFilter === 'Daily Carries Added Report' && (
                    <>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{report.compName}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-gray-700">{report.mcDotNo}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-gray-700">{report.phoneNo}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-gray-700">{report.email}</span>
                      </td>
                    </>
                  )}

                  {/* Daily Talktime Report Content */}
                  {reportNameFilter === 'Daily Talktime Report' && (
                    <>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{report.caller}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-gray-700">{report.startTime}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-gray-700">{report.talkTime}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusColor(report.status)}`}>
                          {report.status === 'answered' && <CheckCircle size={14} />}
                          {report.status === 'missed' && <XCircle size={14} />}
                          {report.status === 'answered' ? 'Answered' : 'Missed'}
                        </span>
                      </td>
                    </>
                  )}

                  {/* Daily Target Completion Report Content */}
                  {reportNameFilter === 'Daily Target Completion Report' && (
                    <>
                      <td className="py-2 px-3">
                        <span className="text-gray-700">{parseFloat(report.talkTimeActual).toFixed(2)}h / {report.talkTimeTarget}h</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-gray-700">{report.truckersActual} / {report.truckersTarget}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusColor(report.status)}`}>
                          {report.status === 'completed' && <CheckCircle size={14} />}
                          {report.status === 'incomplete' && <XCircle size={14} />}
                          {report.status === 'completed' ? 'Completed' : 'Incomplete'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-gray-700">{new Date(report.date).toLocaleDateString()}</span>
                      </td>
                    </>
                  )}

                  {/* Daily Bids Placed Report Content */}
                  {reportNameFilter === 'Daily Bids Placed Report' && (
                    <>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{report.carrierName}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-gray-700">{report.mcDotNo}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-gray-700">${report.rate}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusColor(report.status)}`}>
                          {report.status === 'accepted' && <CheckCircle size={14} />}
                          {report.status === 'rejected' && <XCircle size={14} />}
                          {report.status === 'pending' && <Clock size={14} />}
                          {report.status === 'accepted' ? 'Accepted' :
                            report.status === 'rejected' ? 'Rejected' :
                            report.status === 'pending' ? 'Pending' :
                            report.status || 'Pending'}
                        </span>
                      </td>
                    </>
                  )}

                  {/* Default content when no report is selected */}
                  {!reportNameFilter && (
                    <>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{report.reportName}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <p className="font-medium text-gray-700">{report.employee?.employeeName}</p>
                          <p className="text-sm text-gray-600">{report.employee?.empId}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-sm text-gray-700">
                          {report.type === 'carrier' && (
                            <div>
                              <p className="font-medium">{report.compName}</p>
                              <p className="text-xs text-gray-500">{report.mcDotNo}</p>
                            </div>
                          )}
                          {report.type === 'call' && (
                            <div>
                              <p className="font-medium">{report.callerName}</p>
                              <p className="text-xs text-gray-500">{report.talkTime}</p>
                            </div>
                          )}
                          {report.type === 'target' && (
                            <div>
                              <p className="font-medium">Talk Time: {report.talkTimeActual}h / {report.talkTimeTarget}h</p>
                              <p className="text-xs text-gray-500">Truckers: {report.truckersActual} / {report.truckersTarget}</p>
                            </div>
                          )}
                          {report.type === 'bid' && (
                            <div>
                              <p className="font-medium">{report.carrierName}</p>
                              <p className="text-xs text-gray-500">Rate: ${report.rate}</p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusColor(report.status)}`}>
                          {(report.status === 'approved' || report.status === 'accountant_approved' || report.status === 'answered' || report.status === 'accepted' || report.status === 'completed') && <CheckCircle size={14} />}
                          {(report.status === 'rejected' || report.status === 'missed' || report.status === 'incomplete') && <XCircle size={14} />}
                          {report.status === 'pending' && <Clock size={14} />}
                          {report.status === 'approved' ? 'Approved' :
                            report.status === 'accountant_approved' ? 'Accountant Approved' :
                            report.status === 'answered' ? 'Answered' :
                            report.status === 'accepted' ? 'Accepted' :
                            report.status === 'completed' ? 'Completed' :
                            report.status === 'rejected' ? 'Rejected' :
                            report.status === 'missed' ? 'Missed' :
                            report.status === 'incomplete' ? 'Incomplete' :
                            report.status === 'pending' ? 'Pending' :
                            report.status || 'Pending'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <p className="text-sm text-gray-800">{new Date(report.date).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">{report.employee?.designation}</p>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredReports.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No reports found matching your search' : 
                 (reportNameFilter && employeeFilter && dateFilter) ? 'No data found for selected filters' : 
                 'Select Report Name, Employee, and Date to view data'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 
                 'Please select all three filters to fetch report data'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredReports.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {filteredReports.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredReports.length)} of {filteredReports.length} reports
            {searchTerm && ` (filtered from ${reportData.length} total)`}
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
