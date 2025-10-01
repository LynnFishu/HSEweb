// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://hse.sbd-one.com:5000';

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/api/login`,
  REGISTER: `${API_BASE_URL}/api/contractors/register`,
  
  // Work order endpoints
  WORK_ORDERS: `${API_BASE_URL}/api/work-orders`,
  WORK_ORDER_STATUS: (id) => `${API_BASE_URL}/api/work-orders/${id}/status`,
  WORK_ORDER_ACTIVE: (id) => `${API_BASE_URL}/api/work-orders/${id}/active`,
  WORK_ORDERS_BY_USER: (userId) => `${API_BASE_URL}/api/work-orders/user/${userId}`,
  
  // Contractor endpoints
  CONTRACTORS: `${API_BASE_URL}/api/contractors`,
  CHECK_WORK_ID: (workId) => `${API_BASE_URL}/api/contractors/check-workid/${workId}`,
  
  // Violation endpoints
  VIOLATIONS: `${API_BASE_URL}/api/violations`,
  
  // Test endpoint
  TEST: `${API_BASE_URL}/test`
};

export default API_BASE_URL;
