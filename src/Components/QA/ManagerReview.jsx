import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  User, 
  Phone, 
  Clock, 
  ArrowLeft,
  CheckCircle,
  PlayCircle
} from 'lucide-react';
import qaService from '../../services/qaService';
import { format } from 'date-fns';

const ManagerReview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRecordings, setPendingRecordings] = useState([]);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [managerFeedback, setManagerFeedback] = useState('');

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const response = await qaService.getPendingManagerReviews();
      if (response.success) {
        setPendingRecordings(response.data.recordings || []);
      }
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecording = async (recordingId) => {
    try {
      const response = await qaService.getCallRecording(recordingId);
      if (response.success) {
        setSelectedRecording(response.data);
        if (response.data.managerFeedback?.reason) {
          setManagerFeedback(response.data.managerFeedback.reason);
        }
      }
    } catch (error) {
      console.error('Error fetching recording:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRecording) return;
    if (!managerFeedback.trim()) {
      alert('Please provide manager feedback');
      return;
    }

    try {
      setSubmitting(true);
      const response = await qaService.submitManagerFeedback(selectedRecording._id, {
        reason: managerFeedback,
      });

      if (response.success) {
        alert('Manager feedback submitted successfully!');
        setSelectedRecording(null);
        setManagerFeedback('');
        fetchPendingReviews();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score) => {
    if (score >= 7) return 'text-green-600 bg-green-100';
    if (score >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <AlertCircle className="w-8 h-8 text-red-600" />
          Manager Review - Low Score Recordings
        </h1>
        <p className="text-gray-600 mt-2">
          Review call recordings with QA scores below 7
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pending Recordings List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Pending Reviews ({pendingRecordings.length})
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {pendingRecordings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No recordings pending manager review
                </p>
              ) : (
                pendingRecordings.map((recording) => (
                  <div
                    key={recording._id}
                    onClick={() => handleSelectRecording(recording._id)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedRecording?._id === recording._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{recording.employeeName}</p>
                        <p className="text-sm text-gray-600">Emp ID: {recording.empId}</p>
                      </div>
                      {recording.qaFeedback && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(recording.qaFeedback.score)}`}>
                          {recording.qaFeedback.score}/10
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(recording.callDuration)}
                      </span>
                      <span>{format(new Date(recording.callDate), 'MMM dd')}</span>
                    </div>
                    {recording.qaFeedback?.reason && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {recording.qaFeedback.reason}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Review Section */}
        <div className="lg:col-span-2">
          {selectedRecording ? (
            <div className="space-y-6">
              {/* Employee & Call Details */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Recording Details</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Employee Name</p>
                    <p className="font-semibold text-gray-800">{selectedRecording.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Employee ID</p>
                    <p className="font-semibold text-gray-800">{selectedRecording.empId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-semibold text-gray-800">{selectedRecording.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Call Date</p>
                    <p className="font-semibold text-gray-800">
                      {format(new Date(selectedRecording.callDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-semibold text-gray-800">
                      {formatDuration(selectedRecording.callDuration)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Call Type</p>
                    <p className="font-semibold text-gray-800 capitalize">
                      {selectedRecording.callType}
                    </p>
                  </div>
                </div>
                <a
                  href={selectedRecording.callRecordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlayCircle className="w-5 h-5" />
                  Listen to Recording
                </a>
              </div>

              {/* QA Feedback */}
              {selectedRecording.qaFeedback && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                    QA Feedback
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Score</p>
                      <p className={`text-3xl font-bold mt-1 ${getScoreColor(selectedRecording.qaFeedback.score).split(' ')[0]}`}>
                        {selectedRecording.qaFeedback.score}/10
                      </p>
                    </div>
                    {selectedRecording.qaFeedback.reason && (
                      <div>
                        <p className="text-sm text-gray-600">Reason</p>
                        <p className="font-semibold text-gray-800 mt-1 bg-yellow-50 p-3 rounded-lg">
                          {selectedRecording.qaFeedback.reason}
                        </p>
                      </div>
                    )}
                    {selectedRecording.qaFeedback.reviewedAt && (
                      <div>
                        <p className="text-sm text-gray-600">Reviewed At</p>
                        <p className="font-semibold text-gray-800 mt-1">
                          {format(new Date(selectedRecording.qaFeedback.reviewedAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Manager Feedback Form */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Manager Feedback</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback / Comments <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={managerFeedback}
                      onChange={(e) => setManagerFeedback(e.target.value)}
                      placeholder="Provide your feedback and comments on this call recording..."
                      rows="6"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {managerFeedback.length}/1000 characters
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !managerFeedback.trim()}
                      className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                        submitting || !managerFeedback.trim()
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Submit Manager Feedback
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRecording(null);
                        setManagerFeedback('');
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                Select a recording from the list to review
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerReview;
