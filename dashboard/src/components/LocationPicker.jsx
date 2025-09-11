import React, { useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Box, Typography, Button, TextField, IconButton, CircularProgress } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DeleteIcon from '@mui/icons-material/Delete';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px'
};

const center = {
  lat: 3.1390, // Default to Malaysia's approximate center
  lng: 101.6869
};

const LocationPicker = ({ onLocationSelect, initialLocation = null }) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [marker, setMarker] = useState(initialLocation);
  const [address, setAddress] = useState('');

  const handleMapClick = (event) => {
    // Only place a new marker if there isn't one already
    if (!marker) {
      const newLocation = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      setMarker(newLocation);
      onLocationSelect({ ...newLocation, address });
    }
  };

  const handleRemovePin = () => {
    setMarker(null);
    setAddress('');
    onLocationSelect(null);
  };

  const handleAddressChange = (event) => {
    setAddress(event.target.value);
    if (marker) {
      onLocationSelect({ ...marker, address: event.target.value });
    }
  };

  if (loadError) {
    return (
      <Box
        sx={{
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f8fafc',
          borderRadius: 1,
        }}
      >
        <Typography color="error">
          Error loading map. Please check your API key.
        </Typography>
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box
        sx={{
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f8fafc',
          borderRadius: 1,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Address Input */}
      <TextField
        fullWidth
        label="Site Address"
        value={address}
        onChange={handleAddressChange}
        variant="outlined"
        size="small"
        sx={{ mb: 2 }}
        placeholder="Enter the complete site address"
      />

      {/* Map Container */}
      <Box sx={{ position: 'relative', mb: 2 }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={marker || center}
          zoom={12}
          onClick={handleMapClick}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {/* Show marker */}
          {marker && (
            <Marker
              position={marker}
              icon={{
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                fillColor: '#d32f2f', // Red pin
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: '#fff',
                scale: 2,
                anchor: new google.maps.Point(12, 24),
              }}
            />
          )}
        </GoogleMap>

        {/* Remove Pin Control Button */}
        {marker && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 60,
              backgroundColor: 'white',
              borderRadius: '2px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px 0 0',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
            }}
            onClick={handleRemovePin}
            title="Remove Pin"
          >
            <IconButton
              size="small"
              sx={{
                width: 40,
                height: 40,
              }}
            >
              <DeleteIcon sx={{ color: '#666' }} />
            </IconButton>
            <Typography
              variant="caption"
              sx={{
                color: '#666',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Remove Pin
            </Typography>
          </Box>
        )}
      </Box>

      <Typography variant="caption" sx={{ display: 'block', color: '#677294', textAlign: 'center' }}>
        {!marker ? 
          "Click on the map to place a pin at your site location." :
          "Click 'Remove Pin' at the top-right to place a new pin."}
      </Typography>
    </Box>
  );
};

export default LocationPicker;