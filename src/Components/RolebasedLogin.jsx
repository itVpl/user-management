import React from "react";
import HRDashboard from "./HRDashboard/HrDashboard";
import Dashboard from "./Dashboard/Dashboard";
import AgentDashboard from "./AgentDashboard/AgentDashboard";
import { Navigate } from "react-router-dom";
import ManagerShipperLDocuments from "./Agent-Manager/Manager-Shipper-L-Documents";
import TruckerDocumentsPage from "./CMT-Manager/TruckerDocumetCMT-Manager";
import ShippersLDocuments from "./AgentDashboard/Shipper-L-Document";
import TLDashboard from "./TLDashboard/TLDashboard";
import CMTDashboard from "./CMT/CMTDashbaord";
import CMTMDashboard from "./CMT-Manager/CMT-MDashboard";
import AccountantDashboard from "./Accountant/AccountantDashboard";
import FinanceDashboard from "./Finance/FinanceDashboard";

const RoleBasedDashboard = () => {
  const userData = sessionStorage.getItem("user");

  if (!userData) {
    return <Navigate to="/" />;
  }

  const user = JSON.parse(userData);
  const role = user?.role;
  const department = user?.department;

  // Debug logging
  console.log("User department:", department);
  console.log("User role:", role);

  // Temporary fallback for testing
  if (!role && !department) {
    return <AgentDashboard />;
  }

  // Check department first, then role
  if (department === "HR" || department === "hr") {
    return (
      <>
        <HRDashboard />
      </>
    );
  }

  // Sales department should show AgentDashboard
  if (department === "Sales" || department === "sales") {
    console.log("Sales department detected, showing AgentDashboard");
    return <AgentDashboard />;
  }

  // Finance department should show FinanceDashboard
  if (department === "Finance" || department === "finance") {
    console.log("Finance department detected, showing FinanceDashboard");
    return <FinanceDashboard />;
  }

  switch (role) {
    case "superadmin":
      return (
        <>
          <Dashboard />
        </>
      );

    case "admin":
      return (
        <>
          <TLDashboard/>
        </>
      );



    default:
      console.log("Rendering AgentDashboard for role:", role);
      return <AgentDashboard />;
  }
};

export default RoleBasedDashboard;
