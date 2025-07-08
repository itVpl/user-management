// src/Layout/Layout.js
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Components/Sidebar";
import Topbar from "../TopBar";
const Layout = () => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-20 md:ml-64">
        <Topbar />
        <main className="p-4 pt-20"> {/* Adjust padding if needed */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
