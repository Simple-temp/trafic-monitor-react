import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import {
  DeviceHub as DeviceIcon,
  NetworkCheck as IpIcon,
  VpnKey as CommunityIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import axios from 'axios';

const DeviceAdd = () => {
  const [formData, setFormData] = useState({
    hostname: '',
    ip_address: '',
    snmp_version: '2c',
    snmp_community: '',
  });
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' }); // Clear error on change
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.hostname.trim()) newErrors.hostname = 'Hostname is required';
    if (!formData.ip_address.trim()) newErrors.ip_address = 'IP Address is required';
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(formData.ip_address)) newErrors.ip_address = 'Invalid IP address';
    if (!formData.snmp_community.trim()) newErrors.snmp_community = 'SNMP Community is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // Assuming backend endpoint is POST /api/devices
      await axios.post('http://localhost:5000/api/devices', formData);
      setSnackbar({ open: true, message: 'Device added successfully!', severity: 'success' });
      setFormData({
        hostname: '',
        ip_address: '',
        snmp_version: '2c',
        snmp_community: '',
      });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to add device. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4, p: 2 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <DeviceIcon sx={{ mr: 2, color: 'primary.main', fontSize: 40 }} />
          <Typography variant="h4" component="h1" color="primary" fontWeight="bold">
            Add New Device
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Fill in the details below to register a new device in the NMS system.
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hostname"
                name="hostname"
                value={formData.hostname}
                onChange={handleChange}
                error={!!errors.hostname}
                helperText={errors.hostname}
                variant="outlined"
                InputProps={{
                  startAdornment: <DeviceIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="IP Address"
                name="ip_address"
                value={formData.ip_address}
                onChange={handleChange}
                error={!!errors.ip_address}
                helperText={errors.ip_address}
                variant="outlined"
                InputProps={{
                  startAdornment: <IpIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>SNMP Version</InputLabel>
                <Select
                  label="SNMP Version"
                  name="snmp_version"
                  value={formData.snmp_version}
                  onChange={handleChange}
                >
                  <MenuItem value="1">v1</MenuItem>
                  <MenuItem value="2c">v2c</MenuItem>
                  <MenuItem value="3">v3</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SNMP Community"
                name="snmp_community"
                value={formData.snmp_community}
                onChange={handleChange}
                error={!!errors.snmp_community}
                helperText={errors.snmp_community}
                variant="outlined"
                type="password"
                InputProps={{
                  startAdornment: <CommunityIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
                startIcon={<AddIcon />}
                sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
              >
                {loading ? 'Adding Device...' : 'Add Device'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeviceAdd;