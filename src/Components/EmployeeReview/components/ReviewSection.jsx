import React from 'react';
import RatingInput from './RatingInput';

const ReviewSection = ({ 
  title, 
  fields, 
  formData, 
  onChange, 
  errors = {},
  disabled = false 
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-6">
        {fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <RatingInput
              label={field.label}
              value={formData[field.key]?.rating || 0}
              onChange={(rating) => onChange(field.key, 'rating', rating)}
              required={true}
              error={errors[field.key]?.rating}
              disabled={disabled}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments
              </label>
              <textarea
                value={formData[field.key]?.comments || ''}
                onChange={(e) => onChange(field.key, 'comments', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter comments for ${field.label.toLowerCase()}...`}
                rows={3}
                disabled={disabled}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewSection;

