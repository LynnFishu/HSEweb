import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import ViolationsTable from '../components/ViolationsTable';
import {
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useWorkOrders } from '../contexts/WorkOrderContext';
import { API_ENDPOINTS } from '../config/api';

const ViolationsPage = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const hasLoadedOnceRef = useRef(false);
  // Removed pagination since we're using collapsible rows
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  // Removed server status state
  const [filters, setFilters] = useState({
    contractor: '',
    workOrder: '',
    violationType: '',
    dateRange: 'all',
  });
  const { workOrders } = useWorkOrders();

  // Removed server status check

  // Fetch violations (supports silent background refresh)
  const fetchViolations = useCallback(async ({ silent = false } = {}) => {
    try {
      // Only show the "Loading..." UI on the initial load (or explicit non-silent fetch)
      if (!silent && !hasLoadedOnceRef.current) {
        setLoading(true);
      }
      const response = await fetch(API_ENDPOINTS.VIOLATIONS);
      if (!response.ok) {
        throw new Error('Failed to fetch violations');
      }
      const data = await response.json();
      setViolations(data);
      setError(null);
      setLastUpdatedAt(new Date());
      hasLoadedOnceRef.current = true;
    } catch (err) {
      console.error('Error fetching violations:', err);
      setError(err.message);
    } finally {
      if (!silent) {
        setLoading(false);
      } else if (!hasLoadedOnceRef.current) {
        // If a silent fetch was the first fetch (shouldn't happen), keep UI consistent
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    
    const loadData = async () => {
      if (isSubscribed) {
        await fetchViolations({ silent: false });
      }
    };

    // Initial load
    loadData();

    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      if (isSubscribed) {
        // Background refresh: do NOT flip loading state, so expanded rows stay open
        fetchViolations({ silent: true });
      }
    }, 10000); // 10 seconds = 10000 milliseconds

    return () => {
      isSubscribed = false;
      clearInterval(refreshInterval);
    };
  }, [fetchViolations]);

  // Filter violations
  const filteredViolations = violations.filter(violation => {
    const matchesSearch = (
      violation.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.contractor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesContractor = !filters.contractor || violation.contractor_id === filters.contractor;
    const matchesWorkOrder = !filters.workOrder || violation.work_order_id === filters.workOrder;
    const matchesType = !filters.violationType || violation.type === filters.violationType;

    let matchesDate = true;
    const violationDate = new Date(violation.timestamp);
    const now = new Date();
    
    switch (filters.dateRange) {
      case 'today':
        matchesDate = violationDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        matchesDate = violationDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        matchesDate = violationDate >= monthAgo;
        break;
      default:
        matchesDate = true;
    }

    return matchesSearch && matchesContractor && matchesWorkOrder && matchesType && matchesDate;
  });

  // Get unique contractors and work orders for filters
  const uniqueContractors = [...new Set(violations.map(v => v.contractor_id))].filter(Boolean);
  const uniqueWorkOrders = [...new Set(violations.map(v => v.work_order_id))].filter(Boolean);
  const uniqueViolationTypes = [...new Set(violations.map(v => v.type))].filter(Boolean);

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(90deg, #c3a8f7 0%, #a8e6ef 100%)', minHeight: '100vh' }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 3, gap: 2 }}>
          <Typography variant="h5" sx={{ color: '#2B3467', fontWeight: 600 }}>
            PPE Violations
          </Typography>
          <Typography variant="caption" sx={{ color: '#677294' }}>
            Last updated: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : '—'}
          </Typography>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search violations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Contractor</InputLabel>
              <Select
                value={filters.contractor}
                onChange={(e) => setFilters(prev => ({ ...prev, contractor: e.target.value }))}
                label="Contractor"
              >
                <MenuItem value="">All</MenuItem>
                {uniqueContractors.map(id => {
                  const violation = violations.find(v => v.contractor_id === id);
                  return (
                    <MenuItem key={id} value={id}>
                      {violation?.contractor_name || `Contractor ${id}`}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Work Order</InputLabel>
              <Select
                value={filters.workOrder}
                onChange={(e) => setFilters(prev => ({ ...prev, workOrder: e.target.value }))}
                label="Work Order"
              >
                <MenuItem value="">All</MenuItem>
                {uniqueWorkOrders.map(id => {
                  const violation = violations.find(v => v.work_order_id === id);
                  return (
                    <MenuItem key={id} value={id}>
                      {violation?.work_order_number || `WO ${id}`}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Violation Type</InputLabel>
              <Select
                value={filters.violationType}
                onChange={(e) => setFilters(prev => ({ ...prev, violationType: e.target.value }))}
                label="Violation Type"
              >
                <MenuItem value="">All</MenuItem>
                {uniqueViolationTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Range</InputLabel>
              <Select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                label="Date Range"
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setFilters({
                  contractor: '',
                  workOrder: '',
                  violationType: '',
                  dateRange: 'all',
                });
                setSearchTerm('');
              }}
              sx={{ height: '40px' }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>

        {/* Loading and Error States */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <Typography>Loading violations...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <Typography color="error">{error}</Typography>
            <Button
              variant="outlined"
              onClick={fetchViolations}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </Box>
        ) : filteredViolations.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <Typography>No violations found</Typography>
          </Box>
        ) : (
          <ViolationsTable 
            violations={filteredViolations} 
            onImageClick={setSelectedImage}
          />
        )}

        {/* Image Dialog */}
        <Dialog
          open={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Violation Image
            <IconButton
              onClick={() => setSelectedImage(null)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedImage && (
              <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  src={`data:image/jpeg;base64,${selectedImage}`}
                  alt="Violation"
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    maxHeight: '80vh',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    console.error('Image preview load error:', e);
                    e.target.style.display = 'none';
                  }}
                />
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default ViolationsPage;
