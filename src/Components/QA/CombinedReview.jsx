import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Clock, 
  Calendar,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  FileText
} from 'lucide-react';
import qaService from '../../services/qaService';
import { format } from 'date-fns';

const CombinedReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(null);
  const audioPlayerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    fetchReview();
  }, [id]);

  useEffect(() => {
    const audioPlayer = audioPlayerRef.current;
    if (audioPlayer) {
      const updateTime = () => setCurrentTime(audioPlayer.currentTime);
      const updateDuration = () => setDuration(audioPlayer.duration);
      
      audioPlayer.addEventListener('timeupdate', updateTime);
      audioPlayer.addEventListener('loadedmetadata', updateDuration);
      audioPlayer.addEventListener('ended', () => setIsPlaying(false));

      return () => {
        audioPlayer.removeEventListener('timeupdate', updateTime);
        audioPlayer.removeEventListener('loadedmetadata', updateDuration);
        audioPlayer.removeEventListener('ended', () => setIsPlaying(false));
      };
    }
  }, []);

  const fetchReview = async () => {
    try {
      setLoading(true);
      const response = await qaService.getCompleteReview(id);
      if (response.success) {
        setRecording(response.data);
      }
    } catch (error) {
      console.error('Error fetching review:', error);
      alert('Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    const audioPlayer = audioPlayerRef.current;
    if (!audioPlayer) return;
    
    if (isPlaying) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const audioPlayer = audioPlayerRef.current;
    if (!audioPlayer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    audioPlayer.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  if (!recording) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Review not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-8 h-8" />
          Complete Review
        </h1>
        <p className="text-gray-600 mt-1">QA and Manager feedback for call recording</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-6 h-6" />
              Employee Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Employee Name</p>
                <p className="font-semibold text-gray-800">{recording.employeeName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Employee ID</p>
                <p className="font-semibold text-gray-800">{recording.empId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-semibold text-gray-800">{recording.department}</p>
              </div>
            </div>
          </div>

          {/* Call Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Phone className="w-6 h-6" />
              Call Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Call Date</p>
                <p className="font-semibold text-gray-800">
                  {format(new Date(recording.callDate), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Call Time</p>
                <p className="font-semibold text-gray-800">{recording.callTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-semibold text-gray-800 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(recording.callDuration)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Call Type</p>
                <p className="font-semibold text-gray-800 capitalize">{recording.callType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Caller</p>
                <p className="font-semibold text-gray-800">{recording.callerNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Callee</p>
                <p className="font-semibold text-gray-800">{recording.calleeNumber}</p>
              </div>
            </div>
          </div>

          {/* Audio Player */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PlayCircle className="w-6 h-6" />
              Call Recording
            </h2>
            
            <audio
              ref={audioPlayerRef}
              src={recording.callRecordingUrl}
              preload="metadata"
            />

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                
                <div className="flex-1">
                  <div
                    className="h-2 bg-gray-200 rounded-full cursor-pointer"
                    onClick={handleSeek}
                  >
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <select
                  value={playbackRate}
                  onChange={(e) => {
                    const rate = parseFloat(e.target.value);
                    setPlaybackRate(rate);
                    if (audioPlayerRef.current) {
                      audioPlayerRef.current.playbackRate = rate;
                    }
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0.5">0.5x</option>
                  <option value="1">1x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>

              <a
                href={recording.callRecordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Open recording in new tab
              </a>
            </div>
          </div>

          {/* QA Feedback */}
          {recording.qaFeedback && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-blue-600" />
                QA Feedback
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Score</p>
                  <p className={`text-3xl font-bold mt-1 inline-block px-4 py-2 rounded-lg ${getScoreColor(recording.qaFeedback.score)}`}>
                    {recording.qaFeedback.score}/10
                  </p>
                </div>
                {recording.qaFeedback.reason && (
                  <div>
                    <p className="text-sm text-gray-600">Reason</p>
                    <p className="font-semibold text-gray-800 mt-1 bg-gray-50 p-3 rounded-lg">
                      {recording.qaFeedback.reason}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {recording.qaFeedback.reviewedBy && (
                    <div>
                      <p className="text-sm text-gray-600">Reviewed By</p>
                      <p className="font-semibold text-gray-800 mt-1">QA User</p>
                    </div>
                  )}
                  {recording.qaFeedback.reviewedAt && (
                    <div>
                      <p className="text-sm text-gray-600">Reviewed At</p>
                      <p className="font-semibold text-gray-800 mt-1">
                        {format(new Date(recording.qaFeedback.reviewedAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manager Feedback */}
          {recording.managerFeedback && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-purple-600" />
                Manager Feedback
              </h2>
              <div className="space-y-4">
                {recording.managerFeedback.reason && (
                  <div>
                    <p className="text-sm text-gray-600">Feedback</p>
                    <p className="font-semibold text-gray-800 mt-1 bg-purple-50 p-3 rounded-lg">
                      {recording.managerFeedback.reason}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {recording.managerFeedback.reviewedBy && (
                    <div>
                      <p className="text-sm text-gray-600">Reviewed By</p>
                      <p className="font-semibold text-gray-800 mt-1">Manager</p>
                    </div>
                  )}
                  {recording.managerFeedback.reviewedAt && (
                    <div>
                      <p className="text-sm text-gray-600">Reviewed At</p>
                      <p className="font-semibold text-gray-800 mt-1">
                        {format(new Date(recording.managerFeedback.reviewedAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Review Status</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`font-semibold mt-1 px-3 py-1 rounded-full inline-block ${
                  recording.status === 'pending_review'
                    ? 'bg-orange-100 text-orange-800'
                    : recording.status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : recording.status === 'needs_improvement'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {recording.status.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              {recording.reviewDate && (
                <div>
                  <p className="text-sm text-gray-600">Review Date</p>
                  <p className="font-semibold text-gray-800 mt-1">
                    {format(new Date(recording.reviewDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombinedReview;
