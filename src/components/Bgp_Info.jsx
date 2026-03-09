import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const Bgp_Info = () => {
  const [bgpData, setBgpData] = useState([]);
  const [previousData, setPreviousData] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const intervalRef = useRef(null);

  // Priority for sorting: higher number = higher priority (top of list)
  const statePriority = {
    6: 3, // established (UP)
    3: 2, // active
    1: 1, // idle
    2: 0, // connect
    4: 0, // opensent
    5: 0, // openconfirm
  };

  // State colors - Unified for UP/DOWN logic
  const getStateColor = (state) => {
    if (state === 6) return '#4caf50'; // Green for UP
    return '#f44336'; // Red for everything else (DOWN)
  };

  // Function to speak voice warnings
  const speak = (message) => {
    if ('speechSynthesis' in window) {
      // Cancel any current speech to avoid overlapping
      window.speechSynthesis.cancel();
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

  // Fetch BGP data from API
  const fetchBgpData = async () => {
    try {
      const response = await fetch('/api/bgppeerss'); 
      const result = await response.json();
      if (result.success) {
        setPreviousData(bgpData); 
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
          const peerInfo = `${currentPeer.hostname || 'Unknown'} - Remote: ${currentPeer.bgpPeerRemoteAddr}`;
          
          // Logic: Transitioning FROM Established (6) TO anything else
          if (previousPeer.bgpPeerState === 6 && currentPeer.bgpPeerState !== 6) {
            speak('BGP getting down');
            showToast(`BGP Down: ${peerInfo}`, 'error');
          } 
          // Logic: Transitioning FROM anything else TO Established (6)
          else if (previousPeer.bgpPeerState !== 6 && currentPeer.bgpPeerState === 6) {
            speak('BGP getting up');
            showToast(`BGP Up: ${peerInfo}`, 'success');
          }
        }
      });
    }
  }, [bgpData, previousData]);

  // Sort data by state priority
  const sortedData = [...bgpData].sort((a, b) => {
    const priorityA = statePriority[a.bgpPeerState] || 0;
    const priorityB = statePriority[b.bgpPeerState] || 0;
    return priorityB - priorityA; 
  });

  // Fetch data on mount and set interval
  useEffect(() => {
    fetchBgpData();
    intervalRef.current = setInterval(fetchBgpData, 30000); 

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2, bgcolor: '#f1f5f9', minHeight: '100vh' }}>
      {sortedData.map((peer) => {
        const isUp = peer.bgpPeerState === 6;
        const themeColor = getStateColor(peer.bgpPeerState);
        const statusLabel = isUp ? "UP" : "DOWN";

        return (
          <Box key={peer.id} sx={{
            width: "285px", 
            p: 2, 
            bgcolor: "#fff", 
            borderRadius: 2, 
            borderTop: `6px solid ${themeColor}`,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", 
            display: "flex", 
            flexDirection: "column", 
            gap: 1,
            transition: 'transform 0.2s',
            '&:hover': { transform: 'scale(1.02)' }
          }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Typography variant="subtitle2" fontWeight="bold" color="textPrimary" sx={{ maxWidth: '70%' }}>
                {peer.hostname || 'Unknown Device'}
              </Typography>
              <Box sx={{ 
                px: 1.5, py: 0.5, borderRadius: 1, 
                bgcolor: isUp ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                display: 'flex', alignItems: 'center', gap: 0.5
              }}>
                {isUp ? 
                  <CheckCircleOutlineIcon sx={{ fontSize: 16, color: themeColor }} /> : 
                  <WarningAmberIcon sx={{ fontSize: 16, color: themeColor }} />
                }
                <Typography variant="caption" fontWeight="900" sx={{ color: themeColor }}>
                  {statusLabel}
                </Typography>
              </Box>
            </Box>

            <Typography variant="body2" sx={{ color: "#475569", fontWeight: 500 }}>
               {peer.interface_alias || "No Interface Alias"}
            </Typography>

            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #f1f5f9' }}>
              <Typography variant="caption" display="block" color="textSecondary">
                Remote IP: <b style={{ color: '#1e293b' }}>{peer.bgpPeerRemoteAddr}</b>
              </Typography>
              <Typography variant="caption" display="block" color="textSecondary">
                Remote AS: <b style={{ color: '#1e293b' }}>{peer.bgpPeerRemoteAs}</b>
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic', fontSize: '10px' }}>
                State: {peer.bgpPeerStateText}
              </Typography>
            </Box>
          </Box>
        );
      })}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Bgp_Info;