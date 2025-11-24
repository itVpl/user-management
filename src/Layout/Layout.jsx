// src/Layout/Layout.js
import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Components/Sidebar";
import Topbar from "../TopBar";
import DOAssignmentPopup from "../Components/CMT/DOAssignmentPopup";
import LoadAssignmentPopup from "../Components/CMT/LoadAssignmentPopup";
import { useDOAssignmentNotification } from "../hooks/useDOAssignmentNotification";
import { useAssignmentNotification } from "../hooks/useAssignmentNotification";

const Layout = () => {
  const [user, setUser] = useState(null);
  const [isCMTUser, setIsCMTUser] = useState(false);
  
  // Get user data and check if CMT user
  useEffect(() => {
    const userString = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userString) {
      try {
        const userData = JSON.parse(userString);
        setUser(userData);
        const department = userData?.department || userData?.department?.name || '';
        setIsCMTUser(department.toLowerCase() === 'cmt');
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // Use both assignment notification hooks only for CMT users
  const { newDOAssignment, clearNotification: clearDONotification } = useDOAssignmentNotification(
    user?.empId || user?.employeeId || null,
    isCMTUser
  );

  const { newAssignment, clearNotification: clearLoadNotification } = useAssignmentNotification(
    user?.empId || user?.employeeId || null,
    isCMTUser
  );

  const handleCloseDOPopup = () => {
    clearDONotification();
  };

  const handleCloseLoadPopup = () => {
    clearLoadNotification();
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-20 md:ml-64">
        <Topbar />
        <main className="p-4 pt-20"> {/* Adjust padding if needed */}
          <Outlet />
        </main>
      </div>
      {/* DO Assignment Popup for CMT users - positioned on right */}
      {isCMTUser && newDOAssignment && (
        <DOAssignmentPopup 
          assignment={newDOAssignment} 
          onClose={handleCloseDOPopup}
        />
      )}
      
      {/* Load Assignment Popup for CMT users - positioned on right */}
      {isCMTUser && newAssignment && (
        <LoadAssignmentPopup 
          assignment={newAssignment} 
          onClose={handleCloseLoadPopup}
        />
      )}
    </div>
  );
};

export default Layout;
