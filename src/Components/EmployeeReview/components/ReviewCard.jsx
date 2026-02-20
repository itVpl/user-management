import React from 'react';
import { User, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Star, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const ReviewCard = ({ review, onClick, showStatus = true }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_manager_review':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
            <Clock size={12} />
            Pending Review
          </span>
        );
      case 'pending_director_review':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
            <AlertCircle size={12} />
            Pending Decision
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
            <CheckCircle size={12} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
            <XCircle size={12} />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
            {status}
          </span>
        );
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

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {review.employeeName?.charAt(0) || review.employee?.employeeName?.charAt(0) || 'E'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                {review.employeeName || review.employee?.employeeName || 'N/A'}
              </h3>
              <p className="text-sm text-gray-500">
                {review.employeeEmpId || review.employee?.employeeEmpId || 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User size={16} />
              <span className="font-medium">Department:</span>
              <span>{review.department || review.employee?.department || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={16} />
              <span className="font-medium">Days Since Joining:</span>
              <span>{review.daysSinceJoining || 0} days</span>
            </div>
          </div>

          {review.overallRating && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm font-medium text-gray-600">Overall Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    className={`${
                      star <= review.overallRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-300'
                    }`}
                  />
                ))}
                <span className="text-sm font-bold text-gray-800 ml-1">
                  {review.overallRating}/5
                </span>
              </div>
            </div>
          )}

          {review.managerRecommendation && (
            <div className="mt-3">
              <span className="text-sm font-medium text-gray-600">Manager Recommendation: </span>
              <span className={`text-sm font-semibold ${
                review.managerRecommendation === 'continue' ? 'text-green-600' :
                review.managerRecommendation === 'terminate' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {review.managerRecommendation === 'continue' ? 'Continue' :
                 review.managerRecommendation === 'terminate' ? 'Terminate' :
                 'Extend Probation'}
              </span>
            </div>
          )}
        </div>

        {showStatus && (
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(review.status)}
            {onClick && (
              <ChevronRight className="text-gray-400 group-hover:text-blue-500 transition-colors" size={20} />
            )}
          </div>
        )}
      </div>

      {review.submittedAt && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
          <Clock size={14} />
          <span>Submitted: {formatDate(review.submittedAt)}</span>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;

