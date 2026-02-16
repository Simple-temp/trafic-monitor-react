import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Snackbar, Alert, Checkbox, IconButton } from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const Bgp_Info = () => {
  const [bgpData, setBgpData] = useState([]);
  const [previousData, setPreviousData] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const intervalRef = useRef(null);

  // Priority for sorting: higher number = higher priority (top of list)
  const statePriority = {
    6: 3, // established
    3: 2, // active
    1: 1, // idle
    2: 0, // connect
    4: 0, // opensent
    5: 0, // openconfirm
  };

  // State colors
  const getStateColor = (state) => {
    switch (state) {
      case 6: return '#4caf50'; // green for established
      case 3: return '#ff9800'; // orange for active
      case 1: return '#f44336'; // red for idle
      default: return '#9e9e9e'; // gray for others
    }
  };

  // Function to speak voice warnings
  const speak = (message) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Function to show toast alert
  const showToast = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Function to close toast
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Function to calculate established time in days/hours/minutes/seconds
  const formatEstablishedTime = (centiSeconds) => {
    const totalSeconds = centiSeconds / 100;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  // Fetch BGP data from API
  const fetchBgpData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/bgppeers'); // Adjust URL if needed
      const result = await response.json();
      if (result.success) {
        console.log('Fetched BGP data:', result.data); // Debug log to check if data is updating
        setPreviousData(bgpData); // Store previous data for change detection
        setBgpData(result.data);
      }
    } catch (error) {
      console.error('Error fetching BGP data:', error);
    }
  };

  // Detect state changes and trigger warnings and toasts
  useEffect(() => {
    if (previousData.length > 0 && bgpData.length > 0) {
      bgpData.forEach((currentPeer) => {
        const previousPeer = previousData.find(p => p.id === currentPeer.id);
        if (previousPeer && previousPeer.bgpPeerState !== currentPeer.bgpPeerState) {
          const peerInfo = `${currentPeer.hostname || 'Unknown'} (${currentPeer.ip_address}) - Peer ${currentPeer.peer_index}`;
          if (previousPeer.bgpPeerState === 6 && currentPeer.bgpPeerState !== 6) {
            speak('BGP getting down');
            showToast(`BGP Down: ${peerInfo} changed to ${currentPeer.bgpPeerStateText}`, 'error');
          } else if (previousPeer.bgpPeerState !== 6 && currentPeer.bgpPeerState === 6) {
            speak('BGP getting up');
            showToast(`BGP Up: ${peerInfo} established`, 'success');
          } else {
            // For other state changes, show info toast
            showToast(`BGP State Change: ${peerInfo} to ${currentPeer.bgpPeerStateText}`, 'warning');
          }
        }
      });
    }
  }, [bgpData, previousData]);

  // Sort data by state priority (established first, then active, then idle, etc.)
  const sortedData = [...bgpData].sort((a, b) => {
    const priorityA = statePriority[a.bgpPeerState] || 0;
    const priorityB = statePriority[b.bgpPeerState] || 0;
    return priorityB - priorityA; // Higher priority first
  });

  // Fetch data on mount and set interval for periodic updates
  useEffect(() => {
    fetchBgpData();
    intervalRef.current = setInterval(fetchBgpData, 30000); // Poll every 30 seconds (changed from 1000ms)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {sortedData.map((peer) => {
        const themeColor = getStateColor(peer.bgpPeerState);
        const statusLabel = peer.bgpPeerStateText;
        const error = peer.bgpPeerState !== 6; // Show warning if not established

        return (
          <Box key={peer.id} sx={{
            width: "290px", p: 2, bgcolor: "#fff", borderRadius: 2, borderLeft: `8px solid ${themeColor}`,
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", display: "flex", flexDirection: "column", gap: 0.5,
          }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" fontWeight="bold" color="textSecondary">{peer.hostname || 'Unknown Host'}</Typography>
            </Box>
            <Typography variant="body1" fontWeight="900" noWrap sx={{ color: "#0f172a" }}>
              {peer.interface_alias || peer.ip_address || 'No Alias'}
            </Typography>
            <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {error && <WarningAmberIcon sx={{ fontSize: 14, color: themeColor }} />}
                <Typography variant="caption" fontWeight="bold" sx={{ color: themeColor }}>{statusLabel}</Typography>
              </Box>
            </Box>
            {/* Additional BGP details */}
           <Typography variant="caption" sx={{ color: themeColor }}>
              Remote IP: <b> {peer.bgpPeerRemoteAddr}</b> <br />
              {/* Time: <b>{formatEstablishedTime(peer.bgpPeerFsmEstablishedTime)}</b> */}
            </Typography>
          </Box>
        );
      })}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Bgp_Info;