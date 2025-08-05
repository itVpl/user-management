import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Login from "./Pages/Auth/Login/Login";
import Signup from "./Pages/Auth/Login/Signup";
import Dashboard from "./Components/Dashboard/Dashboard";
import ConsignmentTracker from "./Components/Dashboard/LiveTracker1";
import Layout from "./Layout/Layout";
import UserPermission from "./Components/Dashboard/UserPermission";
import PrivateRoute from "./Components/Dashboard/Private.jsx";
import ManageUser from "./Components/Dashboard/ManageUser.jsx";
import LoadBoard from "./Components/Dashboard/LoadBoard.jsx";
import ProfilePage from "./Pages/ProfilePage.jsx";
import ManageModule from "./Components/Dashboard/ManageModule.jsx";
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
// import HRDashboard from "./Components/HRDashboard/HrDashboard.jsx";
import RoleBasedDashboard from "./Components/RolebasedLogin.jsx";
import ShiperLoadData from "./Components/AgentDashboard/ShiperLoadData.jsx";
import HrDocumentsVerification from "./Components/HRDashboard/DocumentVerifcation.jsx";
import Attendanceleave from "./Components/HRDashboard/Attendance-leave.jsx";
import TLTeams from "./Components/TLDashboard/Team.jsx";
import TruckerDocuments from "./Components/CMT/TruckerDocuments.jsx";
import HREmployeeHygine from "./Components/HRDashboard/HrEmployeeHygine.jsx";
import ManagerShippersLDocuments from "./Components/Agent-Manager/Manager-Shipper-L-Documents.jsx";
import TruckerDocumentsPage from "./Components/CMT-Manager/TruckerDocumetCMT-Manager.jsx";
import TruckerLDocuments from "./Components/CMT-Manager/TruckerDocumetCMT-Manager.jsx";
import HrCreateTask from "./Components/HRDashboard/HrCreateTask.jsx";
import RateRequest from "./Components/CMT-Manager/RateRequest.jsx";

import RateApproved from "./Components/CMT/RateApproved.jsx";
import Loads from "./Components/CMT/Loads.jsx";
import CarrierApproval from "./Components/CMT/CarrierApproval.jsx";


import DeliveryOrder from "./Components/Sales/DeliveryOrder.jsx";
import AddCustomer from "./Components/Sales/AddCustomer.jsx";
import AssignAgent from "./Components/Dashboard/AssignAgent.jsx";
import CarrierDocs from "./Components/CMT/CarrierDocs.jsx";
import DoDetails from "./Components/CMT/DODetails.jsx";


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const user = localStorage.getItem("user") || sessionStorage.getItem("user");
    console.log("Auth token found:", !!token);
    console.log("User data found:", !!user);
    setIsAuthenticated(!!token && !!user);
    setLoading(false);
  }, []);

  if (loading) return <div className="p-10">Loading... <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>  </div>;

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={<Login setIsAuthenticated={setIsAuthenticated} />}
      />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <Layout />
          </PrivateRoute>
        }
      >
        {/* <Route path="dashboard" element={<HRDashboard />} /> */}
        <Route path="dashboard" element={<RoleBasedDashboard />} />
        <Route path="live-tracker" element={<ConsignmentTracker />} />
        <Route path="permissions" element={<UserPermission />} />
        <Route path="manage-users" element={<ManageUser />} />
        <Route path="load-board" element={<LoadBoard />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="modules" element={<ManageModule />} />
        <Route path="/profile" element={<ProfilePage />} />
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
         <Route path="/TLTeams" element={<TLTeams/>} />
        <Route path="/TruckerDocuments" element={<TruckerDocuments/>} />
        <Route path="/HREmployeeHygine" element={<HREmployeeHygine/>} />
        <Route path="/ManagerShippersLDocuments" element={<ManagerShippersLDocuments/>} />
        <Route path="/TruckerLDocuments" element={<TruckerLDocuments/>} />
        <Route path="/RateRequest" element={<RateRequest/>} />
        <Route path="/RateApproved" element={<RateApproved/>} />
        <Route path="/Loads" element={<Loads/>} />
        <Route path="/CarrierApproval" element={<CarrierApproval/>} />
        <Route path="/HrCreateTask" element={<HrCreateTask/>} />
        <Route path="delivery-order" element={<DeliveryOrder/>} />
        <Route path="/AddCustomer" element={<AddCustomer/>}/>
        <Route path="/AssignAgent" element={<AssignAgent/>}/>
        <Route path="/CarrierDocs" element={<CarrierDocs/>}/>
        <Route path="/DODetails" element={<DoDetails/>}/>

        

      </Route>
{/* 
      Optional: Catch-all route */} 
    <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
