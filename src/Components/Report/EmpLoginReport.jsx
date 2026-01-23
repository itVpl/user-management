import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Clock, Calendar, Search, Building, CheckCircle, XCircle } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';

export default function EmpLoginReport() {
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalLoginTime: 0,
    totalLoginTimeFormatted: '0h 0m',
    averageLoginTime: 0,
    averageLoginTimeFormatted: '0h 0m'
  });
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState(null);
  
  // Date range state
  const [range, setRange] = useState({
    startDate: null,
    endDate: null,
    key: 'selection'
  });
  const [dateFilterApplied, setDateFilterApplied] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);

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

  // Department options (hardcoded as fallback)
  useEffect(() => {
    // Try to fetch from API, but use hardcoded list as fallback
    const fetchDepartments = async () => {
      try {
        const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/departments`, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        });

        if (res.data && Array.isArray(res.data)) {
          setDepartments(res.data);
        } else if (res.data && res.data.departments && Array.isArray(res.data.departments)) {
          setDepartments(res.data.departments);
        } else {
          // Fallback to common departments
          setDepartments(['HR', 'Sales', 'Finance', 'CMT', 'QA']);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        // Fallback to common departments
        setDepartments(['HR', 'Sales', 'Finance', 'CMT', 'QA']);
      }
    };

    fetchDepartments();
  }, []);

  // Fetch employees when department is selected
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!selectedDepartment) {
        setEmployees([]);
        return;
      }

      try {
        const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/${selectedDepartment}`, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        });

        if (res.data && Array.isArray(res.data)) {
          setEmployees(res.data);
        } else if (res.data && res.data.employees && Array.isArray(res.data.employees)) {
          setEmployees(res.data.employees);
        } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
          setEmployees(res.data.data);
        } else {
          setEmployees([]);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
        setEmployees([]);
      }
    };

    fetchEmployees();
  }, [selectedDepartment]);

  // Fetch report data
  useEffect(() => {
    if (dateFilterApplied && range.startDate && range.endDate && selectedDepartment) {
      fetchReportData();
    } else {
      setReportData([]);
      setSummary({
        totalEmployees: 0,
        totalLoginTime: 0,
        totalLoginTimeFormatted: '0h 0m',
        averageLoginTime: 0,
        averageLoginTimeFormatted: '0h 0m'
      });
    }
  }, [dateFilterApplied, range.startDate, range.endDate, selectedDepartment, selectedEmployeeId]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      const queryParams = new URLSearchParams();
      queryParams.append('startDate', ymd(range.startDate));
      queryParams.append('endDate', ymd(range.endDate));
      queryParams.append('department', selectedDepartment);
      if (selectedEmployeeId) {
        queryParams.append('empId', selectedEmployeeId);
      }

      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/login-time-report?${queryParams.toString()}`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      if (res.data && res.data.success) {
        setReportData(res.data.data || []);
        setSummary(res.data.summary || {
          totalEmployees: 0,
          totalLoginTime: 0,
          totalLoginTimeFormatted: '0h 0m',
          averageLoginTime: 0,
          averageLoginTimeFormatted: '0h 0m'
        });
      } else {
        console.error('API response format error:', res.data);
        setReportData([]);
        setSummary({
          totalEmployees: 0,
          totalLoginTime: 0,
          totalLoginTimeFormatted: '0h 0m',
          averageLoginTime: 0,
          averageLoginTimeFormatted: '0h 0m'
        });
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      alertify.error('Failed to fetch login report data');
      setReportData([]);
      setSummary({
        totalEmployees: 0,
        totalLoginTime: 0,
        totalLoginTimeFormatted: '0h 0m',
        averageLoginTime: 0,
        averageLoginTimeFormatted: '0h 0m'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee.employeeName || employee.name);
    setSelectedEmployeeId(employee.empId);
  };

  const handleViewEmployeeDetails = (employeeData) => {
    setSelectedEmployeeData(employeeData);
    setShowEmployeeModal(true);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (reportData.length === 0) {
      alertify.warning('No data to export');
      return;
    }

    let csvContent = 'Employee ID,Employee Name,Department,Designation,Total Login Time,Total Sessions\n';
    
    reportData.forEach(emp => {
      csvContent += `"${emp.empId || ''}","${emp.employeeName || ''}","${emp.department || ''}","${emp.designation || ''}","${emp.dateWiseData?.reduce((sum, day) => sum + (day.totalLoginTimeHours || 0), 0).toFixed(2) || 0}h","${emp.dateWiseData?.reduce((sum, day) => sum + (day.totalSessions || 0), 0) || 0}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Emp_Login_Report_${ymd(range.startDate)}_to_${ymd(range.endDate)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && reportData.length === 0) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading login report...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <User className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-xl font-bold text-gray-800">{summary.totalEmployees}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Login Time</p>
                <p className="text-xl font-bold text-green-600">{summary.totalLoginTimeFormatted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Login Time</p>
                <p className="text-xl font-bold text-purple-600">{summary.averageLoginTimeFormatted}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        {reportData.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium"
          >
            <FaDownload size={16} />
            Export to CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Department:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedEmployee('');
              setSelectedEmployeeId('');
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 bg-white"
          >
            <option value="">Select Department</option>
            {departments.map((dept, index) => (
              <option key={index} value={typeof dept === 'string' ? dept : dept.name || dept.department}>
                {typeof dept === 'string' ? dept : dept.name || dept.department}
              </option>
            ))}
          </select>
        </div>

        {/* Employee Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Employee (Optional):</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => {
              const emp = employees.find(emp => emp.empId === e.target.value);
              if (emp) {
                handleEmployeeSelect(emp);
              } else {
                setSelectedEmployee('');
                setSelectedEmployeeId('');
              }
            }}
            disabled={!selectedDepartment}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Employees</option>
            {employees.map((emp, index) => (
              <option key={emp.empId || index} value={emp.empId}>
                {emp.employeeName || emp.name} ({emp.empId})
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Date Range:</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetMenu(v => !v)}
              className="w-[300px] text-left px-3 py-2 border border-gray-200 rounded-lg bg-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <span className={!dateFilterApplied || !range.startDate || !range.endDate ? 'text-gray-400' : 'text-gray-700'}>
                {dateFilterApplied && range.startDate && range.endDate
                  ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                  : 'Select date range'}
              </span>
              <span className="ml-3">▼</span>
            </button>

            {showPresetMenu && (
              <div className="absolute z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg">
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
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    {lbl}
                  </button>
                ))}
                <div className="my-1 border-t" />
                <button
                  onClick={() => { setShowPresetMenu(false); setShowCustomRange(true); }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
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
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomRange(false);
                      if (!dateFilterApplied) {
                        setRange({ startDate: null, endDate: null, key: 'selection' });
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterApplied(true);
                      setShowCustomRange(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        <button
          onClick={() => {
            setSelectedDepartment('');
            setSelectedEmployee('');
            setSelectedEmployeeId('');
            setRange({ startDate: null, endDate: null, key: 'selection' });
            setDateFilterApplied(false);
            setShowPresetMenu(false);
            setShowCustomRange(false);
          }}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 text-sm font-medium"
        >
          Clear All Filters
        </button>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Employee ID</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Employee Name</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Department</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Designation</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Total Login Time</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Total Sessions</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((emp, index) => {
                const totalLoginTime = emp.dateWiseData?.reduce((sum, day) => sum + (day.totalLoginTimeHours || 0), 0) || 0;
                const totalSessions = emp.dateWiseData?.reduce((sum, day) => sum + (day.totalSessions || 0), 0) || 0;
                const isActive = emp.dateWiseData?.some(day => day.isCurrentlyActive) || false;
                
                return (
                  <tr key={emp.empId || index} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{emp.empId}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{emp.employeeName}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-gray-700">{emp.department}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-gray-700">{emp.designation}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{totalLoginTime.toFixed(2)}h</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-gray-700">{totalSessions}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => handleViewEmployeeDetails(emp)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {reportData.length === 0 && (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {dateFilterApplied && selectedDepartment ? 'No login data found for selected filters' : 'Select Department and Date Range to view data'}
            </p>
            <p className="text-gray-400 text-sm">
              {dateFilterApplied && selectedDepartment ? 'Try adjusting your filters' : 'Please select Department and Date Range to fetch report data'}
            </p>
          </div>
        )}
      </div>

      {/* Employee Details Modal */}
      {showEmployeeModal && selectedEmployeeData && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4" onClick={() => setShowEmployeeModal(false)}>
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Login Details - {selectedEmployeeData.employeeName}</h2>
                    <p className="text-blue-100">{selectedEmployeeData.empId} - {selectedEmployeeData.department}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEmployeeModal(false);
                    setSelectedEmployeeData(null);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {selectedEmployeeData.dateWiseData?.map((dayData, index) => (
                <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="text-blue-600" size={20} />
                      <h3 className="text-lg font-bold text-gray-800">
                        {new Date(dayData.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Login Time</p>
                        <p className="font-bold text-blue-600">{dayData.totalLoginTimeFormatted}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Sessions</p>
                        <p className="font-bold text-purple-600">{dayData.totalSessions}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        dayData.isCurrentlyActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {dayData.isCurrentlyActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {dayData.isCurrentlyActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Sessions */}
                  {dayData.sessions && dayData.sessions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Sessions</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {dayData.sessions.map((session, sessionIndex) => (
                          <div key={sessionIndex} className="bg-white rounded-lg p-3 border border-blue-200">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Login Time</p>
                                <p className="font-medium text-gray-800">{session.loginTime || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Logout Time</p>
                                <p className="font-medium text-gray-800">{session.logoutTime || 'Still Active'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Duration</p>
                                <p className="font-medium text-gray-800">{session.durationInHours?.toFixed(2) || session.duration || 0}h ({session.durationInMinutes || 0}m)</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Status</p>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                  session.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {session.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                  {session.status === 'active' ? 'Active' : 'Completed'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

