// HomePage component: Now can be used as the default dashboard content (customize as needed)
import React from "react";
import { Box, Typography } from "@mui/material";

const HomePage = () => {
  return (
    <Box>
      <Typography variant="h4">Welcome to Network Monitor Dashboard</Typography>
      {/* Add dashboard content here, e.g., charts, stats, etc. */}
    </Box>
  );
};

export default HomePage;

// Note: The original Navbar component is no longer needed since the sidebar replaces it.
// Ensure all components (LiveGraph, DeviceAdd, etc.) are properly implemented.