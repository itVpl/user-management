import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Headphones, 
  PlayCircle,
  Calendar,
  Filter,
  User,
  Phone
} from 'lucide-react';
import qaService from '../../services/qaService';
import { format } from 'date-fns';

const PendingReviews = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pendingRecordings, setPendingRecordings] = useState([]);
  const [filters, setFilters] = useState({
    status: 'pending_review',
    reviewDate: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchPendingReviews();
  }, [selectedDate]);

  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const response = await qaService.getCallRecordings({
        status: 'pending_review',
        reviewDate: selectedDate
      });
      if (response.success) {
        setPendingRecordings(response.data.recordings || []);
      }
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (recordingId) => {
    navigate(`/qa/call-recording-review/${recordingId}`);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-8 h-8" />
          Pending Reviews
        </h1>
        <p className="text-gray-600 mt-1">Review call recordings assigned to you</p>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">Review Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">
            {pendingRecordings.length} pending review(s)
          </span>
        </div>
      </div>

      {/* Pending Recordings List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Headphones className="w-6 h-6" />
          Pending Recordings
        </h2>

        {pendingRecordings.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No pending reviews for this date</p>
            <p className="text-gray-500 text-sm mt-2">Try selecting a different date</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRecordings.map((recording) => (
              <div
                key={recording._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div>
                        <p className="font-semibold text-gray-800">{recording.employeeName}</p>
                        <p className="text-sm text-gray-600">Emp ID: {recording.empId}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(recording.callDate), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(recording.callDuration)}
                        </span>
                        <span className="capitalize">{recording.callType}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-600">Department</p>
                        <p className="font-semibold text-gray-800">{recording.department}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Call Time</p>
                        <p className="font-semibold text-gray-800">{recording.callTime}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Caller</p>
                        <p className="font-semibold text-gray-800">{recording.callerNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Callee</p>
                        <p className="font-semibold text-gray-800">{recording.calleeNumber}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleReview(recording._id)}
                    className="ml-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Review Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingReviews;
