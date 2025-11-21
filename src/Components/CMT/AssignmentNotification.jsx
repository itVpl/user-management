import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

const AssignmentNotification = ({ assignment, onAccept, onCancel, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (timeLeft <= 0) {
      // Auto-close after 30 seconds
      onClose();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onClose]);

  if (!assignment) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">New Rate Request Assign</h3>
              <p className="text-sm text-gray-500">You have been assigned a new load</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timer */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Time remaining:</span>
            <span className={`text-lg font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-blue-600'}`}>
              {timeLeft}s
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${timeLeft <= 10 ? 'bg-red-600' : 'bg-blue-600'}`}
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>
        </div>

        {/* Load Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Shipment No:</span>
              <span className="font-medium text-gray-800">{assignment.shipmentNo || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipper:</span>
              <span className="font-medium text-gray-800">{assignment.shipperName || 'N/A'}</span>
            </div>
            {assignment.pickupAddress && (
              <div className="flex justify-between">
                <span className="text-gray-600">Pickup:</span>
                <span className="font-medium text-gray-800">{assignment.pickupAddress}</span>
              </div>
            )}
            {assignment.deliveryAddress && (
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery:</span>
                <span className="font-medium text-gray-800">{assignment.deliveryAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onAccept}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Accept
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentNotification;







