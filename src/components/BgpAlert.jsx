import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Box, Typography, Tabs, Tab, Grid, Container, CircularProgress, Alert, Chip,
  Snackbar, Alert as MuiAlert, Button, Checkbox, IconButton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination
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
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0); // 0: Down, 1: Up, 2: Not in Use, 3: Log

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
    if (isPeerUp(state)) return '#2e7d32'; // Green
    return '#8B0000'; // Dark Red
  };

  const getLogColor = (stateChange) => {
    return stateChange === 'UP' ? '#2e7d32' : '#8B0000';
  };

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

  const formatDateTime = (timestamp) => {
    if (!timestamp) return new Date().toLocaleString();
    return new Date(timestamp).toLocaleString();
  };

  const showToast = (message, severity = 'info') => {
    setToast({ open: true, message, severity });
  };

  const handleToastClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast({ ...toast, open: false });
  };

  const fetchBgpNotInUse = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/bgpnotinuse');
      if (response.data.success) setBgpNotInUse(response.data.data);
    } catch (err) { console.error("Error fetching bgpnotinuse:", err); }
  };

  const fetchBgpLogs = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/bgpstatelog');
      if (response.data.success) setBgpLogs(response.data.data);
    } catch (err) { console.error("Error fetching bgpstatelog:", err); }
  };

  useEffect(() => {
    const fetchBgpData = async () => {
      try {
        const response = await axios.get('/api/bgppeers');
        let data = [];
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          data = response.data.data;
        } else if (Array.isArray(response.data)) {
          data = response.data;
        }
        data.forEach(peer => {
          if (peer && peer.id) playSound(peer.id, peer.bgpPeerState, peer);
        });
        setBgpPeers(data);
      } catch (err) {
        setError("Failed to load BGP peers.");
      }
    };

    fetchBgpData();
    fetchBgpNotInUse();
    fetchBgpLogs();
    const interval = setInterval(() => {
      fetchBgpData();
      fetchBgpNotInUse();
      fetchBgpLogs();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    } catch (err) { console.error("Error logging state change:", err); }
  };

  const playSound = (peerId, newState, peerData) => {
    const prevState = prevStatesRef.current[peerId];
    if (prevState !== undefined && prevState !== newState) {
      const deviceName = peerData?.hostname || peerData?.device_id || 'Unknown Device';
      const remoteIP = peerData?.bgpPeerRemoteAddr || 'Unknown IP';
      if (isPeerUp(newState) && !isPeerUp(prevState)) {
        if (upAudioRef.current) {
          upAudioRef.current.currentTime = 0;
          upAudioRef.current.play().catch(e => {});
        }
        showToast(`BGP UP: ${deviceName} (${remoteIP})`, 'success');
      } else if (!isPeerUp(newState) && isPeerUp(prevState)) {
        if (downAudioRef.current) {
          downAudioRef.current.currentTime = 0;
          downAudioRef.current.play().catch(e => {});
        }
        showToast(`BGP DOWN: ${deviceName} (${remoteIP})`, 'error');
      }
      logStateChange(peerData, prevState, newState);
    }
    prevStatesRef.current[peerId] = newState;
  };

  const handleCheckboxChange = (peer, isChecked) => {
    if (isChecked) {
      setSelectedPeers(prev => [...prev, peer]);
    } else {
      setSelectedPeers(prev => prev.filter(p => p.bgpPeerRemoteAddr !== peer.bgpPeerRemoteAddr));
    }
  };

  const handleSubmitSelected = async () => {
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
      showToast(`${selectedPeers.length} peer(s) excluded`, 'success');
      setSelectedPeers([]);
      fetchBgpNotInUse();
    } catch (err) { showToast('Failed to submit', 'error'); }
  };

  const handleRemoveFromExcluded = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/bgpnotinuse/${id}`);
      showToast('Peer removed from excluded', 'info');
      fetchBgpNotInUse();
    } catch (err) { showToast('Failed to remove', 'error'); }
  };

  const getProcessedPeers = () => {
    if (!Array.isArray(bgpPeers)) return [];
    const excludedIPs = bgpNotInUse.map(item => item.remote_ip);
    let result = [];

    if (tabValue === 0) {
      result = bgpPeers.filter(p => !isPeerUp(p.bgpPeerState) && !excludedIPs.includes(p.bgpPeerRemoteAddr));
      result.sort((a, b) => (a.bgpPeerState - b.bgpPeerState) || (a.bgpPeerFsmEstablishedTime - b.bgpPeerFsmEstablishedTime));
    } else if (tabValue === 1) {
      result = bgpPeers.filter(p => isPeerUp(p.bgpPeerState));
      result.sort((a, b) => a.bgpPeerFsmEstablishedTime - b.bgpPeerFsmEstablishedTime);
    } else if (tabValue === 2) {
      result = bgpNotInUse;
    } else {
      result = bgpLogs;
    }

    return result.slice(0, 50000); // Max 200 data per tab
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
    setSelectedPeers([]);
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;

  const displayData = getProcessedPeers();
  const paginatedData = displayData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const excludedIPsCount = bgpNotInUse.map(item => item.remote_ip);
  const upCount = bgpPeers.filter(p => isPeerUp(p.bgpPeerState)).length;
  const downCount = bgpPeers.filter(p => !isPeerUp(p.bgpPeerState) && !excludedIPsCount.includes(p.bgpPeerRemoteAddr)).length;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>BGP Monitor</Typography>
        {tabValue === 0 && (
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSubmitSelected}
            disabled={selectedPeers.length === 0}
            size="small"
            sx={{ bgcolor: "rgb(141, 35, 15) !important", color: "#fff", "&:hover": { bgcolor: "#A0522D" } }}
          >
            Exclude Selected ({selectedPeers.length})
          </Button>
        )}
      </Box>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Down <Chip label={downCount} size="small" sx={{ bgcolor: '#8B0000', color: 'white' }} /></Box>} />
        <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Up <Chip label={upCount} size="small" sx={{ bgcolor: '#2e7d32', color: 'white' }} /></Box>} />
        <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Excluded <Chip label={bgpNotInUse.length} size="small" /></Box>} />
        <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Logs <Chip label={bgpLogs.length} size="small" /></Box>} />
      </Tabs>

      <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              {tabValue === 0 && <TableCell padding="checkbox" />}
              <TableCell><b>Device</b></TableCell>
              <TableCell><b>Remote IP</b></TableCell>
              <TableCell><b>AS Number</b></TableCell>
              {tabValue < 2 ? (
                <>
                  <TableCell><b>State</b></TableCell>
                  <TableCell><b>Duration</b></TableCell>
                </>
              ) : tabValue === 2 ? (
                <>
                  <TableCell><b>Excluded At</b></TableCell>
                  <TableCell align="right"><b>Action</b></TableCell>
                </>
              ) : (
                <>
                  <TableCell><b>Event</b></TableCell>
                  <TableCell><b>Timestamp</b></TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow key={row.id || index} hover>
                {tabValue === 0 && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedPeers.some(p => p.bgpPeerRemoteAddr === row.bgpPeerRemoteAddr)}
                      onChange={(e) => handleCheckboxChange(row, e.target.checked)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">{row.hostname || row.device_name || row.device_id}</Typography>
                  <Typography variant="caption" color="textSecondary">{row.ip_address || row.device_ip}</Typography>
                </TableCell>
                <TableCell>{row.bgpPeerRemoteAddr || row.remote_ip}</TableCell>
                <TableCell><Chip label={`AS ${row.bgpPeerRemoteAs || row.remote_as}`} size="small" variant="outlined" /></TableCell>
                
                {tabValue < 2 && (
                  <>
                    <TableCell>
                      <Chip 
                        label={BGP_STATES[row.bgpPeerState] || 'Unknown'} 
                        size="small" 
                        sx={{ bgcolor: getStatusColor(row.bgpPeerState), color: 'white', minWidth: 80 }} 
                      />
                    </TableCell>
                    <TableCell>{formatEstablishedTime(row.bgpPeerFsmEstablishedTime)}</TableCell>
                  </>
                )}

                {tabValue === 2 && (
                  <>
                    <TableCell>{formatDateTime(row.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton color="error" onClick={() => handleRemoveFromExcluded(row.id)}><RemoveIcon /></IconButton>
                    </TableCell>
                  </>
                )}

                {tabValue === 3 && (
                  <>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip label={row.state_change} size="small" sx={{ bgcolor: getLogColor(row.state_change), color: 'white', fontWeight: 'bold' }} />
                        <Typography variant="caption">{BGP_STATES[row.previous_state]} ? {BGP_STATES[row.new_state]}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{formatDateTime(row.created_at)}</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100, 300, 1000]}
          component="div"
          count={displayData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      <Snackbar open={toast.open} autoHideDuration={5000} onClose={handleToastClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MuiAlert onClose={handleToastClose} severity={toast.severity} variant="filled">{toast.message}</MuiAlert>
      </Snackbar>
    </Container>
  );
};

export default BgpAlert;