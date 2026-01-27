import React, { useState, useEffect } from "react";
import { Box, Typography, Grid } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

const destinations = [
  "google.com", "8.8.8.8", "1.1.1.1", "bbc.com", 
  "youtube.com", "facebook.com", "whatsapp.com"
];

const FuchkaPingBlock = ({ name }) => {
  const [latency, setLatency] = useState([]);
  const [ip, setIp] = useState("0.0.0.0");

  useEffect(() => {
    // Simulated IP Resolution
    setIp(name.includes('.') && !/[a-z]/i.test(name) ? name : `172.67.${Math.floor(Math.random() * 255)}.12`);

    const interval = setInterval(() => {
      const newPing = Math.floor(Math.random() * 45) + 5;
      setLatency((prev) => [newPing, ...prev].slice(0, 2));
    }, 2000);

    return () => clearInterval(interval);
  }, [name]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", m: 3 }}>
      {/* Top: Destination Name (Outside) */}
      <Typography variant="body2" sx={{ mb: 1, fontWeight: "800", color: "#3e2723", textTransform: 'uppercase' }}>
        {name}
      </Typography>

      {/* Hexagon Frame 150x150 with Brown-Red Background */}
      <Box
        sx={{
          width: 150,
          height: 150,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // The Brown-Red Background
          backgroundColor: "#8D230F", // Deep Brown-Red (Fuchka style)
          clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        }}
      >
        {/* Middle: Latency Only */}
        <Box sx={{ textAlign: "center" }}>
          <AnimatePresence mode="popLayout">
            {latency.map((ms, index) => (
              <motion.div
                key={`${name}-${index}-${ms}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: index === 0 ? 1 : 0.5, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Typography 
                  sx={{ 
                    fontSize: index === 0 ? "35px" : "18px", // Requested 35px font
                    fontWeight: "bold",
                    color: "white", // Latency color white
                    lineHeight: 1.1
                  }}
                >
                  {ms}<span style={{ fontSize: "12px", marginLeft: '2px' }}>ms</span>
                </Typography>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      </Box>

      {/* Below: Resolved IP (Outside) */}
      <Typography variant="caption" sx={{ mt: 1, color: "#5d4037", fontWeight: "600" }}>
        {ip}
      </Typography>
    </Box>
  );
};

const HomePage = () => {
  return (
    <Box sx={{ p: 4, backgroundColor: "#fdf5e6", minHeight: "100vh" }}>
      <Grid container spacing={2} justifyContent="center">
        {destinations.map((dst) => (
          <Grid item key={dst}>
            <FuchkaPingBlock name={dst} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default HomePage;