import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Clock, Calendar, Search, Building, Phone, Mail, Activity } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';

export default function HRActivityReport() {
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalActivities: 0,
    totalCalls: 0,
    totalEmails: 0,
    totalCallDuration: 0,
    totalCallDurationFormatted: '0h 0m',
    averageActivitiesPerEmployee: 0,
    averageCallsPerEmployee: 0,
    averageEmailsPerEmployee: 0,
    averageCallDurationFormatted: '0h 0m'
  });
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  
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

  // Fetch HR employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/HR`, {
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
        console.error('Error fetching HR employees:', err);
        setEmployees([]);
      }
    };

    fetchEmployees();
  }, []);

  // Fetch report data
  useEffect(() => {
    if (dateFilterApplied && range.startDate && range.endDate) {
      fetchReportData();
    } else {
      setReportData([]);
      setSummary({
        totalEmployees: 0,
        totalActivities: 0,
        totalCalls: 0,
        totalEmails: 0,
        totalCallDuration: 0,
        totalCallDurationFormatted: '0h 0m',
        averageActivitiesPerEmployee: 0,
        averageCallsPerEmployee: 0,
        averageEmailsPerEmployee: 0,
        averageCallDurationFormatted: '0h 0m'
      });
    }
  }, [dateFilterApplied, range.startDate, range.endDate, selectedEmployeeId]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      const queryParams = new URLSearchParams();
      queryParams.append('startDate', ymd(range.startDate));
      queryParams.append('endDate', ymd(range.endDate));
      if (selectedEmployeeId) {
        queryParams.append('empId', selectedEmployeeId);
      }

      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/hr-activity/report?${queryParams.toString()}`, {
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
          totalActivities: 0,
          totalCalls: 0,
          totalEmails: 0,
          totalCallDuration: 0,
          totalCallDurationFormatted: '0h 0m',
          averageActivitiesPerEmployee: 0,
          averageCallsPerEmployee: 0,
          averageEmailsPerEmployee: 0,
          averageCallDurationFormatted: '0h 0m'
        });
      } else {
        console.error('API response format error:', res.data);
        setReportData([]);
        setSummary({
          totalEmployees: 0,
          totalActivities: 0,
          totalCalls: 0,
          totalEmails: 0,
          totalCallDuration: 0,
          totalCallDurationFormatted: '0h 0m',
          averageActivitiesPerEmployee: 0,
          averageCallsPerEmployee: 0,
          averageEmailsPerEmployee: 0,
          averageCallDurationFormatted: '0h 0m'
        });
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      alertify.error('Failed to fetch HR activity report data');
      setReportData([]);
      setSummary({
        totalEmployees: 0,
        totalActivities: 0,
        totalCalls: 0,
        totalEmails: 0,
        totalCallDuration: 0,
        totalCallDurationFormatted: '0h 0m',
        averageActivitiesPerEmployee: 0,
        averageCallsPerEmployee: 0,
        averageEmailsPerEmployee: 0,
        averageCallDurationFormatted: '0h 0m'
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

  // Handle search
  const handleSearch = () => {
    setActiveSearchTerm(searchTerm.trim());
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveSearchTerm('');
  };

  // Filter data based on search
  const filteredData = reportData.filter(emp => {
    if (!activeSearchTerm) return true;
    const term = activeSearchTerm.toLowerCase();
    return (
      (emp.empId || '').toLowerCase().includes(term) ||
      (emp.employeeName || '').toLowerCase().includes(term) ||
      (emp.department || '').toLowerCase().includes(term) ||
      (emp.designation || '').toLowerCase().includes(term)
    );
  });

  // Export to CSV
  const exportToCSV = () => {
    if (filteredData.length === 0) {
      alertify.warning('No data to export');
      return;
    }

    let csvContent = 'Employee ID,Employee Name,Department,Designation,Total Activities,Total Calls,Total Emails,Total Call Duration\n';
    
    filteredData.forEach(emp => {
      const summary = emp.summary || {};
      csvContent += `"${emp.empId || ''}","${emp.employeeName || ''}","${emp.department || ''}","${emp.designation || ''}","${summary.totalActivities || 0}","${summary.totalCalls || 0}","${summary.totalEmails || 0}","${summary.totalCallDurationFormatted || '0h 0m'}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `HR_Activity_Report_${ymd(range.startDate)}_to_${ymd(range.endDate)}.csv`);
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
            <p className="text-gray-600">Loading HR activity report...</p>
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
                <Activity className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Activities</p>
                <p className="text-xl font-bold text-green-600">{summary.totalActivities}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Phone className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Calls</p>
                <p className="text-xl font-bold text-purple-600">{summary.totalCalls}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Mail className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Emails</p>
                <p className="text-xl font-bold text-orange-600">{summary.totalEmails}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Clock className="text-indigo-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Call Duration</p>
                <p className="text-xl font-bold text-indigo-600">{summary.totalCallDurationFormatted}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        {filteredData.length > 0 && (
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
        {/* Search */}
        <div className="relative flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search: Employee ID, Name, Department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="w-96 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          {searchTerm && (
            <>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Search
              </button>
              <button
                onClick={handleClearSearch}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                title="Clear search"
              >
                ✕
              </button>
            </>
          )}
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
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 bg-white"
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
            setSelectedEmployee('');
            setSelectedEmployeeId('');
            setRange({ startDate: null, endDate: null, key: 'selection' });
            setDateFilterApplied(false);
            setShowPresetMenu(false);
            setShowCustomRange(false);
            setSearchTerm('');
            setActiveSearchTerm('');
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
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Total Activities</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Total Calls</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Total Emails</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Call Duration</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((emp, index) => {
                const empSummary = emp.summary || {};
                
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
                      <span className="font-medium text-gray-700">{empSummary.totalActivities || 0}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{empSummary.totalCalls || 0}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{empSummary.totalEmails || 0}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{empSummary.totalCallDurationFormatted || '0h 0m'}</span>
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
        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {activeSearchTerm ? 'No employees found matching your search' : 
               dateFilterApplied ? 'No activity data found for selected filters' : 
               'Select Date Range to view data'}
            </p>
            <p className="text-gray-400 text-sm">
              {activeSearchTerm ? 'Try adjusting your search terms' : 
               dateFilterApplied ? 'Try adjusting your filters' : 
               'Please select Date Range to fetch report data'}
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
                    <h2 className="text-xl font-bold">Activity Details - {selectedEmployeeData.employeeName}</h2>
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

            {/* Summary Section */}
            {selectedEmployeeData.summary && (
              <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-blue-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-gray-600">Total Activities</p>
                    <p className="text-xl font-bold text-blue-600">{selectedEmployeeData.summary.totalActivities || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-gray-600">Total Calls</p>
                    <p className="text-xl font-bold text-purple-600">{selectedEmployeeData.summary.totalCalls || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <p className="text-sm text-gray-600">Total Emails</p>
                    <p className="text-xl font-bold text-orange-600">{selectedEmployeeData.summary.totalEmails || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <p className="text-sm text-gray-600">Call Duration</p>
                    <p className="text-xl font-bold text-indigo-600">{selectedEmployeeData.summary.totalCallDurationFormatted || '0h 0m'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-4">
              {selectedEmployeeData.dateWiseData && selectedEmployeeData.dateWiseData.length > 0 ? (
                selectedEmployeeData.dateWiseData.map((dayData, index) => (
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
                          <p className="text-sm text-gray-600">Activities</p>
                          <p className="font-bold text-blue-600">{dayData.totalActivities || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Calls</p>
                          <p className="font-bold text-purple-600">{dayData.totalCalls || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Emails</p>
                          <p className="font-bold text-orange-600">{dayData.totalEmails || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Activities List */}
                    {dayData.activities && dayData.activities.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Activities</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {dayData.activities.map((activity, activityIndex) => (
                            <div key={activityIndex} className="bg-white rounded-lg p-3 border border-blue-200">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-gray-600">Type</p>
                                  <p className="font-medium text-gray-800">{activity.type || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Time</p>
                                  <p className="font-medium text-gray-800">{activity.timestamp || activity.time || 'N/A'}</p>
                                </div>
                                {activity.description && (
                                  <div className="col-span-2">
                                    <p className="text-sm text-gray-600">Description</p>
                                    <p className="font-medium text-gray-800">{activity.description}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No activity data available for this employee</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

