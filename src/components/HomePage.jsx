import React, { useState, useEffect } from "react";
import { Box, Typography, Grid } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

const destinations = [
  "google.com", "8.8.8.8", "1.1.1.1", "bbc.com", 
  "youtube.com", "facebook.com", "whatsapp.com", "tiktok.com", "bkash.com", "imo.im", "nagad.com.bd", "ansarvdp.gov.bd", "gmail.com","8.8.4.4"
];

// Define latency ranges and categories per destination
const latencyGroups = {
  '8.8.8.8': { best: [5, 32], someHigh: [33, 40], high: [41, 50] },
  'gmail.com': { best: [5, 33], someHigh: [34, 40], high: [41, 50] },
  '8.8.4.4': { best: [5, 33], someHigh: [34, 40], high: [41, 50] },
  'youtube.com': { best: [0, 33], someHigh: [34, 50], veryHigh: [51, 80] },
  'facebook.com': { best: [0, 8], someHigh: [9, 12], veryHigh: [13, 15] },
  'whatsapp.com': { best: [0, 8], someHigh: [9, 18], veryHigh: [19, 30] },
  'google.com': { best: [0, 33], someHigh: [34, 40], veryHigh: [41, 55] },
  'nagad.com.bd': { best: [0, 33], someHigh: [34, 40], veryHigh: [41, 50] },
  '1.1.1.1': { best: [0, 2], someHigh: [5, 8], high: [8, 10] },
  'bkash.com': { best: [0, 4], someHigh: [5, 9], high: [10, 15] },
  'bbc.com': { best: [0, 35], someHigh: [36, 50], high: [51, 60] },
  'tiktok.com': { best: [0, 35], someHigh: [36, 50], high: [51, 60] },
  'imo.im': { best: [0, 35], someHigh: [36, 45], high: [46, 60] },
  'ansarvdp.gov.bd': { best: [0, 2], someHigh: [5, 8], high: [8, 10] },
  // ansarvdp.gov.bd not specified, default to unknown/offline
};

// Function to categorize latency and assign colors
const getLatencyCategory = (name, ms) => {
  const group = latencyGroups[name];
  if (!group) {
    return { category: 'unknown', color: '#9E9E9E' }; // Gray for unknown destinations
  }
  if (typeof ms === 'string' || ms === undefined) {
    return { category: 'offline', color: '#9E9E9E' }; // Gray for offline/timeout
  }
  if (ms >= group.best[0] && ms <= group.best[1]) return { category: 'best', color: '#4CAF50' }; // Green for best
  if (ms > group.best[1] && ms <= group.someHigh[1]) return { category: 'some high', color: '#FF9800' }; // Orange for some high
  if (group.veryHigh && ms > group.someHigh[1] && ms <= group.veryHigh[1]) return { category: 'very high', color: '#F44336' }; // Red for very high
  if (group.high && ms > group.someHigh[1] && ms <= group.high[1]) return { category: 'high', color: '#F44336' }; // Red for high
  return { category: 'very high', color: '#F44336' }; // Red if exceeds ranges
};

// This is the individual Hexagon component
const PingBlock = ({ name }) => {
  const [latency, setLatency] = useState([]);
  const [ip, setIp] = useState("...");

  useEffect(() => {
    const getRealStats = async () => {
      try {
        // Ensure you use the full URL if backend is on a different port (e.g., 5000)
        const response = await fetch(`http://localhost:5000/api/ping?host=${name}`);
        const data = await response.json();
        
        if (data.ip) setIp(data.ip);
        if (data.latency !== undefined) {
          setLatency((prev) => [data.latency, ...prev].slice(0, 2));
        }
      } catch (err) {
        console.error("Backend unreachable for:", name);
      }
    };

    getRealStats();
    const interval = setInterval(getRealStats, 1000);
    return () => clearInterval(interval);
  }, [name]);

  const currentLatency = latency[0];
  const { category, color } = getLatencyCategory(name, currentLatency);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", m: 3 }}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: "800", color: "#3e2723", textTransform: 'uppercase' }}>
        {name}
      </Typography>

      <motion.div
        animate={{
          borderColor: color,
          boxShadow: [
            `0 0 20px ${color}`,
            `0 0 40px ${color}`,
            `0 0 20px ${color}`
          ]
        }}
        style={{
          border: '20px solid',
          clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
          width: 160, // Adjusted to account for 20px border (120 + 40)
          height: 160, // Adjusted to account for 20px border (120 + 40)
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: 140, height: 140,
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "#8D230F",
            clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <AnimatePresence mode="popLayout">
              {latency.length > 0 ? (
                latency.map((ms, index) => (
                  <motion.div
                    key={`${name}-${index}-${ms}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: index === 0 ? 1 : 0.5, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <Typography sx={{ fontSize: index === 0 ? "35px" : "18px", fontWeight: "bold", color: "white" }}>
                      {ms}<span style={{ fontSize: "12px" }}>ms</span>
                    </Typography>
                  </motion.div>
                ))
              ) : (
                <Typography sx={{ color: "white" }}>Loading</Typography>
              )}
            </AnimatePresence>
          </Box>
        </Box>
      </motion.div>

      <Typography variant="caption" sx={{ mt: 1, color: "#5d4037", fontWeight: "600", fontFamily: 'monospace' }}>
        {ip}
      </Typography>
    </Box>
  );
};

// This is your main Page
const HomePage = () => {
  return (
    <Box sx={{ p: 4, backgroundColor: "#fdf5e6", minHeight: "100vh" }}>
      <Grid container spacing={2} justifyContent="center">
        {destinations.map((dst) => (
          <Grid item key={dst}>
            {/* Pass the 'dst' string into the 'name' prop */}
            <PingBlock name={dst} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default HomePage;
