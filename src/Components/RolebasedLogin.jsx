import React from "react";
import HRDashboard from "./HRDashboard/HrDashboard";
import Dashboard from "./Dashboard/Dashboard";
import AgentDashboard from "./AgentDashboard/AgentDashboard";
import { Navigate } from "react-router-dom";

const RoleBasedDashboard = () => {
  const userData = sessionStorage.getItem("user");

  if (!userData) return <Navigate to="/" />;

  const role = JSON.parse(userData)?.role;

  switch (role) {
    case "superadmin":
      return <Dashboard />;
    case "admin":
        return <HRDashboard />;
    // case "employee":
     
 default:
    return <AgentDashboard />;
  }
};

export default RoleBasedDashboard;
