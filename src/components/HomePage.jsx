import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import Navbar from "./Navbar";

const HomePage = () => {
  return (
    <>
      <Navbar />

      {/* <Box sx={{ padding: 4 }}>
        <Paper sx={{ padding: 4 }}>
          <Typography variant="h4" gutterBottom>
            Network Bandwidth Monitoring System
          </Typography>

          <Typography variant="body1" paragraph>
            This application is designed to monitor network devices such as
            switches, routers, and firewalls using the SNMP protocol. It provides
            real-time-like bandwidth visualization with a 5-second polling
            interval, allowing network engineers to quickly identify congestion,
            link utilization, and abnormal traffic behavior.
          </Typography>

          <Typography variant="body1" paragraph>
            The system supports interface-level monitoring, device availability
            tracking, and instant port up/down status detection. It is suitable
            for multi-vendor environments including Cisco, MikroTik, Juniper,
            BDCOM, and other SNMP-enabled devices.
          </Typography>

          <Typography variant="body1">
            Built with the MERN stack, this platform focuses on simplicity,
            performance, and scalability for small to medium-sized networks,
            providing a lightweight alternative to traditional monitoring tools.
          </Typography>
        </Paper>
      </Box> */}
    </>
  );
};

export default HomePage;
