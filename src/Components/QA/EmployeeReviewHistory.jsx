import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  Search, 
  Filter,
  Eye,
  Clock,
  TrendingUp,
  Download,
  PlayCircle,
  Headphones,
  File,
  X
} from 'lucide-react';
import qaService from '../../services/qaService';
import { format } from 'date-fns';
import API_CONFIG from '../../config/api';

const EmployeeReviewHistory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  
  // Debug: Log when component mounts
  useEffect(() => {
    console.log('EmployeeReviewHistory component mounted');
  }, []);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    minScore: '',
    maxScore: '',
    status: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [empId, setEmpId] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const itemsPerPage = 10;

  // Get empId on mount
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (!userStr) {
        console.error('No user data found in storage');
        setLoading(false);
        return;
      }
      
      const user = JSON.parse(userStr);
      const userEmpId = user.empId || user.employeeId || user.userId;
      
      if (userEmpId) {
        setEmpId(userEmpId);
      } else {
        console.error('Employee ID not found in user data:', user);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      setLoading(false);
    }
  }, []);

  // Fetch reviews when empId, page, or filters change
  useEffect(() => {
    if (!empId) return;

    const fetchReviews = async () => {
      try {
        setLoading(true);
        const queryParams = {
          page: currentPage,
          limit: itemsPerPage,
          ...filters
        };
        
        const response = await qaService.getEmployeeReviews(empId, queryParams);
        if (response.success) {
          setReviews(response.data.reviews || []);
          setTotalPages(response.data.totalPages || 1);
        } else {
          console.error('Failed to fetch reviews:', response.message);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [empId, currentPage, filters.fromDate, filters.toDate, filters.minScore, filters.maxScore, filters.status]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      minScore: '',
      maxScore: '',
      status: ''
    });
    setCurrentPage(1);
  };

  const getScoreColor = (score) => {
    if (score >= 7) return 'text-green-600 bg-green-100';
    if (score >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'needs_improvement':
        return 'bg-yellow-100 text-yellow-800';
      case 'manager_reviewed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get absolute URL for documents
  const getAbsoluteUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${API_CONFIG.BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
  };

  // Check if URL is an image
  const isImageUrl = (url) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext));
  };

  // Check if URL is an audio file
  const isAudioUrl = (url) => {
    if (!url) return false;
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    const lowerUrl = url.toLowerCase();
    return audioExtensions.some(ext => lowerUrl.includes(ext));
  };

  // Handle document preview
  const handleDocumentPreview = (url, name) => {
    const absoluteUrl = getAbsoluteUrl(url);
    setSelectedDocument({ url: absoluteUrl, name: name || 'Document' });
    setPreviewUrl(absoluteUrl);
  };

  // Close document preview
  const closePreview = () => {
    setSelectedDocument(null);
    setPreviewUrl(null);
  };

  if (loading && !empId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!empId) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Employee ID Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load your reviews. Please log in again.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-8 h-8" />
          My Call Recording Reviews
        </h1>
        <p className="text-gray-600 mt-1">View all your call recording reviews and feedback</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-bold text-gray-800">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Score</label>
            <input
              type="number"
              min="1"
              max="10"
              value={filters.minScore}
              onChange={(e) => handleFilterChange('minScore', e.target.value)}
              placeholder="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
            <input
              type="number"
              min="1"
              max="10"
              value={filters.maxScore}
              onChange={(e) => handleFilterChange('maxScore', e.target.value)}
              placeholder="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="approved">Approved</option>
              <option value="needs_improvement">Needs Improvement</option>
              <option value="manager_reviewed">Manager Reviewed</option>
              <option value="pending_review">Pending Review</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Reviews</h2>
          <span className="text-gray-600">
            Showing {reviews.length} review(s)
          </span>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No reviews found</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(review.callDate), 'MMM dd, yyyy')}
                        </span>
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {Math.floor(review.callDuration / 60)}:{(review.callDuration % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="text-sm text-gray-600 capitalize">
                          {review.callType}
                        </span>
                      </div>
                      
                      {review.qaFeedback && (
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(review.qaFeedback.score)}`}>
                            Score: {review.qaFeedback.score}/10
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                            {review.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      )}

                      {review.qaFeedback?.reason && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          <strong>QA Feedback:</strong> {review.qaFeedback.reason}
                        </p>
                      )}

                      {review.managerFeedback?.reason && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          <strong>Manager Feedback:</strong> {review.managerFeedback.reason}
                        </p>
                      )}

                      {/* Documents Section */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <File className="w-4 h-4" />
                          Documents
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {/* Call Recording */}
                          {review.callRecordingUrl && (
                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                              <Headphones className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-gray-700">Call Recording</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleDocumentPreview(review.callRecordingUrl, 'Call Recording')}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  title="Preview"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <a
                                  href={getAbsoluteUrl(review.callRecordingUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Additional Documents */}
                          {review.documents && review.documents.length > 0 && review.documents.map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                              <File className="w-4 h-4 text-gray-600" />
                              <span className="text-sm text-gray-700 truncate max-w-[150px]">
                                {doc.name || doc.label || `Document ${idx + 1}`}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleDocumentPreview(doc.url, doc.name || doc.label || `Document ${idx + 1}`)}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  title="Preview"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <a
                                  href={getAbsoluteUrl(doc.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/qa/review/${review._id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      {review.callRecordingUrl && (
                        <a
                          href={getAbsoluteUrl(review.callRecordingUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Recording
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">{selectedDocument.name}</h3>
              <button
                onClick={closePreview}
                className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 max-h-[calc(90vh-80px)] overflow-auto">
              {isImageUrl(selectedDocument.url) ? (
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.name}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg mx-auto"
                />
              ) : isAudioUrl(selectedDocument.url) ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Headphones className="w-16 h-16 text-blue-500 mb-4" />
                  <audio
                    controls
                    src={selectedDocument.url}
                    className="w-full max-w-md"
                  >
                    Your browser does not support the audio element.
                  </audio>
                  <a
                    href={selectedDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Audio
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <File className="text-6xl text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Document preview not available</p>
                  <div className="flex gap-3">
                    <a
                      href={selectedDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Open in New Tab
                    </a>
                    <a
                      href={selectedDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
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
};

export default EmployeeReviewHistory;
