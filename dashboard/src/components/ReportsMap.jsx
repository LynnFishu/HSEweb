import React, { useState } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { getMarkerIcon } from '../utils/mapUtils';
import { Box, Typography, Chip, CircularProgress } from '@mui/material';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { useMemo } from 'react';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '8px'
};

const center = {
  lat: 3.1390, // Default to Malaysia's approximate center
  lng: 101.6869
};

const ReportsMap = ({ violations = [] }) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedViolation, setSelectedViolation] = useState(null);

  // Create markers for violations
  const markers = useMemo(() => {
    // For now, we'll create random locations around Malaysia for demo
    return violations.map(violation => ({
      ...violation,
      position: {
        lat: 3.1390 + (Math.random() - 0.5) * 0.1, // Random offset around Malaysia
        lng: 101.6869 + (Math.random() - 0.5) * 0.1
      }
    }));
  }, [violations]);

  const getViolationColor = (type) => {
    switch (type) {
      case 'no-helmet': return '#d32f2f'; // error red
      case 'no-vest': return '#ed6c02';   // warning orange
      default: return '#1976d2';          // primary blue
    }
  };

  // Find map center based on markers or default to Malaysia
  const mapCenter = markers.length > 0 
    ? markers[0].position
    : center;

  if (loadError) {
    return (
      <Box
        sx={{
          height: '100%',
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
          height: '100%',
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
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={11}
      options={{
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={marker.position}
          onClick={() => setSelectedViolation(marker)}
          icon={getMarkerIcon(getViolationColor(marker.type))}
        />
      ))}

      {selectedViolation && (
        <InfoWindow
          position={selectedViolation.position}
          onCloseClick={() => setSelectedViolation(null)}
        >
          <Box sx={{ p: 1, maxWidth: 200 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              {selectedViolation.type}
            </Typography>
            <Typography variant="body2" sx={{ color: '#677294', mb: 1 }}>
              Confidence: {(selectedViolation.confidence * 100).toFixed(1)}%
            </Typography>
            <Chip
              label={selectedViolation.type}
              size="small"
              sx={{
                bgcolor: getViolationColor(selectedViolation.type),
                color: '#fff',
                fontSize: '0.75rem',
              }}
            />
            <Typography variant="caption" display="block" sx={{ mt: 1, color: '#999' }}>
              Detected: {selectedViolation.timestamp.toLocaleString()}
            </Typography>
          </Box>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default ReportsMap;