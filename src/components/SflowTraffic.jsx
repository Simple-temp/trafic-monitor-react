import React, { useState, useEffect, useRef } from "react";
import { Box, Paper, Typography, Chip, Avatar } from "@mui/material";
import { Security, Analytics } from "@mui/icons-material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import io from "socket.io-client";

const SOCKET_URL = "http://localhost:5000:5000";
const DEVICE_API = "http://localhost:5000:5000/api/devices";

const SflowTraffic = () => {
  const [graphData, setGraphData] = useState([]);
  const [interfaceMeta, setInterfaceMeta] = useState({});
  const [currentStats, setCurrentStats] = useState({
    bps: 0,
    description: "Waiting...",
    alias: "N/A",
    device: "N/A",
    ifindex: "N/A",
  });

  // Use a ref to keep track of metadata inside the socket listener without re-triggering effects
  const metaRef = useRef({});

  // 1. Fetch Metadata and Filter for sFlow
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(DEVICE_API);
        const devices = await response.json();
        const mapping = {};

        devices.forEach((dev) => {
          if (dev.interfaces && Array.isArray(dev.interfaces)) {
            dev.interfaces.forEach((iface) => {
              // Strict check: only include interfaces with sflow configured
              if (iface.sflow === true || iface.sflow === "true") {
                mapping[String(iface.ifindex)] = {
                  deviceName: dev.name,
                  description: iface.description || "No Description",
                  alias: iface.alias || "No Alias",
                  ifindex: iface.ifindex,
                };
              }
            });
          }
        });
        setInterfaceMeta(mapping);
        metaRef.current = mapping;
      } catch (err) {
        console.error("Error fetching device metadata:", err);
      }
    };

    fetchMetadata();
  }, []);

  // 2. Socket Connection & Traffic Logic
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("traffic", (data) => {
      let totalBps = 0;
      let matchedInterface = null;

      // Iterate through devices in the socket payload
      Object.values(data).forEach((devicePorts) => {
        Object.entries(devicePorts).forEach(([idx, metrics]) => {
          // STRICT MATCH: ifindex from socket (idx) must exist in our sFlow-configured meta
          const meta = metaRef.current[String(idx)];

          if (meta) {
            // Calculate raw bps: Octets * 8
            const egressBps = (metrics.tx || 0) * 8;
            totalBps += egressBps;
            matchedInterface = meta;
          }
        });
      });

      if (matchedInterface) {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });

        setCurrentStats({
          bps: totalBps,
          description: matchedInterface.description,
          alias: matchedInterface.alias,
          device: matchedInterface.deviceName,
          ifindex: matchedInterface.ifindex,
        });

        setGraphData((prev) =>
          [
            ...prev,
            {
              time: timestamp,
              bps: totalBps,
            },
          ].slice(-20),
        ); // Keep last 20 data points
      }
    });

    return () => socket.disconnect();
  }, []);

  return (
    <Box sx={{ p: 2, bgcolor: "#f1f5f9", minHeight: "100vh" }}>
      {/* HEADER SECTION */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar sx={{ bgcolor: "#1e293b", width: 40, height: 40 }}>
          <Security fontSize="small" />
        </Avatar>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 900, lineHeight: 1.2 }}
          >
            {currentStats.device}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "#64748b", fontWeight: 700 }}
          >
            {currentStats.description} ({currentStats.alias}) | Index:{" "}
            {currentStats.ifindex}
          </Typography>
        </Box>
      </Box>

      {/* FIXED SIZE GRAPH CONTAINER (600x300) */}
      <Paper
        sx={{
          width: "600px",
          height: "300px",
          p: 2,
          borderRadius: 3,
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Analytics sx={{ color: "#0ea5e9", fontSize: 18 }} />
            <Typography
              sx={{ fontWeight: 800, fontSize: "12px", color: "#0f172a" }}
            >
              EGRESS TRAFFIC
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography
              sx={{
                fontSize: "18px",
                fontWeight: 900,
                color: "#10b981",
                lineHeight: 1,
              }}
            >
              {currentStats.bps.toLocaleString()}
            </Typography>
            <Typography
              sx={{ fontSize: "9px", fontWeight: 700, color: "#64748b" }}
            >
              BITS PER SECOND (bps)
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, mt: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graphData}>
              <defs>
                <linearGradient id="colorBps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="time"
                fontSize={9}
                tickMargin={5}
                axisLine={false}
                tickLine={false}
                stroke="#94a3b8"
              />
              <YAxis
                fontSize={9}
                axisLine={false}
                tickLine={false}
                stroke="#94a3b8"
                tickFormatter={(val) => val.toLocaleString()}
              />
              <Tooltip
                labelStyle={{ fontSize: "10px", fontWeight: 700 }}
                itemStyle={{ fontSize: "11px", color: "#10b981" }}
                formatter={(value) => [
                  `${value.toLocaleString()} bps`,
                  "Traffic",
                ]}
              />
              <Area
                type="monotone"
                dataKey="bps"
                stroke="#10b981"
                fill="url(#colorBps)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Box sx={{ mt: 1 }}>
        <Chip
          label="SFLOW CONFIGURED INTERFACES ONLY"
          size="small"
          sx={{
            fontSize: "9px",
            fontWeight: 800,
            bgcolor: "#e0f2fe",
            color: "#0369a1",
          }}
        />
      </Box>
    </Box>
  );
};

export default SflowTraffic;
