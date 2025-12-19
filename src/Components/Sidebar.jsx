import React, { useState, useEffect } from "react";
import axios from "axios";
import { NavLink } from "react-router-dom";
import {
  BackButtonLeft,
  BackButtonRight,
  LiveTracker,
  ManageUser,
  ManageModule,
  UserPermision,
  Analytics,
  Fleet,
  LoadBoard,
  LogOut,
  DashboardImage,
  WhiteLiveTracker,
  WhiteManageUser,
  WhiteUserPermission,
  WhiteAnalytics,
  WhiteFleet,
  WhiteLoadBoard,
  WhiteManageModule, 
  ChatWhite, 
  ChatBlue,
  WhiteDashboard, 
  DailyTarget, 
  DailyTargetWhite, 
  BlueCall, 
  WhiteCall, 
  WhiteRevenueStatic, 
  BlueRevenueStatic, 
  BlueInbox, 
  WhiteInbox
} from "../assets/image";
import logo from "../assets/LogoFinal.png";
import LogoutConfirmationModal from "./LogoutConfirmationModal";

const menuItems = [
  { name: "Dashboard", icon: DashboardImage, whiteIcon: WhiteDashboard, path: "/dashboard" },
  { name: "Company", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/companies" },
  { name: "Tracking", icon: LiveTracker, whiteIcon: WhiteLiveTracker, path: "/live-tracker" },
  { name: "Manage Users", icon: ManageUser, whiteIcon: WhiteManageUser, path: "/manage-users" },
  { name: "Users Permissions", icon: UserPermision, whiteIcon: WhiteUserPermission, path: "/permissions" },
  { name: "Report Analysis", icon: Analytics, whiteIcon: WhiteAnalytics, path: "/analytics" },
  { name: "Fleet", icon: Fleet, whiteIcon: WhiteFleet, path: "/Fleet" },
  { name: "LoadBoard", icon: LoadBoard, whiteIcon: WhiteLoadBoard, path: "/load-board" },
  { name: "Loads", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/Loads" },
  { name: "Manage Module", icon: ManageModule, whiteIcon: WhiteManageModule, path: "/modules" },
  { name: "Daily Task", icon: DailyTarget, whiteIcon: DailyTargetWhite, path: "/DailyTask" },
  { name: "Call Data", icon: BlueCall, whiteIcon: WhiteCall, path: "/call-dashboard" },
  { name: "Chat", icon: ChatBlue, whiteIcon: ChatWhite, path: "/Chat" },
  { name: "Email", icon: BlueInbox, whiteIcon: WhiteInbox, path: "/Inbox" },
  { name: "Revenue & Satatistics", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AgentRevenueStatistics" },
  { name: "Employee Hygiene", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/EmployeeHygiene" },
  { name: "Pay Rolls", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/PayrollPage" },
  { name: "Shipper", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/ShippersLDocuments" },
  { name: "Shipper Load Data", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/ShiperLoadData" },
  { name: "HR Document Verification", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/HrDocumentsVerification" },
  { name: "Attendance Leave", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/Attendanceleave" },
  { name: "Emp Leaves", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/empleaves" },
  { name: "Team", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/TLTeams" },
  { name: "Trukers", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/TruckerDocuments" },
  { name: "Add Trucker Drivers", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/addtruckerdriver" },
  { name: "Empty Truck Location", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/empty-truck-location" },
  { name: "Trucker Empty Location", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/trucker-empty-location" },
  { name: "Employees Hygine", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/HREmployeeHygine" },
  { name: "Manager L Document", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/ManagerShippersLDocuments" },
  { name: "Trucker L Document", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/TruckerLDocuments" },
  { name: "Task", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/HrCreateTask" },
  { name: "Leave Approval", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/LeaveApproval" },
  { name: "Candidate Shortlist", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/candidate-shortlist" },
  { name: "Target Reports", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/target-reports" },
  { name: "Rate Request", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/RateRequest" },
  { name: "Rate Approved", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/RateApproved" },
  { name: "Carrier Approval", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CarrierApproval" },
  { name: "Carrier Docs", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CarrierDocs" },
  { name: "Delivery Order", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/delivery-order" },
  { name: "Team Rating", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/team-rating" },
  { name: "Daily Follow-Up", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/daily-follow-up" },
  { name: "Add Customer", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AddCustomer" },
  { name: "All Customers", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/allcustomer" },
  { name: "Assign Agent", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AssignAgent" },
  { name: "DO Details", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/DODetails" },
  { name: "Consignment", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/Consignment" },
  { name: "Customer Loads", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CustomerLoads" },
  { name: "Daily Rate Request", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/DailyRateRequest" },
  { name: "Office Expenses", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/OfficeExpenses" },
  { name: "Office Inventory", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/OfficeInventory" },
  { name: "Dinner Status", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/dinner-status" },
  { name: "Trucker Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/TruckerReport" },
  { name: "All Leads", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AllLeads" },
  { name: "Task Schedule", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/TaskScheduling" },
  { name: "CMT Dept Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CmtDeptReport" },
  { name: "Sales Dept Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/SalesDeptReport" },
  { name: "Break Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/break-report" },
  { name: "Invoices", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/Invoices" },
  { name: "Accounts Payable", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/acountent-payable" },
  { name: "Check Invoice", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CheckInvoice" },
  { name: "Assign Load", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AssignLoad" },
  { name: "DO Reassign", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/assigndo" },
  { name: "Trucker Reassign", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/trucker-reassign" },
  { name: "Finance Dashboard", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/finance-dashboard" },
  { name: "Call Records (Id)", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CallingReport" },
  { name: "Add Fleet", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AddFleet" },
  { name: "Inventry", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/inventory-management" },
  
  
];

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeBgColor, setActiveBgColor] = useState(() => {
    try {
      const saved = localStorage.getItem("themePrefs");
      const parsed = saved ? JSON.parse(saved) : null;
      return (parsed && parsed.sidebarActive) || "#3b82f6";
    } catch {
      return "#3b82f6";
    }
  });

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/logout",
        {},
        { withCredentials: true }
      );

      // Clear local and session storage
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to login/home page
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  useEffect(() => {
    const fetchModules = async () => {
      try {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
        
        if (!user || Object.keys(user).length === 0) {
          console.error("❌ No user data found");
          // Fallback: show basic menus when no user data
          const basicMenus = menuItems.filter(item => 
            ['Dashboard', 'Tracking',].includes(item.name)
          );
          setFilteredMenuItems(basicMenus);
          setLoading(false);
          return;
        }

        const allowedModuleIds = user?.allowedModules?.map(String) || [];
        console.log("👤 User allowed modules:", allowedModuleIds);

        const res = await fetch("https://vpl-liveproject-1.onrender.com/api/v1/module", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (data.success && data.modules) {
          const activeModules = data.modules.filter((mod) => 
            mod.isActive === true && 
            (allowedModuleIds.length === 0 || allowedModuleIds.includes(mod._id.toString()))
          );

          console.log("✅ Active modules:", activeModules.map(m => ({ name: m.name, id: m._id })));
          console.log("📋 All menu items:", menuItems.map(m => m.name));

          // Match menu items with active modules by name (case insensitive)
          // Also normalize multiple spaces to single space for matching
          const matchedMenus = menuItems.filter((item) =>
            activeModules.some((mod) => {
              const modName = mod.name.trim().replace(/\s+/g, ' ').toLowerCase();
              const itemName = item.name.trim().replace(/\s+/g, ' ').toLowerCase();
              return modName === itemName;
            })
          );

          console.log("✅ Final filtered menu items:", matchedMenus.map(m => m.name));
          
          // Always include Companies menu item
          const companiesMenuItem = menuItems.find(item => item.name === 'Companies');
          
          // If no modules matched, show basic menus as fallback
          if (matchedMenus.length === 0) {
            console.warn("⚠️ No modules matched, showing basic menus");
            const basicMenus = menuItems.filter(item => 
              ['Dashboard', 'Tracking'].includes(item.name)
            );
            setFilteredMenuItems(basicMenus);
          } else {
            // Add Companies to matched menus if not already included
            const hasCompanies = matchedMenus.some(item => item.name === 'Companies');
            if (!hasCompanies && companiesMenuItem) {
              // Insert Companies after Dashboard
              const dashboardIndex = matchedMenus.findIndex(item => item.name === 'Dashboard');
              if (dashboardIndex >= 0) {
                matchedMenus.splice(dashboardIndex + 1, 0, companiesMenuItem);
              } else {
                matchedMenus.unshift(companiesMenuItem);
              }
            }
            setFilteredMenuItems(matchedMenus);
          }
        } else {
          console.error("❌ API response not successful:", data);
          // Fallback: show basic menus if API fails
          const basicMenus = menuItems.filter(item => 
            ['Dashboard', 'Tracking'].includes(item.name)
          );
          setFilteredMenuItems(basicMenus);
        }
      } catch (err) {
        console.error("❌ Failed to fetch modules:", err);
        // Fallback: show basic menus on error
        const basicMenus = menuItems.filter(item => 
          ['Dashboard', 'Tracking'].includes(item.name)
        );
        setFilteredMenuItems(basicMenus);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  useEffect(() => {
    const onStorage = () => {
      try {
        const saved = localStorage.getItem("themePrefs");
        const parsed = saved ? JSON.parse(saved) : {};
        if (parsed.sidebarActive) setActiveBgColor(parsed.sidebarActive);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className={`fixed top-0 left-0 h-screen bg-white shadow-md z-50 flex flex-col justify-between transition-all duration-300 ${isExpanded ? "w-64" : "w-35"}`}>
        <div className="p-4">
          <img src={logo} alt="Logo" className={`${isExpanded ? "w-24 h-10" : "w-23 h-10 mx-auto"}`} />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading modules...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`fixed top-0 left-0 h-screen bg-white shadow-md z-50 flex flex-col justify-between transition-all duration-300 ${isExpanded ? "w-64" : "w-35"}`}>
        <div>
          <div className="p-4 relative flex items-center justify-between">
            <img src={logo} alt="Logo" className={`${isExpanded ? "w-24 h-10" : "w-23 h-10 mx-auto"}`} />
            <button onClick={toggleSidebar} className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-full p-1 shadow-md z-10">
              <img src={isExpanded ? BackButtonLeft : BackButtonRight} alt="Toggle" className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Menu Section */}
          <div className="overflow-y-auto h-[calc(100vh-160px)] px-1 pr-2 scrollbar-hide">
            <nav className={`flex flex-col gap-1 text-sm ${isExpanded ? "items-start" : "items-center"}`}>
              {filteredMenuItems.length > 0 ? (
                filteredMenuItems.map((item, idx) => (
                  <NavLink
                    to={item.path}
                    key={idx}
                    title={!isExpanded ? item.name : ""}
                    className={({ isActive }) =>
                      `flex items-center ${isExpanded ? "justify-start" : "justify-center"} gap-3 p-3 rounded-lg transition-all mx-2 ${isActive ? "text-white" : "hover:bg-gray-100 text-gray-700"}`
                    }
                    style={({ isActive }) => (isActive ? { backgroundColor: activeBgColor } : {})}
                    end
                  >
                    {({ isActive }) => (
                      <>
                        <img
                          src={isActive ? item.whiteIcon || item.icon : item.icon}
                          alt={item.name}
                          className="w-5 h-5"
                        />
                        <span className={`${isExpanded ? "inline" : "hidden"} font-medium`}>
                          {item.name}
                        </span>
                      </>
                    )}
                  </NavLink>
                ))
              ) : (
                <div className="text-center p-4 text-gray-500">
                  No modules available
                </div>
              )}
            </nav>
          </div>
        </div>

        <div className="px-4 py-4 border-t border-gray-200">
          <div 
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer transition-colors"
            onClick={handleLogoutClick}
          >
            <img src={LogOut} alt="Logout" className="w-5 h-5" />
            <span className={`${isExpanded ? "inline" : "hidden"} font-medium`}>
              Logout
            </span>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirmLogout={handleLogout}
      />
    </>
  );
};

export default Sidebar;
