import React, { useState, useEffect } from 'react';
import { 
  Headphones, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Calendar,
  Users,
  BarChart3,
  PlayCircle,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import qaService from '../../services/qaService';
import { format } from 'date-fns';
import UpcomingBirthdays from '../UpcomingBirthdays';

const QADashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dashboardStats, setDashboardStats] = useState({
    pendingReviews: 0,
    completedReviews: 0,
    averageScore: 0,
    managerReviewRequired: 0,
    totalAssigned: 0,
    assignmentDistribution: []
  });
  const [pendingRecordings, setPendingRecordings] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsResponse = await qaService.getDashboardStats(selectedDate);
      if (statsResponse.success) {
        setDashboardStats(statsResponse.data);
      }

      // Fetch pending recordings
      const recordingsResponse = await qaService.getCallRecordings({
        status: 'pending_review',
        reviewDate: selectedDate
      });
      if (recordingsResponse.success) {
        setPendingRecordings(recordingsResponse.data.recordings || []);
      }

      // Fetch recent reviews
      const reviewsResponse = await qaService.getCallRecordings({
        status: ['approved', 'needs_improvement', 'manager_reviewed'],
        reviewDate: selectedDate,
        limit: 10
      });
      if (reviewsResponse.success) {
        setRecentReviews(reviewsResponse.data.recordings || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    try {
      const response = await qaService.autoAssignCallRecordings(selectedDate);
      if (response.success) {
        alert('Call recordings assigned successfully!');
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error auto-assigning recordings:', error);
      alert('Failed to assign recordings. Please try again.');
    }
  };

  const handleReview = (recordingId) => {
    navigate(`/qa/call-recording-review/${recordingId}`);
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className={`${color} rounded-lg p-6 text-white shadow-lg`}>
      <div className="flex flex-col items-center justify-center text-center h-full">
        <Icon className="w-12 h-12 text-white/30 mb-3" />
        <p className="text-white/80 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold mt-2">{value}</p>
        {subtitle && <p className="text-white/70 text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  );

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">QA Dashboard</h1>
          <p className="text-gray-600 mt-1">Quality Assurance - Call Recording Reviews</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAutoAssign}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Auto Assign Recordings
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
        <StatCard
          title="Pending Reviews"
          value={dashboardStats.pendingReviews}
          icon={Clock}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
          subtitle={`For ${format(new Date(selectedDate), 'MMM dd, yyyy')}`}
        />
        <StatCard
          title="Completed Reviews"
          value={dashboardStats.completedReviews}
          icon={CheckCircle}
          color="bg-gradient-to-r from-green-500 to-green-600"
          subtitle="Today"
        />
        <StatCard
          title="Average Score"
          value={dashboardStats.averageScore.toFixed(1)}
          icon={TrendingUp}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          subtitle="Out of 10"
        />
        <StatCard
          title="Manager Review Required"
          value={dashboardStats.managerReviewRequired}
          icon={AlertCircle}
          color="bg-gradient-to-r from-red-500 to-red-600"
          subtitle="Score < 7"
        />
      </div>

      {/* Assignment Distribution */}
      {dashboardStats.assignmentDistribution && dashboardStats.assignmentDistribution.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Assignment Distribution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dashboardStats.assignmentDistribution.map((dist, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-700">{dist.qaUserName}</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{dist.assignedCount}</p>
                <p className="text-sm text-gray-500 mt-1">Recordings Assigned</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Employee Birthdays Section */}
        <div className="lg:col-span-1">
          <UpcomingBirthdays limit={5} showAllDepartments={true} />
        </div>

        {/* Right Side - Two Column Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-8">
          {/* Pending Recordings */}
          <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Headphones className="w-6 h-6" />
              Pending Reviews
            </h2>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
              {pendingRecordings.length}
            </span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pendingRecordings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending reviews for this date</p>
            ) : (
              pendingRecordings.map((recording) => (
                <div
                  key={recording._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleReview(recording._id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{recording.employeeName}</p>
                      <p className="text-sm text-gray-600 mt-1">Emp ID: {recording.empId}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(recording.callDuration)}
                        </span>
                        <span className="capitalize">{recording.callType}</span>
                        <span>{format(new Date(recording.callDate), 'MMM dd, HH:mm')}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReview(recording._id);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Recent Reviews
            </h2>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              {recentReviews.length}
            </span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentReviews.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No reviews completed for this date</p>
            ) : (
              recentReviews.map((recording) => (
                <div
                  key={recording._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/qa/review/${recording._id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{recording.employeeName}</p>
                      <p className="text-sm text-gray-600 mt-1">Emp ID: {recording.empId}</p>
                      {recording.qaFeedback && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(recording.qaFeedback.score)}`}>
                            Score: {recording.qaFeedback.score}/10
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            recording.status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : recording.status === 'needs_improvement'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {recording.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default QADashboard;
