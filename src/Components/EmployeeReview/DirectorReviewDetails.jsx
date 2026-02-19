import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  User, 
  Calendar, 
  Building,
  AlertCircle,
  Star,
  FileText
} from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { format, parseISO } from 'date-fns';

export default function DirectorReviewDetails() {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [decision, setDecision] = useState('');
  const [decisionComments, setDecisionComments] = useState('');
  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch review details
  useEffect(() => {
    const fetchReviewDetails = async () => {
      try {
        setLoading(true);
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/employee-reviews/${reviewId}/details`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (response.data.success) {
          setReviewData(response.data.data.review);
        } else {
          alertify.error('Failed to load review details');
          navigate('/reviews/dashboard');
        }
      } catch (error) {
        console.error('Error fetching review details:', error);
        alertify.error('Failed to load review details');
        navigate('/reviews/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (reviewId) {
      fetchReviewDetails();
    }
  }, [reviewId, navigate]);

  const handleSubmitDecision = async () => {
    if (!decision) {
      setErrors({ decision: 'Please select a decision' });
      alertify.error('Please select a decision');
      return;
    }

    try {
      setSubmitting(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/employee-reviews/${reviewId}/decision`,
        {
          decision,
          decisionComments: decisionComments.trim()
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alertify.success(`Employee ${decision === 'continue' ? 'approved' : 'terminated'} successfully`);
        navigate('/reviews/dashboard');
      } else {
        alertify.error(response.data.message || 'Failed to submit decision');
      }
    } catch (error) {
      console.error('Error submitting decision:', error);
      alertify.error(error.response?.data?.message || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
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

  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading review details...</p>
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

  const canMakeDecision = reviewData.status === 'pending_director_review';

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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Review Details</h1>
            <p className="text-sm sm:text-base text-gray-600">Employee performance review</p>
          </div>
        </div>

        {/* Employee & Manager Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <User size={18} />
              Employee Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Name:</span>
                <span className="font-semibold text-gray-800">
                  {reviewData.employee?.employeeName || reviewData.employeeName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">ID:</span>
                <span className="font-semibold text-gray-800">
                  {reviewData.employee?.employeeEmpId || reviewData.employeeEmpId}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building size={16} className="text-gray-600" />
                <span className="text-gray-600">Department:</span>
                <span className="font-semibold text-gray-800">
                  {reviewData.employee?.department || reviewData.department}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-600" />
                <span className="text-gray-600">Date of Joining:</span>
                <span className="font-semibold text-gray-800">
                  {formatDate(reviewData.employee?.dateOfJoining || reviewData.dateOfJoining)}
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
                  {reviewData.manager?.managerName || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">ID:</span>
                <span className="font-semibold text-gray-800">
                  {reviewData.manager?.managerEmpId || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building size={16} className="text-gray-600" />
                <span className="text-gray-600">Department:</span>
                <span className="font-semibold text-gray-800">
                  {reviewData.manager?.department || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-600" />
                <span className="text-gray-600">Submitted:</span>
                <span className="font-semibold text-gray-800">
                  {formatDate(reviewData.submittedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Sections */}
      <div className="space-y-4 sm:space-y-6">
        {renderRatingSection('Performance Metrics', reviewData.performance)}
        {renderRatingSection('Communication Skills', reviewData.communication)}
        {renderRatingSection('Technical Skills', reviewData.technicalSkills)}
        {renderRatingSection('Behavioral Assessment', reviewData.behavioral)}

        {/* Overall Assessment */}
        {reviewData.overallAssessment && (
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
                        star <= (reviewData.overallAssessment.overallRating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-gray-200 text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-lg font-bold text-gray-800 ml-2">
                    {reviewData.overallAssessment.overallRating}/5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Strengths</label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-700">{reviewData.overallAssessment.strengths || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Areas for Improvement</label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-700">{reviewData.overallAssessment.areasForImprovement || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Overall Comments</label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-700">{reviewData.overallAssessment.overallComments || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manager Recommendation</label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                    reviewData.overallAssessment.managerRecommendation === 'continue'
                      ? 'bg-green-100 text-green-800'
                      : reviewData.overallAssessment.managerRecommendation === 'terminate'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {reviewData.overallAssessment.managerRecommendation === 'continue'
                      ? 'Continue Employment'
                      : reviewData.overallAssessment.managerRecommendation === 'terminate'
                      ? 'Terminate'
                      : 'Extend Probation'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Director Decision Section */}
        {canMakeDecision && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-4 sm:p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              Director Decision
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decision <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDecision('continue');
                      setErrors({});
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      decision === 'continue'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                    }`}
                  >
                    <CheckCircle size={20} />
                    <span className="font-semibold">Continue Employment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDecision('terminate');
                      setErrors({});
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      decision === 'terminate'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                    }`}
                  >
                    <XCircle size={20} />
                    <span className="font-semibold">Terminate</span>
                  </button>
                </div>
                {errors.decision && (
                  <p className="mt-1 text-xs text-red-600">{errors.decision}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decision Comments
                </label>
                <textarea
                  value={decisionComments}
                  onChange={(e) => setDecisionComments(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter comments about your decision..."
                  rows={4}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/reviews/dashboard')}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!decision) {
                      setErrors({ decision: 'Please select a decision' });
                      alertify.error('Please select a decision');
                      return;
                    }
                    setShowConfirmModal(true);
                  }}
                  disabled={submitting || !decision}
                  className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                    decision === 'continue'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                      : decision === 'terminate'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {decision === 'continue' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      Submit Decision
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Already Decided */}
        {!canMakeDecision && reviewData.directorDecision && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              Director Decision
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Decision: </span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                  reviewData.directorDecision.decision === 'continue'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {reviewData.directorDecision.decision === 'continue' ? (
                    <>
                      <CheckCircle size={16} />
                      Continue Employment
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      Terminated
                    </>
                  )}
                </span>
              </div>
              {reviewData.directorDecision.decisionComments && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Comments: </span>
                  <p className="text-gray-700 mt-1">{reviewData.directorDecision.decisionComments}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-600">Decided by: </span>
                <span className="text-gray-700">
                  {reviewData.directorDecision.decidedBy?.employeeName || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Decided at: </span>
                <span className="text-gray-700">{formatDate(reviewData.directorDecision.decidedAt)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl mx-2 sm:mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  decision === 'continue' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {decision === 'continue' ? (
                    <CheckCircle size={24} className="text-green-600" />
                  ) : (
                    <XCircle size={24} className="text-red-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Confirm Decision</h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to {decision === 'continue' ? 'approve' : 'terminate'} this employee?
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Employee:</strong> {reviewData.employee?.employeeName || reviewData.employeeName}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>Decision:</strong> {decision === 'continue' ? 'Continue Employment' : 'Terminate'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitDecision}
                  disabled={submitting}
                  className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                    decision === 'continue'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                      : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                  } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {submitting ? 'Submitting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

