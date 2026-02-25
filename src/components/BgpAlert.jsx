import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Grid, 
  Container, 
  CircularProgress, 
  Alert,
  Chip,
  Snackbar,
  Alert as MuiAlert,
  Button,
  Checkbox,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { 
  Wifi as WifiIcon, 
  WifiOff as WifiOffIcon,
  WarningAmber as WarningIcon,
  Remove as RemoveIcon,
  Send as SendIcon,
  History as HistoryIcon,
  Block as BlockIcon
} from '@mui/icons-material';

import downSoundFile from "../assets/inactive.wav";
import upSoundFile from "../assets/active.wav";

// BGP State Mapping
const BGP_STATES = {
  1: 'Idle',
  2: 'Connect',
  3: 'Active',
  4: 'OpenSent',
  5: 'OpenConfirm',
  6: 'Established'
};

const BgpAlert = () => {
  const [bgpPeers, setBgpPeers] = useState([]);
  const [bgpNotInUse, setBgpNotInUse] = useState([]);
  const [bgpLogs, setBgpLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0); // 0: Down, 1: Up, 2: Not in Use, 3: Log
  
  // Selected peers for submit
  const [selectedPeers, setSelectedPeers] = useState([]);
  
  // Toast notification state
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Refs for audio and tracking previous states
  const prevStatesRef = useRef({});
  const downAudioRef = useRef(null);
  const upAudioRef = useRef(null);

  // Initialize audio refs
  useEffect(() => {
    downAudioRef.current = new Audio(downSoundFile);
    upAudioRef.current = new Audio(upSoundFile);
  }, []);

  // Helper: Check if peer is UP (State 6 = Established)
  const isPeerUp = (state) => state === 6;

  // Helper: Get color based on state
  const getStatusColor = (state) => {
    if (isPeerUp(state)) return '#2e7d32'; // Green for Established (Up)
    return '#8B0000'; // Red/Brown for Down
  };

  // Helper: Get log color based on state change
  const getLogColor = (stateChange) => {
    return stateChange === 'UP' ? '#2e7d32' : '#8B0000';
  };

  // Format established time (seconds to days/hours/minutes/seconds)
  const formatEstablishedTime = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  };

  // Format date time
  const formatDateTime = (timestamp) => {
    if (!timestamp) return new Date().toLocaleString();
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Show toast notification
  const showToast = (message, severity = 'info') => {
    setToast({
      open: true,
      message,
      severity
    });
  };

  // Close toast notification
  const handleToastClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast({ ...toast, open: false });
  };

  // Fetch bgpnotinuse list
  const fetchBgpNotInUse = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/bgpnotinuse');
      if (response.data.success) {
        setBgpNotInUse(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching bgpnotinuse:", err);
    }
  };

  // Fetch bgp logs
  const fetchBgpLogs = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/bgpstatelog');
      if (response.data.success) {
        setBgpLogs(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching bgpstatelog:", err);
    }
  };

  // Fetch Data
  useEffect(() => {
    const fetchBgpData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('http://localhost:5000/api/bgppeers');
        
        // Handle the API response structure
        let data = [];
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          data = response.data.data;
        } else if (Array.isArray(response.data)) {
          data = response.data;
        }
        
        // Check for state changes and play sounds
        data.forEach(peer => {
          if (peer && peer.id) {
            playSound(peer.id, peer.bgpPeerState, peer);
          }
        });
        
        setBgpPeers(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching BGP data:", err);
        setError("Failed to load BGP peers. Please check your connection.");
        setLoading(false);
      }
    };

    fetchBgpData();
    fetchBgpNotInUse();
    fetchBgpLogs();
    
    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchBgpData();
      fetchBgpNotInUse();
      fetchBgpLogs();
    }, 300000);
    
    return () => clearInterval(interval);
  }, []);

  // Log state change to database
  const logStateChange = async (peerData, prevState, newState) => {
    try {
      await axios.post('http://localhost:5000/api/bgpstatelog', {
        device_id: peerData.device_id,
        device_name: peerData.hostname || peerData.device_id,
        device_ip: peerData.ip_address || '',
        remote_ip: peerData.bgpPeerRemoteAddr,
        remote_as: peerData.bgpPeerRemoteAs,
        previous_state: prevState,
        new_state: newState,
        state_change: isPeerUp(newState) ? 'UP' : 'DOWN'
      });
      fetchBgpLogs();
    } catch (err) {
      console.error("Error logging state change:", err);
    }
  };

  // Play sound and show toast based on state change
  const playSound = (peerId, newState, peerData) => {
    const prevState = prevStatesRef.current[peerId];
    
    // Only play sound if state actually changed
    if (prevState !== undefined && prevState !== newState) {
      const deviceName = peerData?.hostname || peerData?.device_id || 'Unknown Device';
      const remoteIP = peerData?.bgpPeerRemoteAddr || 'Unknown IP';
      
      if (isPeerUp(newState) && !isPeerUp(prevState)) {
        // Came UP - play up sound and show success toast
        if (upAudioRef.current) {
          upAudioRef.current.currentTime = 0;
          upAudioRef.current.play().catch(e => console.log('Audio play error:', e));
        }
        showToast(`✅ ${deviceName} - BGP UP (${remoteIP})`, 'success');
      } else if (!isPeerUp(newState) && isPeerUp(prevState)) {
        // Went DOWN - play down sound and show error toast
        if (downAudioRef.current) {
          downAudioRef.current.currentTime = 0;
          downAudioRef.current.play().catch(e => console.log('Audio play error:', e));
        }
        showToast(`❌ ${deviceName} - BGP DOWN (${remoteIP})`, 'error');
      }
      
      // Log to database
      logStateChange(peerData, prevState, newState);
    }
    
    // Update previous state
    prevStatesRef.current[peerId] = newState;
  };

  // Handle checkbox change
  const handleCheckboxChange = (peer, isChecked) => {
    if (isChecked) {
      setSelectedPeers(prev => [...prev, peer]);
    } else {
      setSelectedPeers(prev => prev.filter(p => p.bgpPeerRemoteAddr !== peer.bgpPeerRemoteAddr));
    }
  };

  // Submit selected peers to bgpnotinuse
  const handleSubmitSelected = async () => {
    if (selectedPeers.length === 0) {
      showToast('Please select at least one peer', 'warning');
      return;
    }

    try {
      for (const peer of selectedPeers) {
        await axios.post('http://localhost:5000/api/bgpnotinuse', {
          device_id: peer.device_id,
          device_name: peer.hostname || peer.device_id,
          device_ip: peer.ip_address || '',
          remote_ip: peer.bgpPeerRemoteAddr,
          remote_as: peer.bgpPeerRemoteAs
        });
      }
      
      showToast(`${selectedPeers.length} peer(s) moved to excluded list`, 'success');
      setSelectedPeers([]);
      fetchBgpNotInUse();
    } catch (err) {
      console.error("Error submitting selected peers:", err);
      showToast('Failed to submit selected peers', 'error');
    }
  };

  // Remove from bgpnotinuse
  const handleRemoveFromExcluded = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/bgpnotinuse/${id}`);
      showToast('Peer removed from excluded list', 'info');
      fetchBgpNotInUse();
    } catch (err) {
      console.error("Error removing from excluded:", err);
      showToast('Failed to remove peer', 'error');
    }
  };

  // Process peers with sorting
  const getProcessedPeers = () => {
    if (!Array.isArray(bgpPeers)) return [];

    // Get excluded remote IPs
    const excludedIPs = bgpNotInUse.map(item => item.remote_ip);

    // Separate into Up and Down (filter out excluded from down list)
    const downPeers = bgpPeers.filter(p => 
      !isPeerUp(p.bgpPeerState) && !excludedIPs.includes(p.bgpPeerRemoteAddr)
    );
    const upPeers = bgpPeers.filter(p => isPeerUp(p.bgpPeerState));

    // Sort Down peers: Most critical (lowest state) first, then by established time
    downPeers.sort((a, b) => {
      if (a.bgpPeerState !== b.bgpPeerState) {
        return a.bgpPeerState - b.bgpPeerState;
      }
      const aTime = a.bgpPeerFsmEstablishedTime || 0;
      const bTime = b.bgpPeerFsmEstablishedTime || 0;
      return aTime - bTime;
    });

    // Sort Up peers: Low uptime (just established) to High uptime (long running)
    upPeers.sort((a, b) => {
      const aTime = a.bgpPeerFsmEstablishedTime || 0;
      const bTime = b.bgpPeerFsmEstablishedTime || 0;
      return aTime - bTime;
    });

    // Return based on tab
    if (tabValue === 1) {
      return upPeers;
    } else {
      return downPeers;
    }
  };

  // Calculate counts
  const excludedIPs = bgpNotInUse.map(item => item.remote_ip);
  const upCount = Array.isArray(bgpPeers) ? bgpPeers.filter(p => isPeerUp(p.bgpPeerState)).length : 0;
  const downCount = Array.isArray(bgpPeers) 
    ? bgpPeers.filter(p => !isPeerUp(p.bgpPeerState) && !excludedIPs.includes(p.bgpPeerRemoteAddr)).length 
    : 0;

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSelectedPeers([]); // Clear selection when switching tabs
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const displayPeers = getProcessedPeers();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <div style={{display:"flex"}}>
            <Typography variant="h4" gutterBottom component="div" sx={{ fontWeight: 'bold', color: '#000000', mb: 3 }}>
        BGP Monitor
      </Typography>

      {/* Submit Button - Top Left */}
      {tabValue === 0 && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, marginLeft: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<SendIcon />}
            onClick={handleSubmitSelected}
            disabled={selectedPeers.length === 0}
            sx={{ 
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' }
            }}
          >
            Submit Selected ({selectedPeers.length})
          </Button>
          {selectedPeers.length > 0 && (
            <Typography variant="caption" color="textSecondary">
              {selectedPeers.length} peer(s) selected
            </Typography>
          )}
        </Box>
      )}
      </div> 

      {/* Tabs Section - Down, Up, Not in Use, Log */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="bgp status tabs"
        >
          {/* Down Tab - Red/Brown color */}
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WifiOffIcon sx={{ fontSize: 18 }} />
                <span>Down</span>
                <Chip 
                  label={downCount} 
                  size="small" 
                  sx={{ 
                    height: 20, 
                    minWidth: 20,
                    bgcolor: downCount > 0 ? '#8B0000' : '#ccc', 
                    color: 'white',
                    fontSize: '0.75rem'
                  }} 
                />
              </Box>
            }
            sx={{ 
              color: downCount > 0 ? '#8B0000' : '#666', 
              '&.Mui-selected': { color: '#8B0000' } 
            }}
          />
          
          {/* Up Tab */}
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WifiIcon sx={{ fontSize: 18 }} />
                <span>Up</span>
                <Chip 
                  label={upCount} 
                  size="small" 
                  sx={{ 
                    height: 20, 
                    minWidth: 20,
                    bgcolor: '#2e7d32', 
                    color: 'white',
                    fontSize: '0.75rem'
                  }} 
                />
              </Box>
            }
            sx={{ color: '#2e7d32', '&.Mui-selected': { color: '#2e7d32' } }}
          />

          {/* Not in Use Tab */}
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BlockIcon sx={{ fontSize: 18 }} />
                <span>Not in Use</span>
                <Chip 
                  label={bgpNotInUse.length} 
                  size="small" 
                  sx={{ 
                    height: 20, 
                    minWidth: 20,
                    bgcolor: '#666', 
                    color: 'white',
                    fontSize: '0.75rem'
                  }} 
                />
              </Box>
            }
            sx={{ color: '#666', '&.Mui-selected': { color: '#666' } }}
          />

          {/* Log Tab */}
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon sx={{ fontSize: 18 }} />
                <span>Log</span>
                <Chip 
                  label={bgpLogs.length} 
                  size="small" 
                  sx={{ 
                    height: 20, 
                    minWidth: 20,
                    bgcolor: '#1976d2', 
                    color: 'white',
                    fontSize: '0.75rem'
                  }} 
                />
              </Box>
            }
            sx={{ color: '#1976d2', '&.Mui-selected': { color: '#1976d2' } }}
          />
		          </Tabs>
      </Box>

      {/* Tab Content */}
      
      {/* DOWN TAB CONTENT */}
      {tabValue === 0 && (
        <Grid container spacing={2} justifyContent="flex-start">
          {displayPeers.map((peer) => {
            if (!peer || typeof peer !== 'object') return null;

            const isUp = isPeerUp(peer.bgpPeerState);
            const themeColor = getStatusColor(peer.bgpPeerState);
            const statusLabel = BGP_STATES[peer.bgpPeerState] || 'Unknown';
            const isSelected = selectedPeers.some(p => p.bgpPeerRemoteAddr === peer.bgpPeerRemoteAddr);
            
            return (
              <Grid item key={peer.id || Math.random()}>
                <Box sx={{
                  width: "230px", 
                  height: "105px",
                  p: 1, 
                  bgcolor: isSelected ? '#e3f2fd' : '#fff', 
                  borderRadius: 1, 
                  borderLeft: `6px solid ${themeColor}`,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)", 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: 0.5,
                  transition: '0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: "0 4px 8px rgba(0,0,0,0.15)"
                  }
                }}>
                  {/* Header: Hostname, Checkbox & Status Icon */}
                  <Box sx={{ display: "flex", justifyContent: 'space-between', alignItems: "center" }}>
                    <Typography variant="caption" fontWeight="bold" color="textSecondary" noWrap sx={{ maxWidth: '70px' }}>
                      {peer.hostname || peer.device_id}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleCheckboxChange(peer, e.target.checked)}
                        size="small"
                        sx={{ p: 0, ml: 0.5 }}
                      />
                      <WarningIcon sx={{ fontSize: 12, color: '#8B0000' }} />
                      <WifiOffIcon sx={{ fontSize: 14, color: '#8B0000' }} />
                    </Box>
                  </Box>

                  {/* Remote IP */}
                  <Typography variant="body2" fontWeight="900" noWrap sx={{ color: "#0f172a", fontSize: '0.75rem' }}>
                    {peer.bgpPeerRemoteAddr || 'N/A'}
                  </Typography>

                  {/* Bottom: AS & State */}
                  <Box sx={{ mt: 'auto', display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" fontWeight="bold" sx={{ color: "#A52A2A", fontSize: '0.65rem' }}>
                      AS {peer.bgpPeerRemoteAs}
                    </Typography>
                    <Chip 
                      label={statusLabel} 
                      size="small"
                      sx={{ 
                        height: 16, 
                        fontSize: '0.6rem',
                        bgcolor: themeColor,
                        color: 'white',
                        minWidth: '50px'
                      }} 
                    />
                  </Box>

                  {/* Additional Info: Local IP & Established Time */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#666", fontSize: '0.6rem' }}>
                      {peer.ip_address || 'N/A'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: themeColor, fontSize: '0.6rem', fontWeight: 'bold' }}>
                      {formatEstablishedTime(peer.bgpPeerFsmEstablishedTime)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            );
          })}
          {displayPeers.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body1" align="center" color="text.secondary" sx={{ mt: 4 }}>
                No down peers found.
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      {/* UP TAB CONTENT */}
      {tabValue === 1 && (
        <Grid container spacing={2} justifyContent="flex-start">
          {displayPeers.map((peer) => {
            if (!peer || typeof peer !== 'object') return null;

            const isUp = isPeerUp(peer.bgpPeerState);
            const themeColor = getStatusColor(peer.bgpPeerState);
            const statusLabel = BGP_STATES[peer.bgpPeerState] || 'Unknown';
            
            return (
              <Grid item key={peer.id || Math.random()}>
                <Box sx={{
                  width: "230px", 
                  height: "105px",
                  p: 1, 
                  bgcolor: '#fff', 
                  borderRadius: 1, 
                  borderLeft: `6px solid ${themeColor}`,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)", 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: 0.5,
                  transition: '0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: "0 4px 8px rgba(0,0,0,0.15)"
                  }
                }}>
                  {/* Header: Hostname & Status Icon */}
                  <Box sx={{ display: "flex", justifyContent: 'space-between', alignItems: "center" }}>
                    <Typography variant="caption" fontWeight="bold" color="textSecondary" noWrap sx={{ maxWidth: '80px' }}>
                      {peer.hostname || peer.device_id}
                    </Typography>
                    <WifiIcon sx={{ fontSize: 14, color: '#2e7d32' }} />
                  </Box>

                  {/* Remote IP */}
                  <Typography variant="body2" fontWeight="900" noWrap sx={{ color: "#0f172a", fontSize: '0.75rem' }}>
                    {peer.bgpPeerRemoteAddr || 'N/A'}
                  </Typography>

                  {/* Bottom: AS & State */}
                  <Box sx={{ mt: 'auto', display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" fontWeight="bold" sx={{ color: "#A52A2A", fontSize: '0.65rem' }}>
                      AS {peer.bgpPeerRemoteAs}
                    </Typography>
                    <Chip 
                      label={statusLabel} 
                      size="small"
                      sx={{ 
                        height: 16, 
                        fontSize: '0.6rem',
                        bgcolor: themeColor,
                        color: 'white',
                        minWidth: '50px'
                      }} 
                    />
                  </Box>

                  {/* Additional Info: Local IP & Established Time */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#666", fontSize: '0.6rem' }}>
                      {peer.ip_address || 'N/A'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: themeColor, fontSize: '0.6rem', fontWeight: 'bold' }}>
                      {formatEstablishedTime(peer.bgpPeerFsmEstablishedTime)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            );
          })}
          {displayPeers.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body1" align="center" color="text.secondary" sx={{ mt: 4 }}>
                No up peers found.
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      {/* NOT IN USE TAB CONTENT */}
      {tabValue === 2 && (
        <Grid container spacing={2} justifyContent="flex-start">
          {bgpNotInUse.map((item) => (
            <Grid item key={item.id}>
              <Box sx={{
                width: "230px", 
                height: "80px",
                p: 1, 
                bgcolor: "#f5f5f5", 
                borderRadius: 1, 
                borderLeft: `4px solid #666`,
                display: "flex", 
                flexDirection: "column", 
                justifyContent: "center",
                gap: 0.5,
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" fontWeight="bold" color="textSecondary">
                    {item.device_name}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => handleRemoveFromExcluded(item.id)}
                    sx={{ p: 0.5 }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="body2" fontWeight="900" sx={{ color: "#333", fontSize: '0.75rem' }}>
                  {item.remote_ip}
                </Typography>
                <Typography variant="caption" sx={{ color: "#999", fontSize: '0.65rem' }}>
                  AS {item.remote_as} • {formatDateTime(item.created_at)}
                </Typography>
              </Box>
            </Grid>
          ))}
          {bgpNotInUse.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body1" align="center" color="text.secondary" sx={{ mt: 4 }}>
                No excluded peers found.
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      {/* LOG TAB CONTENT */}
      {tabValue === 3 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {bgpLogs.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No logs found.
            </Typography>
          ) : (
            bgpLogs.map((log) => (
              <Paper
                key={log.id}
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: `6px solid ${getLogColor(log.state_change)}`,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  transition: '0.2s',
                  '&:hover': {
                    transform: 'translateX(4px)',
                    boxShadow: "0 4px 8px rgba(0,0,0,0.15)"
                  }
                }}
              >
                {/* Left Section: Device Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#333' }}>
                      {log.device_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      {log.device_ip}
                    </Typography>
                  </Box>
                </Box>

                {/* Middle Section: Remote Info */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight="900" sx={{ color: '#0f172a' }}>
                    {log.remote_ip}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#A52A2A', fontWeight: 'bold' }}>
                    AS {log.remote_as}
                  </Typography>
                </Box>

                {/* Right Section: State Change */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#999' }}>Previous</Typography>
                    <Chip 
                      label={BGP_STATES[log.previous_state] || log.previous_state} 
                      size="small"
                      sx={{ 
                        bgcolor: '#999',
                        color: 'white',
                        fontSize: '0.65rem',
                        height: 20
                      }} 
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#999' }}>New</Typography>
                    <Chip 
                      label={BGP_STATES[log.new_state] || log.new_state} 
                      size="small"
                      sx={{ 
                        bgcolor: getLogColor(log.state_change),
                        color: 'white',
                        fontSize: '0.65rem',
                        height: 20
                      }} 
                    />
                  </Box>
                  <Chip 
                    label={log.state_change} 
                    size="small"
                    sx={{ 
                      bgcolor: getLogColor(log.state_change),
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      minWidth: 50
                    }} 
                  />
                </Box>

                {/* Date/Time */}
                <Typography variant="caption" sx={{ color: '#666', minWidth: 120, textAlign: 'right' }}>
                  {formatDateTime(log.created_at)}
                </Typography>
              </Paper>
            ))
          )}
        </Box>
      )}

      {/* Toast Notification */}
      <Snackbar 
        open={toast.open} 
        autoHideDuration={5000} 
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MuiAlert 
          onClose={handleToastClose} 
          severity={toast.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </MuiAlert>
      </Snackbar>
    </Container>
  );
};

export default BgpAlert;