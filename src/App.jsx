import { useEffect, useState, useRef, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "./App.css";
import Login from "./Pages/Auth/Login/Login";
import Signup from "./Pages/Auth/Login/Signup";
import Layout from "./Layout/Layout";
import PrivateRoute from "./Components/Dashboard/Private.jsx";
import RoleBasedDashboard from "./Components/RolebasedLogin.jsx";
import ConsignmentTracker from "./Components/Dashboard/LiveTracker1";
import UserPermission from "./Components/Dashboard/UserPermission";
import ManageUser from "./Components/Dashboard/ManageUser.jsx";
import LoadBoard from "./Components/Dashboard/LoadBoard.jsx";
import ProfilePage from "./Pages/ProfilePage.jsx";
import UserCallDashboard from "./Pages/UserCallerData.jsx";
import FleetTable from "./Components/Dashboard/Fleet.jsx";
import AnalyticsReport from "./Components/Dashboard/AnalyticsReport.jsx";
import CallDashboard from "./Components/Dashboard/CallDashboard.jsx";
import ChatPage from "./Components/AgentDashboard/Chat.jsx";
import Inbox from "./Components/Email/index.jsx";
import AgentRevenueStatistics from "./Components/AgentDashboard/AgentRevenueStatistics.jsx";
import EmployeeHygiene from "./Components/AgentDashboard/EmployeeHygine.jsx";
import ShippersLDocuments from "./Components/AgentDashboard/Shipper-L-Document.jsx";
import PayrollPage from "./Components/HRDashboard/payroll.jsx";
import ShiperLoadData from "./Components/AgentDashboard/ShiperLoadData.jsx";
import HrDocumentsVerification from "./Components/HRDashboard/DocumentVerifcation.jsx";
import Attendanceleave from "./Components/HRDashboard/Attendance-leave.jsx";
import TLTeams from "./Components/TLDashboard/Team.jsx";
import TruckerDocuments from "./Components/CMT/TruckerDocuments.jsx";
import HREmployeeHygine from "./Components/HRDashboard/HrEmployeeHygine.jsx";
import ManagerShippersLDocuments from "./Components/Agent-Manager/Manager-Shipper-L-Documents.jsx";
import TruckerLDocuments from "./Components/CMT-Manager/TruckerDocumetCMT-Manager.jsx";
import HrCreateTask from "./Components/HRDashboard/HrCreateTask.jsx";
import RateRequest from "./Components/CMT-Manager/RateRequest.jsx";
import LeaveApproval from "./Components/HRDashboard/LeaveApproval.jsx";
import RateApproved from "./Components/CMT/RateApproved.jsx";
import ManagerPendingBids from "./Components/CMT/ManagerPendingBids.jsx";
import Loads from "./Components/CMT/Loads.jsx";
import CarrierApproval from "./Components/CMT/CarrierApproval.jsx";
import DeliveryOrder from "./Components/Sales/DeliveryOrder.jsx";
import DOReport from "./Components/Sales/DOReport.jsx";
import TeamRating from "./Components/Sales/TeamRating.jsx";
import DailyFollowUp from "./Pages/DailyFollowUp.jsx";
import AddCustomer from "./Components/Sales/AddCustomer.jsx";
import AssignAgent from "./Components/Dashboard/AssignAgent.jsx";
import CarrierDocs from "./Components/CMT/CarrierDocs.jsx";
import DoDetails from "./Components/CMT/DODetails.jsx";
import CandidateShortlist from "./Components/HRDashboard/CandidateShortlist.jsx";
import TargetReports from "./Components/HRDashboard/TargetReports.jsx";
import Consignment from "./Pages/Consignment.jsx";
import CustomerLoads from "./Pages/CustomerLoads.jsx";
import DailyRateRequest from "./Components/CMT-Manager/DailyRateRequest.jsx";
import OfficeInventory from "./Components/HRDashboard/OfficeInventory.jsx";
import DinnerStatus from "./Pages/DinnerStatus.jsx";
import TruckerReport from "./Components/CMT/TruckerReport.jsx";
import AllLeads from "./Components/AllLeads.jsx";
import TaskScheduling from "./Components/TaskScheduling/TaskScheduling.jsx";
import CmtDeptReport from "./Components/CMT/cmtDeptReport.jsx";
import SalesDeptReport from "./Components/Sales/salesDeptReport.jsx";
import Invoices from "./Components/Accountant/Invoices.jsx";
import CheckInvoice from "./Components/Sales/CheckInvoice.jsx";
import AssignLoad from "./Components/CMT-Manager/AssignLoad.jsx";
import FinanceDashboard from "./Components/Finance/FinanceDashboard.jsx";
import CallingReport from "./Pages/IddCallingReport.jsx";
import TermsAndConditions from "./Components/TermsAndConditions.jsx";
import AddFleet from "./Components/CMT-Manager/addFleet.jsx";
import OfficeExpenses from "./Components/HRDashboard/OfficeExpenses.jsx";
import EmpLeaves from "./Components/HRDashboard/EmpLeaves.jsx";
import AddTruckerDriver from "./Components/CMT/AddTruckerDriver.jsx";
import  AssignDo  from "./Components/CMT-Manager/AssignDo.jsx";
import TruckerReassign from "./Components/CMT-Manager/TruckerReassign.jsx";
import CompanyList from "./Components/Accountant/Company/CompanyList.jsx";
import TallyManagement from "./Components/Finance/TallyManagement.jsx";
import LedgerManagement from "./Components/Finance/LedgerManagement.jsx";
import InventoryManagement from "./Components/Finance/InventoryManagement.jsx";
import AcountentPayable from "./Components/Finance/AcountentPayable.jsx";
import AllCustomer from "./Components/Sales/AllCustomer.jsx";
import EmptyTruckLocation from "./Components/CMT/EmptyTruckLocation.jsx";
import RateRequestReport from "./Components/CMT/RateRequestReport.jsx";
import TruckerEmptyLocation from "./Components/Dashboard/TruckerEmptyLocation.jsx";
import BreakReport from "./Components/HRDashboard/BreakReport.jsx";
import FollowUpReport from "./Components/Sales/FollowUpReport.jsx";
import PaymentNotificationPopup from "./Components/PaymentNotificationPopup.jsx";
import QADashboard from "./Components/QA/QADashboard.jsx";
import CallRecordingReview from "./Components/QA/CallRecordingReview.jsx";
import ManagerReview from "./Components/QA/ManagerReview.jsx";
import CombinedReview from "./Components/QA/CombinedReview.jsx";
import EmployeeReviewHistory from "./Components/QA/EmployeeReviewHistory.jsx";
import PendingReviews from "./Components/QA/PendingReviews.jsx";
import QACallReport from "./Components/QA/QACallReport.jsx";

// Chat Message System Imports
import { ChatMessageProvider } from "./contexts/ChatMessageContext";
import ChatMessagePopup from "./Components/ChatMessagePopup/ChatMessagePopup";
import TestChatPopup from "./Components/TestChatPopup";
import ErrorBoundary from "./Components/ErrorBoundary";
import ChatSystemStatus from "./Components/ChatSystemStatus";
import { fetchLoadAddresses } from "./utils/loadUtils";
import globalNegotiationService from "./services/globalNegotiationService";
import SocketTest from "./Components/SocketTest";
import globalNegotiationSocketService from "./services/globalNegotiationSocketFixed";
import NegotiationTestButton from "./Components/NegotiationTestButton";
import NotificationHandler from "./Components/NotificationHandler";
import sharedSocketService from "./services/sharedSocketService";
import { OnlineStatusProvider } from "./contexts/OnlineStatusContext";
import { UnreadCountProvider } from "./contexts/UnreadCountContext";
// import GlobalNegotiationNotifications from "./components/GlobalNegotiationNotifications";
// import NegotiationSocketTester from "./components/NegotiationSocketTester";
import LandingPage from "./Pages/LandingPage.jsx";



// Global Notification Component
function GlobalAssignmentNotification() {
  const navigate = useNavigate();

  // Cross-tab communication
  useEffect(() => {
    let broadcastChannel;

    const handleBroadcastMessage = (event) => {
      const message = event?.data;
      if (message?.type === "RR_NEW_ASSIGNMENT" && message?.approval) {
        showGlobalToast(message.approval);
      }
    };

    const handleStorageChange = (event) => {
      if (event.key === "rr_new_assignment" && event.newValue) {
        try {
          const approval = JSON.parse(event.newValue);
          showGlobalToast(approval);
          // Clear the storage after reading
          localStorage.removeItem("rr_new_assignment");
        } catch (error) {
          console.warn("Failed to parse storage notification:", error);
        }
      }
    };

    // Initialize BroadcastChannel if available 
    if ("BroadcastChannel" in window) {
      try {
        broadcastChannel = new BroadcastChannel("rr_events");
        broadcastChannel.addEventListener("message", handleBroadcastMessage);
      } catch (error) {
        console.warn("BroadcastChannel not supported:", error);
      }
    }

    // Listen for storage events
    window.addEventListener("storage", handleStorageChange);

    return () => {
      if (broadcastChannel) {
        broadcastChannel.removeEventListener("message", handleBroadcastMessage);
        broadcastChannel.close();
      }
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [navigate]);

  // Polling for new assignments (commented out as per original)
  // useEffect(() => {
  //   if (!isOnline) return;

  //   let pollInterval;

  //   const pollForAssignments = async () => {
  //     try {
  //       const token = getAuthToken();
  //       if (!token) return;

  //       const response = await axios.get(
  //         `${API_CONFIG.BASE_URL}/api/v1/load-approval/pending`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${token}`,
  //             'Content-Type': 'application/json'
  //           },
  //           timeout: 10000
  //         }
  //       );

  //       const approvals = response?.data?.data?.approvals || [];
  //       const currentPendingIds = new Set(
  //         approvals
  //           .filter(approval => (approval.overallStatus || approval.status) === "pending")
  //           .map(approval => approval._id)
  //       );

  //       const previousIds = prevIdsRef.current;
  //       const newAssignmentIds = [...currentPendingIds].filter(id => !previousIds.has(id));

  //       if (newAssignmentIds.length > 0) {
  //         newAssignmentIds.forEach(id => {
  //           const newApproval = approvals.find(approval => approval._id === id);
  //           if (newApproval) {
  //             showGlobalToast(newApproval);
  //           }
  //         });
  //       }

  //       prevIdsRef.current = currentPendingIds;
  //     } catch (error) {
  //       // Only log errors that are not permission-related
  //       if (error.response?.status !== 403 && error.response?.status !== 401) {
  //         console.error("Polling error:", error);
  //       }
  //     }
  //   };

  //   // Initial poll
  //   pollForAssignments();
  
  //   // Set up interval for polling
  //   pollInterval = setInterval(pollForAssignments, 20000);

  //   return () => {
  //     if (pollInterval) clearInterval(pollInterval);
  //   };
  // }, [isOnline, navigate]);

  const showGlobalToast = useCallback((approval) => {
    if (!approval) return;

    const originCity = approval?.loadId?.origin?.city ?? approval?.origin?.city ?? "—";
    const destinationCity = approval?.loadId?.destination?.city ?? approval?.destination?.city ?? "—";
    const rate = approval?.loadId?.rate ?? approval?.rate ?? 0;
    const formattedRate = typeof rate === 'number' ? rate.toLocaleString() : "0";

    toast.info(
      ({ closeToast }) => (
        <div className="space-y-2 p-2">
          <div className="font-semibold text-gray-800">New Load Assigned</div>
          <div className="text-sm text-gray-600">
            {originCity} → {destinationCity}
          </div>
          <div className="text-sm font-medium text-green-600">
            Rate: ${formattedRate}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => {
                closeToast?.();
                navigate("/RateRequest", { 
                  state: { openApprovalFromBroadcast: approval } 
                });
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors duration-200"
            >
              View & Accept
            </button>
          </div>
        </div>
      ),
      { 
        autoClose: 8000,
        closeButton: true,
        position: "top-right"
      }
    );
  }, [navigate]);

  return null;
}

// Global Negotiation Notification Component
function GlobalNegotiationNotification() {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize global negotiation socket service
    const initializeGlobalSocket = () => {
      const userInfo = globalNegotiationSocketService.getCurrentUser();
      if (userInfo) {
        console.log('🚀 Initializing global negotiation socket service...');
        globalNegotiationSocketService.initialize();
        globalNegotiationSocketService.requestNotificationPermission();
        
        // Auto-join assigned bids for CMT users
        setTimeout(() => {
          globalNegotiationSocketService.autoJoinAssignedBids();
        }, 2000);
      }
    };

    // Listen for custom negotiation events
    const handleNegotiationEvent = async (event) => {
      const { bidId, loadId, rate, message, senderName, originAddress, destinationAddress, pickupLocation, dropLocation } = event.detail;
      
      console.log('🎯 Global negotiation notification received:', event.detail);
      
      // Fetch load addresses dynamically if not provided
      let finalOriginAddress = pickupLocation || originAddress;
      let finalDestinationAddress = dropLocation || destinationAddress;
      
      if (!finalOriginAddress || !finalDestinationAddress) {
        try {
          console.log('🔍 Fetching load addresses for:', { loadId, bidId });
          const loadDetails = await fetchLoadAddresses(loadId, bidId);
          
          if (loadDetails) {
            finalOriginAddress = finalOriginAddress || loadDetails.originAddress;
            finalDestinationAddress = finalDestinationAddress || loadDetails.destinationAddress;
            console.log('✅ Fetched load addresses:', loadDetails);
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch load addresses:', error);
        }
      }
      
      toast.info(
        ({ closeToast }) => (
          <div className="space-y-2 p-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <div className="font-semibold text-gray-800">New Negotiation Message</div>
            </div>
            <div className="text-sm text-gray-600">
              <strong>Load:</strong> {loadId || bidId}
            </div>
            <div className="text-sm text-gray-600">
              <strong>From:</strong> {senderName || 'Shipper'}
            </div>
            {finalOriginAddress && (
              <div className="text-sm text-gray-600">
                <strong>Pickup:</strong> {finalOriginAddress}
              </div>
            )}
            {finalDestinationAddress && (
              <div className="text-sm text-gray-600">
                <strong>Drop:</strong> {finalDestinationAddress}
              </div>
            )}
            {rate && (
              <div className="text-sm font-medium text-green-600">
                <strong>Rate:</strong> ${rate.toLocaleString()}
              </div>
            )}
            <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
              {message?.substring(0, 60)}{message?.length > 60 ? '...' : ''}
            </div>
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => {
                  closeToast?.();
                  navigate("/RateApproved", { 
                    state: { 
                      openNegotiationModal: true,
                      bidId: bidId,
                      loadId: loadId 
                    } 
                  });
                }}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors duration-200"
              >
                View Negotiation
              </button>
            </div>
          </div>
        ),
        { 
          autoClose: 10000,
          closeButton: true,
          position: "top-right"
        }
      );
    };

    // Listen for modal open events
    const handleOpenNegotiationModal = (event) => {
      const { bidId, loadId } = event.detail;
      navigate("/RateApproved", { 
        state: { 
          openNegotiationModal: true,
          bidId: bidId,
          loadId: loadId 
        } 
      });
    };

    // Initialize socket service
    initializeGlobalSocket();

    // Add event listeners
    window.addEventListener('NEGOTIATION_MESSAGE_RECEIVED', handleNegotiationEvent);
    window.addEventListener('OPEN_NEGOTIATION_MODAL', handleOpenNegotiationModal);

    // Start global polling service when component mounts
    const userInfo = globalNegotiationService.getCurrentUser();
    if (userInfo) {
      console.log('🚀 Starting global negotiation polling service...');
      globalNegotiationService.startPolling(60000); // Poll every 60 seconds (reduced frequency to prevent 429 errors)
    }

    return () => {
      window.removeEventListener('NEGOTIATION_MESSAGE_RECEIVED', handleNegotiationEvent);
      window.removeEventListener('OPEN_NEGOTIATION_MODAL', handleOpenNegotiationModal);
      // Stop polling when component unmounts
      globalNegotiationService.stopPolling();
      // Disconnect global socket service
      globalNegotiationSocketService.disconnect();
    };
  }, [navigate]);

  return null;
}

// Utility function to get authentication token
const getAuthToken = () => {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
};

// Utility function to get user data
const getUserData = () => {
  const userString = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!userString) return null;
  
  try {
    return JSON.parse(userString);
  } catch (error) {
    console.error("Error parsing user data:", error);
    return null;
  }
};

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [userData, setUserData] = useState(null);

  // Check authentication and terms acceptance on mount
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const token = getAuthToken();
        const user = getUserData();

        if (token && user) {
          // Check if terms need to be accepted
          if (user.termsAccepted === false || user.termsAccepted === undefined) {
            setShowTerms(true);
            setUserData(user);
            setIsAuthenticated(false);
          } else {
            setIsAuthenticated(true);
            setUserData(user);
          }
        } else {
          setIsAuthenticated(false);
          setUserData(null);
        }
      } catch (error) {
        console.error("Error checking authentication status:", error);
        setIsAuthenticated(false);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Initialize shared socket service when user is authenticated
  // This ensures the socket is ALWAYS connected when user is logged in
  useEffect(() => {
    if (userData?.empId && isAuthenticated) {
      console.log('🚀 App.jsx: Ensuring shared socket service is connected for user:', userData.empId);
      
      // Get existing socket or initialize if needed
      let socket = sharedSocketService.getSocket();
      
      if (!socket || !socket.connected) {
        console.log('⏳ App.jsx: Socket not connected, initializing...');
        socket = sharedSocketService.initialize(userData.empId);
      } else {
        console.log('✅ App.jsx: Socket already connected:', socket.id);
      }
      
      // Socket.io handles reconnection automatically - no need for manual monitoring
    } else if (!isAuthenticated) {
      // Disconnect socket when user logs out
      console.log('🧹 App.jsx: User logged out, disconnecting shared socket');
      sharedSocketService.disconnect();
    }
  }, [userData?.empId, isAuthenticated]);

  // Handle terms acceptance
  const handleTermsAccepted = useCallback(() => {
    try {
      setShowTerms(false);
      setIsAuthenticated(true);
      
      // Update user data with terms acceptance
      const currentUser = getUserData();
      if (currentUser) {
        const updatedUser = { 
          ...currentUser, 
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString()
        };
        
        // Update both storage locations
        const userString = JSON.stringify(updatedUser);
        sessionStorage.setItem('user', userString);
        localStorage.setItem('user', userString);
        
        setUserData(updatedUser);
      }
    } catch (error) {
      console.error("Error accepting terms:", error);
      toast.error("Failed to accept terms and conditions. Please try again.");
    }
  }, []);

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <OnlineStatusProvider>
        <UnreadCountProvider>
          <ChatMessageProvider>
            {/* Global Components */}
            <GlobalAssignmentNotification />
            <GlobalNegotiationNotification />
            <NotificationHandler />
            <ChatMessagePopup />
        {/* {import.meta.env.DEV && <TestChatPopup />} */}
        {/* {import.meta.env.DEV && <ChatSystemStatus />} */}
        {/* {import.meta.env.DEV && <SocketTest />} */}
        {/* {import.meta.env.DEV && <NegotiationTestButton />} */}
        {/* {import.meta.env.DEV && <NegotiationSocketTgfhfgdhfghfgester />} */}

      {/* Payment Notification Popup - Only shows for Finance employees */}
      {/* Always render - component handles user check internally for all pages */}
      <PaymentNotificationPopup
        user={userData ? {
          empId: userData.empId || userData.employeeId,
          department: typeof userData.department === 'string' 
            ? userData.department 
            : userData.department?.name || '',
        } : null}
        onNotificationClick={(notification) => {
          // Navigate to DO details page
          navigate(`/DODetails`, { 
            state: { doId: notification.doId } 
          });
        }}
      />
      
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Routes */}

      <Routes>
        {/* Public Routes */}

        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={
            <Login 
              setIsAuthenticated={setIsAuthenticated} 
              setUserData={setUserData}
            />
          } 
        />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="dashboard" element={<RoleBasedDashboard />} />
          <Route path="live-tracker" element={<ConsignmentTracker />} />
          <Route path="permissions" element={<UserPermission />} />
          <Route path="manage-users" element={<ManageUser />} />
          <Route path="load-board" element={<LoadBoard />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="DailyTask" element={<CallDashboard />} />
          <Route path="call-dashboard" element={<UserCallDashboard />} />
          <Route path="Fleet" element={<FleetTable />} />
          <Route path="analytics" element={<AnalyticsReport />} />
          <Route path="Chat" element={<ChatPage />} />
          <Route path="Inbox" element={<Inbox />} />
          <Route path="AgentRevenueStatistics" element={<AgentRevenueStatistics />} />
          <Route path="EmployeeHygiene" element={<EmployeeHygiene />} />
          <Route path="ShippersLDocuments" element={<ShippersLDocuments />} />
          <Route path="PayrollPage" element={<PayrollPage />} />
          <Route path="ShiperLoadData" element={<ShiperLoadData />} />
          <Route path="HrDocumentsVerification" element={<HrDocumentsVerification />} />
          <Route path="Attendanceleave" element={<Attendanceleave />} />
          <Route path="TLTeams" element={<TLTeams />} />
          <Route path="TruckerDocuments" element={<TruckerDocuments />} />
          <Route path="HREmployeeHygine" element={<HREmployeeHygine />} />
          <Route path="ManagerShippersLDocuments" element={<ManagerShippersLDocuments />} />
          <Route path="TruckerLDocuments" element={<TruckerLDocuments />} />
          <Route path="RateRequest" element={<RateRequest />} />
          <Route path="RateApproved" element={<RateApproved />} />
          <Route path="ManagerRateApproval" element={<ManagerPendingBids />} />
          <Route path="Loads" element={<Loads />} />
          <Route path="CarrierApproval" element={<CarrierApproval />} />
          <Route path="HrCreateTask" element={<HrCreateTask />} />
          <Route path="LeaveApproval" element={<LeaveApproval />} />
          <Route path="delivery-order" element={<DeliveryOrder />} />
          <Route path="do-report" element={<DOReport />} />
          <Route path="team-rating" element={<TeamRating />} />
          <Route path="daily-follow-up" element={<DailyFollowUp />} />
          <Route path="AddCustomer" element={<AddCustomer />} />
          <Route path="AssignAgent" element={<AssignAgent />} />
          <Route path="CarrierDocs" element={<CarrierDocs />} />
          <Route path="DODetails" element={<DoDetails />} />
          <Route path="candidate-shortlist" element={<CandidateShortlist />} />
          <Route path="target-reports" element={<TargetReports />} />
          <Route path="Consignment" element={<Consignment />} />
          <Route path="CustomerLoads" element={<CustomerLoads />} />
          <Route path="DailyRateRequest" element={<DailyRateRequest />} />
          <Route path="OfficeInventory" element={<OfficeInventory />} />
          <Route path="dinner-status" element={<DinnerStatus />} />
          <Route path="TruckerReport" element={<TruckerReport />} />
          <Route path="AllLeads" element={<AllLeads />} />
          <Route path="TaskScheduling" element={<TaskScheduling />} />
          <Route path="CmtDeptReport" element={<CmtDeptReport />} />
          <Route path="SalesDeptReport" element={<SalesDeptReport />} />
          <Route path="Invoices" element={<Invoices />} />
          <Route path="CheckInvoice" element={<CheckInvoice />} />
          <Route path="AssignLoad" element={<AssignLoad />} />
          <Route path="finance-dashboard" element={<FinanceDashboard />} />
          <Route path="CallingReport" element={<CallingReport />} />
          <Route path="AddFleet" element={<AddFleet />} />
          <Route path="OfficeExpenses" element={<OfficeExpenses />} />
          <Route path="empleaves" element={<EmpLeaves />} />
          <Route path="addtruckerdriver" element={<AddTruckerDriver />} />
          <Route path="assigndo" element={<AssignDo />} />
          <Route path="companies" element={<CompanyList />} />
          <Route path="tally-management" element={<TallyManagement />} />
          <Route path="ladger" element={<LedgerManagement />} />
          <Route path="inventory-management" element={<InventoryManagement />} />
          <Route path="acountent-payable" element={<AcountentPayable />} />
          <Route path="empty-truck-location" element={<EmptyTruckLocation />} />
          <Route path="rate-request-report" element={<RateRequestReport />} />
          <Route path="trucker-empty-location" element={<TruckerEmptyLocation />} />
          <Route path="break-report" element={<BreakReport />} />
          <Route path="allcustomer" element={<AllCustomer />} />
          <Route path="trucker-reassign" element={<TruckerReassign />} />
          <Route path="followUpReport" element={<FollowUpReport />} />
          <Route path="RateRequestReport" element={<RateRequestReport />} />
          
          {/* QA (Quality Assurance) Routes */}
          <Route path="qa/dashboard" element={<QADashboard />} />
          <Route path="qa/pending-reviews" element={<PendingReviews />} />
          <Route path="qa/call-recording-review/:id" element={<CallRecordingReview />} />
          <Route path="qa/manager-review" element={<ManagerReview />} />
          <Route path="qa/review/:id" element={<CombinedReview />} />
          <Route path="qa/my-reviews" element={<EmployeeReviewHistory />} />
          <Route path="qa/call-report" element={<QACallReport />} />
          
          {/* Catch-all for nested protected routes */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Terms and Conditions Modal */}
      {showTerms && userData && (
        <TermsAndConditions 
          onAccept={handleTermsAccepted} 
          user={userData} 
        />
      )}
          </ChatMessageProvider>
        </UnreadCountProvider>
      </OnlineStatusProvider>
    </ErrorBoundary>
  );
}

export default App;