import React from 'react';
import { CheckCircle, Truck } from 'lucide-react';

const LoadAssignmentPopup = ({ assignment, onClose, hasBothPopups = false }) => {
  // Log when popup is rendered for debugging
  React.useEffect(() => {
    if (assignment) {

    }
  }, [assignment]);

  if (!assignment) return null;

  // Calculate position: 
  // If both popups: Load on left (right-[27rem] = 432px), DO on right (right-8 = 32px)
  // Popup width is max-w-sm (384px), so Load ends at 48px from right, DO starts at 32px
  // This gives a 16px gap between popups
  // If only Load: Load at bottom right (right-8)
  const rightPosition = hasBothPopups ? 'right-[27rem]' : 'right-8';

  // Utility function for location display
  const getLocationDisplay = (locationString) => {
    if (!locationString || locationString === 'N/A') return 'N/A';
    return locationString.trim();
  };

  return (
    <div 
      className={`fixed bottom-8 ${rightPosition} z-[9999] transition-all duration-300 ease-out`}
      style={{ 
        animation: 'slideInUp 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        maxWidth: 'calc(100vw - 2rem)',
      }}
    >
      <style>{`
        @keyframes slideInUp {
          from {
            transform: translateY(40px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        /* Custom Shadow for a "floating" luxury card effect */
        .shadow-luxury {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 10px 20px -5px rgba(0, 0, 0, 0.2);
        }
      `}</style>
      
      {/* Container: Deep Charcoal background, sharp corners, heavy shadow */}
      <div className="bg-gray-900 rounded-lg shadow-luxury max-w-sm w-full p-8 border border-gray-700">
        
        {/* Header: Clean, High-Contrast */}
        <div className="flex items-start gap-4 mb-6">
          {/* Icon styling: Subtle Gold/Amber accent */}
          <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-amber-500/20">
            <Truck className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1 pt-0.5">
            {/* Title/Subtitle Typography: Pure white, minimalist font weight */}
            <h3 className="text-xl font-light text-white tracking-widest uppercase">
              {assignment.isReassignment ? 'Load Reassigned' : 'Load Assigned'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {assignment.isReassignment 
                ? 'A load has been reassigned to you.' 
                : 'A new load has been assigned to you.'}
            </p>
          </div>
        </div>

        {/* Detail Box: Slightly lighter gray for contrast */}
        <div className="bg-gray-800 rounded-md p-5 mb-7">
          <div className="space-y-4 text-base">
            
            {/* Detail Item styling: Thin, clean lines */}
            <div className="flex justify-between items-start border-b border-gray-700 pb-2">
              <span className="text-gray-400 font-normal tracking-wider">Load ID</span>
              <span className="font-medium text-white text-right">
                {assignment.loadId 
                  ? (typeof assignment.loadId === 'string' && assignment.loadId.length >= 4 
                      ? `L-${assignment.loadId.slice(-4)}` 
                      : assignment.loadId)
                  : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-start border-b border-gray-700 pb-2">
              <span className="text-gray-400 font-normal tracking-wider">Shipper Name</span>
              <span className="font-medium text-white text-right max-w-[60%]">
                {assignment.shipperName || 'N/A'}
              </span>
            </div>

            {assignment.pickupAddress && (
              <div className="flex justify-between items-start border-b border-gray-700 pb-2">
                <span className="text-gray-400 font-normal tracking-wider">Pickup Location</span>
                <span className="font-medium text-white text-right max-w-[60%]">
                  {getLocationDisplay(assignment.pickupAddress)}
                </span>
              </div>
            )}

            {assignment.deliveryAddress && (
              <div className="flex justify-between items-start border-b border-gray-700 pb-2">
                <span className="text-gray-400 font-normal tracking-wider">Delivery Location</span>
                <span className="font-medium text-white text-right max-w-[60%]">
                  {getLocationDisplay(assignment.deliveryAddress)}
                </span>
              </div>
            )}
            
            {assignment.assignedAt && (
              <div className="flex justify-between items-start pt-3 border-t border-gray-700 mt-4">
                <span className="text-gray-400 font-normal tracking-wider">Assigned Date</span>
                <span className="font-bold text-amber-500 text-right tracking-widest">
                  {new Date(assignment.assignedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* OK Button: High-impact, golden accent */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-600 text-gray-900 px-10 py-3 rounded-full font-bold transition-all duration-300 ease-in-out flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-amber-500/50"
          >
            <CheckCircle className="w-5 h-5 fill-gray-900" />
            CONFIRM RECEIPT
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadAssignmentPopup;

