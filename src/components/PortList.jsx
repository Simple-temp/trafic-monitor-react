import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import downSoundFile from "../assets/inactive.wav";
import upSoundFile from "../assets/active.wav";
import { ToastContainer, toast } from 'react-toastify';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Checkbox, List, ListItem, ListItemText, ListItemIcon, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const socket = io("http://localhost:5000");

function speak(text) {
  if (!window.speechSynthesis) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 0.95;
  msg.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

export default function PortList() {
  const [interfaces, setInterfaces] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [upPorts, setUpPorts] = useState([]);
  const [downInList, setDownInList] = useState([]);
  const [animating, setAnimating] = useState({});
  const [openAddDialog, setOpenAddDialog] = useState(false); // State for add port popup
  const [popupSearchQuery, setPopupSearchQuery] = useState(""); // Search in popup
  const [popupZoneFilter, setPopupZoneFilter] = useState(""); // Zone filter in popup
  const [popupIfIndexFilter, setPopupIfIndexFilter] = useState(""); // ifIndex filter in popup
  const [selectedPorts, setSelectedPorts] = useState([]); // Selected ports in popup
  const [addedPorts, setAddedPorts] = useState([]); // Added ports to display
  const [isLoaded, setIsLoaded] = useState(false); // Loading state for initial data

  const lastStatus = useRef({});
  const timers = useRef({});
  const downAudio = useRef(null);
  const upAudio = useRef(null);

  // Load added ports from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("addedPorts");
    if (saved) {
      setAddedPorts(JSON.parse(saved));
    }
  }, []);

  // Save added ports to localStorage every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem("addedPorts", JSON.stringify(addedPorts));
    }, 1000); // 1 second interval

    return () => clearInterval(interval); // Cleanup on unmount
  }, [addedPorts]);

  useEffect(() => {
    axios.get("http://localhost:5000/api/devices").then((res) => {
      console.log(res.data);
      setInterfaces(res.data.interfaces);
      const initialStatuses = {};
      const initialUpPorts = [];
      res.data.interfaces.forEach((iface) => {
        if (!initialStatuses[iface.device_id])
          initialStatuses[iface.device_id] = {};
        initialStatuses[iface.device_id][iface.ifIndex] = iface.ifOperStatus;
        const key = `${iface.device_id}_${iface.ifIndex}`;
        lastStatus.current[key] = iface.ifOperStatus === 1 ? "UP" : "DOWN";
        if (iface.ifOperStatus === 1) {
          initialUpPorts.push(iface);
        }
      });
      initialUpPorts.sort((a, b) => a.ifIndex - b.ifIndex); // Sort UP ports by ifIndex
      setStatuses(initialStatuses);
      setUpPorts(initialUpPorts);
      setIsLoaded(true); // Set loaded after data is fetched
    });
  }, []);

  useEffect(() => {
    const handleTraffic = (data) => {
      const newStatuses = { ...statuses };
      let hasChanges = false;
      Object.entries(data).forEach(([devId, ifs]) => {
        if (!newStatuses[devId]) newStatuses[devId] = {};
        Object.entries(ifs).forEach(([ifIndex, v]) => {
          if (
            v.status !== undefined &&
            newStatuses[devId][ifIndex] !== v.status
          ) {
            newStatuses[devId][ifIndex] = v.status;
            hasChanges = true;
          }
        });
      });
      if (hasChanges) setStatuses({ ...newStatuses });

      // Alarm logic for all interfaces - immediate audio, delayed toast for DOWN, immediate for UP
      Object.entries(data).forEach(([devId, ifs]) => {
        Object.entries(ifs).forEach(([ifIndex, v]) => {
          const key = `${devId}_${ifIndex}`;
          // Find the interface to get ifAlias (fixed type comparison and variable name)
          const iface = interfaces.find(
            (i) =>
              i.device_id === parseInt(devId) && i.ifIndex === parseInt(ifIndex)
          );
          const alias = iface && iface.ifAlias ? iface.ifAlias : key; // Fallback to key if ifAlias is not available

          const currentStatus = v.status === 1 ? "UP" : "DOWN";
          const prevStatus = lastStatus.current[key];

          if (prevStatus && prevStatus !== currentStatus) {
            if (currentStatus === "DOWN") {
              // Add to downInList at the top, remove from upPorts if present
              setDownInList((prev) => [
                iface,
                ...prev.filter((i) => `${i.device_id}_${i.ifIndex}` !== key),
              ]);
              setUpPorts((prev) =>
                prev.filter((i) => `${i.device_id}_${i.ifIndex}` !== key)
              );
              setAnimating((prev) => ({ ...prev, [key]: "down" }));
              setTimeout(
                () => setAnimating((prev) => ({ ...prev, [key]: null })),
                1000
              );

              // Play DOWN audio immediately
              playAudio(downAudio);
              speak(`Alert! ${alias} is down`);

              // Schedule toast after 10s
              if (!timers.current[key]) {
                timers.current[key] = setTimeout(() => {
                  toast.error(`⚠️ ${alias} is DOWN`);
                  delete timers.current[key];
                }, 10000); // Fixed to 10s delay
              }
            } else if (currentStatus === "UP") {
              // Remove from downInList, add to upPorts in sorted position
              setDownInList((prev) =>
                prev.filter((i) => `${i.device_id}_${i.ifIndex}` !== key)
              );
              setUpPorts((prev) => {
                const newUp = [
                  ...prev.filter((i) => `${i.device_id}_${i.ifIndex}` !== key),
                  iface,
                ];
                newUp.sort((a, b) => a.ifIndex - b.ifIndex);
                return newUp;
              });
              setAnimating((prev) => ({ ...prev, [key]: "up" }));
              setTimeout(
                () => setAnimating((prev) => ({ ...prev, [key]: null })),
                1000
              );

              // Clear any pending DOWN toast
              if (timers.current[key]) {
                clearTimeout(timers.current[key]);
                delete timers.current[key];
              }

              // Play UP audio immediately
              playAudio(upAudio);
              speak(`${alias} is up`);

              // Show UP toast immediately
              toast.success(`✅ ${alias} is back UP`);
            }
          }
          lastStatus.current[key] = currentStatus;
        });
      });
    };

    socket.on("traffic", handleTraffic);
    return () => {
      socket.off("traffic", handleTraffic);
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [interfaces, statuses]);

  // Audio control function (added debug logs)
  const playAudio = (audioRef) => {
    if (!audioRef.current) {
      console.log("Audio ref not ready");
      return;
    }
    console.log("Playing audio:", audioRef.current.src);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.error("Audio play failed:", err);
    });
  };

  // Filter UP ports for popup (only UP status, by zone, search, and ifIndex)
const popupFilteredPorts = upPorts.filter((i) => {
  const query = popupSearchQuery.toLowerCase();
  const zoneMatch = !popupZoneFilter || i.options === popupZoneFilter; // Changed from i.device_option to i.option
  console.log(zoneMatch)
  const ifIndexMatch = !popupIfIndexFilter || i.ifIndex.toString() === popupIfIndexFilter;
  const searchMatch =
    i.device_name.toLowerCase().includes(query) ||
    i.ifDescr.toLowerCase().includes(query) ||
    (i.ifAlias && i.ifAlias.toLowerCase().includes(query));
  return zoneMatch && ifIndexMatch && searchMatch;
});

  // Handle adding selected ports
  const handleAddPorts = () => {
    const newAdded = selectedPorts.filter(
      (port) => !addedPorts.some((added) => `${added.device_id}_${added.ifIndex}` === `${port.device_id}_${port.ifIndex}`)
    );
    setAddedPorts((prev) => [...prev, ...newAdded]);
    setSelectedPorts([]);
    setOpenAddDialog(false);
    toast.success("Selected ports added successfully!");
  };

  // Handle removing a port with confirmation
  const handleRemovePort = (port) => {
    if (window.confirm(`Are you sure you want to remove the port: ${port.device_name} : ${port.ifDescr}?`)) {
      setAddedPorts((prev) =>
        prev.filter((p) => `${p.device_id}_${p.ifIndex}` !== `${port.device_id}_${port.ifIndex}`)
      );
      toast.info(`Port ${port.device_name} : ${port.ifDescr} removed`);
    }
  };

  // Handle checkbox change in popup
  const handleCheckboxChange = (port) => {
    const key = `${port.device_id}_${port.ifIndex}`;
    setSelectedPorts((prev) =>
      prev.some((p) => `${p.device_id}_${p.ifIndex}` === key)
        ? prev.filter((p) => `${p.device_id}_${p.ifIndex}` !== key)
        : [...prev, port]
    );
  };

  // Sort addedPorts: DOWN ports first, then UP ports
  const sortedAddedPorts = [...addedPorts].sort((a, b) => {
    const statusA = statuses[a.device_id]?.[a.ifIndex] === 1 ? "UP" : "DOWN";
    const statusB = statuses[b.device_id]?.[b.ifIndex] === 1 ? "UP" : "DOWN";
    if (statusA === "DOWN" && statusB !== "DOWN") return -1;
    if (statusA !== "DOWN" && statusB === "DOWN") return 1;
    return 0; // Keep original order for same status
  });

  return (
    <div
      style={{
        height: "100vh",
        // width: "100vw",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <ToastContainer position="top-right" />

      {/* Add Port Button in Top Right */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpenAddDialog(true)}
        style={{ position: "absolute", top: "20px", right: "20px",     backgroundColor :"#b50000",
    color: "#fff",}}
      >
        Add Port
      </Button>

      {/* Added Ports Section - Only show when loaded and there are added ports */}
      {isLoaded && addedPorts.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3>Added Ports</h3>
          {sortedAddedPorts.map((i) => {
            const key = `${i.device_id}_${i.ifIndex}`;
            const currentStatus = statuses[i.device_id]?.[i.ifIndex] === 1 ? "UP" : "DOWN";
            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  backgroundColor: currentStatus === "UP" ? "#f0f8f0" : "#fff5f5",
                  marginBottom: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: "16px", color: "#333", flex: 1 }}>
                  {i.device_name} : {i.ifDescr} {i.ifAlias && `(${i.ifAlias})`}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    backgroundColor: currentStatus === "UP" ? "#e8f5e8" : "#ffebee",
                    color: currentStatus === "UP" ? "#4CAF50" : "#F44336",
                  }}
                >
                  Status: {currentStatus}
                </div>
                <IconButton onClick={() => handleRemovePort(i)} style={{ marginLeft: "10px" }}>
                  <CloseIcon />
                </IconButton>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Port Dialog (Popup) */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        maxWidth={false} // Allow custom width
        PaperProps={{
          style: { width: '1200px', height: '900px' }, // Adjusted width for usability
        }}
      >
        <DialogTitle>Add Ports</DialogTitle>
        <DialogContent>
          {/* Filters at Left Top */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <FormControl variant="outlined" size="small" style={{ minWidth: '80px' }}>
              <InputLabel>All</InputLabel>
              <Select
                value={popupZoneFilter}
                onChange={(e) => setPopupZoneFilter(e.target.value)}
                label="All"
              >
                <MenuItem value=""></MenuItem>
                {/* <MenuItem value="DHK">DHK</MenuItem>
                <MenuItem value="NHK">NHK</MenuItem>
                <MenuItem value="CTG">CTG</MenuItem> */}
              </Select>
            </FormControl>
            <TextField
              label="Search"
              variant="outlined"
              size="small"
              value={popupSearchQuery}
              onChange={(e) => setPopupSearchQuery(e.target.value)}
              style={{ minWidth: '80px' }}
            />
            <TextField
              label="Filter by ifIndex"
              variant="outlined"
              size="small"
              value={popupIfIndexFilter}
              onChange={(e) => setPopupIfIndexFilter(e.target.value)}
              style={{ minWidth: '80px' }}
            />
          </div>

          {/* List of UP Ports with Checkboxes */}
          <List style={{ maxHeight: '700px', overflowY: 'auto' }}>
            {popupFilteredPorts.map((port) => {
              const key = `${port.device_id}_${port.ifIndex}`;
              const isSelected = selectedPorts.some((p) => `${p.device_id}_${p.ifIndex}` === key);
              return (
                <ListItem key={key} button onClick={() => handleCheckboxChange(port)}>
                  <ListItemIcon>
                    <Checkbox checked={isSelected} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <span>
                        {port.device_name} : {port.ifDescr} {port.ifAlias ? `(${port.ifAlias})` : ''} 
                        <strong style={{ color: '#4CAF50' }}> (UP)</strong>
                      </span>
                    } 
                  />
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions style={{ justifyContent: 'flex-end' }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddPorts} variant="contained" color="primary" style={{    backgroundColor :"#b50000",
    color: "#fff",}}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* AUDIO */}
      <audio ref={downAudio} src={downSoundFile} preload="auto" />
      <audio ref={upAudio} src={upSoundFile} preload="auto" />

      <style>
        {`
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
          @keyframes jumpUp {
            0% { transform: translateY(20px); opacity: 0; }
            50% { transform: translateY(-10px); opacity: 1; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes jumpDown {
            0% { transform: translateY(-20px); opacity: 0; }
            50% { transform: translateY(10px); opacity: 1; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}