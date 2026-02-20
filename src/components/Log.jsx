import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import axios from "axios";

const Log = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // 1. FETCH HISTORY
    const fetchHistory = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/port-logs");

        // Map DB columns to Frontend object structure
        const historicalLogs = res.data.map((row) => ({
          id: row.id,
          device: row.device_name,
          alias: row.if_alias,
          from: row.status_from,
          to: row.status_to,
          time: new Date(row.created_at),
        }));

        setLogs(historicalLogs);
      } catch (err) {
        console.error("Error fetching history:", err);
      }
    };

    fetchHistory();
  }, []);

  // 2. DELETE LOG
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this log?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/port-logs/${id}`);
      // Remove from local state
      fetchHistory();
      setLogs((prev) => prev.filter((log) => log.id !== id));
    } catch (error) {
      console.error("Error deleting log:", error);
    }
  };

  // 3. COLOR STYLES
  const getStatusStyle = (status) => {
    switch (status) {
      case "UP":
        return { color: "#1b5e20", bg: "#e8f5e9", border: "#4caf50" }; // Green
      case "DOWN":
        return { color: "#b71c1c", bg: "#ffebee", border: "#f44336" }; // Red
      case "SNMP ERROR":
        return { color: "#e65100", bg: "#fff3e0", border: "#ff9800" }; // Orange
      default:
        return { color: "#616161", bg: "#f5f5f5", border: "#9e9e9e" }; // Grey
    }
  };

  return (
    <Box sx={{ width: "100%", p: 2, minHeight: "100vh", bgcolor: "#f4f6f8" }}>
      <Typography
        variant="h5"
        sx={{ mb: 3, fontWeight: "bold", color: "#263238" }}
      >
        Port Status Logs {logs.length}
      </Typography>

      <Stack spacing="5px">
        {logs.map((log) => {
          const style = getStatusStyle(log.to);

          return (
            <Paper
              key={log.id}
              elevation={3}
              sx={{
                height: "30px", // Set height to 20px
                display: "flex", // Content display flex
                justifyContent: "space-between",
                alignItems: "center",
                borderRadius: 1,
                borderLeft: `8px solid ${style.border}`,
                transition: "0.2s",
                "&:hover": {
                  transform: "translateX(4px)",
                  boxShadow: 6,
                },
              }}
            >
              {/* Info Section */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#333",
                    fontSize: "0.75rem",
                  }}
                >
                  {log.device}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ color: "#555", fontSize: "0.7rem" }}
                >
                  {log.alias}
                </Typography>

                <Typography
                  variant="caption"
                  sx={{ color: "#777", fontSize: "0.6rem" }}
                >
                  {log.time ? log.time.toLocaleString() : "Unknown time"}
                </Typography>
              </Box>

              {/* Status Section */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: "bold",
                      fontSize: "0.7rem",
                      color: getStatusStyle(log.from).color,
                    }}
                  >
                    {log.from}
                  </Typography>

                  <ArrowForwardIcon sx={{ fontSize: 12, color: "#999" }} />

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: "bold",
                      color: style.color,
                      fontSize: "0.7rem",
                    }}
                  >
                    {log.to}
                  </Typography>
                </Box>

                <Chip
                  label={log.to}
                  size="small"
                  sx={{
                    bgcolor: style.bg,
                    color: style.color,
                    fontWeight: "bold",
                    border: `1px solid ${style.border}`,
                    minWidth: "60px",
                    height: "16px",
                    fontSize: "0.6rem",
                  }}
                />

                <IconButton
                  onClick={() => handleDelete(log.id)}
                  color="error"
                  title="Delete Log"
                  size="small"
                  sx={{ p: 0 }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Paper>
          );
        })}

        {logs.length === 0 && (
          <Paper sx={{ p: 5, textAlign: "center", bgcolor: "white" }}>
            <Typography color="textSecondary">No logs found.</Typography>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default Log;
