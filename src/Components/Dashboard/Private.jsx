import { Navigate } from "react-router-dom";

export default function PrivateRoute({ isAuthenticated, children }) {
  console.log("PrivateRoute - isAuthenticated:", isAuthenticated);
  
  if (!isAuthenticated) {
    console.log("Redirecting to login - not authenticated");
    return <Navigate to="/" />;
  }
  
  console.log("Rendering protected route");
  return children;
}
