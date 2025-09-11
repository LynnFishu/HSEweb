import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { Box, Typography, Chip, CircularProgress } from '@mui/material';
import { useWorkOrders } from '../contexts/WorkOrderContext';
import { useAuth } from '../contexts/AuthContext';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '8px'
};

const center = {
  lat: 3.1390, // Default to Malaysia's approximate center
  lng: 101.6869
};

const ContractorMap = () => {
  const { workOrders } = useWorkOrders();
  const { user } = useAuth();
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Filter work orders to only show this contractor's orders with valid site locations
  const contractorOrders = workOrders.filter(order => {
    return order.requestedBy === user.username && 
           order.siteLocation && 
           typeof order.siteLocation.lat === 'number' && 
           typeof order.siteLocation.lng === 'number';
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#ed6c02'; // warning
      case 'approved': return '#2e7d32'; // success
      case 'rejected': return '#d32f2f'; // error
      default: return '#1976d2'; // primary
    }
  };

  // Find map center based on orders or default to Malaysia
  const mapCenter = contractorOrders.length > 0 
    ? {
        lat: contractorOrders[0].siteLocation.lat,
        lng: contractorOrders[0].siteLocation.lng
      }
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
      {contractorOrders.map((order) => (
        <Marker
          key={order.id}
          position={order.siteLocation}
          onClick={() => setSelectedOrder(order)}
          icon={{
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: getStatusColor(order.status),
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#fff',
            scale: 2,
            anchor: new google.maps.Point(12, 24),
          }}
        />
      ))}

      {selectedOrder && (
        <InfoWindow
          position={selectedOrder.siteLocation}
          onCloseClick={() => setSelectedOrder(null)}
        >
          <Box sx={{ p: 1, maxWidth: 200 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              {selectedOrder.workOrderNumber}
            </Typography>
            {selectedOrder.siteLocation.address && (
              <Typography variant="body2" sx={{ color: '#677294', mb: 1 }}>
                {selectedOrder.siteLocation.address}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: '#677294', mb: 1 }}>
              {selectedOrder.companyName}
            </Typography>
            <Chip
              label={selectedOrder.status}
              size="small"
              sx={{
                bgcolor: getStatusColor(selectedOrder.status),
                color: '#fff',
                fontSize: '0.75rem',
              }}
            />
            <Typography variant="caption" display="block" sx={{ mt: 1, color: '#999' }}>
              Submitted: {new Date(selectedOrder.submittedAt).toLocaleDateString()}
            </Typography>
          </Box>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default ContractorMap;