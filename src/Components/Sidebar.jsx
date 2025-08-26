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
  WhiteManageModule, ChatWhite, ChatBlue,
  WhiteDashboard, DailyTarget, DailyTargetWhite, BlueCall, WhiteCall, WhiteRevenueStatic, BlueRevenueStatic, BlueInbox, WhiteInbox
} from "../assets/image";
import logo from "../assets/LogoFinal.png";

const menuItems = [
  { name: "Dashboard", icon: DashboardImage, whiteIcon: WhiteDashboard, path: "/dashboard" },
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
  { name: "Team", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/TLTeams" },
  { name: "Trukers", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/TruckerDocuments" },
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
  { name: "Daily Follow-Up", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/daily-follow-up" },
  { name: "Add Customer", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AddCustomer" },
  { name: "Assign Agent", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AssignAgent" },
  { name: "DO Details", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/DODetails" },
  { name: "Consignment", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/Consignment" },
  { name: "Customer Loads", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CustomerLoads" },
  { name: "Daily Rate Request", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/DailyRateRequest" },


];

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const handleLogout = async () => {
    try {
      await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/logout",
        {},
        { withCredentials: true } // This ensures cookies are sent and cleared
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
        const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user"));
        
        if (!user) {
          console.error("❌ No user data found");
          setFilteredMenuItems([]);daily-follow-up
          return;
        }

        const allowedModuleIds = user?.allowedModules?.map(String) || [];

        // console.log("👤 Logged in user:", user);
        // console.log("✅ allowedModuleIds:", allowedModuleIds);

        const res = await fetch("https://vpl-liveproject-1.onrender.com/api/v1/module", {
          credentials: "include", // ✅ needed for cross-origin
        });

        const data = await res.json();
        // console.log("📦 All Modules from API:", data.modules);

        if (data.success) {
          const allowedModuleNames = data.modules
            .filter((mod) => allowedModuleIds.includes(mod._id.toString()))
            .map((mod) => mod.name);

          // console.log("🎯 Allowed module names for sidebar:", allowedModuleNames);

          const matchedMenus = menuItems.filter((item) =>
            allowedModuleNames.includes(item.name)
          );

          // console.log("📋 Matched menu items to render:", matchedMenus);

          // Set filtered menu items based on user permissions
          setFilteredMenuItems(matchedMenus);
        }
      } catch (err) {
        console.error("❌ Failed to fetch modules:", err);
        // Fallback: show only basic menu items if API fails
        const basicMenus = menuItems.filter(item => 
          ['Dashboard', 'Profile'].includes(item.name)
        );
        setFilteredMenuItems(basicMenus);
      }
    };

    fetchModules();
  }, []);

  return (
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
    {filteredMenuItems.map((item, idx) => (
      <NavLink
        to={item.path}
        key={idx}
        title={!isExpanded ? item.name : ""}
        className={({ isActive }) =>
          `flex items-center ${isExpanded ? "justify-start" : "justify-center"} gap-3 p-3 rounded-lg transition-all mx-2 ${isActive ? "bg-blue-500 text-white" : "hover:bg-gray-100 text-gray-700"}`
        }
      >
        {({ isActive }) => (
          <>
            <img
              src={isActive ? item.whiteIcon || item.icon : item.icon}
              alt={item.name}
              className="w-5 h-5"
            />
            <span className={`${isExpanded ? "inline" : "hidden"}`}>{item.name}</span>
          </>
        )}
      </NavLink>
    ))}
  </nav>
</div>

      </div>

      <div className="px-4 py-4">
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer" onClick={handleLogout}>
          <img src={LogOut} alt="Logout" className="w-5 h-5" />
          <span className={`${isExpanded ? "inline" : "hidden"}`}>Logout</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
