import React from 'react';
import { Star } from 'lucide-react';

const RatingInput = ({ value, onChange, label, required = false, error = null, disabled = false }) => {
  const handleStarClick = (rating) => {
    if (!disabled && onChange) {
      onChange(rating);
    }
  };

  const handleStarHover = (rating) => {
    // Optional: Add hover effect
  };

  const getRatingLabel = (rating) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Below Expectations';
      case 3: return 'Meets Expectations';
      case 4: return 'Exceeds Expectations';
      case 5: return 'Outstanding';
      default: return '';
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => handleStarHover(star)}
              disabled={disabled}
              className={`transition-all ${
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'
              }`}
            >
              <Star
                size={28}
                className={`${
                  star <= value
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-300'
                } transition-colors`}
              />
            </button>
          ))}
        </div>
        {value > 0 && (
          <span className="text-sm font-medium text-gray-600 ml-2">
            {value} - {getRatingLabel(value)}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default RatingInput;

