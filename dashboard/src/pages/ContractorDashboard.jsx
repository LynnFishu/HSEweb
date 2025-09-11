import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Toolbar,
  Paper,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  TablePagination,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import ContractorMap from '../components/ContractorMap';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import { useWorkOrders } from '../contexts/WorkOrderContext';
import { useAuth } from '../contexts/AuthContext';
import { useMQTT } from '../contexts/MQTTContext';

const ContractorDashboard = () => {
  const navigate = useNavigate();
  const { workOrders } = useWorkOrders();
  const { logout, user } = useAuth();
  const { setCurrentWorkOrder } = useMQTT();
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get recent orders for approval status box (last 5)
  const recentOrders = useMemo(() => {
    const orders = [...workOrders]
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    
    // If there's an approved work order, set it as the active one
    const activeOrder = orders.find(order => order.status === 'Approved');
    if (activeOrder) {
      console.log('Found approved work order:', activeOrder);
      // Force a delay to ensure the work order is set
      setTimeout(() => {
        setCurrentWorkOrder(activeOrder);
        console.log('Set active work order:', activeOrder);
      }, 100);
    } else {
      console.log('No approved work orders found');
    }
    
    return orders.slice(0, 5);
  }, [workOrders, setCurrentWorkOrder]);

  // Set active work order on component mount
  useEffect(() => {
    const activeOrder = workOrders.find(order => order.status === 'Approved');
    if (activeOrder) {
      setCurrentWorkOrder(activeOrder);
      console.log('Set active work order on mount:', activeOrder);
    }
  }, []);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const pending = workOrders.filter(wo => wo.status === 'Pending').length;
    const approved = workOrders.filter(wo => wo.status === 'Approved').length;
    const rejected = workOrders.filter(wo => wo.status === 'Rejected').length;
    return { pending, approved, rejected };
  }, [workOrders]);

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ color: '#2B3467', fontWeight: 600 }}>
              Contractor Dashboard
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/contractor/submit-request')}
                sx={{
                  bgcolor: '#2B3467',
                  '&:hover': { bgcolor: '#1a1f3d' }
                }}
              >
                New Request
              </Button>
              <Button
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{ borderColor: '#2B3467', color: '#2B3467' }}
              >
                Logout
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff8e1' }}>
            <Typography variant="h6" color="warning.main">{stats.pending}</Typography>
            <Typography variant="body2" color="text.secondary">Pending Requests</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
            <Typography variant="h6" color="success.main">{stats.approved}</Typography>
            <Typography variant="body2" color="text.secondary">Approved Requests</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fbe9e7' }}>
            <Typography variant="h6" color="error.main">{stats.rejected}</Typography>
            <Typography variant="body2" color="text.secondary">Rejected Requests</Typography>
          </Paper>
        </Grid>

        {/* Map Component */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <ContractorMap workOrders={workOrders} />
          </Paper>
        </Grid>

        {/* Recent Requests */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#2B3467' }}>
              Recent Request Status
            </Typography>
            <Grid container spacing={2}>
              {recentOrders.length === 0 ? (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" sx={{ color: '#677294', fontWeight: 500 }}>
                      No Requests Yet
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#999', mt: 1 }}>
                      Click "New Request" to submit your first work order.
                    </Typography>
                  </Box>
                </Grid>
              ) : (
                recentOrders.map((order) => (
                  <Grid item xs={12} key={order.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2B3467' }}>
                              {order.work_order_number}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Submitted: {new Date(order.submitted_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Chip
                            label={order.status}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
                        </Box>
                        
                        <Divider sx={{ my: 1 }} />
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Company:</strong> {order.company_name}
                            </Typography>
                            {order.site_location && (
                              <Typography variant="body2" color="text.secondary">
                                <strong>Location:</strong> {order.site_location.name}
                              </Typography>
                            )}
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              <strong>Description:</strong>
                            </Typography>
                            <Typography variant="body2" noWrap>
                              {order.description || 'No description provided'}
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        {order.status === 'Rejected' && order.rejection_reason && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: '#fff5f5', borderRadius: 1 }}>
                            <Typography variant="body2" color="error">
                              <strong>Rejection Reason:</strong> {order.rejection_reason}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ContractorDashboard;