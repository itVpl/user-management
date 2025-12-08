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
        
        // Check department - handle both string and object formats
        const department = typeof userData?.department === 'string' 
          ? userData.department 
          : userData?.department?.name || '';
        
        const departmentLower = department.toLowerCase();
        const isCMT = departmentLower === 'cmt' || departmentLower.includes('cmt');

        setIsCMTUser(isCMT);
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

  // Debug logs
  useEffect(() => {
    if (isCMTUser) {

    }
  }, [isCMTUser, user, newDOAssignment, newAssignment]);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-20 md:ml-64">
        <Topbar />
        <main className="p-4 pt-20"> {/* Adjust padding if needed */}
          <Outlet />
        </main>
      </div>
      {/* DO Assignment Popup for CMT users */}
      {isCMTUser && newDOAssignment && (
        <DOAssignmentPopup 
          assignment={newDOAssignment} 
          onClose={handleCloseDOPopup}
          hasBothPopups={!!(newDOAssignment && newAssignment)}
        />
      )}
      
      {/* Load Assignment Popup - Show if assignment exists and user is CMT */}
      {isCMTUser && newAssignment && (
        <LoadAssignmentPopup 
          assignment={newAssignment} 
          onClose={handleCloseLoadPopup}
          hasBothPopups={!!(newDOAssignment && newAssignment)}
        />
      )}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <>
          {newAssignment && !isCMTUser && (
            <div className="fixed top-4 left-4 bg-yellow-500 text-black p-2 rounded z-[99999] text-xs max-w-xs">
              ⚠️ Debug: Assignment found but isCMTUser={String(isCMTUser)}. 
              Showing popup anyway in dev mode.
            </div>
          )}
          {isCMTUser && newAssignment && (
            <div className="fixed top-4 left-4 bg-green-500 text-white p-2 rounded z-[99999] text-xs">
              ✅ Load Assignment Popup should be visible
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Layout;
