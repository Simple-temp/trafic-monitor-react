import React, { useState, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";

// Components
import HomePage from "./components/HomePage";
import LiveGraph from "./components/LiveGraph";
import DeviceAdd from "./components/DeviceAdd";
import DeviceList from "./components/DeviceList";
import PortList from "./components/PortList";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import BackboneList from "./components/BackboneList";
import Log from "./components/Log";
import BgpAlert from "./components/BgpAlert";
import SflowTraffic from "./components/SflowTraffic";
import UserList from "./components/UserList";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="backbonelist" element={<BackboneList />} />
            <Route path="livegraph" element={<LiveGraph />} />
            <Route path="addDevice" element={<DeviceAdd />} />
            <Route path="sflow" element={<SflowTraffic />} />
            
            {/* Target Routes */}
            <Route path="deviceList" element={<DeviceList />} />
            <Route path="portlist" element={<PortList />} />
            <Route path="log" element={<Log />} />
            <Route path="bgpalert" element={<BgpAlert />} />
            <Route path="useradd" element={<UserList />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation(); // This hooks into every route change
  
  // 1. Get user from localStorage
  const user = localStorage.getItem('user');
  const isNoc = user === 'noc';

  // 2. Define the exact paths to disable
  const restrictedPaths = [
    "/",
    "/deviceList", 
    "/portlist", 
    "/log", 
    "/bgpalert", 
    "/useradd"
  ];

  // 3. Check if the current route is in our restricted list
  // We use .toLowerCase() to prevent case-sensitivity issues
  const isRestrictedRoute = restrictedPaths.some(path => 
    location.pathname.toLowerCase().includes(path.toLowerCase())
  );

  const shouldDisable = isNoc && isRestrictedRoute;

  const sidebarWidth = isCollapsed ? "5%" : "15%";
  const contentWidth = isCollapsed ? "95%" : "85%";

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
      <Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} width={sidebarWidth} />
      
      <div 
        style={{ 
          ...styles.mainContent, 
          width: contentWidth,
          marginLeft: sidebarWidth,
          /* PERMANENT DISABLE LOGIC */
          pointerEvents: shouldDisable ? "none" : "auto",
          userSelect: shouldDisable ? "none" : "auto", // Prevents highlighting text
          filter: shouldDisable ? "grayscale(30%) brightness(95%)" : "none",
          cursor: shouldDisable ? "not-allowed" : "default"
        }}
      >
        {/* Visual Warning for NOC users on restricted pages */}
        {shouldDisable && (
          <div style={styles.lockOverlay}>
            View Only Mode (NOC Account)
          </div>
        )}
        
        <Outlet />
      </div>
    </div>
  );
};

const styles = {
  mainContent: {
    padding: "10px",
    backgroundColor: "#f5f5f5",
    height: "100vh",
    overflowY: "auto",
    transition: "all 0.3s ease-in-out",
    position: "relative"
  },
  lockOverlay: {
    position: "absolute",
    top: 10,
    right: 20,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    color: "red",
    padding: "5px 10px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
    zIndex: 1000,
    border: "1px solid red"
  }
};

export default App;