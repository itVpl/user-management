import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { User, Mail, Building, Search, Calendar, Star, CheckCircle, XCircle } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

// Searchable Dropdown Component for Rating Value
const SearchableRatingDropdown = ({
  value,
  onChange,
  placeholder = "Select Rating Value",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = React.useRef(null);

  const ratingOptions = [
    { value: 'Excellent', label: 'Excellent' },
    { value: 'Good', label: 'Good' },
    { value: 'Average', label: 'Average' },
    { value: 'Poor', label: 'Poor' }
  ];

  const filteredOptions = ratingOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = ratingOptions.find(option => option.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-yellow-500 focus-within:border-transparent cursor-pointer hover:border-gray-400"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search rating..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className={`px-4 py-2 hover:bg-yellow-50 cursor-pointer text-sm ${
                    value === option.value ? 'bg-yellow-100 font-semibold' : ''
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500 text-sm text-center">
                No rating found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function TeamRating() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [ratingDate, setRatingDate] = useState(new Date().toISOString().split('T')[0]);
  const [ratingValue, setRatingValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ratingStatus, setRatingStatus] = useState(null); // true = complete, false = incomplete
  const [activeTab, setActiveTab] = useState('giveRating'); // 'giveRating' or 'ratingList'
  const [ratingListDate, setRatingListDate] = useState(new Date().toISOString().split('T')[0]);
  const [ratingListData, setRatingListData] = useState([]);
  const [loadingRatingList, setLoadingRatingList] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch employees with ratings from new API
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/checklist/employees/rating`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        params: {
          department: 'Sales'
        }
      });

      if (response.data && response.data.success && response.data.data?.employees) {
        const transformedEmployees = response.data.data.employees.map(emp => ({
          id: emp.empId || emp._id,
          empId: emp.empId || 'N/A',
          employeeName: emp.employeeName || 'N/A',
          email: emp.email || 'N/A',
          department: emp.department || 'Sales',
          designation: emp.designation || 'N/A',
          status: 'active', // All employees from this API are active
          rating: {
            completed: emp.rating?.completed || false,
            value: emp.rating?.value || null,
            status: emp.rating?.status || 'incomplete',
            ratingType: emp.rating?.ratingType || 'text'
          }
        }));
        setEmployees(transformedEmployees);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      alertify.error('Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Get current logged-in user's empId
  const getCurrentUserEmpId = () => {
    try {
      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user.empId || null;
    } catch (error) {
      console.error('Error getting current user empId:', error);
      return null;
    }
  };

  // Filter employees based on logged-in user and search
  useEffect(() => {
    let filtered = [...employees];
    const currentUserEmpId = getCurrentUserEmpId();

    // Apply conditional filtering based on logged-in user
    if (currentUserEmpId === 'VPL007') {
      // VPL007 should not see VPL005, VPL006, VPL007
      filtered = filtered.filter(emp => 
        emp.empId !== 'VPL005' && 
        emp.empId !== 'VPL006' && 
        emp.empId !== 'VPL007'
      );
    } else if (currentUserEmpId === 'VPL006') {
      // VPL006 should not see VPL005, VPL006
      filtered = filtered.filter(emp => 
        emp.empId !== 'VPL005' && 
        emp.empId !== 'VPL006'
      );
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.employeeName.toLowerCase().includes(term) ||
        emp.empId.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term) ||
        (emp.rating?.value && emp.rating.value.toLowerCase().includes(term))
      );
    }

    setFilteredEmployees(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, employees]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Rating button click
  const handleRatingClick = (employee) => {
    setSelectedEmployee(employee);
    setRatingDate(new Date().toISOString().split('T')[0]);
    setRatingValue('');
    setRatingStatus(null);
    setShowRatingModal(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowRatingModal(false);
    setSelectedEmployee(null);
    setRatingDate(new Date().toISOString().split('T')[0]);
    setRatingValue('');
    setRatingStatus(null);
  };

  // Fetch rating list by date
  const fetchRatingList = async (date) => {
    try {
      setLoadingRatingList(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/checklist/employees/rating`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        params: {
          department: 'Sales',
          date: date
        }
      });

      if (response.data && response.data.success && response.data.data?.employees) {
        const transformedData = response.data.data.employees.map(emp => ({
          empId: emp.empId || 'N/A',
          employeeName: emp.employeeName || 'N/A',
          email: emp.email || 'N/A',
          rating: {
            completed: emp.rating?.completed || false,
            value: emp.rating?.value || null,
            status: emp.rating?.status || 'incomplete'
          }
        }));
        setRatingListData(transformedData);
      } else {
        setRatingListData([]);
      }
    } catch (error) {
      console.error('Error fetching rating list:', error);
      alertify.error('Failed to load rating list');
      setRatingListData([]);
    } finally {
      setLoadingRatingList(false);
    }
  };

  // Filter rating list based on logged-in user
  const filteredRatingListData = useMemo(() => {
    let filtered = [...ratingListData];
    const currentUserEmpId = getCurrentUserEmpId();

    // Apply conditional filtering based on logged-in user
    if (currentUserEmpId === 'VPL007') {
      // VPL007 should not see VPL005, VPL006, VPL007
      filtered = filtered.filter(emp => 
        emp.empId !== 'VPL005' && 
        emp.empId !== 'VPL006' && 
        emp.empId !== 'VPL007'
      );
    } else if (currentUserEmpId === 'VPL006') {
      // VPL006 should not see VPL005, VPL006
      filtered = filtered.filter(emp => 
        emp.empId !== 'VPL005' && 
        emp.empId !== 'VPL006'
      );
    }

    return filtered;
  }, [ratingListData]);

  // Handle rating list date change
  useEffect(() => {
    if (activeTab === 'ratingList' && ratingListDate) {
      fetchRatingList(ratingListDate);
      setRatingListPage(1); // Reset to first page when date changes
    }
  }, [activeTab, ratingListDate]);

  // Reset page when rating list data changes
  useEffect(() => {
    setRatingListPage(1);
  }, [filteredRatingListData]);

  // Pagination for rating list
  const [ratingListPage, setRatingListPage] = useState(1);
  const ratingListItemsPerPage = 10;
  const ratingListTotalPages = Math.ceil(filteredRatingListData.length / ratingListItemsPerPage);
  const ratingListStartIndex = (ratingListPage - 1) * ratingListItemsPerPage;
  const ratingListEndIndex = ratingListStartIndex + ratingListItemsPerPage;
  const currentRatingList = filteredRatingListData.slice(ratingListStartIndex, ratingListEndIndex);

  const handleRatingListPageChange = (page) => {
    setRatingListPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle rating submission
  const handleRatingSubmit = async (completed) => {
    if (!selectedEmployee) return;

    // Validate rating value if marking as complete
    if (completed && !ratingValue) {
      alertify.error('Please select a rating value');
      return;
    }

    try {
      setSubmitting(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      const payload = {
        empId: selectedEmployee.empId,
        date: ratingDate,
        ratingCompleted: completed
      };

      // Add ratingValue only when marking as complete
      if (completed) {
        payload.ratingValue = ratingValue;
      }

      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/checklist/sales/user-rating`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.success) {
        alertify.success(`Rating marked as ${completed ? 'Complete' : 'Incomplete'} successfully!`);
        handleCloseModal();
        // Refresh employees data to show updated rating
        await fetchEmployees();
      } else {
        alertify.error(response.data?.message || 'Failed to update rating');
      }
    } catch (error) {
      console.error('Error updating rating:', error);
      alertify.error(error.response?.data?.message || 'Failed to update rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <User className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-xl font-bold text-gray-800">{filteredEmployees.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Star className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ratings Completed</p>
                <p className="text-xl font-bold text-blue-600">
                  {filteredEmployees.filter(emp => emp.rating?.completed === true).length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-1 inline-flex">
          <button
            onClick={() => {
              setActiveTab('giveRating');
              setRatingListPage(1);
            }}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'giveRating'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Give Rating
          </button>
          <button
            onClick={() => {
              setActiveTab('ratingList');
              if (ratingListDate) {
                fetchRatingList(ratingListDate);
              }
            }}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'ratingList'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Rating List
          </button>
        </div>
      </div>

      {/* Give Rating Tab Content */}
      {activeTab === 'giveRating' && (
        <>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Employee ID</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Employee Name</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Email</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Value</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentEmployees.map((employee, index) => (
                  <tr key={employee.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3">
                      <span className="font-mono text-base font-semibold text-gray-700">{employee.empId}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="text-blue-600" size={16} />
                        </div>
                        <span className="font-medium text-gray-700">{employee.employeeName}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Mail className="text-gray-400" size={14} />
                        <span className="text-gray-700">{employee.email}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.rating?.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.rating?.status === 'completed' ? 'Completed' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {employee.rating?.value ? (
                        <span className="text-sm font-semibold text-gray-700">
                          {employee.rating.value}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => handleRatingClick(employee)}
                        disabled={employee.rating?.status === 'completed'}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          employee.rating?.status === 'completed'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        <Star size={14} />
                        Rating
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No employees found matching your search' : 'No employees found'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'No employees available'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && filteredEmployees.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredEmployees.length)} of {filteredEmployees.length} employees
            {searchTerm && ` (filtered from ${employees.length} total)`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 border rounded-lg transition-colors ${currentPage === page
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* Rating List Tab Content */}
      {activeTab === 'ratingList' && (
        <>
          <div className="mb-6 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">
                Select Date:
              </label>
              <input
                type="date"
                value={ratingListDate}
                onChange={(e) => {
                  setRatingListDate(e.target.value);
                  setRatingListPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {loadingRatingList ? (
            <div className="flex justify-center items-center py-12 bg-white rounded-2xl shadow-xl border border-gray-100">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                    <tr>
                      <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Employee ID</th>
                      <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Employee Name</th>
                      <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Email</th>
                      <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                      <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRatingList.length > 0 ? (
                      currentRatingList.map((emp, index) => (
                        <tr key={emp.empId} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="py-2 px-3">
                            <span className="font-mono text-base font-semibold text-gray-700">{emp.empId}</span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="text-blue-600" size={16} />
                              </div>
                              <span className="font-medium text-gray-700">{emp.employeeName}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <Mail className="text-gray-400" size={14} />
                              <span className="text-gray-700">{emp.email}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              emp.rating?.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {emp.rating?.status === 'completed' ? 'Completed' : 'Incomplete'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {emp.rating?.value ? (
                              <span className="text-sm font-semibold text-gray-700">
                                {emp.rating.value}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-12 text-center">
                          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 text-lg">
                            No rating data found for selected date
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rating List Pagination */}
          {ratingListTotalPages > 1 && filteredRatingListData.length > 0 && (
            <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="text-sm text-gray-600">
                Showing {ratingListStartIndex + 1} to {Math.min(ratingListEndIndex, filteredRatingListData.length)} of {filteredRatingListData.length} ratings
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRatingListPageChange(ratingListPage - 1)}
                  disabled={ratingListPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: ratingListTotalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handleRatingListPageChange(page)}
                    className={`px-3 py-2 border rounded-lg transition-colors ${ratingListPage === page
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handleRatingListPageChange(ratingListPage + 1)}
                  disabled={ratingListPage === ratingListTotalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedEmployee && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4">
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Star className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Employee Rating</h2>
                    <p className="text-blue-100">{selectedEmployee.employeeName}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={selectedEmployee.empId}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Employee Name
                  </label>
                  <input
                    type="text"
                    value={selectedEmployee.employeeName}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={ratingDate}
                    onChange={(e) => setRatingDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Rating Value <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(Required when marking as Complete)</span>
                  </label>
                  <SearchableRatingDropdown
                    value={ratingValue}
                    onChange={setRatingValue}
                    placeholder="Select Rating Value"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleRatingSubmit(true)}
                  disabled={submitting}
                  className={`flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    submitting
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:from-green-600 hover:to-green-700'
                  }`}
                >
                  <CheckCircle size={16} />
                  Mark Complete
                </button>
                <button
                  onClick={() => handleRatingSubmit(false)}
                  disabled={submitting}
                  className={`flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    submitting
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:from-red-600 hover:to-red-700'
                  }`}
                >
                  <XCircle size={16} />
                  Mark Incomplete
                </button>
              </div>

              {submitting && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm">Updating rating...</span>
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
