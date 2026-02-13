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
    "Payroll": ["Pay Rolls", "Salary Modification"],
    "Documents": [
      "HR Document Verification",
      "Employee Documents",
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
    "Tracking": [
      "Tracking"
    ],
    "Company Management": [
      "Sub Company"
    ],
    "Reports": [
      "Call Data",
      "Call Records (Id)",
      "Report Analysis",
      "DO Report"
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
      "DO Report",
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
    "Company Management": [
      "Sub Company"
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
  // Universal User Department Categories (with Reports included)
  "CMT_UNIVERSAL": {
    "CMT Modules": [
      "Trucker Report",
      "DO Details",
      "Rate Request",
      "Trukers",
      "Daily Task",
      "Tracking"
    ],
    "Common Modules": [
      "Chat",
      "Email",
      "Dinner Status"
    ],
    "CMT Reports": [
      "CMT Dept Report",
      "Trucker Report",
      "Rate Request Report",
      "DO Report",
      "All DO Assigned CMT",
      "Assigned Rate Request"
    ],
    "Common Reports": [
      "Call Data",
      "Call Records (Id)",
      "Report Analysis",
      "Team Rating"
    ]
  },
  "Sales_UNIVERSAL": {
    "Sales Modules": [
      "Daily Follow-Up",
      "Loads",
      "Rate Approved",
      "Delivery Order",
      "Add Customer",
      "All Customers",
      "Daily Task",
      "Tracking"
    ],
    "Company Management": [
      "Sub Company"
    ],
    "Common Modules": [
      "Chat",
      "Email"
    ],
    "Sales Reports": [
      "Sales Dept Report",
      "Follow Up Report",
      "DO Report"
    ],
    "Common Reports": [
      "Call Data",
      "Call Records (Id)",
      "Report Analysis",
      "Team Rating"
    ]
  },
  "Finance_UNIVERSAL": {
    "Finance Modules": [
      "Accounts Receivable",
      "Accounts Payable",
      "Receivable Report",
      "Payable Report",
      "Employee Hygiene"
    ],
    "Common Modules": [
      "Chat",
      "Email",
      "Dinner Status"
    ],
    "Finance Reports": [
      "Receivable Report",
      "Payable Report",
      "DO Report"
    ],
    "Common Reports": [
      "Call Data",
      "Call Records (Id)",
      "Report Analysis",
      "Team Rating"
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
const getDepartmentCategories = (department, role) => {
  const dept = department?.toLowerCase();
  
  // For universal_user, use special universal categories
  if (role === "universal_user") {
    if (dept === "cmt") return DEPARTMENT_MODULE_CATEGORIES["CMT_UNIVERSAL"];
    if (dept === "sales") return DEPARTMENT_MODULE_CATEGORIES["Sales_UNIVERSAL"];
    if (dept === "finance") return DEPARTMENT_MODULE_CATEGORIES["Finance_UNIVERSAL"];
  }
  
  // Regular department categories
  if (dept === "hr") return DEPARTMENT_MODULE_CATEGORIES["HR"];
  if (dept === "sales") return DEPARTMENT_MODULE_CATEGORIES["Sales"];
  if (dept === "finance") return DEPARTMENT_MODULE_CATEGORIES["Finance"];
  if (dept === "cmt") return DEPARTMENT_MODULE_CATEGORIES["CMT"];
  if (dept === "qa") return DEPARTMENT_MODULE_CATEGORIES["QA"];
  return null;
};

// Function to categorize a module for a specific department
const getModuleCategory = (moduleName, department, role) => {
  const categories = getDepartmentCategories(department, role);
  if (!categories) return "Other";
  
  for (const [category, modules] of Object.entries(categories)) {
    if (modules.includes(moduleName)) {
      return category;
    }
  }
  return "Other"; // Default category for uncategorized modules
};

// Function to get all department module names
const getAllDepartmentModules = (department, role) => {
  const categories = getDepartmentCategories(department, role);
  if (!categories) return [];
  return Object.values(categories).flat();
};

// Function to get all universal user departments and their modules
const getAllUniversalUserDepartments = () => {
  return {
    "CMT": DEPARTMENT_MODULE_CATEGORIES["CMT_UNIVERSAL"],
    "Sales": DEPARTMENT_MODULE_CATEGORIES["Sales_UNIVERSAL"],
    "Finance": DEPARTMENT_MODULE_CATEGORIES["Finance_UNIVERSAL"]
  };
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
  { name: "Sub Company", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/SubCompanies" },
  { name: "Manage Module", icon: ManageModule, whiteIcon: WhiteManageModule, path: "/modules" },
  { name: "Daily Task", icon: DailyTarget, whiteIcon: DailyTargetWhite, path: "/DailyTask" },
  { name: "Call Data", icon: BlueCall, whiteIcon: WhiteCall, path: "/call-dashboard" },
  { name: "Chat", icon: ChatBlue, whiteIcon: ChatWhite, path: "/Chat" },
  { name: "Email", icon: BlueInbox, whiteIcon: WhiteInbox, path: "/Inbox" },
  { name: "Revenue & Satatistics", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/AgentRevenueStatistics" },
  { name: "Employee Hygiene", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/EmployeeHygiene" },
  { name: "Pay Rolls", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/PayrollPage" },
  { name: "Salary Modification", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/salary-modification" },
  { name: "Shipper", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/ShippersLDocuments" },
  { name: "Shipper Load Data", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/ShiperLoadData" },
  { name: "HR Document Verification", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/HrDocumentsVerification" },
  { name: "Employee Documents", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/employee-documents" },
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
  { name: "Assigned Rate Request", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/assigned-rate-request" },
  { name: "Sub Company", icon: BlueRevenueStatic, whiteIcon: WhiteRevenueStatic, path: "/SubCompanies" },
  
  
];

// List of report names to filter for Reports section
const REPORT_NAMES = [
  "Sales Dept Report",
  "Follow Up Report",
  "DO Report",
  "All DO Assigned CMT",
  "Assigned Rate Request",
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

// Department-wise report categorization
const DEPARTMENT_REPORTS = {
  "CMT": [
    "CMT Dept Report",
    "Trucker Report",
    "Rate Request Report",
    "DO Report",
    "All DO Assigned CMT",
    "Assigned Rate Request"
  ],
  "Sales": [
    "Sales Dept Report",
    "Follow Up Report",
    "DO Report"
  ],
  "Finance": [
    "Receivable Report",
    "Payable Report",
    "DO Report"
  ],
  "HR": [
    "Break Report",
    "Target Reports",
    "Emp Login Report"
  ],
  "QA": [
    "QA Call Report"
  ],
  "Common": [
    "Call Data",
    "Call Records (Id)",
    "Report Analysis",
    "Team Rating"
  ]
};

// Function to get reports for a specific department
const getDepartmentReports = (department) => {
  if (!department) return DEPARTMENT_REPORTS["Common"] || [];
  const deptReports = DEPARTMENT_REPORTS[department] || [];
  const commonReports = DEPARTMENT_REPORTS["Common"] || [];
  return [...deptReports, ...commonReports];
};

// Function to categorize reports by department
const categorizeReportsByDepartment = (reportItems) => {
  const categorized = {};
  
  reportItems.forEach(item => {
    let assigned = false;
    
    // Check each department
    Object.entries(DEPARTMENT_REPORTS).forEach(([dept, reports]) => {
      if (reports.includes(item.name)) {
        if (!categorized[dept]) {
          categorized[dept] = [];
        }
        categorized[dept].push(item);
        assigned = true;
      }
    });
    
    // If not assigned to any department, add to Common
    if (!assigned) {
      if (!categorized["Common"]) {
        categorized["Common"] = [];
      }
      categorized["Common"].push(item);
    }
  });
  
  return categorized;
};

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [departmentMenuItems, setDepartmentMenuItems] = useState([]);
  const [departmentCategories, setDepartmentCategories] = useState({});
  const [allDepartmentCategories, setAllDepartmentCategories] = useState({}); // For universal_user: stores all dept categories
  const [isDepartmentMenuOpen, setIsDepartmentMenuOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState({});
  const [isReportsOpen, setIsReportsOpen] = useState(true);
  const [reportMenuItems, setReportMenuItems] = useState([]);
  const [reportCategories, setReportCategories] = useState({}); // Department-wise report categories
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userDepartment, setUserDepartment] = useState(null);
  const [userRole, setUserRole] = useState(null); // Store user role
  
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
  const handleFlyoutOpen = (type, event, departmentName = null) => {
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
      // Keep original simple positioning for department flyouts
      if (topPosition > viewportHeight * 0.7) {
        topPosition = Math.max(20, viewportHeight * 0.1);
      }
    }
    
    setFlyoutPosition({
      left: rect.right + 10,
      top: topPosition
    });
    
    // For universal_user and superadmin, store which department is being opened
    if (departmentName && (userRole === "universal_user" || (userRole && userRole.toLowerCase() === "superadmin"))) {
      setDepartmentCategories(allDepartmentCategories[departmentName] || {});
      setUserDepartment(departmentName);
    }
    
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
      // Declare variables in outer scope so they're accessible in catch block
      let department = "";
      let role = "";
      let isSuperAdmin = false;
      
      try {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
        
        if (!user || Object.keys(user).length === 0) {
          console.error("❌ No user data found");
          // Fallback: show basic menus when no user data
          // Include Tracking for all users in fallback
          const basicMenus = menuItems.filter(item => 
            ['Dashboard', 'Tracking'].includes(item.name)
          );
          setFilteredMenuItems(basicMenus);
          setLoading(false);
          return;
        }

        // Get user department and role
        department = user?.department || "";
        role = (user?.role || "").toLowerCase().trim();
        const isUniversalUser = role === "universal_user";
        isSuperAdmin = role === "superadmin" || role === "super admin";
        setUserDepartment(department);
        setUserRole(role); // Set role early so it's available everywhere
        const hasDepartmentCategories = getDepartmentCategories(department, role) !== null;

        const allowedModuleIds = user?.allowedModules?.map(String) || [];
        console.log("👤 User role:", role, "Is universal_user:", isUniversalUser, "Is superadmin:", isSuperAdmin);
        console.log("👤 User allowed modules (IDs):", allowedModuleIds);
        console.log("👤 User allowed modules (count):", allowedModuleIds.length);
        console.log("👤 User department:", department, "Has categories:", hasDepartmentCategories);

        // Get token explicitly for Safari compatibility (explicit header required)
        const token = 
          sessionStorage.getItem('token') || 
          localStorage.getItem('token') ||
          sessionStorage.getItem('authToken') || 
          localStorage.getItem('authToken');
        
        if (!token) {
          console.error("❌ No token found in storage");
          throw new Error("Authentication token not found. Please login again.");
        }

        // Use axios with explicit Authorization header for Safari compatibility
        // Safari requires explicit headers for cross-site requests
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/module`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true, // 🔥 CRITICAL: Required for Safari/iOS cross-site cookies
        });

        const data = res.data;

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

          // Match menu items with active modules by name or label (case insensitive)
          // Also normalize multiple spaces to single space and hyphens for matching
          const matchedMenus = menuItems.filter((item) => {
            const match = activeModules.some((mod) => {
              // Normalize module name (handle hyphens and spaces)
              const modName = (mod.name || '').trim().replace(/\s+/g, ' ').replace(/-/g, ' ').toLowerCase();
              // Also check label field if it exists
              const modLabel = (mod.label || '').trim().replace(/\s+/g, ' ').replace(/-/g, ' ').toLowerCase();
              // Normalize menu item name
              const itemName = item.name.trim().replace(/\s+/g, ' ').replace(/-/g, ' ').toLowerCase();
              
              // Match by name OR label
              const isMatch = modName === itemName || modLabel === itemName;
              if (isMatch) {
                console.log(`✅ Matched: "${mod.name}"${mod.label ? ` (label: "${mod.label}")` : ''} (ID: ${mod._id}) with menu item "${item.name}"`);
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
              const modName = (mod.name || '').trim().replace(/\s+/g, ' ').replace(/-/g, ' ').toLowerCase();
              const modLabel = (mod.label || '').trim().replace(/\s+/g, ' ').replace(/-/g, ' ').toLowerCase();
              const itemName = item.name.trim().replace(/\s+/g, ' ').replace(/-/g, ' ').toLowerCase();
              return modName === itemName || modLabel === itemName;
            })
          ).map(m => ({ name: m.name, label: m.label, id: m._id })));
          
          // Always include Companies menu item
          const companiesMenuItem = menuItems.find(item => item.name === 'Companies');
          
          // Handle universal_user and superadmin with department-wise dropdowns
          if (isUniversalUser || isSuperAdmin) {
            console.log(`🔑 Processing ${isUniversalUser ? 'universal_user' : 'superadmin'} modules`);
            
            // Get all universal user departments
            const universalDepts = getAllUniversalUserDepartments();
            const allUniversalModuleNames = Object.values(universalDepts).flatMap(cats => 
              Object.values(cats).flat()
            );
            
            // Filter matched menus to only include universal user modules
            const universalMenus = matchedMenus.filter(item => 
              allUniversalModuleNames.includes(item.name)
            );
            
            // Separate reports - all reports for universal_user
            const reports = matchedMenus.filter(item => 
              REPORT_NAMES.includes(item.name)
            );
            
            // For superadmin, extract Chat, Email, Dinner Status, and Tracking to move them outside departments
            let chatMenuItem = null;
            let emailMenuItem = null;
            let dinnerStatusMenuItem = null;
            let trackingMenuItem = null;
            if (isSuperAdmin) {
              chatMenuItem = matchedMenus.find(item => item.name === "Chat");
              emailMenuItem = matchedMenus.find(item => item.name === "Email");
              dinnerStatusMenuItem = matchedMenus.find(item => item.name === "Dinner Status");
              trackingMenuItem = matchedMenus.find(item => item.name === "Tracking");
            }
            
            // Categorize reports by department
            const categorizedReports = categorizeReportsByDepartment(reports);
            
            // Organize modules by department
            const departmentCategoriesMap = {};
            
            // Process each department
            Object.entries(universalDepts).forEach(([deptName, categories]) => {
              const categorized = {};
              
              // Process each category in the department
              Object.entries(categories).forEach(([categoryName, moduleNames]) => {
                const categoryItems = [];
                
                moduleNames.forEach(moduleName => {
                  // For superadmin, skip Chat, Email, Dinner Status, and Tracking in department categories
                  if (isSuperAdmin && (moduleName === "Chat" || moduleName === "Email" || moduleName === "Dinner Status" || moduleName === "Tracking")) {
                    return;
                  }
                  
                  // First try to find in universalMenus (non-report modules)
                  let menuItem = universalMenus.find(item => item.name === moduleName);
                  
                  // If not found, try in reports
                  if (!menuItem) {
                    menuItem = reports.find(item => item.name === moduleName);
                  }
                  
                  if (menuItem) {
                    categoryItems.push(menuItem);
                  }
                });
                
                // Add category if it has items
                if (categoryItems.length > 0) {
                  categorized[categoryName] = categoryItems;
                }
              });
              
              // Only add department if it has any categories
              if (Object.keys(categorized).length > 0) {
                departmentCategoriesMap[deptName] = categorized;
              }
            });
            
            // Set department menu items (flattened for display logic)
            // For superadmin, exclude Chat, Email, Dinner Status, and Tracking from department menus
            const allDeptMenus = Object.values(departmentCategoriesMap).flatMap(cats =>
              Object.values(cats).flat()
            ).filter(item => {
              if (isSuperAdmin) {
                return item.name !== "Chat" && item.name !== "Email" && item.name !== "Dinner Status" && item.name !== "Tracking";
              }
              return true;
            });
            
            // Other menus (Dashboard, Companies) - common modules
            // For superadmin, Tracking will be added separately outside departments
            const commonModules = ["Dashboard"];
            const otherMenus = matchedMenus.filter(item => 
              commonModules.includes(item.name)
            );
            
            // Add Companies if available
            if (companiesMenuItem && matchedMenus.some(m => m.name === 'Company')) {
              const dashboardIndex = otherMenus.findIndex(item => item.name === 'Dashboard');
              if (dashboardIndex >= 0) {
                otherMenus.splice(dashboardIndex + 1, 0, companiesMenuItem);
              } else {
                otherMenus.unshift(companiesMenuItem);
              }
            }
            
            // For superadmin, add Chat, Email, Dinner Status, and Tracking as top-level menu items (outside departments)
            // Only add if they're not already in otherMenus (they might not be in department categories)
            if (isSuperAdmin) {
              // Add Tracking first (after Dashboard)
              if (trackingMenuItem && !otherMenus.some(item => item.name === "Tracking")) {
                const dashboardIndex = otherMenus.findIndex(item => item.name === 'Dashboard');
                if (dashboardIndex >= 0) {
                  otherMenus.splice(dashboardIndex + 1, 0, trackingMenuItem);
                } else {
                  otherMenus.push(trackingMenuItem);
                }
              }
              if (chatMenuItem && !otherMenus.some(item => item.name === "Chat")) {
                otherMenus.push(chatMenuItem);
              }
              if (emailMenuItem && !otherMenus.some(item => item.name === "Email")) {
                otherMenus.push(emailMenuItem);
              }
              if (dinnerStatusMenuItem && !otherMenus.some(item => item.name === "Dinner Status")) {
                otherMenus.push(dinnerStatusMenuItem);
              }
            }
            
            // For universal_user and superadmin, store all department categories
            setAllDepartmentCategories(departmentCategoriesMap);
            // Store the first department for display
            const firstDept = Object.keys(departmentCategoriesMap)[0] || department;
            setUserDepartment(firstDept);
            setDepartmentMenuItems(allDeptMenus);
            setDepartmentCategories(departmentCategoriesMap[firstDept] || {});
            
            // For superadmin, also show separate Reports dropdown
            if (isSuperAdmin) {
              console.log("✅ Setting Reports dropdown for superadmin");
              setReportMenuItems(reports);
              setReportCategories(categorizedReports);
            } else {
              // Don't show separate Reports dropdown for universal_user (reports are in department dropdowns)
              setReportMenuItems([]);
              setReportCategories({});
            }
            
            setFilteredMenuItems(otherMenus);
            
            console.log(`✅ ${isUniversalUser ? 'Universal user' : 'Superadmin'} setup complete`);
            console.log("📋 Department categories:", Object.keys(departmentCategoriesMap));
            console.log("📋 Reports count:", reports.length);
            if (isSuperAdmin) {
              console.log("📋 Report categories:", Object.keys(categorizedReports));
              console.log("📋 Chat, Email, Dinner Status, and Tracking moved outside departments for superadmin");
            }
            
            setLoading(false);
            return;
          }
          
          // Store role for all users
          setUserRole(role);
          console.log("✅ User role stored:", role);
          
          // If no modules matched but user has allowedModules, try to show department modules
          if (matchedMenus.length === 0) {
            if (allowedModuleIds.length > 0 && hasDepartmentCategories) {
              console.warn("⚠️ No modules matched by name, but user has allowedModules. Showing department modules as fallback.");
              // Get all department module names
              const allDeptModuleNames = getAllDepartmentModules(department, role);
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
                const category = getModuleCategory(item.name, department, role);
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
              // For superadmin, include Tracking in basic menus (outside departments)
              const basicMenuNames = isSuperAdmin ? ['Dashboard', 'Tracking'] : ['Dashboard', 'Tracking'];
              const basicMenus = menuItems.filter(item => 
                basicMenuNames.includes(item.name)
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
              const allDeptModuleNames = getAllDepartmentModules(department, role);
              
              // Separate department modules from other modules
              let deptMenus = matchedMenus.filter(item => 
                allDeptModuleNames.includes(item.name)
              );
              
              // For superadmin, extract Chat, Email, Dinner Status, and Tracking from department modules
              let chatMenuItem = null;
              let emailMenuItem = null;
              let dinnerStatusMenuItem = null;
              let trackingMenuItem = null;
              if (isSuperAdmin) {
                chatMenuItem = deptMenus.find(item => item.name === "Chat");
                emailMenuItem = deptMenus.find(item => item.name === "Email");
                dinnerStatusMenuItem = deptMenus.find(item => item.name === "Dinner Status");
                trackingMenuItem = matchedMenus.find(item => item.name === "Tracking");
                // Remove Chat, Email, and Dinner Status from department menus
                deptMenus = deptMenus.filter(item => 
                  item.name !== "Chat" && item.name !== "Email" && item.name !== "Dinner Status"
                );
              }
              
              // Separate reports from other menus - only include reports that user has permission for
              const reports = matchedMenus.filter(item => 
                REPORT_NAMES.includes(item.name)
              );
              
              // Categorize reports by department
              const categorizedReports = categorizeReportsByDepartment(reports);
              
              const otherMenus = matchedMenus.filter(item => 
                !allDeptModuleNames.includes(item.name) && 
                !REPORT_NAMES.includes(item.name) &&
                item.name !== "Tracking" // Tracking will be added separately for superadmin
              );
              
              // Categorize department modules (Chat and Email already removed for superadmin)
              const categorized = {};
              deptMenus.forEach(item => {
                const category = getModuleCategory(item.name, department, role);
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
              
              // For superadmin, add Chat, Email, Dinner Status, and Tracking as top-level menu items (outside departments)
              // Only add if they're not already in otherMenus (they might not be in department categories)
              if (isSuperAdmin) {
                // Add Tracking first (after Dashboard)
                if (trackingMenuItem && !otherMenus.some(item => item.name === "Tracking")) {
                  const dashboardIndex = otherMenus.findIndex(item => item.name === 'Dashboard');
                  if (dashboardIndex >= 0) {
                    otherMenus.splice(dashboardIndex + 1, 0, trackingMenuItem);
                  } else {
                    otherMenus.push(trackingMenuItem);
                  }
                }
                if (chatMenuItem && !otherMenus.some(item => item.name === "Chat")) {
                  otherMenus.push(chatMenuItem);
                }
                if (emailMenuItem && !otherMenus.some(item => item.name === "Email")) {
                  otherMenus.push(emailMenuItem);
                }
                if (dinnerStatusMenuItem && !otherMenus.some(item => item.name === "Dinner Status")) {
                  otherMenus.push(dinnerStatusMenuItem);
                }
              }
              
              // TEMPORARY BYPASS: Add Employee Documents for HR users (after all filtering)
              // This bypasses module permission check - remove after adding module to database
              if ((department === "hr" || department === "HR") && !deptMenus.some(item => item.name === "Employee Documents")) {
                const employeeDocumentsItem = menuItems.find(item => item.name === "Employee Documents");
                if (employeeDocumentsItem) {
                  deptMenus.push(employeeDocumentsItem);
                  // Add to categorized as well
                  const category = getModuleCategory("Employee Documents", department, role);
                  if (!categorized[category]) {
                    categorized[category] = [];
                  }
                  categorized[category].push(employeeDocumentsItem);
                  console.log("✅ Added Employee Documents to HR menu (bypass)");
                }
              }
              
              setDepartmentMenuItems(deptMenus);
              setDepartmentCategories(categorized);
              // Only show Reports dropdown for superadmin
              if (isSuperAdmin) {
                console.log("✅ Setting Reports dropdown for superadmin");
                setReportMenuItems(reports);
                setReportCategories(categorizedReports);
                console.log("📋 Chat, Email, Dinner Status, and Tracking moved outside departments for superadmin");
              } else {
                setReportMenuItems([]);
                setReportCategories({});
              }
              setFilteredMenuItems(otherMenus);
            } else {
              // For users without department categories, separate reports from other menus
              // Only include reports that user has permission for
              const reports = matchedMenus.filter(item => 
                REPORT_NAMES.includes(item.name)
              );
              
              // Categorize reports by department
              const categorizedReports = categorizeReportsByDepartment(reports);
              
              const otherMenus = matchedMenus.filter(item => 
                !REPORT_NAMES.includes(item.name) &&
                !(isSuperAdmin && item.name === "Tracking")
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
              // Only show Reports dropdown for superadmin
              if (isSuperAdmin) {
                console.log("✅ Setting Reports dropdown for superadmin");
                setReportMenuItems(reports);
                setReportCategories(categorizedReports);
              } else {
                setReportMenuItems([]);
                setReportCategories({});
              }
              setFilteredMenuItems(otherMenus);
              setDepartmentMenuItems([]);
              setDepartmentCategories({});
            }
          }
        } else {
          console.error("❌ API response not successful:", data);
          console.error("❌ Response status:", res?.status);
          console.error("❌ Response headers:", res?.headers);
          // Fallback: show basic menus if API fails
          // For superadmin, include Tracking in basic menus (outside departments)
          const basicMenuNames = isSuperAdmin ? ['Dashboard', 'Tracking'] : ['Dashboard', 'Tracking'];
          const basicMenus = menuItems.filter(item => 
            basicMenuNames.includes(item.name)
          );
          setFilteredMenuItems(basicMenus);
          setDepartmentMenuItems([]);
          setDepartmentCategories({});
          setReportMenuItems([]); // Don't show reports if API fails
        }
      } catch (err) {
        console.error("❌ Failed to fetch modules:", err);
        console.error("❌ Error details:", {
          message: err?.message,
          response: err?.response?.data,
          status: err?.response?.status,
          headers: err?.response?.headers,
          config: {
            url: err?.config?.url,
            headers: err?.config?.headers,
            withCredentials: err?.config?.withCredentials
          }
        });
        
        // Check if it's an authentication error
        if (err?.response?.status === 400 || err?.response?.status === 401) {
          console.error("❌ Authentication failed. Token:", token ? "exists" : "missing");
          console.error("❌ Check if token is in storage:", {
            sessionToken: sessionStorage.getItem('token') ? 'exists' : 'missing',
            sessionAuthToken: sessionStorage.getItem('authToken') ? 'exists' : 'missing',
            localToken: localStorage.getItem('token') ? 'exists' : 'missing',
            localAuthToken: localStorage.getItem('authToken') ? 'exists' : 'missing'
          });
        }
        
        // Fallback: show basic menus on error
        // For superadmin, include Tracking in basic menus (outside departments)
        const basicMenuNames = isSuperAdmin ? ['Dashboard', 'Tracking'] : ['Dashboard', 'Tracking'];
        const basicMenus = menuItems.filter(item => 
          basicMenuNames.includes(item.name)
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
      <div className={`fixed top-4 left-12 h-[886px] bg-white border border-gray-300 rounded-xl shadow-lg z-50 flex flex-col transition-all duration-300 ${isExpanded ? "w-64" : "w-16"}`}>
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
                    const hasDeptCategories = userDepartment && getDepartmentCategories(userDepartment, userRole) !== null;
                    return (
                      <>
                        {filteredMenuItems.map((item, idx) => {
                          // Tracking is now shown for superadmin (moved outside departments)
                          // No need to skip it anymore
                          // Render Dashboard first, then department dropdown for users with department categories
                    if (hasDeptCategories && item.name === "Dashboard") {
                      return (
                        <React.Fragment key={idx}>
                          <NavLink
                            to={item.path}
                            title={!isExpanded ? item.name : ""}
                            className={({ isActive }) =>
                              `sidebar-item flex items-center ${isExpanded ? "sidebar-item-expanded justify-start" : "justify-center mx-1"} gap-3 p-3 transition-all ${isActive ? "sidebar-item-active text-white" : "text-gray-700"}`
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
                          {/* Department Dropdown(s) - placed after Dashboard */}
                          {departmentMenuItems.length > 0 && (
                            <div className="w-full">
                              {(userRole === "universal_user" || (userRole && (userRole.toLowerCase() === "superadmin" || userRole.toLowerCase() === "super admin"))) && Object.keys(allDepartmentCategories).length > 0 ? (
                                // Multiple department dropdowns for universal_user
                                Object.entries(allDepartmentCategories).map(([deptName, deptCats]) => {
                                  const deptMenuItems = Object.values(deptCats).flat();
                                  const isActive = deptMenuItems.some(deptItem => 
                                    location.pathname === deptItem.path || location.pathname.startsWith(deptItem.path + '/')
                                  ) || (flyoutOpen && flyoutType === 'sales' && userDepartment === deptName);
                                  
                                  return (
                                    <button
                                      key={deptName}
                                      onClick={(e) => handleFlyoutOpen('sales', e, deptName)}
                                      className={`sidebar-item flex items-center ${isExpanded ? "sidebar-item-expanded justify-start" : "justify-center mx-1"} gap-3 p-3 transition-all w-full mb-1 ${
                                        isActive
                                          ? "sidebar-item-active text-white"
                                          : "text-gray-700"
                                      }`}
                                      style={
                                        isActive
                                          ? { backgroundColor: activeBgColor }
                                          : {}
                                      }
                                    >
                                      <img
                                        src={isActive ? WhiteManageUser : ManageUser}
                                        alt={getDepartmentDropdownName(deptName)}
                                        className="w-5 h-5"
                                      />
                                      <span className={`${isExpanded ? "inline" : "hidden"} font-medium flex-1 text-left`}>
                                        {getDepartmentDropdownName(deptName)}
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                // Single department dropdown for regular users
                                <button
                                  onClick={(e) => handleFlyoutOpen('sales', e)}
                                className={`sidebar-item flex items-center ${isExpanded ? "sidebar-item-expanded justify-start" : "justify-center mx-1"} gap-3 p-3 transition-all w-full ${
                                    departmentMenuItems.some(deptItem => location.pathname === deptItem.path || location.pathname.startsWith(deptItem.path + '/')) || (flyoutOpen && flyoutType === 'sales')
                                      ? "sidebar-item-active text-white"
                                      : "text-gray-700"
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
                          `sidebar-item flex items-center ${isExpanded ? "sidebar-item-expanded justify-start" : "justify-center mx-1"} gap-3 p-3 transition-all ${isActive ? "sidebar-item-active text-white" : "text-gray-700"}`
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
                  {/* Reports Section - Top Level (only for superadmin) */}
                  {reportMenuItems.length > 0 && userRole && (userRole.toLowerCase() === "superadmin" || userRole.toLowerCase() === "super admin") && (
                    <div className="w-full mt-2">
                      <button
                        onClick={(e) => handleFlyoutOpen('reports', e)}
                        className={`sidebar-item flex items-center ${isExpanded ? "sidebar-item-expanded justify-start" : "justify-center mx-1"} gap-3 p-3 transition-all w-full ${
                          reportMenuItems.some(reportItem => location.pathname === reportItem.path || location.pathname.startsWith(reportItem.path + '/')) || (flyoutOpen && flyoutType === 'reports')
                            ? "sidebar-item-active text-white"
                            : "text-gray-700"
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
            className={`sidebar-item flex items-center gap-3 p-3 text-gray-700 cursor-pointer transition-all mb-1 ${isExpanded ? "mx-0" : "justify-center"}`}
          >
            <img src={DashboardImage} alt="Back to Home" className="w-5 h-5" />
            <span className={`${isExpanded ? "inline" : "hidden"} font-medium`}>
              Back to Home
            </span>
          </NavLink>
          <div 
            className={`sidebar-item flex items-center gap-3 p-3 text-gray-700 cursor-pointer transition-all ${isExpanded ? "mx-0" : "justify-center"}`}
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
        categories={
          flyoutType === 'sales' 
            ? departmentCategories 
            : (Object.keys(reportCategories).length > 0 ? reportCategories : { 'Reports': reportMenuItems })
        }
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
