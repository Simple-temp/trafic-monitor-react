import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import StorageIcon from "@mui/icons-material/Storage";
import { Link } from "react-router-dom"

const Navbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Network Monitor
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Link to="/livegraph" style={{color:"#fff"}}>
            <Button color="inherit" startIcon={<ShowChartIcon />}>
              Live Graph
            </Button>
          </Link>

          <Link to="/addDevice" style={{color:"#fff"}}>
            <Button color="inherit" startIcon={<AddCircleOutlineIcon />}>
              Add Device
            </Button>
          </Link>

          <Link to="/deviceList" style={{color:"#fff"}}>
            <Button color="inherit" startIcon={<StorageIcon />}>
              Device List
            </Button>
          </Link>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
