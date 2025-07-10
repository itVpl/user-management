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

const RoleBasedDashboard = () => {
  const userData = sessionStorage.getItem("user");

  if (!userData) return <Navigate to="/" />;

  const role = JSON.parse(userData)?.role;

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
          <HRDashboard />
        </>
      );

    default:
      return <AgentDashboard />;
  }
};

export default RoleBasedDashboard;
