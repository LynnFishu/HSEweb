import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import { useMQTT } from '../contexts/MQTTContext';

const PPEViolationsMonitor = () => {
  const { isConnected, lastMessage } = useMQTT();
  const [violations, setViolations] = useState([]);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (lastMessage) {
      // Add new violation to the list
      const newViolation = {
        id: Date.now(),
        ...lastMessage,
        timestamp: new Date(lastMessage.timestamp).toLocaleString(),
      };

      setViolations(prev => [newViolation, ...prev].slice(0, 10)); // Keep last 10 violations
      setShowAlert(true);
    }
  }, [lastMessage]);

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#2B3467' }}>
          Live PPE Violations
        </Typography>
        <Chip
          label={isConnected ? 'Connected' : 'Disconnected'}
          color={isConnected ? 'success' : 'error'}
          size="small"
        />
      </Box>

      {violations.length === 0 ? (
        <Typography variant="body2" sx={{ color: '#677294', textAlign: 'center', py: 4 }}>
          No violations detected
        </Typography>
      ) : (
        <List>
          {violations.map((violation) => (
            <ListItem
              key={violation.id}
              sx={{
                mb: 1,
                border: '1px solid #f0f0f0',
                borderRadius: 1,
                '&:hover': { bgcolor: '#f8fafc' },
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {violation.type === 'no-helmet' ? 'Missing Helmet' : 'Missing Vest'}
                    </Typography>
                    <Chip
                      label={`${(violation.confidence * 100).toFixed(0)}%`}
                      color="error"
                      size="small"
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" sx={{ color: '#677294' }}>
                    {violation.timestamp}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Snackbar
        open={showAlert}
        autoHideDuration={3000}
        onClose={() => setShowAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="warning" sx={{ width: '100%' }}>
          New PPE violation detected!
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default PPEViolationsMonitor;