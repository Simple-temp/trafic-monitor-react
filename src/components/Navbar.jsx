import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Box, Typography, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Divider, IconButton,
  Drawer, useMediaQuery, Tooltip
} from "@mui/material";
import { keyframes } from "@mui/system";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HomeIcon from "@mui/icons-material/Home";
import RouterIcon from "@mui/icons-material/Router";
import StorageIcon from "@mui/icons-material/Storage";
import CampaignIcon from "@mui/icons-material/Campaign";
import HistoryIcon from "@mui/icons-material/History";
import LOGO from "../assets/logo.jpeg";

// 1. Glowing Animation
const glowAnimation = keyframes`
  0% { filter: drop-shadow(0 0 2px #8b0000); }
  50% { filter: drop-shadow(0 0 12px #ff3333); }
  100% { filter: drop-shadow(0 0 2px #8b0000); }
`;

const Navbar = ({ isCollapsed, setIsCollapsed, width }) => {
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width:1000px)");
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { text: "Home", icon: <HomeIcon />, path: "/" },
    { text: "Port List", icon: <RouterIcon />, path: "/portlist" },
    { text: "Device List", icon: <StorageIcon />, path: "/devicelist" },
    { text: "BGP Alert", icon: <CampaignIcon />, path: "/bgpalert" },
    { text: "Logs", icon: <HistoryIcon />, path: "/log" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.reload();
  };

  const NavContent = (
    <Box sx={{ 
      height: "100%", display: "flex", flexDirection: "column", 
      backgroundColor: "#000", color: "#fff", overflow: "hidden" 
    }}>
      {/* Header with Glowing Logo */}
      <Box sx={{ p: isCollapsed ? 1 : 3, textAlign: "center", position: "relative" }}>
        <Box sx={{ animation: `${glowAnimation} 2.5s infinite` }}>
          <img 
            src={LOGO} 
            alt="Logo" 
            style={{ 
              width: isCollapsed ? "40px" : "120px", 
              transition: "width 0.3s ease" 
            }} 
          />
        </Box>
        
        {!isMobile && (
          <IconButton 
            onClick={() => setIsCollapsed(!isCollapsed)}
            sx={{ color: "#fff", mt: 1 }}
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Box>

      <Divider sx={{ backgroundColor: "#333" }} />

      {/* Links */}
      <List sx={{ flexGrow: 1, px: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Tooltip key={item.text} title={isCollapsed ? item.text : ""} placement="right">
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  sx={{
                    borderRadius: "8px",
                    justifyContent: isCollapsed ? "center" : "initial",
                    backgroundColor: isActive ? "rgba(139, 0, 0, 0.2)" : "transparent",
                    borderLeft: isActive ? "4px solid #8b0000" : "4px solid transparent",
                    "&:hover": { backgroundColor: "darkred" }
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: isActive ? "#ff3333" : "#777", 
                    minWidth: isCollapsed ? 0 : 40,
                    justifyContent: "center"
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  {!isCollapsed && <ListItemText primary={item.text} />}
                </ListItemButton>
              </ListItem>
            </Tooltip>
          );
        })}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2, textAlign: "center" }}>
        <button onClick={handleLogout} style={navStyles.logoutBtn}>
          {isCollapsed ? "?" : "Logout"}
        </button>
        {!isCollapsed && (
          <Typography variant="caption" sx={{ color: "#444", display: "block", mt: 1 }}>
            © 2026 | <b>Aziz</b>
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <>
          <Box sx={{ height: "60px", background: "#000", display: "flex", alignItems: "center", px: 2, position: "fixed", width: "100%", zIndex: 10 }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ color: "#fff" }}><MenuIcon /></IconButton>
          </Box>
          <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
            <Box sx={{ width: "250px", height: "100%" }}>{NavContent}</Box>
          </Drawer>
        </>
      ) : (
        <Box sx={{ 
          width: width, 
          position: "fixed", 
          height: "100vh", 
          transition: "width 0.3s ease-in-out", 
          zIndex: 100 
        }}>
          {NavContent}
        </Box>
      )}
    </>
  );
};

const navStyles = {
  logoutBtn: {
    padding: "8px",
    width: "100%",
    backgroundColor: "#eb2d07",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  }
};

export default Navbar;