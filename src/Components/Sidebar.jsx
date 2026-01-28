import React, { useState, useEffect, useMemo } from "react";
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
import logo from "../assets/logo_vpower.png";
import LogoutConfirmationModal from "./LogoutConfirmationModal";
import { useUnreadCount } from "../contexts/UnreadCountContext";
import sharedSocketService from "../services/sharedSocketService";
import API_CONFIG from "../config/api";
import SidebarFlyout from "./SidebarFlyout";

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
      "Report Analysis",
      "Emp Login Report"
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
      "Receivable Report",
      "Payable Report",
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
      "Report Analysis",
      "Emp Login Report"
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
      "Report Analysis",
      "Emp Login Report"
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
  },
  "QA": {
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
    "Quality Assurance": [
      "QA Dashboard",
      "Pending Reviews",
      "Manager Review",
      "My Reviews",
      "QA Call Report"
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
  if (dept === "qa") return DEPARTMENT_MODULE_CATEGORIES["QA"];
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
  if (dept === "qa") return "QA";
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
  { name: "Receivable Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/invoices-report" },
  { name: "Payable Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/payable-report" },
  { name: "Check Invoice", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CheckInvoice" },
  { name: "Assign Load", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AssignLoad" },
  { name: "DO Reassign", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/assigndo" },
  { name: "Trucker Reassign", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/trucker-reassign" },
  { name: "Finance Dashboard", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/finance-dashboard" },
  { name: "Call Records (Id)", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/CallingReport" },
  { name: "Add Fleet", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AddFleet" },
  { name: "Inventry", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/inventory-management" },
  { name: "Rate Request Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/RateRequestReport" },
  { name: "QA Dashboard", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/qa/dashboard" },
  { name: "Pending Reviews", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/qa/pending-reviews" },
  { name: "Manager Review", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/qa/manager-review" },
  { name: "My Reviews", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/qa/my-reviews" },
  { name: "QA Call Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/qa/call-report" },
  { name: "All DO Assigned CMT", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/all-do-assigned-cmt" },
  { name: "Emp Login Report", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/emp-login-report" },
  
  
];

// List of report names to filter for Reports section
const REPORT_NAMES = [
  "Sales Dept Report",
  "Follow Up Report",
  "DO Report",
  "All DO Assigned CMT",
  "Team Rating",
  "Call Data",
  "Call Records (Id)",
  "Report Analysis",
  "Emp Login Report",
  "Break Report",
  "Receivable Report",
  "Payable Report",
  "Rate Request Report",
  "CMT Dept Report",
  "Trucker Report",
  "Target Reports",
  "QA Call Report"
];

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [departmentMenuItems, setDepartmentMenuItems] = useState([]);
  const [departmentCategories, setDepartmentCategories] = useState({});
  const [isDepartmentMenuOpen, setIsDepartmentMenuOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState({});
  const [isReportsOpen, setIsReportsOpen] = useState(true);
  const [reportMenuItems, setReportMenuItems] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userDepartment, setUserDepartment] = useState(null);
  
  // Time Display and Break/Meeting states
  const [loginTime, setLoginTime] = useState(() => {
    const saved = sessionStorage.getItem("loginTime");
    return saved ? new Date(saved) : new Date();
  });
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [onBreak, setOnBreak] = useState(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState(60 * 60); // 60 mins in seconds
  const [breakIntervalId, setBreakIntervalId] = useState(null);
  const [onMeeting, setOnMeeting] = useState(false);
  const [meetingTime, setMeetingTime] = useState(0);
  const [meetingIntervalId, setMeetingIntervalId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  
  // Flyout menu states
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutType, setFlyoutType] = useState(''); // 'sales' or 'reports'
  const [flyoutPosition, setFlyoutPosition] = useState({ left: 280, top: 100 });
  
  const location = useLocation();
  const { getTotalUnreadCount, hasUnreadMessages, unreadCounts, groupUnreadCounts } = useUnreadCount();
  
  // Helper function for time formatting
  const formatTime = (totalSeconds) => {
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Break/Meeting handlers
  const handleStartBreak = async () => {
    try {
      setBreakLoading(true);
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/break/start`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        setOnBreak(true);
        const remaining = res.data.remainingMinutes || 60;
        setBreakTimeLeft(remaining * 60);

        const intervalId = setInterval(() => {
          setBreakTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(intervalId);
              setOnBreak(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        setBreakIntervalId(intervalId);
        setDropdownOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Break start failed");
    } finally {
      setBreakLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setBreakLoading(true);
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/break/end`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        clearInterval(breakIntervalId);
        setOnBreak(false);
      }
    } catch (err) {
      alert("Break end failed.");
    } finally {
      setBreakLoading(false);
    }
  };

  const handleMeetingToggle = () => {
    if (onMeeting) {
      clearInterval(meetingIntervalId);
      setOnMeeting(false);
    } else {
      setOnMeeting(true);
      const intervalId = setInterval(() => {
        setMeetingTime((prev) => prev + 1);
      }, 1000);
      setMeetingIntervalId(intervalId);
    }
    setDropdownOpen(false);
  };
  // Make these reactive by recalculating when unreadCounts or groupUnreadCounts change
  const totalUnreadCount = useMemo(() => {
    const count = getTotalUnreadCount();
    console.log('🔴 Sidebar: Total unread count:', count, 'unreadCounts:', unreadCounts, 'groupUnreadCounts:', groupUnreadCounts);
    return count;
  }, [unreadCounts, groupUnreadCounts, getTotalUnreadCount]);
  const hasUnread = useMemo(() => {
    const has = hasUnreadMessages();
    console.log('🔴 Sidebar: Has unread:', has);
    return has;
  }, [unreadCounts, groupUnreadCounts, hasUnreadMessages]);
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

  // Flyout menu handlers
  const handleFlyoutOpen = (type, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    let topPosition = rect.top;
    
    // Only apply advanced positioning logic for Reports flyout
    if (type === 'reports') {
      // Estimate flyout height for reports
      let estimatedFlyoutHeight = 200; // Base height for header and padding
      if (reportMenuItems) {
        estimatedFlyoutHeight += 40; // Category header
        estimatedFlyoutHeight += reportMenuItems.length * 36; // Each item ~36px
      }
      
      // Check if flyout would extend below viewport
      if (topPosition + estimatedFlyoutHeight > viewportHeight - 20) {
        // Position flyout so it fits within viewport with 20px margin at bottom
        topPosition = Math.max(20, viewportHeight - estimatedFlyoutHeight - 20);
      }
      
      // Ensure flyout doesn't go above viewport
      topPosition = Math.max(20, topPosition);
    } else {
      // Keep original simple positioning for Sales flyout
      if (topPosition > viewportHeight * 0.7) {
        topPosition = Math.max(20, viewportHeight * 0.1);
      }
    }
    
    setFlyoutPosition({
      left: rect.right + 10,
      top: topPosition
    });
    setFlyoutType(type);
    setFlyoutOpen(true);
  };

  const handleFlyoutClose = () => {
    setFlyoutOpen(false);
    setFlyoutType('');
  };

  // Close flyout when navigating to other pages
  useEffect(() => {
    handleFlyoutClose();
  }, [location.pathname]);

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
        console.log("👤 User allowed modules (IDs):", allowedModuleIds);
        console.log("👤 User allowed modules (count):", allowedModuleIds.length);
        console.log("👤 User department:", department, "Has categories:", hasDepartmentCategories);

        const res = await fetch(`${API_CONFIG.BASE_URL}/api/v1/module`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (data.success && data.modules) {
          console.log("📦 Total modules from API:", data.modules.length);
          console.log("📦 All modules:", data.modules.map(m => ({ name: m.name, id: m._id, isActive: m.isActive })));
          
          const activeModules = data.modules.filter((mod) => 
            mod.isActive === true && 
            (allowedModuleIds.length === 0 || allowedModuleIds.includes(mod._id.toString()))
          );

          console.log("✅ Active modules (filtered by allowedModuleIds):", activeModules.map(m => ({ name: m.name, id: m._id })));
          console.log("✅ Active modules count:", activeModules.length);
          
          // Check if any allowedModuleIds don't have matching modules
          const missingModuleIds = allowedModuleIds.filter(id => 
            !data.modules.some(mod => mod._id.toString() === id)
          );
          if (missingModuleIds.length > 0) {
            console.warn("⚠️ Some allowedModuleIds not found in API response:", missingModuleIds);
          }
          
          // Check if any allowedModuleIds have inactive modules
          const inactiveModuleIds = allowedModuleIds.filter(id => {
            const mod = data.modules.find(m => m._id.toString() === id);
            return mod && !mod.isActive;
          });
          if (inactiveModuleIds.length > 0) {
            console.warn("⚠️ Some allowedModuleIds are inactive:", inactiveModuleIds);
          }
          console.log("📋 All menu items:", menuItems.map(m => ({ name: m.name, path: m.path })));

          // Match menu items with active modules by name (case insensitive)
          // Also normalize multiple spaces to single space for matching
          const matchedMenus = menuItems.filter((item) => {
            const match = activeModules.some((mod) => {
              const modName = mod.name.trim().replace(/\s+/g, ' ').toLowerCase();
              const itemName = item.name.trim().replace(/\s+/g, ' ').toLowerCase();
              const isMatch = modName === itemName;
              if (isMatch) {
                console.log(`✅ Matched: "${mod.name}" (ID: ${mod._id}) with menu item "${item.name}"`);
              }
              return isMatch;
            });
            if (!match) {
              console.log(`❌ No match found for menu item: "${item.name}"`);
            }
            return match;
          });

          console.log("✅ Final filtered menu items:", matchedMenus.map(m => m.name));
          console.log("❌ Unmatched active modules:", activeModules.filter(mod => 
            !matchedMenus.some(item => {
              const modName = mod.name.trim().replace(/\s+/g, ' ').toLowerCase();
              const itemName = item.name.trim().replace(/\s+/g, ' ').toLowerCase();
              return modName === itemName;
            })
          ).map(m => ({ name: m.name, id: m._id })));
          
          // Always include Companies menu item
          const companiesMenuItem = menuItems.find(item => item.name === 'Companies');
          
          // If no modules matched but user has allowedModules, try to show department modules
          if (matchedMenus.length === 0) {
            if (allowedModuleIds.length > 0 && hasDepartmentCategories) {
              console.warn("⚠️ No modules matched by name, but user has allowedModules. Showing department modules as fallback.");
              // Get all department module names
              const allDeptModuleNames = getAllDepartmentModules(department);
              // Show menu items that are in department categories
              const deptMenus = menuItems.filter(item => 
                allDeptModuleNames.includes(item.name)
              );
              // For fallback case, we don't have matchedMenus, so we can't filter reports by permissions
              // Only show basic menus in this case
              const otherMenus = menuItems.filter(item => 
                !allDeptModuleNames.includes(item.name) && 
                !REPORT_NAMES.includes(item.name) &&
                ['Dashboard', 'Tracking', 'Companies'].includes(item.name)
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
              
              setDepartmentMenuItems(deptMenus);
              setDepartmentCategories(categorized);
              setReportMenuItems([]); // Don't show reports in fallback case without proper permissions
              setFilteredMenuItems(otherMenus);
            } else {
              console.warn("⚠️ No modules matched, showing basic menus");
              const basicMenus = menuItems.filter(item => 
                ['Dashboard', 'Tracking'].includes(item.name)
              );
              setFilteredMenuItems(basicMenus);
              setDepartmentMenuItems([]);
              setDepartmentCategories({});
              setReportMenuItems([]); // Don't show reports if no modules matched
            }
          } else {
            // For users with department categories, separate department modules and categorize them
            if (hasDepartmentCategories) {
              // Get all department module names from categories
              const allDeptModuleNames = getAllDepartmentModules(department);
              
              // Separate department modules from other modules
              const deptMenus = matchedMenus.filter(item => 
                allDeptModuleNames.includes(item.name)
              );
              // Separate reports from other menus - only include reports that user has permission for
              const reports = matchedMenus.filter(item => 
                REPORT_NAMES.includes(item.name)
              );
              
              const otherMenus = matchedMenus.filter(item => 
                !allDeptModuleNames.includes(item.name) && !REPORT_NAMES.includes(item.name)
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
              setReportMenuItems(reports);
              setFilteredMenuItems(otherMenus);
            } else {
              // For users without department categories, separate reports from other menus
              // Only include reports that user has permission for
              const reports = matchedMenus.filter(item => 
                REPORT_NAMES.includes(item.name)
              );
              
              const otherMenus = matchedMenus.filter(item => 
                !REPORT_NAMES.includes(item.name)
              );
              
              const hasCompanies = otherMenus.some(item => item.name === 'Companies');
              if (!hasCompanies && companiesMenuItem) {
                const dashboardIndex = otherMenus.findIndex(item => item.name === 'Dashboard');
                if (dashboardIndex >= 0) {
                  otherMenus.splice(dashboardIndex + 1, 0, companiesMenuItem);
                } else {
                  otherMenus.unshift(companiesMenuItem);
                }
              }
              setReportMenuItems(reports);
              setFilteredMenuItems(otherMenus);
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
          setReportMenuItems([]); // Don't show reports if API fails
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
        setReportMenuItems([]); // Don't show reports on error
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

  // Auto-expand Reports section if current location matches any report path
  useEffect(() => {
    if (reportMenuItems.length > 0) {
      const currentPath = location.pathname;
      const isReportActive = reportMenuItems.some(item => 
        currentPath === item.path || currentPath.startsWith(item.path + '/')
      );
      
      if (isReportActive) {
        setIsReportsOpen(true);
      }
    }
  }, [location.pathname, reportMenuItems]);

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

  // Time Display useEffect
  useEffect(() => {
    if (!sessionStorage.getItem("loginTime")) {
      sessionStorage.setItem("loginTime", new Date().toISOString());
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = new Date(now - new Date(loginTime));
      const hours = String(diff.getUTCHours()).padStart(2, "0");
      const minutes = String(diff.getUTCMinutes()).padStart(2, "0");
      const seconds = String(diff.getUTCSeconds()).padStart(2, "0");
      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [loginTime]);

  // Handle click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("#break-dropdown")) setDropdownOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className={`fixed top-4 left-20 h-[800px] bg-white border border-gray-300 rounded-xl shadow-lg z-50 flex flex-col justify-between transition-all duration-300 ${isExpanded ? "w-64" : "w-16"}`}>
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
      <div className={`fixed top-4 left-20 h-[800px] bg-white border border-gray-300 rounded-xl shadow-lg z-50 flex flex-col transition-all duration-300 ${isExpanded ? "w-64" : "w-16"}`}>
        <div className="flex-none">
          <div className="p-4 relative flex items-center justify-between">
            <img 
              src={logo} 
              alt="Logo" 
              className={`${isExpanded ? "w-24 h-10" : "w-8 h-8 mx-auto object-contain"}`} 
            />
            <button 
              onClick={toggleSidebar} 
              className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-full p-2 shadow-md z-10 hover:bg-gray-50 transition-colors"
            >
              {isExpanded ? (
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>

          {/* Scrollable Menu Section */}
          <div className="overflow-y-auto h-[640px] px-1 pr-2 scrollbar-hide">
            <nav className={`flex flex-col gap-1 text-sm ${isExpanded ? "items-start" : "items-center"}`}>
              {filteredMenuItems.length > 0 || departmentMenuItems.length > 0 ? (
                <>
                  {(() => {
                    // Define hasDeptCategories outside the map for use in multiple places
                    const hasDeptCategories = userDepartment && getDepartmentCategories(userDepartment) !== null;
                    return (
                      <>
                        {filteredMenuItems.map((item, idx) => {
                          // Render Dashboard first, then department dropdown for users with department categories
                    if (hasDeptCategories && item.name === "Dashboard") {
                      return (
                        <React.Fragment key={idx}>
                          <NavLink
                            to={item.path}
                            title={!isExpanded ? item.name : ""}
                            className={({ isActive }) =>
                              `flex items-center ${isExpanded ? "justify-start" : "justify-center"} gap-3 p-3 rounded-lg transition-all ${isExpanded ? "mx-2" : "mx-1"} ${isActive ? "text-white" : "hover:bg-gray-100 text-gray-700"}`
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
                                onClick={(e) => handleFlyoutOpen('sales', e)}
                                className={`flex items-center ${isExpanded ? "justify-start" : "justify-center"} gap-3 p-3 transition-all ${isExpanded ? "mx-2" : "mx-1"} w-full ${
                                  departmentMenuItems.some(deptItem => location.pathname === deptItem.path || location.pathname.startsWith(deptItem.path + '/')) || (flyoutOpen && flyoutType === 'sales')
                                    ? "text-white rounded-l-lg rounded-r-3xl"
                                    : "hover:bg-gray-100 text-gray-700 rounded-lg"
                                }`}
                                style={
                                  departmentMenuItems.some(deptItem => location.pathname === deptItem.path || location.pathname.startsWith(deptItem.path + '/')) || (flyoutOpen && flyoutType === 'sales')
                                    ? { backgroundColor: activeBgColor }
                                    : {}
                                }
                              >
                                <img
                                  src={
                                    departmentMenuItems.some(deptItem => location.pathname === deptItem.path || location.pathname.startsWith(deptItem.path + '/')) || (flyoutOpen && flyoutType === 'sales')
                                      ? WhiteManageUser
                                      : ManageUser
                                  }
                                  alt={getDepartmentDropdownName(userDepartment)}
                                  className="w-5 h-5"
                                />
                                <span className={`${isExpanded ? "inline" : "hidden"} font-medium flex-1 text-left`}>
                                  {getDepartmentDropdownName(userDepartment)}
                                </span>
                              </button>
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
                          `flex items-center ${isExpanded ? "justify-start" : "justify-center"} gap-3 p-3 rounded-lg transition-all ${isExpanded ? "mx-2" : "mx-1"} ${isActive ? "text-white" : "hover:bg-gray-100 text-gray-700"}`
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
                  {/* Reports Section - Top Level (for all users) */}
                  {reportMenuItems.length > 0 && (
                    <div className="w-full mt-2">
                      <button
                        onClick={(e) => handleFlyoutOpen('reports', e)}
                        className={`flex items-center ${isExpanded ? "justify-start" : "justify-center"} gap-3 p-3 transition-all ${isExpanded ? "mx-2" : "mx-1"} w-full ${
                          reportMenuItems.some(reportItem => location.pathname === reportItem.path || location.pathname.startsWith(reportItem.path + '/')) || (flyoutOpen && flyoutType === 'reports')
                            ? "text-white rounded-l-lg rounded-r-3xl"
                            : "hover:bg-gray-100 text-gray-700 rounded-lg"
                        }`}
                        style={
                          reportMenuItems.some(reportItem => location.pathname === reportItem.path || location.pathname.startsWith(reportItem.path + '/')) || (flyoutOpen && flyoutType === 'reports')
                            ? { backgroundColor: activeBgColor }
                            : {}
                        }
                      >
                        <img
                          src={
                            reportMenuItems.some(reportItem => location.pathname === reportItem.path || location.pathname.startsWith(reportItem.path + '/')) || (flyoutOpen && flyoutType === 'reports')
                              ? WhiteRevenueStatic
                              : BlueRevenueStatic
                          }
                          alt="Reports"
                          className="w-5 h-5"
                        />
                        <span className={`${isExpanded ? "inline" : "hidden"} font-medium flex-1 text-left`}>
                          Reports
                        </span>
                      </button>
                    </div>
                  )}
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="text-center p-4 text-gray-500">
                  No modules available
                </div>
              )}
            </nav>
          </div>

        <div className="flex-none px-4 py-4 border-t border-gray-200">
          {/* Time Display Section */}
          {isExpanded && (
            <div className="mb-2">
              <div className="bg-white border border-gray-300 rounded-full px-3 py-2 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                    </svg>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {elapsedTime}
                </div>
              </div>
            </div>
          )}

          {/* Break/Meeting Section */}
          {isExpanded && (
            <div className="mb-3">
              <div className="relative" id="break-dropdown">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full bg-white border border-gray-300 rounded-full px-3 py-2 flex items-center justify-between hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,2A2,2 0 0,1 14,4C14,5.5 13.6,6.9 12.9,8.1C17.2,8.8 20.5,12.3 20.5,16.5V18.5C20.5,19.6 19.6,20.5 18.5,20.5H17V22H15V20.5H9V22H7V20.5H5.5C4.4,20.5 3.5,19.6 3.5,18.5V16.5C3.5,12.3 6.8,8.8 11.1,8.1C10.4,6.9 10,5.5 10,4A2,2 0 0,1 12,2M12,4.5A0.5,0.5 0 0,0 11.5,4A0.5,0.5 0 0,0 12,4.5A0.5,0.5 0 0,0 12.5,4A0.5,0.5 0 0,0 12,4.5Z"/>
                      </svg>
                    </div>
                    <span className="text-gray-800 text-sm font-medium">Meeting</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-800 text-sm font-medium">Break</span>
                    <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center ml-2">
                      <svg className="w-4 h-4 text-amber-700" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2,21V19H20V21H2M20,8V5L18,5V8H20M18,8.5V10.5C18,11.3 17.3,12 16.5,12H15.5C14.7,12 14,11.3 14,10.5V8.5C14,7.7 14.7,7 15.5,7H16.5C17.3,7 18,7.7 18,8.5M16,8.75A0.25,0.25 0 0,0 15.75,8.5A0.25,0.25 0 0,0 15.5,8.75A0.25,0.25 0 0,0 15.75,9A0.25,0.25 0 0,0 16,8.75M14,20.5V16.5C14,15.7 14.7,15 15.5,15H16.5C17.3,15 18,15.7 18,16.5V20.5C18,21.3 17.3,22 16.5,22H15.5C14.7,22 14,21.3 14,20.5M16,16.75A0.25,0.25 0 0,0 15.75,16.5A0.25,0.25 0 0,0 15.5,16.75A0.25,0.25 0 0,0 15.75,17A0.25,0.25 0 0,0 16,16.75M5,3H7C8,3 9,4 9,5V6H11L12,7H14C15,7 16,8 16,9V11C16,12 15,13 14,13H7C6,13 5,12 5,11V3M7,9A1,1 0 0,0 8,10A1,1 0 0,0 9,9A1,1 0 0,0 8,8A1,1 0 0,0 7,9Z"/>
                      </svg>
                    </div>
                  </div>
                </button>

                {dropdownOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg py-2 animate-fade-in z-50 border border-gray-200">
                    {/* Break Section */}
                    <div className="px-4 py-2 hover:bg-gray-100 text-sm text-gray-800 flex justify-between items-center">
                      <span>Break</span>
                      {onBreak ? (
                        <span className="text-yellow-600 font-semibold">
                          {formatTime(breakTimeLeft)}
                        </span>
                      ) : (
                        <button
                          onClick={handleStartBreak}
                          disabled={breakLoading}
                          className="text-xs bg-yellow-200 px-2 py-1 rounded-full flex items-center gap-1"
                        >
                          {breakLoading ? (
                            <>
                              <span className="animate-spin">⏳</span> Starting...
                            </>
                          ) : (
                            "Start"
                          )}
                        </button>
                      )}
                    </div>
                    {onBreak && (
                      <div className="px-4 py-1">
                        <button
                          onClick={handleEndBreak}
                          disabled={breakLoading}
                          className="w-full bg-red-100 text-red-700 text-xs py-1 rounded flex items-center justify-center gap-1"
                        >
                          {breakLoading ? (
                            <>
                              <span className="animate-spin">⏳</span> Ending...
                            </>
                          ) : (
                            "End Break"
                          )}
                        </button>
                      </div>
                    )}

                    {/* Meeting Section */}
                    <div className="px-4 py-2 hover:bg-gray-100 text-sm text-gray-800 flex justify-between items-center">
                      <span>Meeting</span>
                      {onMeeting ? (
                        <span className="text-blue-600 font-semibold">
                          {formatTime(meetingTime)}
                        </span>
                      ) : (
                        <button
                          onClick={handleMeetingToggle}
                          disabled={meetingLoading}
                          className="text-xs bg-blue-200 px-2 py-1 rounded-full flex items-center gap-1"
                        >
                          {meetingLoading ? (
                            <>
                              <span className="animate-spin">⏳</span> Starting...
                            </>
                          ) : (
                            "Start"
                          )}
                        </button>
                      )}
                    </div>
                    {onMeeting && (
                      <div className="px-4 py-1">
                        <button
                          onClick={handleMeetingToggle}
                          className="w-full bg-red-100 text-red-700 text-xs py-1 rounded"
                        >
                          End Meeting
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <NavLink
            to="/"
            className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer transition-colors mb-1 ${isExpanded ? "mx-0" : "justify-center"}`}
          >
            <img src={DashboardImage} alt="Back to Home" className="w-5 h-5" />
            <span className={`${isExpanded ? "inline" : "hidden"} font-medium`}>
              Back to Home
            </span>
          </NavLink>
          <div 
            className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer transition-colors ${isExpanded ? "mx-0" : "justify-center"}`}
            onClick={handleLogoutClick}
          >
            <img src={LogOut} alt="Logout" className="w-5 h-5" />
            <span className={`${isExpanded ? "inline" : "hidden"} font-medium`}>
              Logout
            </span>
          </div>
        </div>
      </div>

      {/* Sidebar Flyout Menu */}
      <SidebarFlyout
        isOpen={flyoutOpen}
        categories={flyoutType === 'sales' ? departmentCategories : { 'Reports': reportMenuItems }}
        position={flyoutPosition}
        onItemClick={handleFlyoutClose}
        title={flyoutType === 'sales' ? getDepartmentDropdownName(userDepartment) : 'Reports'}
      />

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
