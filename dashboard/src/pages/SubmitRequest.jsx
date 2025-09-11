import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  IconButton,
  Alert,
} from '@mui/material';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useWorkOrders } from '../contexts/WorkOrderContext';
import { useAuth } from '../contexts/AuthContext';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Map click handler component
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
};

const SubmitRequest = () => {
  const navigate = useNavigate();
  const { user, setCurrentWorkOrder } = useAuth();
  const { addWorkOrder } = useWorkOrders();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    workOrderNumber: `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    companyName: user?.company_name || '',
    description: '',
    siteLocation: {
      name: '',
      lat: '',
      lng: '',
      address: ''
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('siteLocation.')) {
      const locationField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        siteLocation: {
          ...prev.siteLocation,
          [locationField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.workOrderNumber || !formData.companyName || !formData.description) {
        throw new Error('Please fill in all required fields');
      }

      // Validate site location
      if (!formData.siteLocation.address || !formData.siteLocation.name) {
        throw new Error('Please provide site location name and address');
      }

      if (!formData.siteLocation.lat || !formData.siteLocation.lng) {
        throw new Error('Please select a location on the map');
      }

      // Validate coordinates
      const lat = parseFloat(formData.siteLocation.lat);
      const lng = parseFloat(formData.siteLocation.lng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid coordinates selected. Please try again.');
      }

      // Convert lat/lng to numbers
      const siteLocation = {
        ...formData.siteLocation,
        lat: parseFloat(formData.siteLocation.lat) || 0,
        lng: parseFloat(formData.siteLocation.lng) || 0
      };

      const newWorkOrder = await addWorkOrder({
        ...formData,
        siteLocation,
        requestedBy: user.id
      });

      // Set this as the current work order
      setCurrentWorkOrder(newWorkOrder);
      console.log('Set current work order:', newWorkOrder);

      navigate('/contractor/request-history');
    } catch (err) {
      console.error('Error submitting work order:', err);
      setError(err.message || 'Failed to submit work order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 3, color: '#2B3467', fontWeight: 600 }}>
          Submit Work Order Request
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Work Order Number"
                name="workOrderNumber"
                value={formData.workOrderNumber}
                onChange={handleChange}
                required
                disabled
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company Name"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
                disabled={!!user?.company_name}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                multiline
                rows={4}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, color: '#2B3467', fontWeight: 600 }}>
                Site Location
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location Name"
                name="siteLocation.name"
                value={formData.siteLocation.name}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Address"
                name="siteLocation.address"
                value={formData.siteLocation.address}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ height: '400px', width: '100%', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Click on the map to set the site location
                </Typography>
                <Paper elevation={3} sx={{ height: '100%', overflow: 'hidden' }}>
                  <MapContainer
                    center={[3.1390, 101.6869]} // Default to Malaysia
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler
                      onLocationSelect={(lat, lng) => {
                        try {
                          setFormData(prev => ({
                            ...prev,
                            siteLocation: {
                              ...prev.siteLocation,
                              lat: lat.toFixed(6),
                              lng: lng.toFixed(6)
                            }
                          }));
                        } catch (error) {
                          console.error('Error updating location:', error);
                          setError('Failed to set location. Please try again.');
                        }
                      }}
                    />
                    {formData.siteLocation.lat && formData.siteLocation.lng && (
                      <Marker
                        position={[
                          parseFloat(formData.siteLocation.lat) || 3.1390,
                          parseFloat(formData.siteLocation.lng) || 101.6869
                        ]}
                      />
                    )}
                  </MapContainer>
                </Paper>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Latitude"
                name="siteLocation.lat"
                type="number"
                value={formData.siteLocation.lat}
                onChange={handleChange}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Longitude"
                name="siteLocation.lng"
                type="number"
                value={formData.siteLocation.lng}
                onChange={handleChange}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 2,
                  bgcolor: '#2B3467',
                  '&:hover': {
                    bgcolor: '#1a1f3d',
                  },
                }}
              >
                Submit Request
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default SubmitRequest;