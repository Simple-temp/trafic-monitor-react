import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Box,
  Typography,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import HistoryIcon from "@mui/icons-material/History";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import ListIcon from "@mui/icons-material/List";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Assets
import downSoundFile from "../assets/inactive.wav";
import upSoundFile from "../assets/active.wav";

function speak(text) {
  //if (!window.speechSynthesis) return;
  //const msg = new SpeechSynthesisUtterance(text);
  //msg.rate = 0.95;
  //window.speechSynthesis.cancel();
  //window.speechSynthesis.speak(msg);
}

export default function PortList() {
  const [interfaces, setInterfaces] = useState([]);
  const [logs, setLogs] = useState([]);
  // Initialize failed ports from LocalStorage
  const [failedPorts, setFailedPorts] = useState(() => {
    const saved = localStorage.getItem("failed_ports_list");
    return saved ? JSON.parse(saved) : [];
  });

  const [globalSearch, setGlobalSearch] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const lastStatus = useRef({});
  const initialLoadDone = useRef(false);
  const downAudio = useRef(null);
  const upAudio = useRef(null);

  const playAudio = (audioRef) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  // Sync failedPorts to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("failed_ports_list", JSON.stringify(failedPorts));
  }, [failedPorts]);

  useEffect(() => {
    const interval = setInterval(() => {
      axios
        .get("http://localhost:5000/api/devices")
        .then((res) => {
          const allowedPrefixes = [
            "ae",
            "et",
            "lt",
            "xe",
            "10GE",
            "20GE",
            "30GE",
            "40GE",
            "25GE",
            "100GE",
            "Giga",
            "Ethernet",
          ];

          const fetchedInterfaces = res.data.interfaces.filter((iface) => {
            const matchesPrefix =
              iface.ifDescr &&
              allowedPrefixes.some((p) => iface.ifDescr.startsWith(p));
            const hasAlias = iface.ifAlias && iface.ifAlias.trim().length > 0;
            return matchesPrefix && hasAlias;
          });

          const newLogs = [];

          fetchedInterfaces.forEach((iface) => {
            const key = `${iface.device_id}_${iface.ifIndex}`;
            const currentStatus = iface.ifOperStatus === 1 ? "UP" : "DOWN";
            const previousStatus = lastStatus.current[key];

            if (
              initialLoadDone.current &&
              previousStatus !== undefined &&
              previousStatus !== currentStatus
            ) {
              const alias = iface.ifAlias || iface.ifDescr || key;

              newLogs.push({
                id: Date.now() + Math.random(),
                device: iface.device_name,
                alias: alias,
                from: previousStatus,
                to: currentStatus,
                time: new Date(),
              });

              if (currentStatus === "DOWN") {
                // Add to persistent failed list
                setFailedPorts((prev) => [...new Set([...prev, key])]);
                playAudio(downAudio);
                speak(`Alert! ${alias} is down`);
                toast.error(`? ${alias} is DOWN`);
              } else {
                // Remove from persistent failed list
                setFailedPorts((prev) => prev.filter((item) => item !== key));
                playAudio(upAudio);
                speak(`${alias} is up`);
                toast.success(`? ${alias} is back UP`);
              }
            }
            lastStatus.current[key] = currentStatus;
          });

          if (newLogs.length > 0) setLogs((prev) => [...newLogs, ...prev]);
          if (!initialLoadDone.current) initialLoadDone.current = true;
          setInterfaces(fetchedInterfaces);
          setIsLoaded(true);
        })
        .catch((err) => console.error("Polling error:", err));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const searchFilter = (i) => {
    const s = globalSearch.toLowerCase();
    return (
      i.device_name?.toLowerCase().includes(s) ||
      i.ifDescr?.toLowerCase().includes(s) ||
      i.ifAlias?.toLowerCase().includes(s)
    );
  };

  // --- Filter Logic ---

  // 1. DOWN LIST: Only ports that exist in our 'failedPorts' (LocalStorage) list
  const downListItems = interfaces.filter((i) => {
    const key = `${i.device_id}_${i.ifIndex}`;
    return failedPorts.includes(key) && i.ifOperStatus !== 1 && searchFilter(i);
  });

  // 2. UP LIST: Only active ports
  const upPorts = interfaces.filter(
    (i) => i.ifOperStatus === 1 && searchFilter(i),
  );

  // 3. LOGS: Last 10 mins
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentLogs = logs.filter((log) => log.time > tenMinutesAgo);

  // 4. NOT IN USE: All ports currently down in the system
  const allDownPorts = interfaces.filter(
    (i) => i.ifOperStatus !== 1 && searchFilter(i),
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "20px",
        backgroundColor: "#f1f5f9",
      }}
    >
      <ToastContainer position="top-right" autoClose={3000} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <Typography variant="h5" fontWeight="900" color="#334155">
          PORT MONITOR
        </Typography>
        <TextField
          placeholder="Search ports..."
          size="small"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          sx={{ width: "350px", bgcolor: "#fff", borderRadius: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </div>

      <Tabs
        value={tabValue}
        onChange={(e, v) => setTabValue(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
        TabIndicatorProps={{
          style: {
            background:
              tabValue === 0
                ? "#d32f2f"
                : tabValue === 1
                  ? "#388e3c"
                  : "#0288d1",
          },
        }}
      >
        <Tab
          icon={<ReportProblemIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={`DOWN LIST (${downListItems.length})`}
          sx={{
            color: tabValue === 0 ? "#d32f2f" : "inherit",
            fontWeight: "bold",
          }}
        />
        <Tab
          label={`UP LIST (${upPorts.length})`}
          sx={{
            color: tabValue === 1 ? "#388e3c" : "inherit",
            fontWeight: "bold",
          }}
        />
        <Tab
          icon={<HistoryIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={`LOGS (${recentLogs.length})`}
        />
        <Tab
          icon={<ListIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={`NOT IN USE (${allDownPorts.length})`}
        />
      </Tabs>

      {/* Grid Display */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {tabValue === 0 &&
          downListItems.map((i) => (
            <PortBlock
              key={`${i.device_id}_${i.ifIndex}`}
              item={i}
              status="DOWN"
            />
          ))}
        {tabValue === 1 &&
          upPorts.map((i) => (
            <PortBlock
              key={`${i.device_id}_${i.ifIndex}`}
              item={i}
              status="UP"
            />
          ))}
        {tabValue === 3 &&
          allDownPorts.map((i) => (
            <PortBlock
              key={`${i.device_id}_${i.ifIndex}`}
              item={i}
              status="DOWN"
            />
          ))}
      </Box>

      {tabValue === 2 && (
        <Box sx={{ maxWidth: "800px" }}>
          {recentLogs.map((log) => (
            <Paper
              key={log.id}
              sx={{
                p: 1.5,
                mb: 1,
                borderLeft: `5px solid ${log.to === "UP" ? "#4caf50" : "#d32f2f"}`,
              }}
            >
              <Typography variant="body2" fontWeight="bold">
                {log.device} - {log.alias}
              </Typography>
              <Typography variant="caption">
                Changed to <b>{log.to}</b> at {log.time.toLocaleTimeString()}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      <audio ref={downAudio} src={downSoundFile} />
      <audio ref={upAudio} src={upSoundFile} />
    </div>
  );
}

function PortBlock({ item, status }) {
  const isDown = status === "DOWN";
  return (
    <Box
      sx={{
        width: "290px",
        height: "85px",
        p: 1.5,
        bgcolor: "#fff",
        borderRadius: 2,
        borderLeft: `6px solid ${isDown ? "#d32f2f" : "#4caf50"}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Typography
        variant="caption"
        fontWeight="bold"
        color="textSecondary"
        noWrap
      >
        {item.device_name}
      </Typography>
      <Typography
        variant="body2"
        fontWeight="900"
        noWrap
        color={isDown ? "#d32f2f" : "#2c3e50"}
      >
        {item.ifAlias}
      </Typography>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ fontSize: "10px" }}
          noWrap
        >
          {item.ifDescr}
        </Typography>
        <Typography
          variant="caption"
          fontWeight="bold"
          sx={{ color: isDown ? "#d32f2f" : "#388e3c" }}
        >
          {status}
        </Typography>
      </Box>
    </Box>
  );
}
