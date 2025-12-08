import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Search, PlusCircle, Edit, Trash2, Eye, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw, Download } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import * as XLSX from 'xlsx';
import API_CONFIG from '../../config/api.js';
// Custom CSS for hiding scrollbars
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* Internet Explorer 10+ */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Safari and Chrome */
  }
`;

export default function CandidateShortlist() {
  // API Base URL
  const API_BASE_URL = `${API_CONFIG.BASE_URL}`;

  // Check if user is logged in
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  if (!token) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Authentication Required</h3>
          <p className="text-red-600 mb-4">Please login to access the candidate management system.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const [candidates, setCandidates] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [videoSize, setVideoSize] = useState('medium'); // small, medium, large
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const [videoRef, setVideoRef] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Temporarily reduced for testing

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    profile: '',
    experience: '',
    currentlyWorking: 'no',
    noticePeriod: '',
    currentSalary: '',
    expectedSalary: '',
    performanceBasedIncentive: 'no',
    communicationSkills: 'Beginner',
    // Sales specific fields
    coldCallsComfortable: 'no',
    leadGenerationExperience: 'no',
    leadGenerationMethod: '',
    targetDrivenEnvironment: 'no',
    fieldSalesComfortable: 'no',
    salesMotivation: 'Achieving targets',
    // Operation specific fields
    multipleTasksComfortable: 'no',
    clientVendorCommunication: 'no',
    operationalMetricsExperience: 'no',
    // Common fields
    nightShiftsWilling: 'no',
    officeLocationWilling: 'no',
    fullTimeCommitment: 'no',
    status: 'shortlisted',
    resume: null,
    notes: ''
  });

  // Fetch candidates from API
  const [apiLoading, setApiLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalCandidates: 0,
    pending: 0,
    shortlisted: 0,
    interviewed: 0,
    selected: 0,
    rejected: 0
  });

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setApiLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        alertify.error('Please login first to fetch candidates');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/candidate/all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
       // Debug log

      if (data.success) {
        // Transform API data to match frontend format
        const candidatesArray = data.candidates || [];
        const transformedCandidates = candidatesArray.map(candidate => {
          try {
            return {
              id: candidate._id,
              name: candidate.candidateName,
              phone: candidate.phone,
              email: candidate.email,
              profile: candidate.profile || (candidate.department === 'CMT' ? 'Operation' : candidate.department),
              experience: candidate.experience ? `${candidate.experience} years` : '0 years',
              currentlyWorking: candidate.currentlyEmployed === 'Yes' ? 'yes' : 'no',
              noticePeriod: candidate.noticePeriod || '',
              currentSalary: candidate.currentSalary ? candidate.currentSalary.toString() : '0',
              expectedSalary: candidate.expectedSalary ? candidate.expectedSalary.toString() : '0',
              performanceBasedIncentive: candidate.performanceBasedIncentive === 'Yes' ? 'yes' : 'no',
              communicationSkills: candidate.communicationSkills ? candidate.communicationSkills.toLowerCase() : 'beginner',
              status: candidate.status ? candidate.status.toLowerCase() : 'pending',
              interviewDate: candidate.interviewDate ? new Date(candidate.interviewDate).toISOString().split('T')[0] : '',
              notes: candidate.interviewNotes,
              createdAt: candidate.createdAt ? new Date(candidate.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],

              // Video interview
              videoInterviewLink: candidate.videoInterviewLink,
              videoInterviewStatus: candidate.videoInterviewStatus || 'Pending',
              videoInterviewUrl: candidate.videoInterviewUrl,
              videoInterviewExpiry: candidate.videoInterviewExpiry,

              // ---- Normalized fields for UI (keep these) ----
              // Sales
              coldCallsComfortable: candidate.coldCallsComfort === 'Yes' ? 'yes' : 'no',
              leadGenerationExperience: candidate.leadGenerationExperience === 'Yes' ? 'yes' : 'no',
              leadGenerationMethod: candidate.leadGenerationMethod || '',
              targetDrivenEnvironment: candidate.targetDrivenEnvironment === 'Yes' ? 'yes' : 'no',
              fieldSalesComfortable: candidate.officeFieldSales === 'Yes' ? 'yes' : 'no',
              salesMotivation: candidate.salesMotivation || '',

              // Ops
              multipleTasksComfortable: candidate.multitaskingComfort === 'Yes' ? 'yes' : 'no',
              clientVendorCommunication: candidate.clientVendorCommunication === 'Yes' ? 'yes' : 'no',
              operationalMetricsExperience: candidate.operationalMetricsExperience === 'Yes' ? 'yes' : 'no',

              // Common
              nightShiftsWilling: candidate.nightShiftsWillingness === 'Yes' ? 'yes' : 'no',
              officeLocationWilling: candidate.gurgaonOfficeWillingness === 'Yes' ? 'yes' : 'no',
              fullTimeCommitment: candidate.fullTimeCommitment === 'Yes' ? 'yes' : 'no',

              resume: candidate.resume,

              // ---- Raw API extras (no duplicates; optional if tum use karte ho) ----
              currentlyEmployed: candidate.currentlyEmployed,
              coldCallsComfort: candidate.coldCallsComfort,
              officeFieldSales: candidate.officeFieldSales,
              multitaskingComfort: candidate.multitaskingComfort,
              nightShiftsWillingness: candidate.nightShiftsWillingness,
              gurgaonOfficeWillingness: candidate.gurgaonOfficeWillingness
            };

          } catch (error) {
            console.error('Error transforming candidate:', candidate, error);
            return null;
          }
        }).filter(candidate => candidate !== null);

        setCandidates(transformedCandidates);

        // Set statistics from API response
        if (data.statistics) {
          setStatistics({
            totalCandidates: data.statistics.totalCandidates || 0,
            pending: data.statistics.pending || 0,
            shortlisted: data.statistics.shortlisted || 0,
            interviewed: data.statistics.interviewed || 0,
            selected: data.statistics.selected || 0,
            rejected: data.statistics.rejected || 0
          });
        }

        // alertify.success(`Loaded ${transformedCandidates.length} candidates successfully!`);
      } else {
        console.error('API Error:', data);
        alertify.error(data.message || 'Failed to fetch candidates');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      alertify.error('Failed to fetch candidates. Please try again.');
    } finally {
      setApiLoading(false);
    }
  };

  // Filter candidates based on search and date
  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.profile.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.experience.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !dateFilter || candidate.createdAt === dateFilter;

    return matchesSearch && matchesDate;
  });

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset current page when search term or date filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCandidates = filteredCandidates.slice(startIndex, endIndex);

  // Debug logging

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        resume: file
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (showEditForm && selectedCandidate) {
      // Update existing candidate
      setCandidates(prev => prev.map(candidate =>
        candidate.id === selectedCandidate.id
          ? { ...formData, id: candidate.id, createdAt: candidate.createdAt }
          : candidate
      ));
      alertify.success('Candidate updated successfully!');
    } else {
      // Add new candidate via API
      try {
        setLoading(true);

        // Validate required fields
        if (!formData.profile || formData.profile.trim() === '') {
          alertify.error('Please enter a profile');
          setLoading(false);
          return;
        }

        // Create JSON payload for API
        const payload = {
          candidateName: formData.name,
          profile: formData.profile,
          department: formData.profile === 'Operation' ? 'CMT' : formData.profile,
          experience: parseInt(formData.experience),
          currentSalary: parseInt(formData.currentSalary) || 0,
          expectedSalary: parseInt(formData.expectedSalary) || 0,
          performanceBasedIncentive: formData.performanceBasedIncentive === 'yes' ? 'Yes' : 'No',
          currentlyEmployed: formData.currentlyWorking === 'yes' ? 'Yes' : 'No',
          noticePeriod: formData.noticePeriod || '',
          communicationSkills: formData.communicationSkills,
          phone: formData.phone,
          email: formData.email
        };

        // Sales-specific fields
        if (formData.profile === 'Sales') {
          payload.coldCallsComfort = formData.coldCallsComfortable === 'yes' ? 'Yes' : 'No';
          payload.leadGenerationExperience = formData.leadGenerationExperience === 'yes' ? 'Yes' : 'No';
          payload.leadGenerationMethod = formData.leadGenerationMethod || '';
          payload.targetDrivenEnvironment = formData.targetDrivenEnvironment === 'yes' ? 'Yes' : 'No';
          payload.officeFieldSales = formData.fieldSalesComfortable === 'yes' ? 'Yes' : 'No';
          payload.salesMotivation = formData.salesMotivation;
        }

        // CMT-specific fields
        if (formData.profile === 'Operation') {
          payload.multitaskingComfort = formData.multipleTasksComfortable === 'yes' ? 'Yes' : 'No';
          payload.clientVendorCommunication = formData.clientVendorCommunication === 'yes' ? 'Yes' : 'No';
          payload.operationalMetricsExperience = formData.operationalMetricsExperience === 'yes' ? 'Yes' : 'No';
        }

        // Work flexibility fields
        payload.nightShiftsWillingness = formData.nightShiftsWilling === 'yes' ? 'Yes' : 'No';
        payload.gurgaonOfficeWillingness = formData.officeLocationWilling === 'yes' ? 'Yes' : 'No';
        payload.fullTimeCommitment = formData.fullTimeCommitment === 'yes' ? 'Yes' : 'No';

        // Interview date (if provided)
        if (formData.interviewDate) {
          payload.interviewDate = new Date(formData.interviewDate).toISOString();
        }

        // Get token from localStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        if (!token) {
          alertify.error('Please login first to add candidates');
          return;
        }

         // Debug log

        // Make API call
        const response = await fetch(`${API_BASE_URL}/api/v1/candidate/create-simple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
          alertify.success('Candidate added successfully! Video interview link has been sent to the candidate.');

          // Add the new candidate to the local state
          const newCandidate = {
            ...data.candidate,
            id: data.candidate._id,
            name: data.candidate.candidateName,
            profile: data.candidate.profile || data.candidate.department,
            phone: data.candidate.phone,
            email: data.candidate.email,
            experience: data.candidate.experience ? data.candidate.experience.toString() : '0',
            currentSalary: data.candidate.currentSalary ? data.candidate.currentSalary.toString() : '0',
            expectedSalary: data.candidate.expectedSalary ? data.candidate.expectedSalary.toString() : '0',
            status: data.candidate.status || 'pending',
            videoInterviewLink: data.candidate.videoInterviewLink || '',
            videoInterviewStatus: data.candidate.videoInterviewStatus || 'Pending',
            videoInterviewUrl: data.candidate.videoInterviewUrl || '',
            videoInterviewExpiry: data.candidate.videoInterviewExpiry || '',
            createdAt: data.candidate.createdAt ? new Date(data.candidate.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
          };

          // Refresh the candidates list from API
          await fetchCandidates();
        } else {
          alertify.error(data.message || 'Failed to add candidate');
        }
      } catch (error) {
        console.error('Error adding candidate:', error);
        alertify.error('Failed to add candidate. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    handleCloseForm();
  };

  // Handle view candidate details
  const handleViewCandidate = async (candidateId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        alertify.error('Please login first to view candidate details');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/candidate/${candidateId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setCandidateDetails(data.candidate);
        setShowViewModal(true);
      } else {
        alertify.error(data.message || 'Failed to fetch candidate details');
      }
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      alertify.error('Failed to fetch candidate details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit candidate
  const handleEdit = (candidate) => {
    setSelectedCandidate(candidate);
    setFormData(candidate);
    setShowEditForm(true);
  };

  // Handle delete candidate
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to remove this candidate from shortlist?')) {
      setCandidates(prev => prev.filter(candidate => candidate.id !== id));
      alertify.success('Candidate removed from shortlist!');
    }
  };

  // Handle status change
  const handleStatusChange = (id, newStatus) => {
    setCandidates(prev => prev.map(candidate =>
      candidate.id === id ? { ...candidate, status: newStatus } : candidate
    ));
    alertify.success(`Candidate status updated to ${newStatus}!`);
  };



  // Close form and reset
  const handleCloseForm = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setShowViewModal(false);
    setSelectedCandidate(null);
    setCandidateDetails(null);
    setVideoSize('medium');
    setShowVideoMenu(false);
    setVideoRef(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setFormData({
      name: '',
      phone: '',
      email: '',
      profile: '',
      experience: '',
      currentlyWorking: 'no',
      noticePeriod: '',
      currentSalary: '',
      expectedSalary: '',
      performanceBasedIncentive: 'no',
      communicationSkills: 'Beginner',
      // Sales specific fields
      coldCallsComfortable: 'no',
      leadGenerationExperience: 'no',
      leadGenerationMethod: '',
      targetDrivenEnvironment: 'no',
      fieldSalesComfortable: 'no',
      salesMotivation: 'Achieving targets',
      // Operation specific fields
      multipleTasksComfortable: 'no',
      clientVendorCommunication: 'no',
      operationalMetricsExperience: 'no',
      // Common fields
      nightShiftsWilling: 'no',
      officeLocationWilling: 'no',
      fullTimeCommitment: 'no',
      status: 'shortlisted',
      resume: null,
      notes: ''
    });
  };

  // Status color helper
  const getStatusColor = (status) => {
    switch (status) {
      case 'shortlisted': return 'bg-blue-100 text-blue-700';
      case 'interviewed': return 'bg-yellow-100 text-yellow-700';
      case 'hired': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Status icon helper
  const getStatusIcon = (status) => {
    switch (status) {
      case 'shortlisted': return <Clock size={14} />;
      case 'interviewed': return <Eye size={14} />;
      case 'hired': return <CheckCircle size={14} />;
      case 'rejected': return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  // Video interview status color helper
  const getVideoStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'Expired': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Video interview status icon helper
  const getVideoStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return <Clock size={14} />;
      case 'Completed': return <CheckCircle size={14} />;
      case 'Expired': return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  // Format time function
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  // Picture in Picture function
  const togglePictureInPicture = async () => {
    try {
      setShowVideoMenu(false); // Close menu after clicking

      if (videoRef) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.requestPictureInPicture();
        }
      }
    } catch (error) {
      console.error('Error with Picture-in-Picture:', error);
      alertify.error('Picture-in-Picture not supported in this browser');
    }
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        alertify.error('Please login first to update status');
        return;
      }

      const payload = {
        status: candidateDetails.status
      };

      // Add optional fields if they exist
      if (candidateDetails.interviewDate) {
        payload.interviewDate = candidateDetails.interviewDate;
      }
      if (candidateDetails.interviewNotes) {
        payload.interviewNotes = candidateDetails.interviewNotes;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/candidate/${candidateDetails._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        alertify.success('Candidate status updated successfully!');

        // Refresh the candidates list
        await fetchCandidates();

        // Close the modal
        handleCloseForm();
      } else {
        alertify.error(data.message || 'Failed to update candidate status');
      }
    } catch (error) {
      console.error('Error updating candidate status:', error);
      alertify.error('Failed to update candidate status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Excel export
  const handleExcelExport = () => {
    try {
      // Prepare data for export
      const exportData = filteredCandidates.map(candidate => ({
        'Name': candidate.name,
        'Email': candidate.email,
        'Phone': candidate.phone,
        'Profile': candidate.profile,
        'Experience': candidate.experience,
        'Currently Working': candidate.currentlyWorking === 'yes' ? 'Yes' : 'No',
        'Notice Period': candidate.noticePeriod || 'N/A',
        'Current Salary': candidate.currentSalary || '0',
        'Expected Salary': candidate.expectedSalary || '0',
        'Performance Based Incentive': candidate.performanceBasedIncentive === 'yes' ? 'Yes' : 'No',
        'Communication Skills': candidate.communicationSkills,
        'Status': candidate.status,
        'Video Interview Status': candidate.videoInterviewStatus || 'N/A',
        'Applied Date': candidate.createdAt,
        'Interview Date': candidate.interviewDate || 'N/A',
        'Notes': candidate.notes || 'N/A'
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 20 }, // Name
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }, // Profile
        { wch: 12 }, // Experience
        { wch: 15 }, // Currently Working
        { wch: 15 }, // Notice Period
        { wch: 15 }, // Current Salary
        { wch: 15 }, // Expected Salary
        { wch: 20 }, // Performance Based Incentive
        { wch: 18 }, // Communication Skills
        { wch: 12 }, // Status
        { wch: 18 }, // Video Interview Status
        { wch: 15 }, // Applied Date
        { wch: 15 }, // Interview Date
        { wch: 30 }  // Notes
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Candidates');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `candidates_${currentDate}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      alertify.success(`Excel file exported successfully! (${exportData.length} candidates)`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alertify.error('Failed to export Excel file. Please try again.');
    }
  };

  // Show loader on initial load
  if (apiLoading) {
    return (
      <div className="p-6">
        <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Candidates...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch the information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <style>{scrollbarHideStyles}</style>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <User className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Candidates</p>
                <p className="text-xl font-bold text-gray-800">{statistics.totalCandidates}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Shortlisted</p>
                <p className="text-xl font-bold text-green-600">
                  {statistics.shortlisted}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Eye className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Interviewed</p>
                <p className="text-xl font-bold text-yellow-600">
                  {statistics.interviewed}
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
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-48 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Filter by date"
            />
          </div>
          <button
            onClick={fetchCandidates}
            disabled={apiLoading}
            className="flex items-center justify-center w-10 h-10 bg-gray-500 hover:bg-gray-600 rounded-lg text-white shadow transition disabled:opacity-50"
            title="Refresh candidates"
          >
            <RefreshCw size={18} className={apiLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExcelExport}
            disabled={filteredCandidates.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg text-white font-semibold shadow hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to Excel"
          >
            <Download size={18} /> Export Excel
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition"
          >
            <PlusCircle size={20} /> Add Candidate
          </button>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Name</th>
                <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Profile</th>
                <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Experience</th>
                <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Video Interview</th>
                <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiLoading ? (
                <tr>
                  <td colSpan="6" className="py-12">
                    <div className="flex justify-center items-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <p className="text-gray-600 text-sm">Loading candidates...</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                currentCandidates.map((candidate, index) => (
                  <tr key={candidate.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-700">{candidate.name}</div>
                        <div className="text-sm text-gray-500">{candidate.email}</div>
                        <div className="text-xs text-gray-400">{candidate.phone}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-700">{candidate.profile}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-700">{candidate.experience}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(candidate.status)}`}>
                        {getStatusIcon(candidate.status)}
                        {candidate.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${getVideoStatusColor(candidate.videoInterviewStatus)}`}>
                        {getVideoStatusIcon(candidate.videoInterviewStatus)}
                        {candidate.videoInterviewStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewCandidate(candidate.id)}
                        className="bg-transparent hover:bg-gray-100 text-blue-600 hover:text-blue-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors border border-blue-200 hover:border-blue-300"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredCandidates.length === 0 && (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No candidates found matching your search' : 'No candidates in shortlist'}
            </p>
            <p className="text-gray-400 text-sm">
              {searchTerm ? 'Try adjusting your search terms' : 'Add your first candidate to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredCandidates.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredCandidates.length)} of {filteredCandidates.length} candidates
            <span className="ml-2 text-xs text-gray-400">
              (Page {currentPage} of {totalPages}, Items per page: {itemsPerPage})
            </span>
          </div>
          {filteredCandidates.length > itemsPerPage && (
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
          )}
        </div>
      )}

      {/* Add/Edit Candidate Modal */}
      {(showAddForm || showEditForm) && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => {
            setShowAddForm(false);
            setShowEditForm(false);
          }}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {showEditForm ? 'Edit Candidate' : 'Add Candidate to Shortlist'}
                    </h2>
                    <p className="text-blue-100">
                      {showEditForm ? 'Update candidate information' : 'Add a new candidate to the shortlist'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseForm}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
              {/* Basic Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Basic Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full Name *"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Phone Number *"
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Email Address *"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <input
                    type="text"
                    name="profile"
                    value={formData.profile}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Select Profile *"
                  />
                  <input
                    type="text"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Experience *"
                  />
                </div>

                {/* Currently Working Section */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currently Working?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="currentlyWorking"
                        value="yes"
                        checked={formData.currentlyWorking === 'yes'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="currentlyWorking"
                        value="no"
                        checked={formData.currentlyWorking === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                  {formData.currentlyWorking === 'yes' && (
                    <input
                      type="text"
                      name="noticePeriod"
                      value={formData.noticePeriod}
                      onChange={handleInputChange}
                      className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notice Period (e.g., 30 days, 2 months)"
                    />
                  )}
                </div>
              </div>

              {/* Professional Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Professional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    name="currentSalary"
                    value={formData.currentSalary}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Current Salary"
                  />
                  {/* <input
                    type="number"
                    name="expectedSalary"
                    value={formData.expectedSalary}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Expected Salary *"
                  /> */}
                </div>

              </div>

              {/* Skills & Work Style - Conditional based on Profile */}
              {/* {formData.profile === 'Sales' && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-800 mb-4">Skills & Work Style - Sales</h3>

                  {/* Cold Calls */}
              {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      1. Are you comfortable making cold calls and handling client rejections?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="coldCallsComfortable"
                          value="yes"
                          checked={formData.coldCallsComfortable === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="coldCallsComfortable"
                          value="no"
                          checked={formData.coldCallsComfortable === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                  </div> */}

              {/* Lead Generation */}
              {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      2. Do you have experience in lead generation or client acquisition?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="leadGenerationExperience"
                          value="yes"
                          checked={formData.leadGenerationExperience === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes (Please specify a method)
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="leadGenerationExperience"
                          value="no"
                          checked={formData.leadGenerationExperience === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {formData.leadGenerationExperience === 'yes' && (
                      <input
                        type="text"
                        name="leadGenerationMethod"
                        value={formData.leadGenerationMethod}
                        onChange={handleInputChange}
                        className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Please specify your lead generation method"
                      />
                    )}
                  </div> */}

              {/* Target Driven Environment */}
              {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      3. Are you willing to work in a target-driven environment?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="targetDrivenEnvironment"
                          value="yes"
                          checked={formData.targetDrivenEnvironment === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="targetDrivenEnvironment"
                          value="no"
                          checked={formData.targetDrivenEnvironment === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                  </div> */}

              {/* Field Sales */}
              {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      4. Are you comfortable with both in-office and field sales activities (if required)?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="fieldSalesComfortable"
                          value="yes"
                          checked={formData.fieldSalesComfortable === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="fieldSalesComfortable"
                          value="no"
                          checked={formData.fieldSalesComfortable === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                  </div> */}

              {/* Sales Motivation */}
              {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      5. What motivates you more in sales?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="salesMotivation"
                          value="Achieving targets"
                          checked={formData.salesMotivation === 'Achieving targets'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Achieving targets
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="salesMotivation"
                          value="Earning incentives"
                          checked={formData.salesMotivation === 'Earning incentives'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Earning incentives
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="salesMotivation"
                          value="Building client relationships"
                          checked={formData.salesMotivation === 'Building client relationships'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Building client relationships
                      </label>
                    </div>
                  </div> */}
              {/* </div>
              )} */}

              {/* {formData.profile === 'Operation' && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-indigo-800 mb-4">Skills & Work Style - Operation</h3>

                  {/* Multiple Tasks */}
              {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      1. Are you comfortable handling multiple tasks simultaneously under tight deadlines?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="multipleTasksComfortable"
                          value="yes"
                          checked={formData.multipleTasksComfortable === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="multipleTasksComfortable"
                          value="no"
                          checked={formData.multipleTasksComfortable === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                  </div> */}

              {/* Client/Vendor Communication */}
              {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      2. Have you worked in a role that required direct communication with clients or vendors?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="clientVendorCommunication"
                          value="yes"
                          checked={formData.clientVendorCommunication === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="clientVendorCommunication"
                          value="no"
                          checked={formData.clientVendorCommunication === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                  </div> */}

              {/* Operational Metrics */}
              {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      3. Do you have experience in tracking and reporting key operational metrics?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="operationalMetricsExperience"
                          value="yes"
                          checked={formData.operationalMetricsExperience === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="operationalMetricsExperience"
                          value="no"
                          checked={formData.operationalMetricsExperience === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                  </div> */}
              {/* </div>
              )} */}

              {/* Work Flexibility & Commitment - Common for both */}
              {/* {(formData.profile === 'Sales' || formData.profile === 'Operation') && (
                <div className="bg-teal-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-teal-800 mb-4">Work Flexibility & Commitment</h3>

                  {/* Night Shifts */}
              {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      1. Are you willing to work night shifts or extended hours if required?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="nightShiftsWilling"
                          value="yes"
                          checked={formData.nightShiftsWilling === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="nightShiftsWilling"
                          value="no"
                          checked={formData.nightShiftsWilling === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                  </div> */}

              {/* Office Location */}
              {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      2. Are you willing to work from our office location [Gurgaon]?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="officeLocationWilling"
                          value="yes"
                          checked={formData.officeLocationWilling === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="officeLocationWilling"
                          value="no"
                          checked={formData.officeLocationWilling === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                  </div> */}

              {/* Full Time Commitment */}
              {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      3. Can you commit to working full-time for at least 12 months?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="fullTimeCommitment"
                          value="yes"
                          checked={formData.fullTimeCommitment === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="fullTimeCommitment"
                          value="no"
                          checked={formData.fullTimeCommitment === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                  </div> */}
              {/* </div>
              )} */}



              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : (showEditForm ? 'Update Candidate' : 'Add to Shortlist')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Candidate Details Modal */}
      {showViewModal && candidateDetails && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowViewModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      Candidate Details
                    </h2>
                    <p className="text-blue-100">
                      {candidateDetails.candidateName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseForm}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-gray-800 font-medium">{candidateDetails.candidateName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Profile</label>
                    <p className="text-gray-800 font-medium">{candidateDetails.profile || (candidateDetails.department === 'CMT' ? 'Operation' : candidateDetails.department)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-800 font-medium">{candidateDetails.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-800 font-medium">{candidateDetails.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Experience</label>
                    <p className="text-gray-800 font-medium">{candidateDetails.experience} years</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Currently Employed</label>
                    <p className="text-gray-800 font-medium">{candidateDetails.currentlyEmployed}</p>
                  </div>
                  {candidateDetails.noticePeriod && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Notice Period</label>
                      <p className="text-gray-800 font-medium">{candidateDetails.noticePeriod}</p>
                    </div>
                  )}
                  {candidateDetails.interviewDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Interview Date</label>
                      <p className="text-gray-800 font-medium">
                        {new Date(candidateDetails.interviewDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Professional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Current Salary</label>
                    <p className="text-gray-800 font-medium">₹{candidateDetails.currentSalary}</p>
                  </div>
                </div>
              </div>

              {/* Department Specific Information */}
              {candidateDetails.department === 'Sales' && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-800 mb-4">Sales Specific Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Cold Calls Comfort</label>
                      <p className="text-gray-800 font-medium">{candidateDetails.coldCallsComfort}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Lead Generation Experience</label>
                      <p className="text-gray-800 font-medium">{candidateDetails.leadGenerationExperience}</p>
                    </div>
                    {candidateDetails.leadGenerationMethod && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Lead Generation Method</label>
                        <p className="text-gray-800 font-medium">{candidateDetails.leadGenerationMethod}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Target Driven Environment</label>
                      <p className="text-gray-800 font-medium">{candidateDetails.targetDrivenEnvironment}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Office/Field Sales</label>
                      <p className="text-gray-800 font-medium">{candidateDetails.officeFieldSales}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Sales Motivation</label>
                      <p className="text-gray-800 font-medium">{candidateDetails.salesMotivation}</p>
                    </div>
                  </div>
                </div>
              )}

              {candidateDetails.department === 'CMT' && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-indigo-800 mb-4">Operation Specific Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Multitasking Comfort</label>
                      <p className="text-gray-800 font-medium">{candidateDetails.multitaskingComfort}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Client/Vendor Communication</label>
                      <p className="text-gray-800 font-medium">{candidateDetails.clientVendorCommunication}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Operational Metrics Experience</label>
                      <p className="text-gray-800 font-medium">{candidateDetails.operationalMetricsExperience}</p>
                    </div>
                  </div>
                </div>
              )}


              {/* Video Interview Information */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Video Interview Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Status</label>
                    <p className="text-gray-800 font-medium">{candidateDetails.videoInterviewStatus}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Expiry Date</label>
                    <p className="text-gray-800 font-medium">
                      {candidateDetails.videoInterviewExpiry ? new Date(candidateDetails.videoInterviewExpiry).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  {candidateDetails.videoInterviewUrl && (
                    <div className="col-span-2">
                      {/* Header with gradient background */}
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-t-xl border border-purple-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">🎥</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800">Video Interview</h4>
                              <p className="text-xs text-gray-600">Watch candidate's recorded response</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setVideoSize('small')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${videoSize === 'small'
                                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                                  : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 hover:border-purple-300'
                                }`}
                            >
                              Small
                            </button>
                            <button
                              onClick={() => setVideoSize('medium')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${videoSize === 'medium'
                                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                                  : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 hover:border-purple-300'
                                }`}
                            >
                              Medium
                            </button>
                            <button
                              onClick={() => setVideoSize('large')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${videoSize === 'large'
                                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                                  : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 hover:border-purple-300'
                                }`}
                            >
                              Large
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Video Container with enhanced styling */}
                      <div className={`relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-b-xl overflow-hidden shadow-2xl transition-all duration-500 ${videoSize === 'small' ? 'h-80' :
                          videoSize === 'medium' ? 'h-96' : 'h-[500px]'
                        }`}>
                        {/* Video overlay pattern */}
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none"></div>

                        {/* Video player */}
                        <video
                          className="w-full h-full object-contain relative z-10"
                          src={candidateDetails.videoInterviewUrl}
                          preload="metadata"
                          playsInline
                          ref={(video) => {
                            if (video) {
                              setVideoRef(video);
                              video.addEventListener('contextmenu', (e) => e.preventDefault());
                              video.addEventListener('loadedmetadata', () => {
                                setDuration(video.duration);
                              });
                              video.addEventListener('timeupdate', () => {
                                setCurrentTime(video.currentTime);
                              });
                              video.addEventListener('play', () => setIsPlaying(true));
                              video.addEventListener('pause', () => setIsPlaying(false));

                              // Picture-in-Picture support
                              video.addEventListener('enterpictureinpicture', () => {
                                // alertify.success('Picture-in-Picture mode activated!');
                              });
                              video.addEventListener('leavepictureinpicture', () => {
                                alertify.info('Picture-in-Picture mode deactivated');
                              });
                            }
                          }}
                        >
                          Your browser does not support the video tag.
                        </video>

                        {/* Custom video controls */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 z-20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  if (videoRef) {
                                    if (isPlaying) videoRef.pause();
                                    else videoRef.play();
                                  }
                                }}
                                className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
                              >
                                {isPlaying ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </button>
                              <div className="text-white text-sm font-medium">
                                <span>{formatTime(currentTime)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (videoRef) {
                                    videoRef.requestFullscreen();
                                  }
                                }}
                                className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="w-full bg-white/20 rounded-full h-1">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-1 rounded-full transition-all duration-200"
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* Custom video controls overlay */}
                        <div className="absolute top-3 right-3 z-20">
                          <div className="relative">
                            <button
                              onClick={() => setShowVideoMenu(!showVideoMenu)}
                              className="w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>

                            {/* Dropdown menu */}
                            {showVideoMenu && (
                              <div className="absolute top-10 right-0 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[180px] animate-in slide-in-from-top-2 duration-200">
                                <div className="px-3 py-2 border-b border-gray-100">
                                  <p className="text-xs font-medium text-gray-700">Video Options</p>
                                </div>

                                <button
                                  onClick={togglePictureInPicture}
                                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200 flex items-center gap-3 group"
                                >
                                  <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="font-medium">Picture-in-Picture</p>
                                    <p className="text-xs text-gray-500">Float video window</p>
                                  </div>
                                </button>

                                <button
                                  onClick={() => {
                                    window.open(candidateDetails.videoInterviewUrl, '_blank');
                                    setShowVideoMenu(false);
                                  }}
                                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200 flex items-center gap-3 group"
                                >
                                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="font-medium">Open in New Tab</p>
                                    <p className="text-xs text-gray-500">Full screen view</p>
                                  </div>
                                </button>

                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(candidateDetails.videoInterviewUrl);
                                    setShowVideoMenu(false);
                                    alertify.success('Video link copied to clipboard!');
                                  }}
                                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200 flex items-center gap-3 group"
                                >
                                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="font-medium">Copy Link</p>
                                    <p className="text-xs text-gray-500">Share video URL</p>
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Click outside to close menu */}
                        {showVideoMenu && (
                          <div
                            className="absolute inset-0 z-10"
                            onClick={() => setShowVideoMenu(false)}
                          ></div>
                        )}

                        {/* Decorative corner elements */}
                        <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-purple-400 rounded-tl-lg"></div>
                        <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-purple-400 rounded-tr-lg"></div>
                        <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-purple-400 rounded-bl-lg"></div>
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-purple-400 rounded-br-lg"></div>
                      </div>

                      {/* Footer with enhanced styling */}
                      <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <p className="text-xs text-gray-600 font-medium">
                            Click play to watch the candidate's video interview
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                            HD Quality
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                            Mobile Optimized
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Application Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Application Information</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Status</label>
                    <p className="text-gray-800 font-medium">{candidateDetails.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Applied Date</label>
                    <p className="text-gray-800 font-medium">
                      {new Date(candidateDetails.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Status Update Section */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">Update Status</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">New Status</label>
                      <select
                        value={candidateDetails.status}
                        onChange={(e) => {
                          setCandidateDetails(prev => ({
                            ...prev,
                            status: e.target.value
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Interviewed">Interviewed</option>
                        <option value="Selected">Selected</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Interview Date (Optional)</label>
                      <input
                        type="date"
                        value={candidateDetails.interviewDate ? new Date(candidateDetails.interviewDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          setCandidateDetails(prev => ({
                            ...prev,
                            interviewDate: e.target.value ? new Date(e.target.value).toISOString() : null
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Interview Notes (Optional)</label>
                      <textarea
                        value={candidateDetails.interviewNotes || ''}
                        onChange={(e) => {
                          setCandidateDetails(prev => ({
                            ...prev,
                            interviewNotes: e.target.value
                          }));
                        }}
                        rows="3"
                        placeholder="Add interview notes, feedback, or comments..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>

                    <button
                      onClick={handleStatusUpdate}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-4 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseForm}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 

