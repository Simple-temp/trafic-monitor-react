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
  IconButton,
  Button,
  Checkbox,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import HistoryIcon from "@mui/icons-material/History";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveIcon from "@mui/icons-material/Remove";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Assets
import downSoundFile from "../assets/inactive.wav";
import upSoundFile from "../assets/active.wav";
import Bgp_Info from "./Bgp_Info";

function isSnmpError(iface) {
  return (
    iface.ifAdminStatus === 0 &&
    iface.ifOperStatus === 0
  );
}

export default function PortList() {
  const [interfaces, setInterfaces] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notInUseInterfaces, setNotInUseInterfaces] = useState([]);
  const [globalSearch, setGlobalSearch] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [selectedInterfaces, setSelectedInterfaces] = useState([]); 

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

  const fetchNotInUse = () => {
    axios.get('http://localhost:5000/api/interfacesnotinuse').then((res) => {
      setNotInUseInterfaces(res.data);
    }).catch((err) => console.error('Error fetching not in use:', err));
  };

useEffect(() => {
    // 1. FETCH HISTORY
    const fetchHistory = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/port-logs");
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

    // 2. POLLING & DETECTION
    const fetchData = () => {
      axios
        .get("http://localhost:5000/api/devices")
        .then((res) => {
          const allowedPrefixes = [
            "ae", "et", "lt", "xe", "10GE", "20GE", "30GE", "40GE", "25GE",
            "100GE", "Ethernet", "GigaEthernet", "TGigaEthernet",
          ];

          const cleanInterfaceRegex = /^[a-zA-Z0-9]+$/;

          const filteredData = res.data.interfaces.filter((iface) => {
            const descr = iface.ifDescr || "";
            const alias = iface.ifAlias || "";
            
            const matchesPrefix = allowedPrefixes.some((p) => descr.startsWith(p));
            const isCleanInterface = !descr.includes(".");
            const hasAlias = alias.trim().length > 0;

            return matchesPrefix && isCleanInterface && hasAlias;
          });

          const newLogs = [];

          filteredData.forEach((iface) => {
            const key = `${iface.device_id}_${iface.ifIndex}`;
            let currentStatus = iface.ifOperStatus === 1 ? "UP" : "DOWN";
            if (isSnmpError(iface)) currentStatus = "SNMP ERROR";

            const previousStatus = lastStatus.current[key];

            if (initialLoadDone.current && previousStatus && previousStatus !== currentStatus) {
              const displayAlias = iface.ifAlias || iface.ifDescr || key;

              const logEntry = {
                id: Date.now() + Math.random(),
                device: iface.device_name,
                alias: displayAlias,
                from: previousStatus,
                to: currentStatus,
                time: new Date(),
              };

              newLogs.push(logEntry);

              // --- FIX IS HERE: MATCH BACKEND EXPECTED KEYS ---
              axios.post("http://localhost:5000/api/port-logs", {
                device: logEntry.device,       // Backend expects 'device'
                alias: logEntry.alias,         // Backend expects 'alias'
                from: logEntry.from,           // Backend expects 'from'
                to: logEntry.to                // Backend expects 'to'
              }).catch(err => console.error("Failed to save log", err));
              // -------------------------------------------------

              if (currentStatus === "DOWN") {
                playAudio(downAudio);
                toast.error(`PORT DOWN: ${displayAlias}`);
              } else if (currentStatus === "UP" && previousStatus === "DOWN") {
                playAudio(upAudio);
                toast.success(`PORT UP: ${displayAlias}`);
              }
            }
            lastStatus.current[key] = currentStatus;
          });

          if (newLogs.length > 0) setLogs((prev) => [...newLogs, ...prev]);
          if (!initialLoadDone.current) initialLoadDone.current = true;
          setInterfaces(filteredData);
        })
        .catch((err) => console.error("Polling error:", err));
    };

    fetchNotInUse(); 
    fetchData(); 
    const interval = setInterval(() => {
        fetchData();
        fetchNotInUse();
    }, 1000);
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

  const notInUseKeys = new Set(notInUseInterfaces.map(n => `${n.device_id}_${n.ifIndex}`));

  const downPorts = interfaces.filter(
    (i) => i.ifOperStatus === 2 && !isSnmpError(i) && searchFilter(i) && !notInUseKeys.has(`${i.device_id}_${i.ifIndex}`),
  );
  const snmpPorts = interfaces.filter((i) => isSnmpError(i) && searchFilter(i));
  const upPorts = interfaces.filter(
    (i) => i.ifOperStatus === 1 && !isSnmpError(i) && searchFilter(i),
  );
  const notInUseFiltered = notInUseInterfaces.filter(searchFilter);

  const handleCheckboxChange = (item, checked) => {
    if (checked) {
      setSelectedInterfaces(prev => [...prev, item]);
    } else {
      setSelectedInterfaces(prev => prev.filter(i => `${i.device_id}_${i.ifIndex}` !== `${item.device_id}_${item.ifIndex}`));
    }
  };

  const handleSubmitSelected = async () => {
    if (selectedInterfaces.length === 0) {
      alert('No interfaces selected');
      return;
    }
    try {
      const promises = selectedInterfaces.map(item =>
        axios.post('http://localhost:5000/api/interfacesnotinuse', {
          device_id: item.device_id,
          ifIndex: item.ifIndex,
          ifDescr: item.ifDescr,
          ifName: item.ifName,
          ifAlias: item.ifAlias,
          ifOperStatus: item.ifOperStatus,
        })
      );
      await Promise.all(promises);
      alert(`Added ${selectedInterfaces.length} interface(s) to not in use`);
      setSelectedInterfaces([]);
      fetchNotInUse();
      setTabValue(3); // Adjusted since NOT IN USE is now tab 3
    } catch (err) {
      console.error('Error adding:', err);
    }
  };

  const handleRemove = (id) => {
    if (window.confirm('Are you sure you want to remove this interface from not in use?')) {
      axios.delete(`http://localhost:5000/api/interfacesnotinuse/${id}`).then(() => {
        alert('Removed from not in use');
        fetchNotInUse();
      }).catch((err) => {
        console.error('Error removing:', err);
      });
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "20px", backgroundColor: "#f8fafc" }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Button
            variant="contained"
            onClick={handleSubmitSelected}
            sx={{ bgcolor: "rgb(141, 35, 15) !important", color: "#fff", "&:hover": { bgcolor: "#A0522D" } }}
          >
            Submit Selected ({selectedInterfaces.length})
          </Button>
          <Typography variant="h5" fontWeight="900" color="#1e293b">PORT MONITOR</Typography>
        </div>
        <TextField
          placeholder="Search..."
          size="small"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          sx={{ width: "400px", bgcolor: "#fff" }}
          InputProps={{
            startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>),
          }}
        />
      </div>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tab icon={<ReportProblemIcon sx={{ color: "#ef4444" }} />} iconPosition="start" label={`DOWN (${downPorts.length})`} />
        {/* Commented out SNMP ERR tab as per request */}
        {/* <Tab icon={<WarningAmberIcon sx={{ color: "#f59e0b" }} />} iconPosition="start" label={`SNMP ERR (${snmpPorts.length})`} /> */}
        <Tab icon={<CheckCircleIcon sx={{ color: "#22c55e" }} />} iconPosition="start" label={`UP PORTS (${upPorts.length})`} />
        <Tab icon={<HistoryIcon />} iconPosition="start" label="LOGS" />
        <Tab label={`NOT IN USE (${notInUseFiltered.length})`} />
        <Tab label="BGP Alert" />
        <Tab label="Fiber power" />
        <Tab label="backbone" />
      </Tabs>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {tabValue === 0 && downPorts.map((i) => (
          <PortBlock
            key={`${i.device_id}_${i.ifIndex}`}
            item={i}
            showCheckbox
            isSelected={selectedInterfaces.some(sel => `${sel.device_id}_${sel.ifIndex}` === `${i.device_id}_${i.ifIndex}`)}
            onCheckboxChange={handleCheckboxChange}
          />
        ))}
        {/* Commented out SNMP ERR content as per request */}
        {/* {tabValue === 1 && snmpPorts.map((i) => <PortBlock key={`${i.device_id}_${i.ifIndex}`} item={i} />)} */}
        {tabValue === 1 && upPorts.map((i) => <PortBlock key={`${i.device_id}_${i.ifIndex}`} item={i} />)}
        {tabValue === 3 && notInUseFiltered.map((i) => <PortBlock key={i.id} item={i} showMinus onMinusClick={() => handleRemove(i.id)} />)}
      </Box>

      {tabValue === 2 && (
        <Box sx={{ maxWidth: "900px" }}>
          {logs.slice(0, 50).map((log) => (
            <Paper key={log.id} sx={{ p: 1.5, mb: 1, borderLeft: `5px solid ${log.to === "UP" ? "#22c55e" : log.to === "SNMP ERROR" ? "#f59e0b" : "#ef4444"}` }}>
              <Typography variant="body2" fontWeight="bold">{log.device} � {log.alias}</Typography>
              <Typography variant="caption" color="textSecondary">
                Status: <b>{log.from}</b> ? <b>{log.to}</b> at {log.time.toLocaleTimeString()}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      {tabValue === 4 && <Typography> <Bgp_Info/> </Typography>}
      {tabValue === 5 && <Typography>Fiber Power(coming soon..)</Typography>}
      {tabValue === 6 && <Typography>Backbone(coming soon..)</Typography>}

      <audio ref={downAudio} src={downSoundFile} />
      <audio ref={upAudio} src={upSoundFile} />
    </div>
  );
}

function PortBlock({ item, showCheckbox, isSelected, onCheckboxChange, showMinus, onMinusClick }) {
  const error = isSnmpError(item);
  const statusLabel = error ? "SNMP ERROR" : item.ifOperStatus === 1 ? "UP" : "DOWN";
  const themeColor = error ? "#f59e0b" : item.ifOperStatus === 1 ? "#22c55e" : "#ef4444";

  return (
    <Box sx={{
      width: "300px", p: 2, bgcolor: "#fff", borderRadius: 2, borderLeft: `8px solid ${themeColor}`,
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", display: "flex", flexDirection: "column", gap: 0.5,
    }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="caption" fontWeight="bold" color="textSecondary">{item.device_name}</Typography>
        {showCheckbox && (
          <Checkbox
            checked={isSelected}
            onChange={(e) => onCheckboxChange(item, e.target.checked)}
            size="small"
          />
        )}
        {showMinus && <IconButton size="small" onClick={onMinusClick}><RemoveIcon /></IconButton>}
      </Box>
      <Typography variant="body1" fontWeight="900" noWrap sx={{ color: "#0f172a" }}>{item.ifAlias}</Typography>
      <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="caption" fontWeight="900" sx={{ fontFamily: "monospace", color: "#A52A2A" }}>{item.ifDescr}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {error && <WarningAmberIcon sx={{ fontSize: 14, color: themeColor }} />}
          <Typography variant="caption" fontWeight="bold" sx={{ color: themeColor }}>{statusLabel}</Typography>
        </Box>
      </Box>
    </Box>
  );
}