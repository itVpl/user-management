import React from 'react';
import { CheckCircle, Package } from 'lucide-react';

const DOAssignmentPopup = ({ assignment, onClose, hasBothPopups = false }) => {
  if (!assignment) return null;

  // Calculate position: if both popups, stay at right; if only this one, also at right
  // Both popups: DO at right-8, Load at left of DO
  // Only DO: DO at right-8
  const rightPosition = hasBothPopups ? 'right-8' : 'right-8';

  // Utility function for location display (Kept for functionality)
  const getLocationDisplay = (location, fallbackLocations) => {
    const city = location?.city || fallbackLocations?.[0]?.city || '';
    const state = location?.state || fallbackLocations?.[0]?.state || '';
    if (city && state) return `${city.trim()}, ${state.trim()}`;
    if (city) return city.trim();
    if (state) return state.trim();
    return 'N/A';
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
            <Package className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1 pt-0.5">
            {/* Title/Subtitle Typography: Pure white, minimalist font weight */}
            <h3 className="text-xl font-light text-white tracking-widest uppercase">New Delivery Order Assigned</h3>
            <p className="text-sm text-gray-400 mt-1">A high-priority Delivery Order has been secured.</p>
          </div>
        </div>

        {/* Detail Box: Slightly lighter gray for contrast */}
        <div className="bg-gray-800 rounded-md p-5 mb-7">
          <div className="space-y-4 text-base">
            
            {/* Detail Item styling: Thin, clean lines */}
            <div className="flex justify-between items-start border-b border-gray-700 pb-2">
              <span className="text-gray-400 font-normal tracking-wider">Load Reference</span>
              <span className="font-medium text-white text-right">{assignment.loadNo || 'N/A'}</span>
            </div>

            <div className="flex justify-between items-start border-b border-gray-700 pb-2">
              <span className="text-gray-400 font-normal tracking-wider">Origin Location</span>
              <span className="font-medium text-white text-right max-w-[60%]">
                {getLocationDisplay(assignment.origin, assignment.shipper?.pickUpLocations)}
              </span>
            </div>

            <div className="flex justify-between items-start border-b border-gray-700 pb-2">
              <span className="text-gray-400 font-normal tracking-wider">Final Destination</span>
              <span className="font-medium text-white text-right max-w-[60%]">
                {getLocationDisplay(assignment.destination, assignment.shipper?.dropLocations)}
              </span>
            </div>
            
            <div className="flex justify-between items-start">
              <span className="text-gray-400 font-normal tracking-wider">Load Type</span>
              <span className="font-medium text-white text-right uppercase">{assignment.loadType || 'N/A'}</span>
            </div>
            
            {assignment.date && (
              <div className="flex justify-between items-start pt-3 border-t border-gray-700 mt-4">
                <span className="text-gray-400 font-normal tracking-wider">Scheduled Date</span>
                <span className="font-bold text-amber-500 text-right tracking-widest">
                  {new Date(assignment.date).toLocaleDateString('en-US', {
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

export default DOAssignmentPopup;