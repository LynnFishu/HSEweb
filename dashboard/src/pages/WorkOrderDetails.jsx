import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useWorkOrders } from '../contexts/WorkOrderContext';
import { useAuth } from '../contexts/AuthContext';

const WorkOrderDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();
  const { workOrders, updateWorkOrder } = useWorkOrders();
  const [workOrder, setWorkOrder] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  useEffect(() => {
    const order = workOrders.find(o => o.id === parseInt(id));
    if (!order) {
      // If coming from contractors page, go back there
      if (location.pathname.includes('/admin/work-order')) {
        navigate('/admin/contractors');
      } else {
        navigate(user?.role === 'admin' ? '/admin/dashboard' : '/contractor/request-history');
      }
      return;
    }
    setWorkOrder(order);
  }, [id, workOrders, navigate, user, location]);

  const handleDelete = async () => {
    try {
      await updateWorkOrder(workOrder.id, { status: 'Cancelled' });
      navigate(user?.role === 'admin' ? '/admin/dashboard' : '/contractor/request-history');
    } catch (error) {
      console.error('Error deleting work order:', error);
    }
    setDeleteDialog(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const handleBack = () => {
    // If we came from the contractors page, go back there
    if (location.pathname.includes('/admin/work-order')) {
      navigate('/admin/contractors');
    } else {
      navigate(user?.role === 'admin' ? '/admin/dashboard' : '/contractor/request-history');
    }
  };

  if (!workOrder) return null;

  return (
    <Box
      sx={{
        flexGrow: 1,
        width: '100%',
        p: { xs: 2, sm: 3 },
        background: 'linear-gradient(90deg, #c3a8f7 0%, #a8e6ef 100%)',
        minHeight: '100vh',
      }}
    >
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={handleBack}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">Work Order Details</Typography>
          </Box>
          {workOrder.status === 'Pending' && user?.role === 'contractor' && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Edit Work Order">
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/contractor/submit-request?edit=${workOrder.id}`)}
                  sx={{ borderRadius: 2 }}
                >
                  Edit
                </Button>
              </Tooltip>
              <Tooltip title="Delete Work Order">
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialog(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Delete
                </Button>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Status and Work Order Number */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ color: '#2B3467' }}>
            {workOrder.work_order_number}
          </Typography>
          <Chip
            label={workOrder.status}
            color={getStatusColor(workOrder.status)}
            sx={{ fontWeight: 500 }}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Company Information */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
              Company Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1">
                <strong>Company Name:</strong> {workOrder.company_name}
              </Typography>
              {workOrder.site_location && (
                <>
                  <Typography variant="body1">
                    <strong>Location Name:</strong> {workOrder.site_location.name}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Address:</strong> {workOrder.site_location.address}
                  </Typography>
                  {workOrder.site_location.coordinates && (
                    <Typography variant="body1">
                      <strong>Coordinates:</strong> {workOrder.site_location.coordinates.lat}, {workOrder.site_location.coordinates.lng}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
              Request Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1">
                <strong>Requested By:</strong> {workOrder.requester_name}
              </Typography>
              <Typography variant="body1">
                <strong>Submission Date:</strong> {new Date(workOrder.submitted_at).toLocaleDateString()}
              </Typography>
              {workOrder.status === 'Rejected' && workOrder.rejection_reason && (
                <Typography variant="body1" color="error">
                  <strong>Rejection Reason:</strong> {workOrder.rejection_reason}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Description */}
        <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
          Description
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1 }}>
          <Typography variant="body1">
            {workOrder.description || 'No description provided'}
          </Typography>
        </Paper>

        <Divider sx={{ my: 3 }} />

        {/* Site Location Details */}
        <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
          Site Location Details
        </Typography>
        {workOrder.site_location && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography><strong>Location Name:</strong> {workOrder.site_location.name}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography><strong>Address:</strong> {workOrder.site_location.address}</Typography>
            </Grid>
            {workOrder.site_location.lat && workOrder.site_location.lng && (
              <Grid item xs={12}>
                <Typography>
                  <strong>Coordinates:</strong> {workOrder.site_location.lat}, {workOrder.site_location.lng}
                </Typography>
              </Grid>
            )}
          </Grid>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Delete Work Order</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this work order? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default WorkOrderDetails;