import React, { useState } from 'react';
import {
  Box,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  InputAdornment,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useWorkOrders } from '../contexts/WorkOrderContext';
import { useNavigate } from 'react-router-dom';

const ContractorRequests = () => {
  const { workOrders, updateWorkOrder, loading, error, refreshWorkOrders, setWorkOrderActive } = useWorkOrders();

  // No need for additional refresh on mount since WorkOrderContext already handles it
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(1); // Default to Pending tab
  const [rejectDialog, setRejectDialog] = useState({ open: false, orderId: null });
  const [rejectReason, setRejectReason] = useState('');

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      if (newStatus === 'Rejected') {
        setRejectDialog({ open: true, orderId });
      } else {
        await updateWorkOrder(orderId, { status: newStatus });
        // Refresh the work orders after status change
        await refreshWorkOrders();
      }
    } catch (error) {
      console.error('Error updating work order status:', error);
    }
  };

  const handleReject = async () => {
    try {
      if (rejectDialog.orderId && rejectReason.trim()) {
        await updateWorkOrder(rejectDialog.orderId, {
          status: 'Rejected',
          rejectionReason: rejectReason.trim()
        });
        // Refresh work orders after rejection
        await refreshWorkOrders();
        setRejectDialog({ open: false, orderId: null });
        setRejectReason('');
      }
    } catch (error) {
      console.error('Error rejecting work order:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredOrders = workOrders.filter(order => {
    const matchesSearch = (
      order.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.requester_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesStatus = selectedTab === 0 ? true :
      selectedTab === 1 ? order.status === 'Pending' :
      selectedTab === 2 ? order.status === 'Approved' :
      order.status === 'Rejected';

    return matchesSearch && matchesStatus;
  });

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: { xs: 2, sm: 3 },
        background: 'linear-gradient(90deg, #c3a8f7 0%, #a8e6ef 100%)',
        minHeight: '100vh',
      }}
    >
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#2B3467' }}>
            Contractor Work Orders
          </Typography>
          <TextField
            size="small"
            placeholder="Search work orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="All" />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Pending</span>
                <Chip 
                  size="small" 
                  label={workOrders.filter(o => o.status === 'Pending').length}
                  color="warning"
                />
              </Box>
            }
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Approved</span>
                <Chip 
                  size="small" 
                  label={workOrders.filter(o => o.status === 'Approved').length}
                  color="success"
                />
              </Box>
            }
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Rejected</span>
                <Chip 
                  size="small" 
                  label={workOrders.filter(o => o.status === 'Rejected').length}
                  color="error"
                />
              </Box>
            }
          />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Work Order #</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Company Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Requested By</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                {selectedTab === 3 && (  // Only show Reason column in Rejected tab
                  <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                )}
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Typography variant="body1" sx={{ color: '#677294' }}>
                      Loading...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Typography variant="body1" sx={{ color: 'error.main' }}>
                      {error}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#677294', mt: 1 }}>
                      Please ensure the backend server is running and try again.
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={refreshWorkOrders}
                      sx={{ mt: 2 }}
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
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
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:hover': { bgcolor: '#f8fafc' }
                      }}
                    >
                      <TableCell>
                        {new Date(order.submitted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{order.work_order_number}</TableCell>
                      <TableCell>{order.company_name}</TableCell>
                      <TableCell>{order.requester_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={order.status}
                          color={getStatusColor(order.status)}
                          size="small"
                        />
                      </TableCell>
                      {selectedTab === 3 && (  // Only show Reason column in Rejected tab
                        <TableCell>{order.rejection_reason}</TableCell>
                      )}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          {order.status === 'Pending' && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleStatusChange(order.id, 'Approved')}
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleStatusChange(order.id, 'Rejected')}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {order.status === 'Approved' && (
                            <Button
                              size="small"
                              variant={order.is_active === false ? 'contained' : 'outlined'}
                              onClick={async () => {
                                const next = !(order.is_active === true);
                                try {
                                  await setWorkOrderActive(order.id, next);
                                  await refreshWorkOrders();
                                } catch (e) {
                                  console.error('Toggle active failed:', e);
                                }
                              }}
                            >
                              {order.is_active === false ? 'Activate' : 'Deactivate'}
                            </Button>
                          )}
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/admin/work-order/${order.id}`)}
                              sx={{ color: '#2B3467' }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Reject Reason Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, orderId: null })}
      >
        <DialogTitle>Reject Work Order</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for Rejection"
            fullWidth
            multiline
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, orderId: null })}>
            Cancel
          </Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractorRequests;