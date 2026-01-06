import React, { useState, useEffect } from "react";
import axios from "axios";
import { NavLink, useLocation } from "react-router-dom";
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
  WhiteInbox,
  ArrowDown,
  ArrowUp
} from "../assets/image";
import logo from "../assets/LogoFinal.png";
import LogoutConfirmationModal from "./LogoutConfirmationModal";
import { useUnreadCount } from "../contexts/UnreadCountContext";
import sharedSocketService from "../services/sharedSocketService";
import API_CONFIG from "../config/api";

// Department-specific Module Categories
const DEPARTMENT_MODULE_CATEGORIES = {
  "HR": {
    "User Management": ["Manage Users", "Users Permissions"],
    "Communication": [
      "Chat",
      "Email"
    ],
    "Reports": [
      "Break Report",
      "Target Reports",
      "CMT Dept Report",
      "Sales Dept Report",
      "DO Report",
      "Follow Up Report",
      "Trucker Report",
      "Rate Request Report",
      "Call Records (Id)",
      "Call Data",
      "Report Analysis"
    ],
    "Attendance & Leave": [
      "Attendance Leave",
      "Emp Leaves",
      "Leave Approval"
    ],
    "Payroll": ["Pay Rolls"],
    "Documents": [
      "HR Document Verification",
      "Employees Hygine",
      "Employee Hygiene"
    ],
    "Recruitment": ["Candidate Shortlist"],
    "Office Management": [
      "Office Inventory",
      "Office Expenses",
      "Dinner Status"
    ],
    "Tasks": [
      "Task",
      "Task Schedule",
      "Daily Task"
    ],
    "Team Management": [
      "Team",
      "Team Rating"
    ],
    "System Administration": [
      "Manage Module"
    ]
  },
  "Sales": {
    "Customer Management": [
      "Add Customer",
      "All Customers",
      "All Leads",
      "Customer Loads",
      "Assign Agent"
    ],
    "Communication": [
      "Chat",
      "Email"
    ],
    "Documents": [
      "Shipper",
      "Shipper Load Data",
      "Manager L Document"
    ],
    "Reports": [
      "Sales Dept Report",
      "Follow Up Report",
      "DO Report",
      "Team Rating",
      "Call Data",
      "Call Records (Id)",
      "Report Analysis"
    ],
    "Follow-ups": [
      "Daily Follow-Up",
      "Follow Up Report"
    ],
    "Invoices": [
      "Check Invoice"
    ],
    "Revenue": [
      "Revenue & Satatistics"
    ],
    "Tasks": [
      "Daily Task"
    ],
    "Team Management": [
      "Team",
      "Team Rating"
    ],
    "System Administration": [
      "Manage Module"
    ]
  },
  "Finance": {
    "Financial Management": [
      "Accounts Receivable",
      "Accounts Payable",
      "Finance Dashboard"
    ],
    "Communication": [
      "Chat",
      "Email"
    ],
    "Accounting": [
      "Check Invoice"
    ],
    "Inventory": [
      "Inventry"
    ],
    "Reports": [
      "Finance Dashboard",
      "Call Data",
      "Call Records (Id)",
      "Report Analysis"
    ],
    "System Administration": [
      "Manage Module"
    ]
  },
  "CMT": {
    "Load Management": [
      "Loads",
      "LoadBoard",
      "Assign Load",
      "DO Reassign",
      "Trucker Reassign"
    ],
    "Communication": [
      "Chat",
      "Email"
    ],
    "Documents": [
      "Trukers",
      "Trucker L Document",
      "Carrier Docs",
      "Carrier Approval",
      "Add Trucker Drivers"
    ],
    "Reports": [
      "CMT Dept Report",
      "Trucker Report",
      "Rate Request Report",
      "DO Report",
      "Call Records (Id)",
      "Call Data",
      "Report Analysis"
    ],
    "Rate Management": [
      "Rate Request",
      "Rate Approved",
      "Manager Rate Approval",
      "Daily Rate Request"
    ],
    "Fleet": [
      "Fleet",
      "Add Fleet"
    ],
    "Delivery Orders": [
      "Delivery Order",
      "DO Details",
      "Consignment"
    ],
    "Location": [
      "Empty Truck Location",
      "Trucker Empty Location"
    ],
    "Tasks": [
      "Daily Task"
    ],
    "Team Management": [
      "Team",
      "Team Rating"
    ],
    "System Administration": [
      "Manage Module"
    ]
  }
};

// Function to get department-specific module categories
const getDepartmentCategories = (department) => {
  const dept = department?.toLowerCase();
  if (dept === "hr") return DEPARTMENT_MODULE_CATEGORIES["HR"];
  if (dept === "sales") return DEPARTMENT_MODULE_CATEGORIES["Sales"];
  if (dept === "finance") return DEPARTMENT_MODULE_CATEGORIES["Finance"];
  if (dept === "cmt") return DEPARTMENT_MODULE_CATEGORIES["CMT"];
  return null;
};

// Function to categorize a module for a specific department
const getModuleCategory = (moduleName, department) => {
  const categories = getDepartmentCategories(department);
  if (!categories) return "Other";
  
  for (const [category, modules] of Object.entries(categories)) {
    if (modules.includes(moduleName)) {
      return category;
    }
  }
  return "Other"; // Default category for uncategorized modules
};

// Function to get all department module names
const getAllDepartmentModules = (department) => {
  const categories = getDepartmentCategories(department);
  if (!categories) return [];
  return Object.values(categories).flat();
};

// Function to get department dropdown name
const getDepartmentDropdownName = (department) => {
  const dept = department?.toLowerCase();
  if (dept === "hr") return "HRM";
  if (dept === "sales") return "Sales";
  if (dept === "finance") return "Finance";
  if (dept === "cmt") return "CMT";
  return department || "Modules";
};

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
  { name: "Manager Rate Approval", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/ManagerRateApproval" },
  { name: "Carrier Approval", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CarrierApproval" },
  { name: "Carrier Docs", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CarrierDocs" },
  { name: "Delivery Order", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/delivery-order" },
  { name: "DO Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/do-report" },
  { name: "Team Rating", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/team-rating" },
  { name: "Daily Follow-Up", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/daily-follow-up" },
  { name: "Follow Up Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/followUpReport" },
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
  { name: "Accounts Receivable", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/Invoices" },
  { name: "Accounts Payable", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/acountent-payable" },
  { name: "Check Invoice", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CheckInvoice" },
  { name: "Assign Load", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AssignLoad" },
  { name: "DO Reassign", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/assigndo" },
  { name: "Trucker Reassign", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/trucker-reassign" },
  { name: "Finance Dashboard", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/finance-dashboard" },
  { name: "Call Records (Id)", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CallingReport" },
  { name: "Add Fleet", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AddFleet" },
  { name: "Inventry", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/inventory-management" },
  { name: "Rate Request Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/RateRequestReport" },
  
  
];

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [departmentMenuItems, setDepartmentMenuItems] = useState([]);
  const [departmentCategories, setDepartmentCategories] = useState({});
  const [isDepartmentMenuOpen, setIsDepartmentMenuOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userDepartment, setUserDepartment] = useState(null);
  const location = useLocation();
  const { getTotalUnreadCount, hasUnreadMessages } = useUnreadCount();
  const totalUnreadCount = getTotalUnreadCount();
  const hasUnread = hasUnreadMessages();
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
      // Disconnect shared socket before logout
      console.log('🧹 Sidebar: Disconnecting shared socket on logout');
      sharedSocketService.disconnect();

      await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/logout`,
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

        // Get user department
        const department = user?.department || "";
        setUserDepartment(department);
        const hasDepartmentCategories = getDepartmentCategories(department) !== null;

        const allowedModuleIds = user?.allowedModules?.map(String) || [];
        console.log("👤 User allowed modules:", allowedModuleIds);
        console.log("👤 User department:", department, "Has categories:", hasDepartmentCategories);

        const res = await fetch(`${API_CONFIG.BASE_URL}/api/v1/module`, {
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
            setDepartmentMenuItems([]);
            setDepartmentCategories({});
          } else {
            // For users with department categories, separate department modules and categorize them
            if (hasDepartmentCategories) {
              // Get all department module names from categories
              const allDeptModuleNames = getAllDepartmentModules(department);
              
              // Separate department modules from other modules
              const deptMenus = matchedMenus.filter(item => 
                allDeptModuleNames.includes(item.name)
              );
              const otherMenus = matchedMenus.filter(item => 
                !allDeptModuleNames.includes(item.name)
              );
              
              // Categorize department modules
              const categorized = {};
              deptMenus.forEach(item => {
                const category = getModuleCategory(item.name, department);
                if (!categorized[category]) {
                  categorized[category] = [];
                }
                categorized[category].push(item);
              });
              
              // Add Companies to other menus if not already included
              const hasCompanies = otherMenus.some(item => item.name === 'Companies');
              if (!hasCompanies && companiesMenuItem) {
                const dashboardIndex = otherMenus.findIndex(item => item.name === 'Dashboard');
                if (dashboardIndex >= 0) {
                  otherMenus.splice(dashboardIndex + 1, 0, companiesMenuItem);
                } else {
                  otherMenus.unshift(companiesMenuItem);
                }
              }
              
              setDepartmentMenuItems(deptMenus);
              setDepartmentCategories(categorized);
              setFilteredMenuItems(otherMenus);
            } else {
              // For users without department categories, show all modules as before
              const hasCompanies = matchedMenus.some(item => item.name === 'Companies');
              if (!hasCompanies && companiesMenuItem) {
                const dashboardIndex = matchedMenus.findIndex(item => item.name === 'Dashboard');
                if (dashboardIndex >= 0) {
                  matchedMenus.splice(dashboardIndex + 1, 0, companiesMenuItem);
                } else {
                  matchedMenus.unshift(companiesMenuItem);
                }
              }
              setFilteredMenuItems(matchedMenus);
              setDepartmentMenuItems([]);
              setDepartmentCategories({});
            }
          }
        } else {
          console.error("❌ API response not successful:", data);
          // Fallback: show basic menus if API fails
          const basicMenus = menuItems.filter(item => 
            ['Dashboard', 'Tracking'].includes(item.name)
          );
          setFilteredMenuItems(basicMenus);
          setDepartmentMenuItems([]);
          setDepartmentCategories({});
        }
      } catch (err) {
        console.error("❌ Failed to fetch modules:", err);
        // Fallback: show basic menus on error
        const basicMenus = menuItems.filter(item => 
          ['Dashboard', 'Tracking'].includes(item.name)
        );
        setFilteredMenuItems(basicMenus);
        setDepartmentMenuItems([]);
        setDepartmentCategories({});
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  // Auto-expand department dropdown and relevant category if current location matches any department module path
  useEffect(() => {
    if (userDepartment && departmentMenuItems.length > 0) {
      const currentPath = location.pathname;
      const isDeptModuleActive = departmentMenuItems.some(item => 
        currentPath === item.path || currentPath.startsWith(item.path + '/')
      );
      
      if (isDeptModuleActive) {
        setIsDepartmentMenuOpen(true);
        
        // Find which category contains the active module and expand it
        Object.entries(departmentCategories).forEach(([category, modules]) => {
          const hasActiveModule = modules.some(item => 
            currentPath === item.path || currentPath.startsWith(item.path + '/')
          );
          if (hasActiveModule) {
            setOpenCategories(prev => ({ ...prev, [category]: true }));
          }
        });
      }
    }
  }, [location.pathname, userDepartment, departmentMenuItems, departmentCategories]);

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
              {filteredMenuItems.length > 0 || departmentMenuItems.length > 0 ? (
                <>
                  {filteredMenuItems.map((item, idx) => {
                    // Render Dashboard first, then department dropdown for users with department categories
                    const hasDeptCategories = userDepartment && getDepartmentCategories(userDepartment) !== null;
                    if (hasDeptCategories && item.name === "Dashboard") {
                      return (
                        <React.Fragment key={idx}>
                          <NavLink
                            to={item.path}
                            title={!isExpanded ? item.name : ""}
                            className={({ isActive }) =>
                              `flex items-center ${isExpanded ? "justify-start" : "justify-center"} gap-3 p-3 rounded-lg transition-all mx-2 ${isActive ? "text-white" : "hover:bg-gray-100 text-gray-700"}`
                            }
                            style={({ isActive }) => (isActive ? { backgroundColor: activeBgColor } : {})}
                            end
                          >
                            {({ isActive }) => (
                              <>
                                <div className="relative">
                                  <img
                                    src={isActive ? item.whiteIcon || item.icon : item.icon}
                                    alt={item.name}
                                    className="w-5 h-5"
                                  />
                                </div>
                                <span className={`${isExpanded ? "inline" : "hidden"} font-medium`}>
                                  {item.name}
                                </span>
                              </>
                            )}
                          </NavLink>
                          {/* Department Dropdown - placed after Dashboard */}
                          {departmentMenuItems.length > 0 && (
                            <div className="w-full">
                              <button
                                onClick={() => setIsDepartmentMenuOpen(!isDepartmentMenuOpen)}
                                className={`flex items-center ${isExpanded ? "justify-start" : "justify-center"} gap-3 p-3 rounded-lg transition-all mx-2 w-full ${
                                  departmentMenuItems.some(deptItem => location.pathname === deptItem.path || location.pathname.startsWith(deptItem.path + '/'))
                                    ? "text-white"
                                    : "hover:bg-gray-100 text-gray-700"
                                }`}
                                style={
                                  departmentMenuItems.some(deptItem => location.pathname === deptItem.path || location.pathname.startsWith(deptItem.path + '/'))
                                    ? { backgroundColor: activeBgColor }
                                    : {}
                                }
                              >
                                <img
                                  src={
                                    departmentMenuItems.some(deptItem => location.pathname === deptItem.path || location.pathname.startsWith(deptItem.path + '/'))
                                      ? WhiteManageUser
                                      : ManageUser
                                  }
                                  alt={getDepartmentDropdownName(userDepartment)}
                                  className="w-5 h-5"
                                />
                                <span className={`${isExpanded ? "inline" : "hidden"} font-medium flex-1 text-left`}>
                                  {getDepartmentDropdownName(userDepartment)}
                                </span>
                                {isExpanded && (
                                  <img
                                    src={isDepartmentMenuOpen ? ArrowUp : ArrowDown}
                                    alt={isDepartmentMenuOpen ? "Collapse" : "Expand"}
                                    className="w-4 h-4"
                                  />
                                )}
                              </button>
                              {isDepartmentMenuOpen && isExpanded && (
                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                                  {Object.entries(departmentCategories).map(([category, modules]) => {
                                    const isCategoryActive = modules.some(mod => 
                                      location.pathname === mod.path || location.pathname.startsWith(mod.path + '/')
                                    );
                                    const isCategoryOpen = openCategories[category] || false;
                                    
                                    return (
                                      <div key={category} className="w-full">
                                        <button
                                          onClick={() => setOpenCategories(prev => ({ ...prev, [category]: !isCategoryOpen }))}
                                          className={`flex items-center justify-start gap-2 p-2 rounded-lg transition-all w-full ${
                                            isCategoryActive
                                              ? "text-white"
                                              : "hover:bg-gray-100 text-gray-700"
                                          }`}
                                          style={isCategoryActive ? { backgroundColor: activeBgColor } : {}}
                                        >
                                          <img
                                            src={isCategoryOpen ? ArrowUp : ArrowDown}
                                            alt={isCategoryOpen ? "Collapse" : "Expand"}
                                            className="w-3 h-3"
                                          />
                                          <span className="text-sm font-semibold">
                                            {category}
                                          </span>
                                        </button>
                                        {isCategoryOpen && (
                                          <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-300 pl-2">
                                            {modules.map((deptItem, deptIdx) => (
                                              <NavLink
                                                to={deptItem.path}
                                                key={deptIdx}
                                                title={!isExpanded ? deptItem.name : ""}
                                                className={({ isActive }) =>
                                                  `flex items-center justify-start gap-2 p-2 rounded-lg transition-all ${isActive ? "text-white" : "hover:bg-gray-100 text-gray-700"}`
                                                }
                                                style={({ isActive }) => (isActive ? { backgroundColor: activeBgColor } : {})}
                                                end
                                              >
                                                {({ isActive }) => (
                                                  <>
                                                    <img
                                                      src={isActive ? deptItem.whiteIcon || deptItem.icon : deptItem.icon}
                                                      alt={deptItem.name}
                                                      className="w-4 h-4"
                                                    />
                                                    <span className="text-xs font-medium">
                                                      {deptItem.name}
                                                    </span>
                                                  </>
                                                )}
                                              </NavLink>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    }
                    // Skip Dashboard if already rendered above for department users
                    if (hasDeptCategories && item.name === "Dashboard") {
                      return null;
                    }
                    // Regular menu items
                    return (
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
                            <div className="relative">
                              <img
                                src={isActive ? item.whiteIcon || item.icon : item.icon}
                                alt={item.name}
                                className="w-5 h-5"
                              />
                              {/* Red dot badge for Chat when there are unread messages */}
                              {item.name === "Chat" && hasUnread && (
                                <span
                                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
                                  style={{
                                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                                  }}
                                  title={`${totalUnreadCount} unread message${totalUnreadCount > 1 ? 's' : ''}`}
                                />
                              )}
                            </div>
                            <span className={`${isExpanded ? "inline" : "hidden"} font-medium`}>
                              {item.name}
                            </span>
                            {/* Show count badge next to Chat name if expanded and has unread */}
                            {item.name === "Chat" && hasUnread && isExpanded && totalUnreadCount > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </>
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
