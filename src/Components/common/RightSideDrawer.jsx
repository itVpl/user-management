import React, { useEffect } from 'react';
import { X, Plus, RefreshCw } from 'lucide-react';

/**
 * RightSideDrawer Component
 * A reusable drawer component that slides in from the right side
 * 
 * @param {boolean} isOpen - Controls drawer visibility
 * @param {function} onClose - Callback when drawer closes
 * @param {ReactNode} children - Content to display in drawer
 * @param {string} title - Drawer title
 * @param {number} width - Width percentage (default: 30)
 * @param {ReactComponent} icon - Custom icon component (optional)
 * @param {string} iconPosition - Position of plugin icon: 'fixed' or 'relative' (default: 'fixed')
 * @param {object} iconStyle - Custom styles for plugin icon button
 * @param {boolean} showIcon - Show/hide the plugin icon button
 * @param {function} onRefresh - Callback function for refresh button in header
 */
const RightSideDrawer = ({
  isOpen,
  onClose,
  children,
  title = 'Drawer',
  width = 30,
  icon: CustomIcon = Plus,
  iconPosition = 'fixed',
  iconStyle = {},
  showIcon = true,
  onRefresh = null
}) => {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const defaultIconStyle = {
    position: iconPosition,
    top: '50%',
    right: isOpen ? `${width}%` : '20px',
    transform: 'translateY(-50%)',
    zIndex: 1000,
    transition: 'all 0.3s ease-in-out',
    ...iconStyle
  };

  return (
    <>
      {/* Plugin Icon Button - Beautiful Primary Color Design */}
      {showIcon && (
        <button
          onClick={() => onClose()} // Toggle drawer
          style={defaultIconStyle}
          className="
            fixed
            bg-blue-600
            hover:bg-blue-700
            text-white
            w-10 h-10
            rounded-l-lg
            shadow-lg
            hover:shadow-xl
            shadow-blue-500/50
            hover:shadow-blue-600/60
            border-0
            transition-all 
            duration-300
            flex 
            items-center 
            justify-center
            group
            hover:scale-105
            transform
            relative
            overflow-hidden
          "
          aria-label="Toggle drawer"
          title={isOpen ? 'Close drawer' : 'Open drawer'}
        >
          {/* Shimmer effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          
          <CustomIcon 
            size={18} 
            className={`transition-all duration-300 relative z-10 ${isOpen ? 'rotate-45' : ''}`}
          />
          
          {/* Pulse indicator when closed */}
          {!isOpen && (
            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-75"></div>
          )}
        </button>
      )}

      {/* Backdrop - Beautiful blur effect */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998] transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer - Beautiful sliding panel */}
      <div
        className={`
          fixed 
          top-0 
          right-0 
          h-full 
          bg-white
          shadow-2xl
          shadow-blue-500/10
          z-[999]
          transform 
          transition-transform 
          duration-300 
          ease-out
          flex 
          flex-col
          border-l-2 border-blue-100
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ width: `${width}%` }}
      >
        {/* Drawer Header - Beautiful Primary Color Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 text-white p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12 blur-xl"></div>
          </div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30">
              <CustomIcon size={22} className="drop-shadow-sm" />
            </div>
            <div>
              <h2 className="text-2xl font-bold drop-shadow-sm">{title}</h2>
              <p className="text-xs text-blue-100 mt-0.5">Quick access panel</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 relative z-10">
            {onRefresh && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                className="
                  p-2.5 
                  rounded-xl 
                  bg-white/10
                  hover:bg-white/20 
                  backdrop-blur-sm
                  transition-all 
                  duration-200
                  focus:outline-none
                  focus:ring-2
                  focus:ring-white/50
                  hover:scale-110
                  transform
                  border border-white/20
                  text-white
                "
                aria-label="Refresh drawer"
                title="Refresh"
              >
                <RefreshCw size={20} className="drop-shadow-sm" />
              </button>
            )}
            <button
              onClick={onClose}
              className="
                p-2.5 
                rounded-xl 
                bg-white/10
                hover:bg-white/20 
                backdrop-blur-sm
                transition-all 
                duration-200
                focus:outline-none
                focus:ring-2
                focus:ring-white/50
                hover:scale-110
                transform
                border border-white/20
                text-white
              "
              aria-label="Close drawer"
            >
              <X size={22} className="drop-shadow-sm" />
            </button>
          </div>
        </div>

        {/* Drawer Content - Beautiful scrollable area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 via-white to-gray-50">
          <div className="max-w-full">
            {children}
          </div>
        </div>
        
        {/* Bottom gradient fade */}
        <div className="h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none sticky bottom-0"></div>
      </div>
    </>
  );
};

export default RightSideDrawer;

