// Navbar component: Left 15%, dark black background, logo, menu items with icons, white text, hover dark red, bottom copyright
import React from "react";
import { Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RouterIcon from "@mui/icons-material/Router"; // Appropriate icon for Port List
import StorageIcon from "@mui/icons-material/Storage";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <Box
      sx={{
        width: '15%',
        backgroundColor: '#000', // Dark black background
        color: '#fff', // White text
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100vh',
        padding: '20px',
        position: "fixed", // Keeps sidebar fixed on the left
        top: 0,
        left: 0,
      }}
    >
      {/* Logo at the top */}
      <Box>
        <Typography variant="h5" sx={{ marginBottom: '20px', textAlign: 'center' }}>
          Network Monitor {/* Replace with actual logo if needed */}
        </Typography>
        
        {/* Menu items */}
        <List>
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/livegraph"
              sx={{
                '&:hover': { backgroundColor: 'darkred' }, // Hover effect dark red
              }}
            >
              <ListItemIcon sx={{ color: '#fff' }}>
                <ShowChartIcon />
              </ListItemIcon>
              <ListItemText primary="Live Graph" />
            </ListItemButton>
          </ListItem>
{/*           
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/addDevice"
              sx={{
                '&:hover': { backgroundColor: 'darkred' },
              }}
            >
              <ListItemIcon sx={{ color: '#fff' }}>
                <AddCircleOutlineIcon />
              </ListItemIcon>
              <ListItemText primary="Add Device" />
            </ListItemButton>
          </ListItem> */}
          
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/portlist"
              sx={{
                '&:hover': { backgroundColor: 'darkred' },
              }}
            >
              <ListItemIcon sx={{ color: '#fff' }}>
                <RouterIcon /> {/* Changed to RouterIcon for Port List */}
              </ListItemIcon>
              <ListItemText primary="Port List" />
            </ListItemButton>
          </ListItem>
          
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/deviceList"
              sx={{
                '&:hover': { backgroundColor: 'darkred' },
              }}
            >
              <ListItemIcon sx={{ color: '#fff' }}>
                <StorageIcon />
              </ListItemIcon>
              <ListItemText primary="Device List" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
      
      {/* Copyright at the bottom */}
      <Typography variant="body2" sx={{ textAlign: 'center', marginTop: 'auto' }}>
        ©Made By Md Abdul Aziz
      </Typography>
    </Box>
  );
};

export default Navbar;