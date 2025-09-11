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
  Collapse,
  IconButton,
  Chip,
  TablePagination,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Row component for work order and its violations
const WorkOrderRow = ({ workOrder, violations, onImageClick }) => {
  const [open, setOpen] = useState(false);
  
  // Calculate statistics for this work order
  const totalViolations = violations.length;
  const highConfidenceViolations = violations.filter(v => v.confidence > 0.8).length;
  
  return (
    <>
      <TableRow 
        sx={{ 
          '& > *': { borderBottom: 'unset' },
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
          bgcolor: open ? 'rgba(43, 52, 103, 0.05)' : 'inherit'
        }}
        onClick={() => setOpen(!open)}
      >
        <TableCell padding="checkbox" sx={{ width: '40px' }}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ maxWidth: '200px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#2B3467', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {workOrder.work_order_number}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>
                {(() => {
                  try {
                    const date = new Date(workOrder.submitted_at);
                    if (isNaN(date.getTime())) throw new Error('Invalid date');
                    return date.toLocaleDateString(undefined, { 
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  } catch (e) {
                    console.error('Date parsing error:', e, workOrder.submitted_at);
                    return 'Invalid date';
                  }
                })()}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={totalViolations}
              color={totalViolations > 5 ? 'error' : 'warning'}
              sx={{ minWidth: '32px', height: '24px' }}
            />
          </Box>
        </TableCell>
        <TableCell sx={{ maxWidth: '250px' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 'medium', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {workOrder.contractor_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {workOrder.company_name}
            </Typography>
          </Box>
        </TableCell>
        <TableCell sx={{ width: '120px' }}>
          {highConfidenceViolations > 0 && (
            <Chip
              size="small"
              label={`${highConfidenceViolations} critical`}
              color="error"
              variant="outlined"
              sx={{ height: '24px' }}
            />
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div" sx={{ color: '#2B3467', fontSize: '1rem' }}>
                Violations
              </Typography>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                {violations.map((violation) => (
                  <Paper
                    key={violation.id}
                    elevation={0}
                    variant="outlined"
                    sx={{ p: 1.5, borderRadius: 1 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Chip 
                        label={violation.type}
                        color={violation.confidence > 0.8 ? 'error' : 'warning'}
                        size="small"
                        sx={{ height: '24px' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(violation.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    
                    {violation.image_url && (
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          paddingTop: '56.25%', // 16:9 aspect ratio
                          mb: 1,
                          borderRadius: 1,
                          overflow: 'hidden',
                          bgcolor: 'rgba(0,0,0,0.03)',
                          cursor: 'pointer',
                          '&:hover': {
                            '& .image-overlay': {
                              opacity: 1
                            }
                          }
                        }}
                        onClick={() => onImageClick?.(violation.image_url)}
                      >
                        <Box
                          component="img"
                          src={`data:image/jpeg;base64,${violation.image_url}`}
                          alt={`Violation ${violation.id}`}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            console.error('Image load error:', e);
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iMTIiIHk9IjEyIiBmb250LXNpemU9IjEyIiBmaWxsPSIjYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+P'
                          }}
                        />
                        <Box
                          className="image-overlay"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: 'rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            color: 'white'
                          }}
                        >
                          <Typography variant="caption">Click to view</Typography>
                        </Box>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(violation.timestamp).toLocaleDateString()}
                      </Typography>
                      <Chip 
                        label={`${(violation.confidence * 100).toFixed(0)}%`}
                        color={violation.confidence > 0.8 ? 'error' : 'warning'}
                        size="small"
                        variant="outlined"
                        sx={{ height: '20px', minWidth: '45px' }}
                      />
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const ViolationsTable = ({ violations, onImageClick }) => {
  // Group violations by work order
  const workOrderMap = violations.reduce((acc, violation) => {
    const workOrderId = violation.work_order_id;
    if (!acc[workOrderId]) {
      acc[workOrderId] = {
        work_order_id: workOrderId,
        work_order_number: violation.work_order_number,
        contractor_name: violation.contractor_name,
        company_name: violation.company_name,
        contractor_work_id: violation.contractor_work_id,
        submitted_at: violation.work_order_submitted_at,
        violations: []
      };
    }
    acc[workOrderId].violations.push(violation);
    return acc;
  }, {});

  const workOrders = Object.values(workOrderMap);

  // Pagination state for grouped work orders
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const pagedWorkOrders = workOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table 
          aria-label="collapsible table"
          sx={{
            '& th': { 
              bgcolor: '#2B3467',
              color: 'white',
              fontWeight: 'medium',
              whiteSpace: 'nowrap'
            }
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: '40px' }} />
              <TableCell sx={{ width: '30%' }}>Work Order</TableCell>
              <TableCell sx={{ width: '40%' }}>Contractor</TableCell>
              <TableCell sx={{ width: '30%' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedWorkOrders.map((workOrder) => (
              <WorkOrderRow 
                key={workOrder.work_order_id} 
                workOrder={workOrder}
                violations={workOrder.violations}
                onImageClick={onImageClick}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <TablePagination
          component="div"
          count={workOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Box>
    </>
  );
};

export default ViolationsTable;
