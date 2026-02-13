import { NavLink } from 'react-router-dom';
import {
  Calendar,
  Phone,
  FileText,
  Users,
  BarChart3,
  MessageCircle,
  Mail,
  Clock,
  UserPlus,
  Target,
  Award,
  Package,
  TrendingUp
} from 'lucide-react';

// Icon mapping for different menu items
const getMenuIcon = (itemName) => {
  const iconMap = {
    'Daily Task': Calendar,
    'Call Data': Phone,
    'DO Report': FileText,
    'Team Rating': Award,
    'Follow Up Report': BarChart3,
    'Sales Dept Report': BarChart3,
    'Call Records (Id)': Phone,
    'Chats': MessageCircle,
    'Chat': MessageCircle,
    'Email': Mail,
    'Daily Follow-Up': Clock,
    'Add Customer': UserPlus,
    'All Customer': Users,
    'All Customers': Users,
    'Check Invoice': FileText,
    'CMT Dept Report': BarChart3,
    'Trucker Report': BarChart3,
    'Rate Request Report': BarChart3,
    'Break Report': Clock,
    'Target Reports': Target,
    'Attendance Leave': Calendar,
    'Leave Approval': Award,
    'Report Analysis': TrendingUp,
    'Emp Login Report': BarChart3,
    'All Leads': Users,
    'Customer Loads': Package,
    'Assign Agent': UserPlus
  };
  
  return iconMap[itemName] || FileText;
};

const SidebarFlyout = ({ 
  isOpen, 
  categories, 
  position, 
  onItemClick,
  title = "Sales"
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Custom scrollbar styles - Strong override for global scrollbar hiding */}
      <style>{`
        .sales-flyout-content {
          scrollbar-width: thin !important;
          scrollbar-color: #9ca3af transparent !important;
          -ms-overflow-style: scrollbar !important;
        }
        .sales-flyout-content::-webkit-scrollbar {
          width: 8px !important;
          display: block !important;
          height: 8px !important;
        }
        .sales-flyout-content::-webkit-scrollbar-track {
          background: transparent !important;
          border-radius: 4px !important;
        }
        .sales-flyout-content::-webkit-scrollbar-thumb {
          background-color: #9ca3af !important;
          border-radius: 4px !important;
          border: 1px solid transparent !important;
        }
        .sales-flyout-content::-webkit-scrollbar-thumb:hover {
          background-color: #6b7280 !important;
        }
        .sales-flyout-content::-webkit-scrollbar-thumb:active {
          background-color: #4b5563 !important;
        }
        /* Force scrollbar visibility even when content doesn't overflow initially */
        .sales-flyout-content {
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
      `}</style>
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => onItemClick && onItemClick()}
      />
      
      {/* Flyout Menu - Better spacing and text sizes */}
      <div 
        className="fixed z-50 bg-white rounded-2xl shadow-lg border border-gray-200"
        style={{
          left: position?.left || '280px',
          top: position?.top || '100px',
          width: '300px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Blue Header - Good size */}
        <div className="px-5 pt-5 pb-3">
          <div className="bg-blue-500 rounded-xl px-5 py-3">
            <h3 className="text-white font-medium text-base text-center">{title}</h3>
          </div>
        </div>

        {/* Content - Better spacing */}
        <div 
          className="px-5 pb-5 max-h-[600px] overflow-y-auto sales-flyout-content"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#9ca3af transparent',
            msOverflowStyle: 'scrollbar'
          }}
        >
          {Object.entries(categories).map(([categoryName, items]) => (
            <div key={categoryName} className="mb-4">
              {/* Category Header - Readable size */}
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {categoryName}
              </h4>

              {/* Category Items - Good spacing */}
              <div className="space-y-1">
                {items.map((item, index) => {
                  const Icon = getMenuIcon(item.name);
                  return (
                    <NavLink
                      key={index}
                      to={item.path}
                      onClick={() => onItemClick && onItemClick()}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
                          <span>{item.name}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default SidebarFlyout;