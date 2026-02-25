import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Star,
  User,
  Building,
  Calendar,
  Send,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import StatisticsCard from '../EmployeeReview/components/StatisticsCard';
import RatingInput from '../EmployeeReview/components/RatingInput';
import ReviewSection from '../EmployeeReview/components/ReviewSection';

// Searchable Dropdown Component
const SearchableDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

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

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find(option => option.value === value);
  const hasError = className.includes('border-red');

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full px-4 py-3 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
          }`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
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

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500 text-sm text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function MonthlyPerformanceReviewDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState({
    totalPending: 0,
    totalCompleted: 0,
    totalReviews: 0,
    averageRating: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending_manager_review');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [userEmpId, setUserEmpId] = useState(null);
  const [departments] = useState(['Sales', 'CMT', 'Finance', 'HR']);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view' or 'form'
  const [reviewDetails, setReviewDetails] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingReviewData, setLoadingReviewData] = useState(false);

  const itemsPerPage = 20;

  // Generate month options
  const monthOptions = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Generate year options (current year and previous 2 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: currentYear.toString(), label: currentYear.toString() },
    { value: (currentYear - 1).toString(), label: (currentYear - 1).toString() },
    { value: (currentYear - 2).toString(), label: (currentYear - 2).toString() }
  ];

  // Get user role and empId (VPL004 has director access)
  useEffect(() => {
    const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const role = user.role || user.userType || 'employee';
        const empId = user.empId || user.employeeId || '';
        setUserRole(role);
        setUserEmpId(empId);
        // Set default filter based on role
        if (role === 'superadmin' || empId === 'VPL004') {
          setStatusFilter('all');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUserRole('employee');
      }
    }
  }, []);

  const hasDirectorAccess = userRole === 'superadmin' || userEmpId === 'VPL004';

  // Form data structure
  const [formData, setFormData] = useState({
    performance: {
      taskCompletion: { rating: 0, comments: '' },
      qualityOfWork: { rating: 0, comments: '' },
      meetingDeadlines: { rating: 0, comments: '' },
      productivity: { rating: 0, comments: '' },
      goalAchievement: { rating: 0, comments: '' }
    },
    communication: {
      verbal: { rating: 0, comments: '' },
      written: { rating: 0, comments: '' },
      teamCollaboration: { rating: 0, comments: '' },
      clientInteraction: { rating: 0, comments: '' },
      reporting: { rating: 0, comments: '' }
    },
    technicalSkills: {
      jobSpecificSkills: { rating: 0, comments: '' },
      learningDevelopment: { rating: 0, comments: '' },
      problemSolving: { rating: 0, comments: '' },
      adaptability: { rating: 0, comments: '' },
      technicalApplication: { rating: 0, comments: '' }
    },
    behavioral: {
      punctuality: { rating: 0, comments: '' },
      professionalism: { rating: 0, comments: '' },
      attitude: { rating: 0, comments: '' },
      teamwork: { rating: 0, comments: '' },
      initiative: { rating: 0, comments: '' }
    },
    overallAssessment: {
      overallRating: 0,
      strengths: '',
      areasForImprovement: '',
      overallComments: '',
      goalsForNextMonth: ''
    }
  });

  // Fetch pending reviews (Manager - admin role)
  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      if (statusFilter !== 'pending_manager_review') {
        params.append('status', statusFilter);
      }
      if (monthFilter !== 'all') {
        params.append('month', monthFilter);
      }
      if (yearFilter) {
        params.append('year', yearFilter);
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/monthly-performance-reviews/pending?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setReviews(response.data.data.reviews || []);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
        setTotalItems(response.data.data.pagination?.totalCount || 0);
      }
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
      alertify.error('Failed to load pending reviews');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all reviews (Director - superadmin role)
  const fetchAllReviews = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (departmentFilter !== 'all') {
        params.append('department', departmentFilter);
      }
      if (monthFilter !== 'all') {
        params.append('month', monthFilter);
      }
      if (yearFilter) {
        params.append('year', yearFilter);
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/monthly-performance-reviews/all?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setReviews(response.data.data.reviews || []);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
        setTotalItems(response.data.data.pagination?.totalCount || 0);
        setStatistics(response.data.data.statistics || {
          totalPending: 0,
          totalCompleted: 0,
          totalReviews: 0,
          averageRating: 0
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      alertify.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics (Director only)
  const fetchStatistics = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const params = new URLSearchParams();
      if (monthFilter !== 'all') {
        params.append('startMonth', monthFilter);
        params.append('endMonth', monthFilter);
      }
      if (yearFilter) {
        params.append('year', yearFilter);
      }
      if (departmentFilter !== 'all') {
        params.append('department', departmentFilter);
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/monthly-performance-reviews/statistics/overview?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        const stats = response.data.data.overview || {
          totalReviews: 0,
          completedReviews: 0,
          pendingReviews: 0,
          averageRating: 0
        };
        setStatistics(stats);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  useEffect(() => {
    if (userRole === 'admin') {
      fetchPendingReviews();
    } else if (hasDirectorAccess) {
      fetchAllReviews();
      fetchStatistics();
    }
  }, [currentPage, statusFilter, departmentFilter, monthFilter, yearFilter, userRole, hasDirectorAccess]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, departmentFilter, monthFilter, yearFilter]);

  // Search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        if (userRole === 'admin') {
          fetchPendingReviews();
        } else if (hasDirectorAccess) {
          fetchAllReviews();
        }
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleReviewClick = async (review) => {
    if (userRole === 'admin') {
      // For pending reviews, show form in modal
      setSelectedReview(review);
      setModalType('form');
      setShowReviewModal(true);
      // Fetch review data for form
      await fetchReviewDataForForm(review.reviewId || review._id);
    } else if (hasDirectorAccess) {
      // For director (superadmin or VPL004), show details in modal
      setSelectedReview(review);
      setModalType('view');
      setShowReviewModal(true);
      // Fetch review details
      await fetchReviewDetailsForDirector(review.reviewId || review._id);
    }
  };

  // Fetch review data for form
  const fetchReviewDataForForm = async (reviewId) => {
    try {
      setLoadingReviewData(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/monthly-performance-reviews/${reviewId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        const review = response.data.data.review;
        setSelectedReview(review);
        // If review already has data, populate form
        if (review.performance || review.communication || review.technicalSkills || review.behavioral) {
          setFormData({
            performance: review.performance || formData.performance,
            communication: review.communication || formData.communication,
            technicalSkills: review.technicalSkills || formData.technicalSkills,
            behavioral: review.behavioral || formData.behavioral,
            overallAssessment: review.overallAssessment || formData.overallAssessment
          });
        }
      } else {
        alertify.error('Failed to load review data');
      }
    } catch (error) {
      console.error('Error fetching review data:', error);
      alertify.error('Failed to load review data');
    } finally {
      setLoadingReviewData(false);
    }
  };

  // Fetch review details for director
  const fetchReviewDetailsForDirector = async (reviewId) => {
    try {
      setLoadingReviewData(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/monthly-performance-reviews/${reviewId}/details`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setReviewDetails(response.data.data.review);
      } else {
        alertify.error('Failed to load review details');
      }
    } catch (error) {
      console.error('Error fetching review details:', error);
      alertify.error('Failed to load review details');
    } finally {
      setLoadingReviewData(false);
    }
  };

  // Form handlers
  const handleFieldChange = (section, field, type, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: {
          ...prev[section][field],
          [type]: value
        }
      }
    }));
    // Clear error for this field
    if (formErrors[section]?.[field]?.[type]) {
      setFormErrors(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: {
            ...prev[section]?.[field],
            [type]: null
          }
        }
      }));
    }
  };

  const handleOverallChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      overallAssessment: {
        ...prev.overallAssessment,
        [field]: value
      }
    }));
    if (formErrors.overallAssessment?.[field]) {
      setFormErrors(prev => ({
        ...prev,
        overallAssessment: {
          ...prev.overallAssessment,
          [field]: null
        }
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate all ratings
    const sections = ['performance', 'communication', 'technicalSkills', 'behavioral'];
    sections.forEach(section => {
      Object.keys(formData[section]).forEach(field => {
        if (!formData[section][field].rating || formData[section][field].rating === 0) {
          if (!newErrors[section]) newErrors[section] = {};
          if (!newErrors[section][field]) newErrors[section][field] = {};
          newErrors[section][field].rating = 'Rating is required';
        }
      });
    });

    // Validate overall assessment
    if (!formData.overallAssessment.overallRating || formData.overallAssessment.overallRating === 0) {
      if (!newErrors.overallAssessment) newErrors.overallAssessment = {};
      newErrors.overallAssessment.overallRating = 'Overall rating is required';
    }
    if (!formData.overallAssessment.strengths.trim()) {
      if (!newErrors.overallAssessment) newErrors.overallAssessment = {};
      newErrors.overallAssessment.strengths = 'Strengths are required';
    }
    if (!formData.overallAssessment.areasForImprovement.trim()) {
      if (!newErrors.overallAssessment) newErrors.overallAssessment = {};
      newErrors.overallAssessment.areasForImprovement = 'Areas for improvement are required';
    }
    if (!formData.overallAssessment.goalsForNextMonth.trim()) {
      if (!newErrors.overallAssessment) newErrors.overallAssessment = {};
      newErrors.overallAssessment.goalsForNextMonth = 'Goals for next month are required';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alertify.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/monthly-performance-reviews/${selectedReview.reviewId || selectedReview._id}/submit`,
        formData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alertify.success('Monthly review submitted successfully');
        setShowReviewModal(false);
        setSelectedReview(null);
        // Reset form data
        setFormData({
          performance: {
            taskCompletion: { rating: 0, comments: '' },
            qualityOfWork: { rating: 0, comments: '' },
            meetingDeadlines: { rating: 0, comments: '' },
            productivity: { rating: 0, comments: '' },
            goalAchievement: { rating: 0, comments: '' }
          },
          communication: {
            verbal: { rating: 0, comments: '' },
            written: { rating: 0, comments: '' },
            teamCollaboration: { rating: 0, comments: '' },
            clientInteraction: { rating: 0, comments: '' },
            reporting: { rating: 0, comments: '' }
          },
          technicalSkills: {
            jobSpecificSkills: { rating: 0, comments: '' },
            learningDevelopment: { rating: 0, comments: '' },
            problemSolving: { rating: 0, comments: '' },
            adaptability: { rating: 0, comments: '' },
            technicalApplication: { rating: 0, comments: '' }
          },
          behavioral: {
            punctuality: { rating: 0, comments: '' },
            professionalism: { rating: 0, comments: '' },
            attitude: { rating: 0, comments: '' },
            teamwork: { rating: 0, comments: '' },
            initiative: { rating: 0, comments: '' }
          },
          overallAssessment: {
            overallRating: 0,
            strengths: '',
            areasForImprovement: '',
            overallComments: '',
            goalsForNextMonth: ''
          }
        });
        setFormErrors({});
        // Refresh the reviews list
        fetchPendingReviews();
      } else {
        alertify.error(response.data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alertify.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending_manager_review': { label: 'Pending Review', style: 'border border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-400 hover:text-white transition-colors' },
      'completed': { label: 'Completed', style: 'border border-green-300 text-green-700 bg-green-50 hover:bg-green-500 hover:text-white transition-colors' },
      'cancelled': { label: 'Cancelled', style: 'border border-red-300 text-red-700 bg-red-50 hover:bg-red-500 hover:text-white transition-colors' }
    };
    const statusInfo = statusMap[status] || { label: status, style: 'border border-gray-300 text-gray-700 bg-gray-50' };
    return (
      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${statusInfo.style}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB");
    } catch {
      return dateString;
    }
  };

  const formatMonthYear = (month, year) => {
    if (!month || !year) return 'N/A';
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[month - 1]} ${year}`;
  };

  const renderRatingSection = (title, data) => {
    if (!data) return null;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          {title}
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {Object.keys(data).map((key) => (
            <div key={key} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={`${
                        star <= (data[key]?.rating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-gray-200 text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-sm font-bold text-gray-800 ml-2">
                    {data[key]?.rating || 0}/5
                  </span>
                </div>
              </div>
              {data[key]?.comments && (
                <p className="text-sm text-gray-600 mt-1">{data[key].comments}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getPageNumbers = (totalPagesToUse = totalPages) => {
    const maxVisible = 7;
    if (totalPagesToUse <= maxVisible) {
      return Array.from({ length: totalPagesToUse }, (_, i) => i + 1);
    }

    const pages = [];
    const halfVisible = Math.floor(maxVisible / 2);

    if (currentPage <= halfVisible + 1) {
      for (let i = 1; i <= maxVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPagesToUse);
    } else if (currentPage >= totalPagesToUse - halfVisible) {
      pages.push(1);
      for (let i = totalPagesToUse - (maxVisible - 2); i <= totalPagesToUse; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      for (let i = currentPage - halfVisible + 1; i <= currentPage + halfVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPagesToUse);
    }

    return pages;
  };

  // Filter reviews based on search term (client-side filtering)
  const filteredReviews = useMemo(() => {
    if (!searchTerm.trim()) {
      return reviews;
    }
    const term = searchTerm.toLowerCase();
    return reviews.filter(review => {
      const empId = (review.employeeEmpId || review.employee?.employeeEmpId || '').toLowerCase();
      const empName = (review.employeeName || review.employee?.employeeName || '').toLowerCase();
      const dept = (review.department || review.employee?.department || '').toLowerCase();
      const status = (review.status || '').toLowerCase();
      const monthYear = formatMonthYear(
        review.reviewPeriod?.month || review.reviewPeriod?.month,
        review.reviewPeriod?.year || review.reviewPeriod?.year
      ).toLowerCase();
      return empId.includes(term) || empName.includes(term) || dept.includes(term) || status.includes(term) || monthYear.includes(term);
    });
  }, [reviews, searchTerm]);

  // Apply client-side pagination for filtered results
  const displayReviews = searchTerm.trim() 
    ? filteredReviews
    : reviews;

  const displayTotalItems = searchTerm.trim()
    ? filteredReviews.length
    : totalItems;

  const displayTotalPages = searchTerm.trim()
    ? Math.max(1, Math.ceil(filteredReviews.length / itemsPerPage))
    : totalPages;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, displayTotalItems);

  // Manager View (admin role)
  const ManagerView = () => (
    <div className="p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Monthly Performance Reviews</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by ID, name, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <SearchableDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'pending_manager_review', label: 'Pending Review' },
              { value: 'completed', label: 'Completed' }
            ]}
            placeholder="Filter by Status"
            className="w-full"
          />

          <SearchableDropdown
            value={monthFilter}
            onChange={setMonthFilter}
            options={monthOptions}
            placeholder="Filter by Month"
            className="w-full"
          />

          <SearchableDropdown
            value={yearFilter}
            onChange={setYearFilter}
            options={yearOptions}
            placeholder="Filter by Year"
            className="w-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto p-4">
          <table className="min-w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y first:border-l border-gray-200 rounded-l-lg">
                  Employee ID
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Employee Name
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Department
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Review Period
                </th>
                <th className="px-8 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Status
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y last:border-r border-gray-200 rounded-r-lg">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-12 text-center border-y first:border-l last:border-r border-gray-200 first:rounded-l-lg last:rounded-r-lg"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-600">Loading reviews...</p>
                    </div>
                  </td>
                </tr>
              ) : displayReviews.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-12 text-center border-y first:border-l last:border-r border-gray-200 first:rounded-l-lg last:rounded-r-lg"
                  >
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No reviews found</p>
                    <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                displayReviews.map((review) => (
                  <tr key={review._id || review.reviewId} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 border-y first:border-l border-gray-200 first:rounded-l-lg text-gray-900 font-semibold">
                      {review.employeeEmpId || review.employee?.employeeEmpId || 'N/A'}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {review.employeeName || review.employee?.employeeName || 'N/A'}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {review.department || review.employee?.department || 'N/A'}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {formatMonthYear(review.reviewPeriod?.month, review.reviewPeriod?.year)}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200">
                      {getStatusBadge(review.status)}
                    </td>
                    <td className="px-4 py-4 border-y last:border-r border-gray-200 last:rounded-r-lg">
                      <button
                        onClick={() => handleReviewClick(review)}
                        className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer"
                      >
                        {review.status === 'completed' ? 'View' : 'Review'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reviews.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center px-4 border border-gray-200 p-2 rounded-xl bg-white">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {endIndex} of {totalItems} reviews
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {getPageNumbers().map((page, idx, arr) => {
                const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsisBefore && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
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
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Director View (superadmin role)
  const DirectorView = () => (
    <div className="p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Monthly Performance Reviews</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatisticsCard
          title="Total Reviews"
          value={statistics.totalReviews || 0}
          icon={FileText}
          color="blue"
          subtitle="All Reviews"
        />
        <StatisticsCard
          title="Pending"
          value={statistics.pendingReviews || statistics.totalPending || 0}
          icon={Clock}
          color="yellow"
          subtitle="Pending Reviews"
        />
        <StatisticsCard
          title="Completed"
          value={statistics.completedReviews || statistics.totalCompleted || 0}
          icon={CheckCircle}
          color="green"
          subtitle="Completed Reviews"
        />
        <StatisticsCard
          title="Average Rating"
          value={statistics.averageRating ? Number(statistics.averageRating).toFixed(1) : '0.0'}
          icon={Star}
          color="purple"
          subtitle="Overall Average"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by ID, name, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <SearchableDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending_manager_review', label: 'Pending Review' },
              { value: 'completed', label: 'Completed' }
            ]}
            placeholder="Filter by Status"
            className="w-full"
          />

          <SearchableDropdown
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={[
              { value: 'all', label: 'All Departments' },
              ...departments.map(dept => ({ value: dept, label: dept }))
            ]}
            placeholder="Filter by Department"
            className="w-full"
          />

          <SearchableDropdown
            value={monthFilter}
            onChange={setMonthFilter}
            options={monthOptions}
            placeholder="Filter by Month"
            className="w-full"
          />

          <SearchableDropdown
            value={yearFilter}
            onChange={setYearFilter}
            options={yearOptions}
            placeholder="Filter by Year"
            className="w-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto p-4">
          <table className="min-w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y first:border-l border-gray-200 rounded-l-lg">
                  Employee ID
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Employee Name
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Department
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Review Period
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Rating
                </th>
                <th className="px-8 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Status
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y last:border-r border-gray-200 rounded-r-lg">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-12 text-center border-y first:border-l last:border-r border-gray-200 first:rounded-l-lg last:rounded-r-lg"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-600">Loading reviews...</p>
                    </div>
                  </td>
                </tr>
              ) : displayReviews.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-12 text-center border-y first:border-l last:border-r border-gray-200 first:rounded-l-lg last:rounded-r-lg"
                  >
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No reviews found</p>
                    <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                displayReviews.map((review) => (
                  <tr key={review._id || review.reviewId} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 border-y first:border-l border-gray-200 first:rounded-l-lg text-gray-900 font-semibold">
                      {review.employeeEmpId || review.employee?.employeeEmpId || 'N/A'}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {review.employeeName || review.employee?.employeeName || 'N/A'}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {review.department || review.employee?.department || 'N/A'}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {formatMonthYear(review.reviewPeriod?.month, review.reviewPeriod?.year)}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200">
                      {review.overallAssessment?.overallRating ? (
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={`${
                                star <= review.overallAssessment.overallRating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'fill-gray-200 text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-sm font-bold text-gray-800 ml-1">
                            {review.overallAssessment.overallRating}/5
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200">
                      {getStatusBadge(review.status)}
                    </td>
                    <td className="px-4 py-4 border-y last:border-r border-gray-200 last:rounded-r-lg">
                      <button
                        onClick={() => handleReviewClick(review)}
                        className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reviews.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center px-4 border border-gray-200 p-2 rounded-xl bg-white">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {endIndex} of {totalItems} reviews
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {getPageNumbers().map((page, idx, arr) => {
                const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsisBefore && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
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
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {userRole === 'admin' && <ManagerView />}
      {hasDirectorAccess && <DirectorView />}
      {userRole !== 'admin' && !hasDirectorAccess && (
        <div className="p-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Access Denied</p>
            <p className="text-gray-400 text-sm mt-2">You don't have permission to access this module</p>
          </div>
        </div>
      )}

      {/* Review Details Modal */}
      {showReviewModal && selectedReview && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-[9999] flex justify-center items-center p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReviewModal(false);
              setSelectedReview(null);
              setReviewDetails(null);
              setModalType('view');
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl mx-2 sm:mx-4 relative z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-6 rounded-t-2xl sm:rounded-t-3xl sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FileText className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">
                      {modalType === 'form' ? 'Submit Monthly Review' : 'Review Details'}
                    </h2>
                    <p className="text-blue-100 text-xs sm:text-sm">
                      {selectedReview.employeeName || selectedReview.employee?.employeeName || 'N/A'} - {formatMonthYear(selectedReview.reviewPeriod?.month, selectedReview.reviewPeriod?.year)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedReview(null);
                    setModalType('view');
                    // Reset form data
                    setFormData({
                      performance: {
                        taskCompletion: { rating: 0, comments: '' },
                        qualityOfWork: { rating: 0, comments: '' },
                        meetingDeadlines: { rating: 0, comments: '' },
                        productivity: { rating: 0, comments: '' },
                        goalAchievement: { rating: 0, comments: '' }
                      },
                      communication: {
                        verbal: { rating: 0, comments: '' },
                        written: { rating: 0, comments: '' },
                        teamCollaboration: { rating: 0, comments: '' },
                        clientInteraction: { rating: 0, comments: '' },
                        reporting: { rating: 0, comments: '' }
                      },
                      technicalSkills: {
                        jobSpecificSkills: { rating: 0, comments: '' },
                        learningDevelopment: { rating: 0, comments: '' },
                        problemSolving: { rating: 0, comments: '' },
                        adaptability: { rating: 0, comments: '' },
                        technicalApplication: { rating: 0, comments: '' }
                      },
                      behavioral: {
                        punctuality: { rating: 0, comments: '' },
                        professionalism: { rating: 0, comments: '' },
                        attitude: { rating: 0, comments: '' },
                        teamwork: { rating: 0, comments: '' },
                        initiative: { rating: 0, comments: '' }
                      },
                      overallAssessment: {
                        overallRating: 0,
                        strengths: '',
                        areasForImprovement: '',
                        overallComments: '',
                        goalsForNextMonth: ''
                      }
                    });
                    setFormErrors({});
                  }}
                  className="text-white hover:text-gray-200 text-xl sm:text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            {loadingReviewData ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading review form...</p>
              </div>
            ) : modalType === 'form' && userRole === 'admin' ? (
              <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Employee Info Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {selectedReview.employeeName?.charAt(0) || selectedReview.employee?.employeeName?.charAt(0) || 'E'}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Employee</p>
                        <p className="font-semibold text-gray-800">
                          {selectedReview.employeeName || selectedReview.employee?.employeeName || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building size={20} className="text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Department</p>
                        <p className="font-semibold text-gray-800">
                          {selectedReview.department || selectedReview.employee?.department || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar size={20} className="text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Review Period</p>
                        <p className="font-semibold text-gray-800">
                          {formatMonthYear(selectedReview.reviewPeriod?.month, selectedReview.reviewPeriod?.year)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User size={20} className="text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Employee ID</p>
                        <p className="font-semibold text-gray-800">
                          {selectedReview.employeeEmpId || selectedReview.employee?.employeeEmpId || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Section */}
                <ReviewSection
                  title="Performance Metrics"
                  fields={[
                    { key: 'taskCompletion', label: 'Task Completion' },
                    { key: 'qualityOfWork', label: 'Quality of Work' },
                    { key: 'meetingDeadlines', label: 'Meeting Deadlines' },
                    { key: 'productivity', label: 'Productivity' },
                    { key: 'goalAchievement', label: 'Goal Achievement' }
                  ]}
                  formData={formData.performance}
                  onChange={(field, type, value) => handleFieldChange('performance', field, type, value)}
                  errors={formErrors.performance}
                />

                {/* Communication Section */}
                <ReviewSection
                  title="Communication Skills"
                  fields={[
                    { key: 'verbal', label: 'Verbal Communication' },
                    { key: 'written', label: 'Written Communication' },
                    { key: 'teamCollaboration', label: 'Team Collaboration' },
                    { key: 'clientInteraction', label: 'Client Interaction' },
                    { key: 'reporting', label: 'Reporting' }
                  ]}
                  formData={formData.communication}
                  onChange={(field, type, value) => handleFieldChange('communication', field, type, value)}
                  errors={formErrors.communication}
                />

                {/* Technical Skills Section */}
                <ReviewSection
                  title="Technical Skills"
                  fields={[
                    { key: 'jobSpecificSkills', label: 'Job-Specific Skills' },
                    { key: 'learningDevelopment', label: 'Learning & Development' },
                    { key: 'problemSolving', label: 'Problem Solving' },
                    { key: 'adaptability', label: 'Adaptability' },
                    { key: 'technicalApplication', label: 'Technical Application' }
                  ]}
                  formData={formData.technicalSkills}
                  onChange={(field, type, value) => handleFieldChange('technicalSkills', field, type, value)}
                  errors={formErrors.technicalSkills}
                />

                {/* Behavioral Section */}
                <ReviewSection
                  title="Behavioral Assessment"
                  fields={[
                    { key: 'punctuality', label: 'Punctuality' },
                    { key: 'professionalism', label: 'Professionalism' },
                    { key: 'attitude', label: 'Attitude' },
                    { key: 'teamwork', label: 'Teamwork' },
                    { key: 'initiative', label: 'Initiative' }
                  ]}
                  formData={formData.behavioral}
                  onChange={(field, type, value) => handleFieldChange('behavioral', field, type, value)}
                  errors={formErrors.behavioral}
                />

                {/* Overall Assessment Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    Overall Assessment
                  </h3>
                  <div className="space-y-6">
                    <RatingInput
                      label="Overall Rating"
                      value={formData.overallAssessment.overallRating}
                      onChange={(rating) => handleOverallChange('overallRating', rating)}
                      required={true}
                      error={formErrors.overallAssessment?.overallRating}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Strengths <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.overallAssessment.strengths}
                        onChange={(e) => handleOverallChange('strengths', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          formErrors.overallAssessment?.strengths
                            ? 'border-red-500 focus:ring-red-200 bg-red-50 error-field'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="List the employee's key strengths..."
                        rows={4}
                      />
                      {formErrors.overallAssessment?.strengths && (
                        <p className="mt-1 text-xs text-red-600">{formErrors.overallAssessment.strengths}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Areas for Improvement <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.overallAssessment.areasForImprovement}
                        onChange={(e) => handleOverallChange('areasForImprovement', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          formErrors.overallAssessment?.areasForImprovement
                            ? 'border-red-500 focus:ring-red-200 bg-red-50 error-field'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="List areas where the employee can improve..."
                        rows={4}
                      />
                      {formErrors.overallAssessment?.areasForImprovement && (
                        <p className="mt-1 text-xs text-red-600">{formErrors.overallAssessment.areasForImprovement}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Overall Comments
                      </label>
                      <textarea
                        value={formData.overallAssessment.overallComments}
                        onChange={(e) => handleOverallChange('overallComments', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Additional comments about the employee..."
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Goals for Next Month <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.overallAssessment.goalsForNextMonth}
                        onChange={(e) => handleOverallChange('goalsForNextMonth', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          formErrors.overallAssessment?.goalsForNextMonth
                            ? 'border-red-500 focus:ring-red-200 bg-red-50 error-field'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="Set goals for the next month..."
                        rows={4}
                      />
                      {formErrors.overallAssessment?.goalsForNextMonth && (
                        <p className="mt-1 text-xs text-red-600">{formErrors.overallAssessment.goalsForNextMonth}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReviewModal(false);
                        setSelectedReview(null);
                        setModalType('view');
                        // Reset form data
                        setFormData({
                          performance: {
                            taskCompletion: { rating: 0, comments: '' },
                            qualityOfWork: { rating: 0, comments: '' },
                            meetingDeadlines: { rating: 0, comments: '' },
                            productivity: { rating: 0, comments: '' },
                            goalAchievement: { rating: 0, comments: '' }
                          },
                          communication: {
                            verbal: { rating: 0, comments: '' },
                            written: { rating: 0, comments: '' },
                            teamCollaboration: { rating: 0, comments: '' },
                            clientInteraction: { rating: 0, comments: '' },
                            reporting: { rating: 0, comments: '' }
                          },
                          technicalSkills: {
                            jobSpecificSkills: { rating: 0, comments: '' },
                            learningDevelopment: { rating: 0, comments: '' },
                            problemSolving: { rating: 0, comments: '' },
                            adaptability: { rating: 0, comments: '' },
                            technicalApplication: { rating: 0, comments: '' }
                          },
                          behavioral: {
                            punctuality: { rating: 0, comments: '' },
                            professionalism: { rating: 0, comments: '' },
                            attitude: { rating: 0, comments: '' },
                            teamwork: { rating: 0, comments: '' },
                            initiative: { rating: 0, comments: '' }
                          },
                          overallAssessment: {
                            overallRating: 0,
                            strengths: '',
                            areasForImprovement: '',
                            overallComments: '',
                            goalsForNextMonth: ''
                          }
                        });
                        setFormErrors({});
                      }}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                        submitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-700'
                      }`}
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          Submitting...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Send size={18} />
                          Submit Review
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            ) : hasDirectorAccess ? (
              reviewDetails ? (
                // Director View Content
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Employee & Manager Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <User size={18} />
                      Employee Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-semibold text-gray-800">
                          {reviewDetails.employee?.employeeName || reviewDetails.employeeName || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">ID:</span>
                        <span className="font-semibold text-gray-800">
                          {reviewDetails.employee?.employeeEmpId || reviewDetails.employeeEmpId || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building size={16} className="text-gray-600" />
                        <span className="text-gray-600">Department:</span>
                        <span className="font-semibold text-gray-800">
                          {reviewDetails.employee?.department || reviewDetails.department || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-600" />
                        <span className="text-gray-600">Review Period:</span>
                        <span className="font-semibold text-gray-800">
                          {formatMonthYear(reviewDetails.reviewPeriod?.month, reviewDetails.reviewPeriod?.year)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <User size={18} />
                      Manager Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-semibold text-gray-800">
                          {reviewDetails.manager?.managerName || reviewDetails.managerName || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-600" />
                        <span className="text-gray-600">Submitted:</span>
                        <span className="font-semibold text-gray-800">
                          {formatDate(reviewDetails.submittedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Status:</span>
                        {getStatusBadge(reviewDetails.status)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Sections */}
                <div className="space-y-4">
                  {renderRatingSection('Performance Metrics', reviewDetails.performance)}
                  {renderRatingSection('Communication Skills', reviewDetails.communication)}
                  {renderRatingSection('Technical Skills', reviewDetails.technicalSkills)}
                  {renderRatingSection('Behavioral Assessment', reviewDetails.behavioral)}

                  {/* Overall Assessment */}
                  {reviewDetails.overallAssessment && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                        Overall Assessment
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Overall Rating</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={20}
                                className={`${
                                  star <= (reviewDetails.overallAssessment.overallRating || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-gray-200 text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-lg font-bold text-gray-800 ml-2">
                              {reviewDetails.overallAssessment.overallRating}/5
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Strengths</label>
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-gray-700">{reviewDetails.overallAssessment.strengths || 'N/A'}</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Areas for Improvement</label>
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-gray-700">{reviewDetails.overallAssessment.areasForImprovement || 'N/A'}</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Overall Comments</label>
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-gray-700">{reviewDetails.overallAssessment.overallComments || 'N/A'}</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Goals for Next Month</label>
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-gray-700">{reviewDetails.overallAssessment.goalsForNextMonth || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowReviewModal(false);
                      setSelectedReview(null);
                      setReviewDetails(null);
                      setModalType('view');
                    }}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Loading review details...</p>
                </div>
              )
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

