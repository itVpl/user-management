import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  User, 
  Calendar, 
  Building,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { format, parseISO } from 'date-fns';
import RatingInput from './components/RatingInput';
import ReviewSection from './components/ReviewSection';

export default function ReviewSubmissionForm() {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [formData, setFormData] = useState({
    performance: {
      taskCompletion: { rating: 0, comments: '' },
      qualityOfWork: { rating: 0, comments: '' },
      meetingDeadlines: { rating: 0, comments: '' },
      initiative: { rating: 0, comments: '' }
    },
    communication: {
      verbal: { rating: 0, comments: '' },
      written: { rating: 0, comments: '' },
      teamCollaboration: { rating: 0, comments: '' },
      clientInteraction: { rating: 0, comments: '' }
    },
    technicalSkills: {
      jobSpecificSkills: { rating: 0, comments: '' },
      learningAbility: { rating: 0, comments: '' },
      problemSolving: { rating: 0, comments: '' },
      adaptability: { rating: 0, comments: '' }
    },
    behavioral: {
      punctuality: { rating: 0, comments: '' },
      professionalism: { rating: 0, comments: '' },
      attitude: { rating: 0, comments: '' },
      culturalFit: { rating: 0, comments: '' }
    },
    overallAssessment: {
      overallRating: 0,
      strengths: '',
      areasForImprovement: '',
      overallComments: '',
      managerRecommendation: ''
    }
  });
  const [errors, setErrors] = useState({});

  // Fetch review data
  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        setLoading(true);
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/employee-reviews/${reviewId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (response.data.success) {
          setReviewData(response.data.data.review);
        } else {
          alertify.error('Failed to load review data');
          navigate('/reviews/dashboard');
        }
      } catch (error) {
        console.error('Error fetching review data:', error);
        alertify.error('Failed to load review data');
        navigate('/reviews/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (reviewId) {
      fetchReviewData();
    }
  }, [reviewId, navigate]);

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
    if (errors[section]?.[field]?.[type]) {
      setErrors(prev => ({
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
    if (errors.overallAssessment?.[field]) {
      setErrors(prev => ({
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
    if (!formData.overallAssessment.managerRecommendation) {
      if (!newErrors.overallAssessment) newErrors.overallAssessment = {};
      newErrors.overallAssessment.managerRecommendation = 'Manager recommendation is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      const el = document.querySelector('.error-field') || document.querySelector('[aria-invalid="true"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try {
          if (typeof el.focus === 'function') el.focus({ preventScroll: true });
          else {
            const input = el.querySelector('input, textarea, select, [tabindex]');
            input?.focus?.({ preventScroll: true });
          }
        } catch { }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      focusFirstError();
      alertify.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/employee-reviews/${reviewId}/submit`,
        formData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alertify.success('Review submitted successfully');
        navigate('/reviews/dashboard');
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading review form...</p>
        </div>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Review not found</p>
          <button
            onClick={() => navigate('/reviews/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/reviews/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Submit Review</h1>
            <p className="text-sm sm:text-base text-gray-600">Review employee performance</p>
          </div>
        </div>

        {/* Employee Info Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 border border-blue-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {reviewData.employeeName?.charAt(0) || 'E'}
              </div>
              <div>
                <p className="text-sm text-gray-600">Employee</p>
                <p className="font-semibold text-gray-800">{reviewData.employeeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building size={20} className="text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-semibold text-gray-800">{reviewData.department}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Days Since Joining</p>
                <p className="font-semibold text-gray-800">{reviewData.daysSinceJoining} days</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User size={20} className="text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Employee ID</p>
                <p className="font-semibold text-gray-800">{reviewData.employeeEmpId}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Performance Section */}
        <ReviewSection
          title="Performance Metrics"
          fields={[
            { key: 'taskCompletion', label: 'Task Completion' },
            { key: 'qualityOfWork', label: 'Quality of Work' },
            { key: 'meetingDeadlines', label: 'Meeting Deadlines' },
            { key: 'initiative', label: 'Initiative' }
          ]}
          formData={formData.performance}
          onChange={(field, type, value) => handleFieldChange('performance', field, type, value)}
          errors={errors.performance}
        />

        {/* Communication Section */}
        <ReviewSection
          title="Communication Skills"
          fields={[
            { key: 'verbal', label: 'Verbal Communication' },
            { key: 'written', label: 'Written Communication' },
            { key: 'teamCollaboration', label: 'Team Collaboration' },
            { key: 'clientInteraction', label: 'Client Interaction' }
          ]}
          formData={formData.communication}
          onChange={(field, type, value) => handleFieldChange('communication', field, type, value)}
          errors={errors.communication}
        />

        {/* Technical Skills Section */}
        <ReviewSection
          title="Technical Skills"
          fields={[
            { key: 'jobSpecificSkills', label: 'Job-Specific Skills' },
            { key: 'learningAbility', label: 'Learning Ability' },
            { key: 'problemSolving', label: 'Problem Solving' },
            { key: 'adaptability', label: 'Adaptability' }
          ]}
          formData={formData.technicalSkills}
          onChange={(field, type, value) => handleFieldChange('technicalSkills', field, type, value)}
          errors={errors.technicalSkills}
        />

        {/* Behavioral Section */}
        <ReviewSection
          title="Behavioral Assessment"
          fields={[
            { key: 'punctuality', label: 'Punctuality' },
            { key: 'professionalism', label: 'Professionalism' },
            { key: 'attitude', label: 'Attitude' },
            { key: 'culturalFit', label: 'Cultural Fit' }
          ]}
          formData={formData.behavioral}
          onChange={(field, type, value) => handleFieldChange('behavioral', field, type, value)}
          errors={errors.behavioral}
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
              error={errors.overallAssessment?.overallRating}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strengths <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.overallAssessment.strengths}
                onChange={(e) => handleOverallChange('strengths', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.overallAssessment?.strengths
                    ? 'border-red-500 focus:ring-red-200 bg-red-50 error-field'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="List the employee's key strengths..."
                rows={4}
              />
              {errors.overallAssessment?.strengths && (
                <p className="mt-1 text-xs text-red-600">{errors.overallAssessment.strengths}</p>
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
                  errors.overallAssessment?.areasForImprovement
                    ? 'border-red-500 focus:ring-red-200 bg-red-50 error-field'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="List areas where the employee can improve..."
                rows={4}
              />
              {errors.overallAssessment?.areasForImprovement && (
                <p className="mt-1 text-xs text-red-600">{errors.overallAssessment.areasForImprovement}</p>
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
                Manager Recommendation <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.overallAssessment.managerRecommendation}
                onChange={(e) => handleOverallChange('managerRecommendation', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.overallAssessment?.managerRecommendation
                    ? 'border-red-500 focus:ring-red-200 bg-red-50 error-field'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              >
                <option value="">Select Recommendation</option>
                <option value="continue">Continue Employment</option>
                <option value="terminate">Terminate</option>
                <option value="extend_probation">Extend Probation</option>
              </select>
              {errors.overallAssessment?.managerRecommendation && (
                <p className="mt-1 text-xs text-red-600">{errors.overallAssessment.managerRecommendation}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate('/reviews/dashboard')}
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
    </div>
  );
}

