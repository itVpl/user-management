import React from 'react';

const Loader = ({ variant = 'section', message }) => {
  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
        {message && <span className="ml-2 text-xs text-gray-600">{message}</span>}
      </div>
    );
  }
  if (variant === 'overlay') {
    return (
      <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          {message && <p className="text-white font-medium">{message}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="p-6">
      <div className="flex justify-center items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          {message && <p className="text-gray-600 font-medium">{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default Loader;

