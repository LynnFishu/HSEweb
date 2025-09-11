import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useWorkOrders } from '../contexts/WorkOrderContext';
import { useAuth } from '../contexts/AuthContext';

const RequestHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workOrders } = useWorkOrders();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');

  const filteredData = useMemo(() => {
    return workOrders.filter(order => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      switch (filterField) {
        case 'companyName':
          return order.company_name.toLowerCase().includes(searchLower);
        case 'workOrderNumber':
          return order.work_order_number.toLowerCase().includes(searchLower);
        case 'all':
        default:
          return (
            order.work_order_number.toLowerCase().includes(searchLower) ||
            order.company_name.toLowerCase().includes(searchLower) ||
            (order.description && order.description.toLowerCase().includes(searchLower))
          );
      }
    });
  }, [workOrders, searchTerm, filterField]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const handleViewDetails = (orderId) => {
    navigate(`/${user.role}/work-order/${orderId}`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#2B3467' }}>
            Request History
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              size="small"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Search in</InputLabel>
              <Select
                value={filterField}
                label="Search in"
                onChange={(e) => setFilterField(e.target.value)}
              >
                <MenuItem value="all">All Fields</MenuItem>
                <MenuItem value="workOrderNumber">Work Order #</MenuItem>
                <MenuItem value="companyName">Company Name</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Work Order #</TableCell>
                  <TableCell>Company Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <Typography variant="body1" sx={{ color: '#677294', fontWeight: 500 }}>
                        No Request History
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#999', mt: 1 }}>
                        There are currently no work order requests.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData
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
                        <TableCell>
                          <Chip
                            label={order.status}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewDetails(order.id)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
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
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default RequestHistory;