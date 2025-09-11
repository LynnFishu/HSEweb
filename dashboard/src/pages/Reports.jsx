import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import ViolationsTable from '../components/ViolationsTable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Reports = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Removed pagination state since we're using collapsible rows now
  const [filters, setFilters] = useState({
    contractor: '',
    workOrder: '',
    dateRange: 'week',
  });
  const [contractors, setContractors] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    byType: {},
    byContractor: {},
    byWorkOrder: {},
  });

  // Helper function to check if server is running
  const checkServerConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/test');
      if (!response.ok) return false;
      const data = await response.json();
      return data.message === 'Backend is working!';
      } catch (error) {
      return false;
    }
  };

  // Fetch violations and related data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Check if server is running
      const isServerRunning = await checkServerConnection();
      if (!isServerRunning) {
        throw new Error('Backend server is not running. Please start the server and try again.');
      }

      // Fetch violations
      const violationsResponse = await fetch('http://localhost:5000/api/violations');
      if (!violationsResponse.ok) {
        const errorText = await violationsResponse.text();
        console.error('Violations response error:', errorText);
        throw new Error('Failed to fetch violations: ' + violationsResponse.statusText);
      }
      const violationsData = await violationsResponse.json();
      
      // Fetch contractors with their stats
      console.log('Fetching contractors...');
      const contractorsResponse = await fetch('http://localhost:5000/api/contractors');
      console.log('Contractors response:', contractorsResponse);
      
      if (!contractorsResponse.ok) {
        const errorText = await contractorsResponse.text();
        console.error('Contractors response error:', errorText);
        throw new Error('Failed to fetch contractors: ' + contractorsResponse.statusText);
      }

      const contractorsData = await contractorsResponse.json();
      console.log('Fetched contractors:', contractorsData);
      
      // Fetch work orders
      const workOrdersResponse = await fetch('http://localhost:5000/api/work-orders');
      if (!workOrdersResponse.ok) {
        const errorText = await workOrdersResponse.text();
        console.error('Work orders response error:', errorText);
        throw new Error('Failed to fetch work orders: ' + workOrdersResponse.statusText);
      }
      const workOrdersData = await workOrdersResponse.json();

      // Process data
      setViolations(violationsData);
      setContractors(contractorsData);
      setWorkOrders(workOrdersData);

      // Calculate statistics
      const stats = calculateStats(violationsData);
      setStats(stats);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate statistics from violations data
  const calculateStats = (violations) => {
    const stats = {
      total: violations.length,
      byType: {},
      byContractor: {},
      byWorkOrder: {},
    };

    violations.forEach(violation => {
      // Count by type
      stats.byType[violation.type] = (stats.byType[violation.type] || 0) + 1;

      // Count by contractor
      if (violation.contractor_name) {
        stats.byContractor[violation.contractor_name] = 
          (stats.byContractor[violation.contractor_name] || 0) + 1;
      }

      // Count by work order
      if (violation.work_order_number) {
        stats.byWorkOrder[violation.work_order_number] = 
          (stats.byWorkOrder[violation.work_order_number] || 0) + 1;
      }
    });

    return stats;
  };

  // Filter violations based on selected filters
  const filteredViolations = violations.filter(violation => {
    const matchesContractor = !filters.contractor || 
      violation.contractor_id === filters.contractor;
    
    const matchesWorkOrder = !filters.workOrder || 
      violation.work_order_id === filters.workOrder;

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

    return matchesContractor && matchesWorkOrder && matchesDate;
  });

  // Prepare chart data
  const chartData = Object.entries(stats.byType).map(([type, count]) => ({
    name: type,
    violations: count,
  }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, background: 'linear-gradient(90deg, #c3a8f7 0%, #a8e6ef 100%)', minHeight: '100vh' }}>
        <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Typography variant="h6" color="error" gutterBottom>
            Error Loading Reports
            </Typography>
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
            </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please ensure that:
            <ul>
              <li>The backend server is running (cd backend && node server.js)</li>
              <li>The database is connected and accessible</li>
              <li>All required services are running</li>
            </ul>
          </Typography>
          <Button 
            variant="contained" 
            onClick={fetchData} 
            sx={{ 
              mt: 2,
              bgcolor: '#2B3467',
                '&:hover': {
                bgcolor: '#1a1f3d',
              },
            }}
          >
            Retry Loading
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(90deg, #c3a8f7 0%, #a8e6ef 100%)', minHeight: '100vh' }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ mb: 3, color: '#2B3467', fontWeight: 600 }}>
          PPE Violations Report
              </Typography>
              
        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Contractor</InputLabel>
              <Select
                value={filters.contractor}
                onChange={(e) => setFilters(prev => ({ ...prev, contractor: e.target.value }))}
                label="Contractor"
              >
                <MenuItem value="">All Contractors</MenuItem>
                {contractors.map(contractor => (
                  <MenuItem key={contractor.id} value={contractor.id}>
                    {contractor.name} ({contractor.company_name}) - {contractor.violations_count} violations
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Work Order</InputLabel>
              <Select
                value={filters.workOrder}
                onChange={(e) => setFilters(prev => ({ ...prev, workOrder: e.target.value }))}
                label="Work Order"
              >
                <MenuItem value="">All Work Orders</MenuItem>
                {workOrders.map(order => (
                  <MenuItem key={order.id} value={order.id}>
                    {order.work_order_number}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
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
        </Grid>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Violations
                </Typography>
                <Typography variant="h4">
                  {filteredViolations.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Unique Contractors
                </Typography>
                <Typography variant="h4">
                  {Object.keys(stats.byContractor).length}
              </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Work Orders Affected
              </Typography>
                <Typography variant="h4">
                  {Object.keys(stats.byWorkOrder).length}
              </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Most Common Violation
              </Typography>
                <Typography variant="h4">
                  {Object.entries(stats.byType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Chart */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Violations by Type
                    </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="violations" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Violations Table */}
        <ViolationsTable violations={filteredViolations} />
                </Paper>
    </Box>
  );
};

export default Reports;