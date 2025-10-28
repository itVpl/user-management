import { useEffect, useState, useRef } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import API_CONFIG from "./config/api.js";

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
import Inbox from "./Components/AgentDashboard/Email.jsx";
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
import Loads from "./Components/CMT/Loads.jsx";
import CarrierApproval from "./Components/CMT/CarrierApproval.jsx";
import DeliveryOrder from "./Components/Sales/DeliveryOrder.jsx";
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
import TaskScheduling from "./Components/TaskScheduling/TaskScheduling.jsx";
import CmtDeptReport from "./Components/CMT/cmtDeptReport.jsx";
import SalesDeptReport from "./Components/Sales/salesDeptReport.jsx";
import Invoices from "./Components/Accountant/Invoices.jsx"
import CheckInvoice from "./Components/Sales/CheckInvoice.jsx"
import AssignLoad from "./Components/CMT-Manager/AssignLoad.jsx";
import FinanceDashboard from "./Components/Finance/FinanceDashboard.jsx";
import CallingReport from "./Pages/IddCallingReport.jsx";

import TermsAndConditions from "./Components/TermsAndConditions.jsx";

import AddFleet from "./Components/CMT-Manager/addFleet.jsx";





function GlobalRRListener() {
  const navigate = useNavigate();
  const prevIdsRef = useRef(new Set());

  // cross-tab listeners
  useEffect(() => {
    let bc;
    const onBC = (e) => {
      const msg = e?.data;
      if (msg?.type === "RR_NEW_ASSIGNMENT" && msg?.approval) {
        showGlobalToast(msg.approval);
      }
    };
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel("rr_events");
      bc.addEventListener("message", onBC);
    }

    const onStorage = (e) => {
      if (e.key === "rr_new_assignment" && e.newValue) {
        try {
          const approval = JSON.parse(e.newValue);
          showGlobalToast(approval);
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      bc?.removeEventListener("message", onBC);
      bc?.close?.();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // global polling (20s) so popup appears on any tab
  // useEffect(() => {
  //   let id;
  //   const poll = async () => {
  //     try {
  //       const token =
  //         localStorage.getItem("authToken") ||
  //         sessionStorage.getItem("authToken") ||
  //         localStorage.getItem("token") ||
  //         sessionStorage.getItem("token");
  //       if (!token) return;
        
  //       const headers = { 
  //         Authorization: `Bearer ${token}`,
  //         'Content-Type': 'application/json'
  //       };
        
  //       const res = await axios.get(
  //         `${API_CONFIG.BASE_URL}/api/v1/load-approval/pending`,
  //         { 
  //           headers,
  //           timeout: 10000 // 10 second timeout
  //         }
  //       );
  //       const approvals = res?.data?.data?.approvals || [];

  //       const current = new Set(
  //         approvals
  //           .filter(a => (a.overallStatus || a.status) === "pending")
  //           .map(a => a._id)
  //       );
  //       const prev = prevIdsRef.current || new Set();
  //       const newbies = [...current].filter(id => !prev.has(id));

  //       if (newbies.length) {
  //         newbies.forEach(id => {
  //           const approval = approvals.find(a => a._id === id);
  //           if (approval) showGlobalToast(approval);
  //         });
  //       }
  //       prevIdsRef.current = current;
  //     } catch (e) {
  //       // Only log errors that are not 403 Forbidden (permission issues)
  //       if (e.response?.status !== 403) {
  //         console.error("Polling error:", e);
  //       }
  //       // If it's a 403, the user might not have permission for this endpoint
  //       // or the token might be invalid - we'll silently skip this polling
  //     }
  //   };

  //   poll();
  //   id = setInterval(poll, 20000);
  //   return () => clearInterval(id);
  // }, []);

  function showGlobalToast(approval) {
    toast.info(
      ({ closeToast }) => (
        <div className="space-y-1">
          <div className="font-semibold">New load assigned</div>
          <div className="text-sm text-gray-700">
            {(approval?.loadId?.origin?.city ?? approval?.origin?.city ?? "—")}
            {" → "}
            {(approval?.loadId?.destination?.city ?? approval?.destination?.city ?? "—")}
            {" · "}Rate $
            {((approval?.loadId?.rate ?? approval?.rate) ?? 0).toLocaleString?.() ?? "0"}
          </div>
          <div className="mt-2">
            <button
              onClick={() => {
                closeToast?.();
                navigate("/RateRequest", { state: { openApprovalFromBroadcast: approval } });
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm"
            >
              View & Accept
            </button>
          </div>
        </div>
      ),
      { autoClose: 7000 }
    );
  }

  return null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const user = localStorage.getItem("user") || sessionStorage.getItem("user");
    
    if (token && user) {
      try {
        const userObj = JSON.parse(user);
        // Check if terms are accepted
        if (userObj.termsAccepted === false || userObj.termsAccepted === undefined) {
          setShowTerms(true);
          setUserData(userObj);
          setIsAuthenticated(false); // Don't authenticate until terms are accepted
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  // Handle terms acceptance
  const handleTermsAccepted = (termsData) => {
    setShowTerms(false);
    setIsAuthenticated(true);
    // Update user data in storage with terms acceptance
    if (userData) {
      const updatedUser = { ...userData, termsAccepted: true };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  if (loading) {
    return (
      <div className="p-10">
        Loading...
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {/* ✅ Routes ke bahar */}
      <GlobalRRListener />
      <ToastContainer position="top-right" newestOnTop />

      <Routes>
        {/* Public */}
        <Route path="/" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected */}
        <Route
          path="/"
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
          <Route path="/DailyTask" element={<CallDashboard />} />
          <Route path="/call-dashboard" element={<UserCallDashboard />} />
          <Route path="/Fleet" element={<FleetTable />} />
          <Route path="/analytics" element={<AnalyticsReport />} />
          <Route path="/Chat" element={<ChatPage />} />
          <Route path="/Inbox" element={<Inbox />} />
          <Route path="/AgentRevenueStatistics" element={<AgentRevenueStatistics />} />
          <Route path="/EmployeeHygiene" element={<EmployeeHygiene />} />
          <Route path="/ShippersLDocuments" element={<ShippersLDocuments />} />
          <Route path="/PayrollPage" element={<PayrollPage />} />
          <Route path="/ShiperLoadData" element={<ShiperLoadData />} />
          <Route path="/HrDocumentsVerification" element={<HrDocumentsVerification />} />
          <Route path="/Attendanceleave" element={<Attendanceleave />} />
          <Route path="/TLTeams" element={<TLTeams />} />
          <Route path="/TruckerDocuments" element={<TruckerDocuments />} />
          <Route path="/HREmployeeHygine" element={<HREmployeeHygine />} />
          <Route path="/ManagerShippersLDocuments" element={<ManagerShippersLDocuments />} />
          <Route path="/TruckerLDocuments" element={<TruckerLDocuments />} />
          <Route path="/RateRequest" element={<RateRequest />} />
          <Route path="/RateApproved" element={<RateApproved />} />
          <Route path="/Loads" element={<Loads />} />
          <Route path="/CarrierApproval" element={<CarrierApproval />} />
          <Route path="/HrCreateTask" element={<HrCreateTask />} />
          <Route path="/LeaveApproval" element={<LeaveApproval />} />
          <Route path="delivery-order" element={<DeliveryOrder />} />
          <Route path="/daily-follow-up" element={<DailyFollowUp />} />
          <Route path="/AddCustomer" element={<AddCustomer />} />
          <Route path="/AssignAgent" element={<AssignAgent />} />
          <Route path="/CarrierDocs" element={<CarrierDocs />} />
          <Route path="/DODetails" element={<DoDetails />} />
          <Route path="/candidate-shortlist" element={<CandidateShortlist />} />
          <Route path="/target-reports" element={<TargetReports />} />
          <Route path="/Consignment" element={<Consignment />} />
          <Route path="/CustomerLoads" element={<CustomerLoads />} />
          <Route path="/DailyRateRequest" element={<DailyRateRequest />} />
          <Route path="/OfficeInventory" element={<OfficeInventory />} />
          <Route path="/dinner-status" element={<DinnerStatus />} />
          <Route path="/TruckerReport" element={<TruckerReport />} />
          <Route path="/TaskScheduling" element={<TaskScheduling />} />
          <Route path="/CmtDeptReport" element={<CmtDeptReport />} />
          <Route path="/SalesDeptReport" element={<SalesDeptReport />} />
          <Route path="/Invoices" element={<Invoices />} />
          <Route path="/CheckInvoice" element={<CheckInvoice />} />
          <Route path="/AssignLoad" element={<AssignLoad />} />
          <Route path="/finance-dashboard" element={<FinanceDashboard />} />
          <Route path="/CallingReport" element={<CallingReport />} />
          <Route path="/AddFleet" element={<AddFleet />} />

        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Terms and Conditions Modal */}
      {showTerms && userData && (
        <TermsAndConditions 
          onAccept={handleTermsAccepted} 
          user={userData} 
        />
      )}
    </>
  );
}

export default App;
