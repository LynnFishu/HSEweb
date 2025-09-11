import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const WorkOrderContext = createContext(null);

export const WorkOrderProvider = ({ children }) => {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Fetch work orders based on user role
  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const endpoint = user?.role === 'contractor' 
        ? `/api/work-orders/user/${user.id}`
        : '/api/work-orders';
      
      console.log('Fetching work orders for user:', { userId: user?.id, role: user?.role });
      try {
        console.log('Making request to:', `http://localhost:5000${endpoint}`);
        const response = await fetch(`http://localhost:5000${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${user?.id}`,
            'X-User-Role': user?.role || 'none'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Server error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch work orders');
        }
        
        const data = await response.json();
        console.log('Fetched work orders:', data);
        
        // Sort work orders by submission date (newest first)
        const sortedData = data.sort((a, b) => 
          new Date(b.submitted_at) - new Date(a.submitted_at)
        );
        
        setWorkOrders(sortedData);
      } catch (error) {
        console.error('Fetch error:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('<!doctype')) {
          throw new Error('Unable to connect to server. Please ensure the backend server is running.');
        }
        throw error;
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching work orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch work orders when user changes
  useEffect(() => {
    if (!user) {
      setWorkOrders([]); // Clear work orders when user logs out
      return;
    }

    let isSubscribed = true;
    
    const loadWorkOrders = async () => {
      try {
        const endpoint = user?.role === 'contractor' 
          ? `/api/work-orders/user/${user.id}`
          : '/api/work-orders';
        
        console.log('Making request to:', `http://localhost:5000${endpoint}`);
        const response = await fetch(`http://localhost:5000${endpoint}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Server error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch work orders');
        }
        
        const data = await response.json();
        console.log('Fetched work orders:', data);
        
        if (isSubscribed) {
          // Sort work orders by submission date (newest first)
          const sortedData = data.sort((a, b) => 
            new Date(b.submitted_at) - new Date(a.submitted_at)
          );
          
          setWorkOrders(sortedData);
          setError(null);
        }
      } catch (error) {
        console.error('Fetch error:', error);
        if (isSubscribed) {
          setError(error.message);
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    loadWorkOrders();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isSubscribed = false;
    };
  }, [user]); // Only re-fetch when user changes

  const addWorkOrder = async (order) => {
    try {
      console.log('Adding work order:', order);
      
      // Prepare the site location data as JSONB
      const siteLocation = {
        name: order.siteLocation.name,
        address: order.siteLocation.address,
        coordinates: {
          lat: parseFloat(order.siteLocation.lat) || 0,
          lng: parseFloat(order.siteLocation.lng) || 0
        }
      };

      const requestBody = {
        work_order_number: order.workOrderNumber,
        company_name: order.companyName,
        requested_by: user.id, // This matches the foreign key constraint
        description: order.description,
        site_location: siteLocation // This will be stored as JSONB
      };

      console.log('Sending request with body:', requestBody);

      const response = await fetch('http://localhost:5000/api/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create work order');
      }
      
      const newOrder = await response.json();
      console.log('New work order created:', newOrder);
      
      // Update local state
      setWorkOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (err) {
      console.error('Error adding work order:', err);
      throw err;
    }
  };

  const updateWorkOrder = async (id, updates) => {
    try {
      setLoading(true);
      console.log('Updating work order:', id, updates);
      
      // If updating status, use the status endpoint
      if ('status' in updates) {
        const response = await fetch(`http://localhost:5000/api/work-orders/${id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: updates.status,
            rejection_reason: updates.rejectionReason
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update work order status');
        }
        
        const updatedOrder = await response.json();
        console.log('Work order updated:', updatedOrder);
        
        // Update local state
        setWorkOrders(prev => {
          const newOrders = prev.map(order => 
            order.id === id ? updatedOrder : order
          );
          // Sort by submission date
          return newOrders.sort((a, b) => 
            new Date(b.submitted_at) - new Date(a.submitted_at)
          );
        });
        
        setError(null);
        return updatedOrder;
      }
    } catch (err) {
      console.error('Error updating work order:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setWorkOrderActive = async (id, isActive) => {
    try {
      console.log('Toggling work order active state:', { id, isActive });
      const response = await fetch(`http://localhost:5000/api/work-orders/${id}/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !!isActive })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update active state');
      }
      const updated = await response.json();
      setWorkOrders(prev => prev.map(o => o.id === id ? updated : o));
      return updated;
    } catch (err) {
      console.error('Error toggling active state:', err);
      setError(err.message);
      throw err;
    }
  };

  const getWorkOrder = (id) => {
    return workOrders.find(order => order.id === parseInt(id));
  };

  return (
    <WorkOrderContext.Provider value={{
      workOrders,
      loading,
      error,
      addWorkOrder,
      updateWorkOrder,
      getWorkOrder,
      refreshWorkOrders: fetchWorkOrders,
      setWorkOrderActive
    }}>
      {children}
    </WorkOrderContext.Provider>
  );
};

export const useWorkOrders = () => {
  const context = useContext(WorkOrderContext);
  if (!context) {
    throw new Error('useWorkOrders must be used within a WorkOrderProvider');
  }
  return context;
};

export default WorkOrderContext;