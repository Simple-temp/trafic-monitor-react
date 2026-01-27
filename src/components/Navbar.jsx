import React from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import RouterIcon from "@mui/icons-material/Router";
import StorageIcon from "@mui/icons-material/Storage";
import HomeIcon from "@mui/icons-material/Home";

const Navbar = () => {
  const location = useLocation();

  const menuItems = [
    { text: "Home", icon: <HomeIcon />, path: "/" },
    //{ text: "Live Graph", icon: <ShowChartIcon />, path: "/livegraph" },
    { text: "Port List", icon: <RouterIcon />, path: "/portlist" },
    { text: "Device List", icon: <StorageIcon />, path: "/devicelist" },
  ];

  return (
    <Box
      sx={{
        width: "15%",
        minWidth: "220px", // Prevents sidebar from getting too narrow
        backgroundColor: "#0a0a0a", // Deep professional black
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        borderRight: "1px solid #222", // Subtle separation
        zIndex: 1200,
      }}
    >
      {/* Branding Section */}
      <Box sx={{ p: 4, textAlign: "center" }}>
        {/* Placeholder for actual Logo image */}
        <Box
          component="div"
          sx={{
            width: 50,
            height: 50,
            backgroundColor: "#8b0000",
            borderRadius: "12px",
            margin: "0 auto 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            fontWeight: "bold",
            boxShadow: "0 0 15px rgba(139, 0, 0, 0.4)",
          }}
        >
          N
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            fontSize: "1.1rem",
            color: "#fff",
          }}
        >
          NMS TOOL
        </Typography>
      </Box>

      <Divider sx={{ backgroundColor: "#222", mx: 2 }} />

      {/* Navigation Links */}
      <Box sx={{ mt: 2, flexGrow: 1 }}>
        <List sx={{ px: 1.5 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  sx={{
                    borderRadius: "8px",
                    transition: "all 0.3s ease",
                    backgroundColor: isActive ? "rgba(139, 0, 0, 0.15)" : "transparent",
                    borderLeft: isActive ? "4px solid #8b0000" : "4px solid transparent",
                    "&:hover": {
                      backgroundColor: "darkred",
                      transform: "translateX(5px)", // Subtle slide animation
                      "& .MuiListItemIcon-root": { color: "#fff" },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? "#8b0000" : "#777",
                      minWidth: "40px",
                      transition: "color 0.3s ease",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: "0.95rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#fff" : "#bbb",
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer / Copyright */}
      <Box sx={{ p: 3, backgroundColor: "#000" }}>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            color: "#555",
            fontSize: "0.7rem",
            letterSpacing: "0.5px",
          }}
        >
          © 2026 | Designed By
          <Typography
            variant="caption"
            sx={{ display: "block", color: "#8b0000", fontWeight: "bold" }}
          >
            Md Abdul Aziz
          </Typography>
        </Typography>
      </Box>
    </Box>
  );
};

export default Navbar;