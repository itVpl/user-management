import { Navigate } from "react-router-dom";

export default function VPL100Redirect() {
  const userString = localStorage.getItem("user") || sessionStorage.getItem("user");
  
  if (userString) {
    try {
      const user = JSON.parse(userString);
      const empId = user?.empId || user?.employeeId || '';
      
      // Redirect VPL100 to docs-upload, others to dashboard
      if (empId === 'VPL100') {
        return <Navigate to="/docs-upload" replace />;
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }
  
  return <Navigate to="/dashboard" replace />;
}

