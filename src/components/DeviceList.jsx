import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Box, Typography } from "@mui/material";
import downSoundFile from "../assets/inactive.wav";
import upSoundFile from "../assets/active.wav";

const API_URL = "http://localhost:5000/api/devices";
const POLL_INTERVAL = 1000;
const DOWN_NOTIFICATION_DELAY = 10000; // 10s

// Icon components (using simple SVG or emoji for demonstration; replace with actual icons if needed)
const SwitchIcon = () => <span>🔌</span>; // Switch icon
const JuniperIcon = () => <span>🌐</span>; // Juniper router icon
const MikrotikIcon = () => <span>📡</span>; // Mikrotik icon
const DefaultIcon = () => <span>🖥️</span>; // Default device icon

const DeviceList = () => {
  const [devices, setDevices] = useState([]);
  const [downDevices, setDownDevices] = useState([]);
  const [upDevices, setUpDevices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false); // State for add device popup
  const [newDevice, setNewDevice] = useState({ hostname: "", ip_address: "", snmp_community: "", options: "" }); // Form state
  const [filterZone, setFilterZone] = useState(""); // Filter by zone
  const [filterIP, setFilterIP] = useState(""); // Filter by IP

  const prevStatusRef = useRef({});
  const downTimersRef = useRef({});
  const pollingRef = useRef(null);

  const downAudio = useRef(null);
  const upAudio = useRef(null);

  /* -------------------- AUTO START MONITORING ON MOUNT -------------------- */
  useEffect(() => {
    fetchDevices();
    pollingRef.current = setInterval(fetchDevices, POLL_INTERVAL);

    return () => {
      clearInterval(pollingRef.current);
      clearAllDownTimers();
    };
  }, []);

  /* -------------------- FETCH DEVICE DATA -------------------- */
  const fetchDevices = async () => {
    try {
      const res = await axios.get(API_URL);
      const list = res.data.devices || [];

      list.forEach((device) => {
        const prev = prevStatusRef.current[device.id];

        if (prev && prev !== device.status) {
          if (device.status !== "UP") {
            handleDeviceDown(device);
          } else {
            handleDeviceUp(device);
          }
        }

        prevStatusRef.current[device.id] = device.status;
      });

      setDevices(list);

      // Categorize devices: DOWN at top, UP sorted by ID below
      const down = [];
      const up = [];
      list.forEach((d) => {
        if (d.status === "UP") {
          up.push(d);
        } else {
          down.push(d);
        }
      });
      setDownDevices(down);
      setUpDevices(up.sort((a, b) => a.id - b.id)); // Sort UP devices by ID for "previous place"
    } catch (err) {
      console.error("Device API error:", err);
    }
  };

  /* -------------------- STATUS HANDLERS -------------------- */
  const handleDeviceDown = (device) => {
    // Play DOWN sound immediately
    playAudio(downAudio);

    // Schedule notification after 10s
    if (!downTimersRef.current[device.id]) {
      downTimersRef.current[device.id] = setTimeout(() => {
        showToast(`⚠️ ${device.hostname} is DOWN`, "danger");
        delete downTimersRef.current[device.id];
      }, DOWN_NOTIFICATION_DELAY);
    }
  };

  const handleDeviceUp = (device) => {
    // Clear any pending DOWN notification
    if (downTimersRef.current[device.id]) {
      clearTimeout(downTimersRef.current[device.id]);
      delete downTimersRef.current[device.id];
    }

    // Play UP sound immediately
    playAudio(upAudio);

    // Show UP notification
    showToast(`✅ ${device.hostname} is back UP`, "success");
  };

  /* -------------------- TOAST NOTIFICATION -------------------- */
  const showToast = (message, type) => {
    const id = Date.now();
    setNotifications((p) => [...p, { id, message, type }]);
    setTimeout(() => {
      setNotifications((p) => p.filter((n) => n.id !== id));
    }, 1000);
  };

  const clearAllDownTimers = () => {
    Object.values(downTimersRef.current).forEach(clearTimeout);
    downTimersRef.current = {};
  };

  /* -------------------- AUDIO CONTROL -------------------- */
  const playAudio = (audioRef) => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  /* -------------------- GET DEVICE ICON -------------------- */
  const getDeviceIcon = (hostname) => {
    const lowerHostname = hostname.toLowerCase();
    if (lowerHostname.includes("switch")) return <SwitchIcon />;
    if (lowerHostname.includes("juniper")) return <JuniperIcon />;
    if (lowerHostname.includes("mikrotik")) return <MikrotikIcon />;
    return <DefaultIcon />;
  };

  /* -------------------- ADD DEVICE HANDLER -------------------- */
  const handleAddDevice = async () => {
    if (!newDevice.hostname || !newDevice.ip_address || !newDevice.snmp_community) {
      showToast("Please fill in all required fields.", "danger");
      return;
    }

    try {
      await axios.post(API_URL, newDevice);
      showToast("Device added successfully!", "success");
      setOpenAddDialog(false);
      setNewDevice({ hostname: "", ip_address: "", snmp_community: "", options: "" });
      fetchDevices(); // Refresh the list
    } catch (err) {
      console.error("Error adding device:", err);
      showToast(err.response?.data?.error || "Failed to add device.", "danger");
    }
  };

  /* -------------------- FILTER DEVICES -------------------- */
  const filteredDevices = [...downDevices, ...upDevices].filter((device) => {
    const matchesZone = !filterZone || device.options === filterZone;
    const matchesIP = !filterIP || device.ip_address.toLowerCase().includes(filterIP.toLowerCase());
    return matchesZone && matchesIP;
  });

  /* -------------------- UI -------------------- */
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        {/* <h1 style={styles.title}>📡 Network Device Monitoring Dashboard</h1>
        <p style={styles.subtitle}>Real-time status tracking with automatic alerts</p> */}
        {/* Add Device Button in Top Right */}
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpenAddDialog(true)}
          style={styles.addButton}
        >
          Add Device
        </Button>
      </header>

      <div style={styles.monitoringIndicator}>
        <span style={styles.indicatorDot}></span>
        Monitoring Active (Automatic)
      </div>

      {/* Filter Section Below Left Corner */}
      <Box style={styles.filterContainer}>
        <FormControl variant="outlined" size="small" style={styles.filterItem}>
          <InputLabel>Zone</InputLabel>
          <Select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            label="Zone"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="DHK">DHK</MenuItem>
            <MenuItem value="NHK">NHK</MenuItem>
            <MenuItem value="CTG">CTG</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Search by IP"
          variant="outlined"
          size="small"
          value={filterIP}
          onChange={(e) => setFilterIP(e.target.value)}
          style={styles.filterItem}
        />
      </Box>

      {/* Table-like layout for Zabbix-style rows */}
      <div style={styles.tableContainer}>
        <div style={styles.tableHeader}>
          <div style={styles.headerCell}>Device Name</div>
          <div style={styles.headerCell}>IP Address</div>
          <div style={styles.headerCell}>Status</div>
          <div style={styles.headerCell}>Type</div>
          <div style={styles.headerCell}>Zone</div> {/* Added Zone column */}
        </div>
        {filteredDevices.map((d) => (
          <div
            key={d.id}
            style={{
              ...styles.tableRow,
              background: d.status === "UP" ? "#f0fdf4" : "#fef2f2",
              borderLeft: `4px solid ${d.status === "UP" ? "#10b981" : "#ef4444"}`,
            }}
          >
            <div style={styles.cell}>{d.hostname}</div>
            <div style={styles.cell}>{d.ip_address || "N/A"}</div>
            <div
              style={{
                ...styles.cell,
                color: d.status === "UP" ? "#059669" : "#dc2626",
                fontWeight: "bold",
              }}
            >
              {d.status}
            </div>
            <div style={styles.cell}>{getDeviceIcon(d.hostname)}</div>
            <div style={styles.cell}>{d.options || "N/A"}</div> {/* Display Zone */}
          </div>
        ))}
      </div>

      {/* Add Device Dialog (Popup) */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Device</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Device Name (Hostname)"
            fullWidth
            variant="outlined"
            value={newDevice.hostname}
            onChange={(e) => setNewDevice({ ...newDevice, hostname: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="IP Address"
            fullWidth
            variant="outlined"
            value={newDevice.ip_address}
            onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="SNMP Community"
            fullWidth
            variant="outlined"
            value={newDevice.snmp_community}
            onChange={(e) => setNewDevice({ ...newDevice, snmp_community: e.target.value })}
            required
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Zone</InputLabel>
            <Select
              value={newDevice.options}
              onChange={(e) => setNewDevice({ ...newDevice, options: e.target.value })}
              label="Zone"
            >
              <MenuItem value="DHK">DHK</MenuItem>
              <MenuItem value="NHK">NHK</MenuItem>
              <MenuItem value="CTG">CTG</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions style={{ justifyContent: 'flex-end' }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddDevice} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* TOASTS */}
      <div style={styles.toastWrap}>
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              ...styles.toast,
              background: n.type === "danger" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "linear-gradient(135deg, #16a34a, #15803d)",
              animation: "slideInRight 0.5s ease-out",
            }}
          >
            {n.message}
          </div>
        ))}
      </div>

      {/* AUDIO */}
      <audio ref={downAudio} src={downSoundFile} preload="auto" />
      <audio ref={upAudio} src={upSoundFile} preload="auto" />
    </div>
  );
};

/* -------------------- STYLES -------------------- */
const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: "20px",
    color: "#1f2937",
  },
  header: {
    textAlign: "center",
    marginBottom: "30px",
    position: "relative", // For positioning the add button
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "700",
    margin: "0 0 10px 0",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#64748b",
    margin: "0",
  },
  addButton: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  monitoringIndicator: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    fontSize: "1rem",
    fontWeight: "500",
    color: "#059669",
  },
  indicatorDot: {
    width: "10px",
    height: "10px",
    background: "#10b981",
    borderRadius: "50%",
    marginRight: "8px",
    animation: "pulse 2s infinite",
  },
  filterContainer: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
    alignItems: "center",
  },
  filterItem: {
    minWidth: "150px",
  },
  tableContainer: {
    width: "100%",
    margin: "0 auto",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  tableHeader: {
    display: "flex",
    background: "#f1f5f9",
    fontWeight: "bold",
    color: "#374151",
    padding: "12px 0",
  },
  headerCell: {
    flex: 1,
    textAlign: "center",
    padding: "0 10px",
  },
  tableRow: {
    display: "flex",
    borderBottom: "1px solid #e2e8f0",
    transition: "background 0.3s ease",
  },
  cell: {
    flex: 1,
    textAlign: "center",
    padding: "12px 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  toastWrap: {
    position: "fixed",
    top: "20px",
    right: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    zIndex: 9999,
  },
  toast: {
    padding: "14px 18px",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "600",
    boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
    minWidth: "300px",
  },
};

// Add CSS animations (you can add this to your global CSS or use a library like styled-components)
const globalStyles = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

// Inject global styles (in a real app, use a CSS file or styled-components)
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = globalStyles;
  document.head.appendChild(styleSheet);
}

export default DeviceList;