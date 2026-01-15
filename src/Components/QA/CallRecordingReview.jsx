import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Volume2, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Clock,
  User,
  Phone,
  Calendar
} from 'lucide-react';
import qaService from '../../services/qaService';
import { format } from 'date-fns';

const CallRecordingReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(null);
  const [score, setScore] = useState(7);
  const [reason, setReason] = useState('');
  const audioPlayerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    fetchRecording();
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

  const fetchRecording = async () => {
    try {
      setLoading(true);
      const response = await qaService.getCallRecording(id);
      if (response.success) {
        setRecording(response.data);
        if (response.data.qaFeedback) {
          setScore(response.data.qaFeedback.score || 7);
          setReason(response.data.qaFeedback.reason || '');
        }
      }
    } catch (error) {
      console.error('Error fetching recording:', error);
      alert('Failed to load call recording');
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

  const handleTimeDisplayClick = (e) => {
    handleSeek(e);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (score < 7 && !reason.trim()) {
      alert('Please provide a reason for scores below 7');
      return;
    }

    try {
      setSubmitting(true);
      const feedback = {
        score,
        reason: score < 7 ? reason : undefined,
      };

      const response = await qaService.submitQAFeedback(id, feedback);
      if (response.success) {
        alert('Feedback submitted successfully!');
        navigate('/qa/dashboard');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 7) return 'bg-green-100 border-green-300';
    if (score >= 4) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
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
        <p className="text-gray-600">Recording not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/qa/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Call Recording Review</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Review Section */}
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
                  {formatTime(recording.callDuration)}
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
              <Volume2 className="w-6 h-6" />
              Call Recording
            </h2>
            
            {/* Hidden Audio Element */}
            <audio
              ref={audioPlayerRef}
              src={recording.callRecordingUrl}
              preload="metadata"
            />

            {/* Audio Controls */}
            <div className="space-y-4">
              {/* Playback Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </button>
                
                {/* Progress Bar */}
                <div className="flex-1">
                  <div
                    className="h-2 bg-gray-200 rounded-full cursor-pointer relative"
                    onClick={handleSeek}
                  >
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span onClick={handleTimeDisplayClick} className="cursor-pointer">
                      {formatTime(currentTime)}
                    </span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Playback Speed */}
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

              {/* Recording Link */}
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

          {/* Feedback Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quality Assessment</h2>
            
            {/* Score Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score (1-10)
              </label>
              <div className="space-y-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1 (Poor)</span>
                  <span>5 (Average)</span>
                  <span>10 (Excellent)</span>
                </div>
                <div className="text-center">
                  <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
                    {score}
                  </span>
                  <span className="text-gray-600 ml-2">/ 10</span>
                </div>
              </div>
            </div>

            {/* Reason Input (Required if score < 7) */}
            {score < 7 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Low Score <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide detailed feedback on areas that need improvement..."
                  rows="5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reason.length}/500 characters
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                onClick={handleSubmit}
                disabled={submitting || (score < 7 && !reason.trim())}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  submitting || (score < 7 && !reason.trim())
                    ? 'bg-gray-400 cursor-not-allowed'
                    : score >= 7
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : score >= 7 ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Approve (Score ≥ 7)
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Submit for Manager Review (Score &lt; 7)
                  </>
                )}
              </button>
              <button
                onClick={() => navigate('/qa/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Status Info */}
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
              {recording.assignedToQA && (
                <div>
                  <p className="text-sm text-gray-600">Assigned To</p>
                  <p className="font-semibold text-gray-800 mt-1">QA User</p>
                </div>
              )}
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

          {recording.qaFeedback && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Previous Feedback</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Score</p>
                  <p className={`font-semibold text-2xl mt-1 ${getScoreColor(recording.qaFeedback.score)}`}>
                    {recording.qaFeedback.score}/10
                  </p>
                </div>
                {recording.qaFeedback.reason && (
                  <div>
                    <p className="text-sm text-gray-600">Reason</p>
                    <p className="font-semibold text-gray-800 mt-1">{recording.qaFeedback.reason}</p>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default CallRecordingReview;
