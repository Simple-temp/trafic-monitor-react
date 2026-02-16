import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Tabs,
  Tab,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  MenuItem,
  DialogActions,
  IconButton,
  Alert,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

// --- Logic Helpers ---
const getLatencyCategory = (name, ms, latencyGroups) => {
  const group = latencyGroups[name] || {
    best: [0, 30],
    someHigh: [31, 60],
    veryHigh: [61, 100],
  };
  if (typeof ms === "string" || ms === null)
    return { category: "offline", color: "#9E9E9E" };

  if (ms >= group.best[0] && ms <= group.best[1])
    return { category: "best", color: "#4CAF50" };
  if (ms > group.best[1] && ms <= group.someHigh[1])
    return { category: "some high", color: "#FF9800" };
  return { category: "high", color: "#F44336" };
};

// --- Components ---

const PingCircle = ({ name, id, latencyGroups, onEdit, onDelete }) => {
  const [latency, setLatency] = useState([]);
  const [ip, setIp] = useState("...");
  const [lossCount, setLossCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0); // Track progress up to 100

  useEffect(() => {
    const getRealStats = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/ping?host=${encodeURIComponent(name)}`,
        );
        if (!response.ok) return;

        const data = await response.json();
        if (data.ip) setIp(data.ip);

        const nameMatches = data.host === name;
        const isTimeout = data.latency === "Timeout" || data.latency === null;

        if (nameMatches) {
          // Increment total attempts
          setTotalAttempts((prev) => {
            const nextTotal = prev + 1;

            // LOGIC: If we hit 100, reset everything
            if (nextTotal > 100) {
              setLossCount(isTimeout ? 1 : 0); // Start new cycle with 1 if current is timeout
              return 1;
            }

            // Otherwise, check for loss increment
            if (isTimeout) {
              setLossCount((l) => l + 1);
            }

            return nextTotal;
          });

          // Update Latency Display
          if (data.latency !== undefined && data.latency !== "Timeout") {
            setLatency((prev) => [data.latency, ...prev].slice(0, 2));
          } else if (data.latency === "Timeout") {
            setLatency((prev) => ["Timeout", ...prev].slice(0, 2));
          }
        }
      } catch (err) {
        console.error("Network connection error for:", name);
      }
    };

    getRealStats();
    const interval = setInterval(getRealStats, 1000);
    return () => clearInterval(interval);
  }, [name]);

  const currentLatency = latency[0];
  const { color } = getLatencyCategory(name, currentLatency, latencyGroups);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: 1,
        position: "relative",
        gap: "1px",
      }}
    >
      {/* Name Label */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: "800",
          color: "#3e2723",
          textAlign: "center",
          height: "20px",
        }}
      >
        {name?.toUpperCase() || ""}
      </Typography>

      {/* Action Buttons */}
      <IconButton
        onClick={onEdit}
        sx={{
          position: "absolute",
          top: 35,
          right: 5,
          zIndex: 10,
          color: "white",
          backgroundColor: "rgba(0,0,0,0.3)",
          width: 24,
          height: 24,
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      >
        <EditIcon sx={{ fontSize: 14 }} />
      </IconButton>
      <IconButton
        onClick={onDelete}
        sx={{
          position: "absolute",
          bottom: 35,
          right: 5,
          zIndex: 10,
          color: "white",
          backgroundColor: "rgba(0,0,0,0.3)",
          width: 24,
          height: 24,
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      >
        <DeleteIcon sx={{ fontSize: 14 }} />
      </IconButton>

      {/* Main Circle */}
      <motion.div
        animate={{ borderColor: color }}
        transition={{ duration: 0.5 }}
        style={{
          width: 102,
          height: 102,
          borderRadius: "50%",
          border: `1px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          animate={{ backgroundColor: color }}
          transition={{ duration: 0.5 }}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          <AnimatePresence mode="popLayout">
            {latency.length > 0 ? (
              <Box sx={{ textAlign: "center" }}>
                <motion.div
                  key={`${name}-${latency[0]}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Typography
                    sx={{ fontSize: "36px", fontWeight: "bold", lineHeight: 1 }}
                  >
                    {latency[0] === "Timeout" ? "!!!" : latency[0]}
                    {typeof latency[0] === "number" && (
                      <span style={{ fontSize: "14px" }}>ms</span>
                    )}
                  </Typography>
                </motion.div>

                {/* Counter Stats */}
                <Box sx={{ mt: 1 }}>
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: "900",
                      bgcolor: "rgba(0,0,0,0.2)",
                      px: 1,
                      borderRadius: "5px",
                      display: "block",
                      mb: 0.5,
                    }}
                  >
                    LOSS: {lossCount} / 100
                  </Typography>

                  {/* Small Progress Bar */}
                  <Box
                    sx={{
                      width: "60px",
                      height: "4px",
                      bgcolor: "rgba(255,255,255,0.3)",
                      borderRadius: 2,
                      mx: "auto",
                    }}
                  >
                    <Box
                      sx={{
                        width: `${totalAttempts}%`,
                        height: "100%",
                        bgcolor: "white",
                        borderRadius: 2,
                        transition: "width 0.3s",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            ) : (
              <Typography variant="button">CONNECTING</Typography>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <Typography
        variant="caption"
        sx={{ color: "#5d4037", fontWeight: "600", fontSize: "11px" }}
      >
        {ip}
      </Typography>
    </Box>
  );
};

const HomePage = () => {
  const [tabData, setTabData] = useState({});
  const [latencyGroups, setLatencyGroups] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [editId, setEditId] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [deleteName, setDeleteName] = useState("");
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    best_low: "",
    best_high: "",
    somehigh_low: "",
    somehigh_high: "",
    veryhigh_low: "",
    veryhigh_high: "",
    category: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/pingtable");
      const data = await response.json();
      setTabData(data.tabData);
      setLatencyGroups(data.latencyGroups);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleOpenAdd = () => setOpenAdd(true); // this is i want to export

  const handleCloseAdd = () => setOpenAdd(false);

  const handleOpenEdit = (dst) => {
    setEditId(dst.id);
    // Pre-fill form with existing data
    const group = latencyGroups[dst.name] || {};
    setFormData({
      id: dst.id,
      name: dst.name,
      best_low: group.best?.[0] || "",
      best_high: group.best?.[1] || "",
      somehigh_low: group.someHigh?.[0] || "",
      somehigh_high: group.someHigh?.[1] || "",
      veryhigh_low: group.veryHigh?.[0] || "",
      veryhigh_high: group.veryHigh?.[1] || "",
      category:
        Object.keys(tabData).find((cat) =>
          tabData[cat].some((item) => item.id === dst.id),
        ) || "",
    });
    setOpenEdit(true);
  };
  const handleCloseEdit = () => setOpenEdit(false);

  const handleOpenDelete = (dst) => {
    setDeleteId(dst.id);
    setDeleteName(dst.name);
    setOpenDelete(true);
  };
  const handleCloseDelete = () => setOpenDelete(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitAdd = async () => {
    try {
      await fetch("http://localhost:5000/api/pingtable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      fetchData();
      handleCloseAdd();
      setFormData({
        id: "",
        name: "",
        best_low: "",
        best_high: "",
        somehigh_low: "",
        somehigh_high: "",
        veryhigh_low: "",
        veryhigh_high: "",
        category: "",
      });
    } catch (err) {
      console.error("Error adding entry:", err);
    }
  };

  const handleSubmitEdit = async () => {
    try {
      await fetch(`http://localhost:5000/api/pingtable/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      fetchData();
      handleCloseEdit();
    } catch (err) {
      console.error("Error editing entry:", err);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await fetch(`/api/pingtable/${deleteId}`, {
        method: "DELETE",
      });
      fetchData();
      handleCloseDelete();
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  const tabNames = Object.keys(tabData);

  return (
    <Box
      sx={{
        p: { xs: 1, md: 1 },
        backgroundColor: "#fdf5e6",
        minHeight: "100vh",
      }}
    >
      <Button
        variant="contained"
        onClick={handleOpenAdd}
        sx={{ bottom: 10, bgcolor: "rgb(141, 35, 15)", fontSize:10 }}
      >
        Add Ping
      </Button>

      <Paper
        elevation={3}
        sx={{
          mb: 1,
          borderRadius: 2,
          height: "24px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            minHeight: "40px", // Shrink the container
            width: "100%",
          }}
        >
          {tabNames.map((name, index) => (
            <Tab
              key={index}
              label={name}
              sx={{
                fontWeight: "bold",
                minHeight: "40px", // Shrink the individual tabs
                fontSize: "0.95rem", // Smaller text to fit the slim bar
                py: 0, // Remove vertical padding
              }}
            />
          ))}
        </Tabs>
      </Paper>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Grid container spacing={1} justifyContent="center">
            {tabData[tabNames[activeTab]]?.map((dst) => (
              <Grid item key={dst.id}>
                <PingCircle
                  name={dst.name}
                  id={dst.id}
                  latencyGroups={latencyGroups}
                  onEdit={() => handleOpenEdit(dst)}
                  onDelete={() => handleOpenDelete(dst)}
                />
              </Grid>
            ))}
          </Grid>
        </motion.div>
      </AnimatePresence>

      {/* Add Dialog */}
      <Dialog open={openAdd} onClose={handleCloseAdd}>
        <DialogTitle>Add New Ping</DialogTitle>
        <DialogContent style={{ width: "900px !important", display: "flex" }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Best Low"
                name="best_low"
                type="number"
                value={formData.best_low}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Best High"
                name="best_high"
                type="number"
                value={formData.best_high}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Some High Low"
                name="somehigh_low"
                type="number"
                value={formData.somehigh_low}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Some High High"
                name="somehigh_high"
                type="number"
                value={formData.somehigh_high}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Very High Low"
                name="veryhigh_low"
                type="number"
                value={formData.veryhigh_low}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Very High High"
                name="veryhigh_high"
                type="number"
                value={formData.veryhigh_high}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <MenuItem value="Home">Home</MenuItem>
                <MenuItem value="International">International</MenuItem>
                <MenuItem value="BD Websites">BD Websites</MenuItem>
                <MenuItem value="BD Govt">BD Govt</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdd}>Cancel</Button>
          <Button onClick={handleSubmitAdd}>Submit</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onClose={handleCloseEdit}>
        <DialogTitle>Edit Ping</DialogTitle>
        <DialogContent style={{ width: "900px !important", display: "flex" }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Best Low"
                name="best_low"
                type="number"
                value={formData.best_low}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Best High"
                name="best_high"
                type="number"
                value={formData.best_high}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Some High Low"
                name="somehigh_low"
                type="number"
                value={formData.somehigh_low}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Some High High"
                name="somehigh_high"
                type="number"
                value={formData.somehigh_high}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Very High Low"
                name="veryhigh_low"
                type="number"
                value={formData.veryhigh_low}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Very High High"
                name="veryhigh_high"
                type="number"
                value={formData.veryhigh_high}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                sx={{ width: 250 }}
                margin="dense"
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <MenuItem value="Home">Home</MenuItem>
                <MenuItem value="International">International</MenuItem>
                <MenuItem value="BD Websites">BD Websites</MenuItem>
                <MenuItem value="BD Govt">BD Govt</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button onClick={handleSubmitEdit}>Update</Button>
        </DialogActions>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onClose={handleCloseDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Are you sure you want to delete "{deleteName}"? This action cannot
            be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HomePage;