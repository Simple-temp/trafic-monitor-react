import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./components/HomePage";
import LiveGraph from "./components/LiveGraph";
import DeviceAdd from "./components/DeviceAdd";
import DeviceList from "./components/DeviceList";
import PortList from "./components/PortList";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { Outlet } from "react-router-dom";
import BackboneList from "./components/BackboneList";
import { Button } from "@mui/material";
import Log from "./components/Log";
import BgpAlert from "./components/BgpAlert";
import SflowTraffic from "./components/SflowTraffic";
import {
  Box,
} from "@mui/material";
import React, { useState } from "react";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="backbonelist" element={<BackboneList />} />
            <Route path="livegraph" element={<LiveGraph />} />
            <Route path="addDevice" element={<DeviceAdd />} />
            <Route path="deviceList" element={<DeviceList />} />
            <Route path="portlist" element={<PortList />} />
            <Route path="log" element={<Log />} />
            <Route path="bgpalert" element={<BgpAlert />} />
            <Route path="sflow" element={<SflowTraffic />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Inside App.js, update the Layout component and styles:

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Dynamic widths
  const sidebarWidth = isCollapsed ? "5%" : "15%";
  const contentWidth = isCollapsed ? "95%" : "85%";

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
      {/* Navbar receives state and toggle function */}
      <Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} width={sidebarWidth} />
      
      <div 
        style={{ 
          ...styles.mainContent, 
          width: contentWidth,
          marginLeft: sidebarWidth, // Pushes content exactly by sidebar width
        }}
      >
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
    transition: "all 0.3s ease-in-out", // Smooth transition when sidebar toggles
  },
};

export default App;