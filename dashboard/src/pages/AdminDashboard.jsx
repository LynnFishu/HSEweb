import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material';
import AdminMap from '../components/AdminMap';
import {
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useWorkOrders } from '../contexts/WorkOrderContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { workOrders, loading, error } = useWorkOrders();
  const { logout } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const filteredOrders = useMemo(() => {
    return workOrders.filter(order => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        order.work_order_number?.toLowerCase().includes(searchLower) ||
        order.company_name?.toLowerCase().includes(searchLower) ||
        order.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [workOrders, searchTerm]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ color: '#2B3467', fontWeight: 600 }}>
              Admin Dashboard
            </Typography>
            <Button
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{ borderColor: '#2B3467', color: '#2B3467' }}
            >
              Logout
            </Button>
          </Box>
        </Grid>

        {/* Map Component */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <AdminMap workOrders={workOrders} />
          </Paper>
        </Grid>

        {/* Work Orders Table */}
        <Grid item xs={12}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#2B3467' }}>
                Recent Work Orders
              </Typography>

              <TextField
                fullWidth
                size="small"
                placeholder="Search work orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Work Order #</TableCell>
                      <TableCell>Company</TableCell>
                      <TableCell>Contractor</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                          <Typography variant="body1" sx={{ color: '#677294' }}>
                            Loading...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                          <Typography variant="body1" sx={{ color: 'error.main' }}>
                            {error}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#677294', mt: 1 }}>
                            Please ensure the backend server is running and try again.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                          <Typography variant="body1" sx={{ color: '#677294', fontWeight: 500 }}>
                            No Work Orders
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#999', mt: 1 }}>
                            There are currently no work order requests.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((order) => (
                          <TableRow 
                            key={order.id}
                            sx={{ '&:hover': { bgcolor: '#f8fafc' } }}
                          >
                            <TableCell>
                              {new Date(order.submitted_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{order.work_order_number}</TableCell>
                            <TableCell>{order.company_name}</TableCell>
                            <TableCell>{order.requester_name}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip
                                  label={order.status}
                                  color={getStatusColor(order.status)}
                                  size="small"
                                />
                                {order.status === 'Approved' && (
                                  <Chip
                                    label={order.is_active === false ? 'Deactivated' : 'Active'}
                                    color={order.is_active === false ? 'default' : 'success'}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => navigate(`/admin/work-order/${order.id}`)}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                              {/* No activate/deactivate controls on dashboard */}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={filteredOrders.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;