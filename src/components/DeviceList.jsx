import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Paper,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import HistoryIcon from "@mui/icons-material/History";

// Assets
import downSoundFile from "../assets/inactive.wav";
import upSoundFile from "../assets/active.wav";

const API_URL = "http://localhost:5000/api/devices";
const POLL_INTERVAL = 5000;

const DeviceList = () => {
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]); // State for status logs
  const [globalSearch, setGlobalSearch] = useState("");
  const [filterZone, setFilterZone] = useState("");
  const [tabValue, setTabValue] = useState(0);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    hostname: "",
    ip_address: "",
    snmp_community: "",
    options: "",
  });

  const prevStatusRef = useRef({});
  const initialLoadDone = useRef(false);
  const downAudio = useRef(null);
  const upAudio = useRef(null);

  useEffect(() => {
    fetchDevices();
    const polling = setInterval(fetchDevices, POLL_INTERVAL);
    return () => clearInterval(polling);
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await axios.get(API_URL);
      const list = res.data.devices || [];

      const newLogs = [];

      list.forEach((device) => {
        const key = device.id;
        const currentStatus = device.status;
        const prevStatus = prevStatusRef.current[key];

        if (
          initialLoadDone.current &&
          prevStatus !== undefined &&
          prevStatus !== currentStatus
        ) {
          // Add to log state
          newLogs.push({
            id: Date.now() + Math.random(),
            hostname: device.hostname,
            ip: device.ip_address,
            from: prevStatus,
            to: currentStatus,
            time: new Date(),
          });

          // Sound/Voice Logic
          if (prevStatus === "UP" && currentStatus === "DOWN") {
            playAudio(downAudio);
          } else if (prevStatus === "DOWN" && currentStatus === "UP") {
            playAudio(upAudio);
          }
        }
        prevStatusRef.current[key] = currentStatus;
      });

      if (newLogs.length > 0) {
        setLogs((prev) => [...newLogs, ...prev]);
      }

      if (!initialLoadDone.current) initialLoadDone.current = true;
      setDevices(list);
    } catch (err) {
      console.error("API error:", err);
    }
  };

  const playAudio = (audioRef) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => console.log("Audio blocked", e));
    }
  };

  const handleSaveDevice = async () => {
    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, formData);
      } else {
        await axios.post(API_URL, formData);
      }
      setOpenDialog(false);
      setEditingId(null);
      setFormData({
        hostname: "",
        ip_address: "",
        snmp_community: "",
        options: "",
      });
      fetchDevices();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this device?")) {
      await axios.delete(`${API_URL}/${id}`);
      fetchDevices();
    }
  };

  // Filter Logic
  const filteredDevices = devices.filter((d) => {
    const s = globalSearch.toLowerCase();
    const matchesSearch =
      d.hostname.toLowerCase().includes(s) || d.ip_address.includes(s);
    const matchesZone = !filterZone || d.options === filterZone;
    const matchesStatus =
      tabValue === 0 ? d.status !== "UP" : d.status === "UP";
    return matchesSearch && matchesZone && matchesStatus;
  });

  // Log Filter: Last 10 Minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentLogs = logs.filter((log) => log.time > tenMinutesAgo);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="900" color="#334155">
            NMS Devices
          </Typography>
          <Box display="flex" gap={2}>
            <TextField
              size="small"
              placeholder="Search IP/Name..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              sx={{ bgcolor: "#fff", borderRadius: 1 }}
            />
            <Select
              size="small"
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              displayEmpty
              sx={{ bgcolor: "#fff", minWidth: 120, borderRadius: 1 }}
            >
              <MenuItem value="">All Zones</MenuItem>
              <MenuItem value="DHK">DHK</MenuItem>
              <MenuItem value="NHK">NHK</MenuItem>
              <MenuItem value="CTG">CTG</MenuItem>
            </Select>
            <Button
              variant="contained"
              onClick={() => {
                setEditingId(null);
                setOpenDialog(true);
              }}
              sx={{ bgcolor: "#b50000", "&:hover": { bgcolor: "#8b0000" } }}
            >
              Add Device
            </Button>
          </Box>
        </Box>
      </header>

      <Tabs
        value={tabValue}
        onChange={(e, v) => setTabValue(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab
          label={`DOWN LIST (${devices.filter((d) => d.status !== "UP").length})`}
          sx={{ fontWeight: "bold", color: tabValue === 0 ? "red" : "inherit" }}
        />
        <Tab
          label={`UP LIST (${devices.filter((d) => d.status === "UP").length})`}
          sx={{
            fontWeight: "bold",
            color: tabValue === 1 ? "green" : "inherit",
          }}
        />
        <Tab
          icon={<HistoryIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={`LOGS (${recentLogs.length})`}
        />
      </Tabs>

      {/* Tab Panels */}
      {tabValue < 2 ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {filteredDevices.map((d) => (
            <DeviceBlock
              key={d.id}
              device={d}
              onEdit={() => {
                setEditingId(d.id);
                setFormData({
                  hostname: d.hostname,
                  ip_address: d.ip_address,
                  snmp_community: d.snmp_community,
                  options: d.options,
                });
                setOpenDialog(true);
              }}
              onDelete={() => handleDelete(d.id)}
            />
          ))}
        </Box>
      ) : (
        <Box sx={{ maxWidth: "800px" }}>
          {recentLogs.length === 0 ? (
            <Typography sx={{ fontStyle: "italic", color: "gray", ml: 2 }}>
              No status changes in the last 10 minutes.
            </Typography>
          ) : (
            recentLogs.map((log) => (
              <Paper
                key={log.id}
                sx={{
                  p: 1.5,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderLeft: `5px solid ${log.to === "UP" ? "#10b981" : "#dc2626"}`,
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    {log.hostname} ({log.ip})
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Status changed from{" "}
                    <b style={{ color: log.from === "UP" ? "green" : "red" }}>
                      {log.from}
                    </b>{" "}
                    to{" "}
                    <b style={{ color: log.to === "UP" ? "green" : "red" }}>
                      {log.to}
                    </b>
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  color="textSecondary"
                >
                  {log.time.toLocaleTimeString()}
                </Typography>
              </Paper>
            ))
          )}
        </Box>
      )}

      {/* DIALOG remains same */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {editingId ? "Edit Device" : "Add New Device"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Hostname"
            fullWidth
            margin="dense"
            value={formData.hostname}
            onChange={(e) =>
              setFormData({ ...formData, hostname: e.target.value })
            }
          />
          <TextField
            label="IP Address"
            fullWidth
            margin="dense"
            value={formData.ip_address}
            onChange={(e) =>
              setFormData({ ...formData, ip_address: e.target.value })
            }
          />
          <TextField
            label="SNMP Community"
            fullWidth
            margin="dense"
            value={formData.snmp_community}
            onChange={(e) =>
              setFormData({ ...formData, snmp_community: e.target.value })
            }
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Zone</InputLabel>
            <Select
              value={formData.options}
              label="Zone"
              onChange={(e) =>
                setFormData({ ...formData, options: e.target.value })
              }
            >
              <MenuItem value="DHK">DHK</MenuItem>
              <MenuItem value="NHK">NHK</MenuItem>
              <MenuItem value="CTG">CTG</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveDevice}
            variant="contained"
            sx={{ bgcolor: "#b50000" }}
          >
            Save Device
          </Button>
        </DialogActions>
      </Dialog>

      <audio ref={downAudio} src={downSoundFile} />
      <audio ref={upAudio} src={upSoundFile} />
    </div>
  );
};

const DeviceBlock = ({ device, onEdit, onDelete }) => {
  const isDown = device.status !== "UP";
  return (
    <Box
      sx={{
        width: "290px",
        height: "80px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: 1.5,
        bgcolor: "#fff",
        borderRadius: 2,
        borderLeft: `6px solid ${isDown ? "#dc2626" : "#10b981"}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <Box sx={{ overflow: "hidden", flex: 1 }}>
        <Typography
          fontWeight="bold"
          variant="body2"
          noWrap
          color={isDown ? "#b91c1c" : "#1e293b"}
        >
          {device.hostname}
        </Typography>
        <Typography variant="caption" color="textSecondary" display="block">
          {device.ip_address}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: "#64748b" }}
        >
          {device.options}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 0.5,
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" onClick={onEdit} sx={{ p: 0.5 }}>
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={onDelete}
            sx={{ p: 0.5 }}
            color="error"
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Typography
          fontWeight="900"
          variant="caption"
          color={isDown ? "error" : "success.main"}
        >
          {device.status}
        </Typography>
      </Box>
    </Box>
  );
};

const styles = {
  container: { minHeight: "100vh", background: "#f1f5f9", padding: "20px" },
  header: { marginBottom: "30px" },
};

export default DeviceList;
