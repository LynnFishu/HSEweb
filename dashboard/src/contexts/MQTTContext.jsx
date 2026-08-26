import React, { createContext, useContext, useState, useEffect } from 'react';
import mqtt from 'mqtt';
import { useAuth } from './AuthContext';
import { API_ENDPOINTS } from '../config/api';

const MQTTContext = createContext(null);

// Public broker for testing over WebSocket - reachable from anywhere now
// that the Orin has real internet (wired to the dog for RTSP, Wi-Fi free
// for internet access).
const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const MQTT_TOPIC = 'ppe/detection/#';  // # is a wildcard for all subtopics

export const MQTTProvider = ({ children }) => {
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [activeWorkOrder, setActiveWorkOrder] = useState(null);
  
  // Log current context whenever it changes
  useEffect(() => {
    console.log('MQTT Context - Current User:', user);
    console.log('MQTT Context - Active Work Order:', activeWorkOrder);
  }, [user, activeWorkOrder]);

  // Function to set active work order for violations
  const setCurrentWorkOrder = (workOrder) => {
    if (!workOrder) {
      console.log('Attempted to set null/undefined work order');
      return;
    }
    console.log('Setting active work order:', workOrder);
    if (workOrder.status !== 'Approved') {
      console.log('Warning: Cannot set non-approved work order as active');
      return;
    }
    setActiveWorkOrder(workOrder);
    console.log('Successfully set active work order for violations:', workOrder);
  };

  // Set active work order on mount if user is logged in (only for contractors)
  useEffect(() => {
    if (user && user.role === 'contractor') {
      console.log('Checking for active work order on mount for contractor:', user.id);
      fetch(API_ENDPOINTS.WORK_ORDERS_BY_USER(user.id))
        .then(response => response.json())
        .then(orders => {
          console.log('Work orders fetched on mount:', orders);
          console.log('Work orders statuses:', orders.map(o => ({ id: o.id, status: o.status, is_active: o.is_active })));
          
          // Find approved AND active work order
          const activeOrder = orders.find(order => 
            order.status === 'Approved' && order.is_active !== false
          );
          
          if (activeOrder) {
            setActiveWorkOrder(activeOrder);
            console.log('Set active work order from API:', activeOrder);
          } else {
            console.log('No approved and active work order found on mount');
            console.log('Available work orders:', orders.map(o => ({
              id: o.id,
              work_order_number: o.work_order_number,
              status: o.status,
              is_active: o.is_active
            })));
          }
        })
        .catch(error => console.error('Error fetching work orders:', error));
    } else if (user && user.role === 'admin') {
      console.log('User is admin - skipping work order fetch (admins view all work orders)');
    }
  }, [user]);

  useEffect(() => {
    // Create MQTT client
    const mqttClient = mqtt.connect(MQTT_BROKER, {
      clientId: `dashboard_${Math.random().toString(16).substring(2, 8)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
      protocol: 'wss',
      rejectUnauthorized: false
    });

    // Handle connection
    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      setIsConnected(true);

      // Subscribe to PPE detection topics
      mqttClient.subscribe(MQTT_TOPIC, (err) => {
        if (err) {
          console.error('Subscription error:', err);
        } else {
          console.log('Subscribed to:', MQTT_TOPIC);
        }
      });
    });

    // Function to check if coordinates are within site boundary
    const isWithinSiteBoundary = (lat1, lon1, lat2, lon2, radiusKm = 0.5) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      return distance <= radiusKm;
    };

    // Handle incoming messages
    mqttClient.on('message', async (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        console.log('Received MQTT message:', payload);
        setLastMessage(payload);

        // Send violation to backend API
        if (payload.type && (payload.type.startsWith('no-') || payload.type.startsWith('NO-'))) {
          console.log('Processing violation:', payload);
          
          try {
            // Handle different payload formats
            // hsedemo.py sends: type, confidence, timestamp, frame_size, image
            // May or may not include: contractor_id, work_order_id
            
            let contractorId = payload.contractor_id;
            let workOrderId = payload.work_order_id;
            
            // If payload doesn't have contractor/work_order, try to find them
            if (!contractorId || !workOrderId) {
              console.log('Payload missing contractor_id or work_order_id - attempting to find them');
              
              // Strategy 1: If logged-in user is a contractor, use their info
              if (user && user.role === 'contractor') {
                contractorId = contractorId || user.id;
                
                // Try to find active work order for this contractor
                if (!workOrderId) {
                  try {
                    const resp = await fetch(API_ENDPOINTS.WORK_ORDERS_BY_USER(user.id));
                    if (resp.ok) {
                      const orders = await resp.json();
                      console.log('Fetched work orders for contractor:', orders);
                      
                      // Find approved and active work order
                      const approved = Array.isArray(orders) ? orders.find(o => 
                        o.status === 'Approved' && o.is_active !== false
                      ) : null;
                      
                      if (approved) {
                        workOrderId = approved.id;
                        console.log('Found active work order for contractor:', workOrderId);
                      } else {
                        console.log('No approved and active work orders found for contractor');
                        console.log('Available work orders:', orders.map(o => ({
                          id: o.id,
                          work_order_number: o.work_order_number,
                          status: o.status,
                          is_active: o.is_active
                        })));
                      }
                    }
                  } catch (e) {
                    console.error('Error fetching work orders:', e);
                  }
                }
              }
              
              // Strategy 2: If admin is logged in or still no work order, try to find any active work order
              // This allows admins to see violations even if payload doesn't include contractor info
              if (!workOrderId) {
                console.log('Attempting to find any active work order for violation processing');
                try {
                  // Fetch all work orders (admin can see all)
                  const resp = await fetch(API_ENDPOINTS.WORK_ORDERS);
                  if (resp.ok) {
                    const allOrders = await resp.json();
                    console.log('Fetched all work orders:', allOrders.length);
                    
                    // Find first approved and active work order
                    const activeOrder = Array.isArray(allOrders) ? allOrders.find(o => 
                      o.status === 'Approved' && o.is_active !== false
                    ) : null;
                    
                    if (activeOrder) {
                      workOrderId = activeOrder.id;
                      contractorId = contractorId || activeOrder.requested_by;
                      console.log('Found active work order for violation:', {
                        work_order_id: workOrderId,
                        contractor_id: contractorId,
                        work_order_number: activeOrder.work_order_number
                      });
                    } else {
                      console.log('No approved and active work orders found in system');
                    }
                  }
                } catch (e) {
                  console.error('Error fetching all work orders:', e);
                }
              }
            }
            
            // Final validation
            if (!contractorId || !workOrderId) {
              console.log('Cannot process violation - missing required info');
              console.log('contractor_id:', contractorId);
              console.log('work_order_id:', workOrderId);
              return;
            }
            
            console.log('Processing violation with:', {
              contractor_id: contractorId,
              work_order_id: workOrderId,
              type: payload.type
            });

            // Prepare the violation data
            const violationData = {
              type: payload.type.toLowerCase(), // Normalize to lowercase
              confidence: payload.confidence,
              // Support both 'image' (hsedemo.py) and 'image_url' field names
              image_url: payload.image || payload.image_url,
              // Ensure timestamp is in ISO format
              timestamp: (() => {
                if (!payload.timestamp) return new Date().toISOString();
                // If it's a number (unix timestamp), convert it
                if (typeof payload.timestamp === 'number') {
                  // Check if it's in seconds (10 digits) or milliseconds (13 digits)
                  const timestamp = payload.timestamp.toString().length === 10 
                    ? payload.timestamp * 1000  // Convert seconds to milliseconds
                    : payload.timestamp;
                  return new Date(timestamp).toISOString();
                }
                // If it's already a string, validate it's a proper date
                try {
                  const date = new Date(payload.timestamp);
                  if (isNaN(date.getTime())) throw new Error('Invalid date');
                  return date.toISOString();
                } catch (e) {
                  console.error('Invalid timestamp received:', payload.timestamp);
                  return new Date().toISOString();
                }
              })(),
              location: payload.location || null,
              contractor_id: contractorId,
              work_order_id: workOrderId
            };

            console.log('Sending violation to backend:', violationData);

            console.log('Attempting to send violation to backend:', {
                url: API_ENDPOINTS.VIOLATIONS,
                data: violationData
            });

            const response = await fetch(API_ENDPOINTS.VIOLATIONS, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                type: violationData.type,
                confidence: parseFloat(violationData.confidence), // Ensure confidence is a number
                image_url: violationData.image_url,
                timestamp: violationData.timestamp,
                contractor_id: violationData.contractor_id,
                work_order_id: violationData.work_order_id,
                work_order_number: payload.work_order_number || null,
                contractor_name: payload.contractor_name || user?.name || null,
                company_name: payload.company_name || user?.company_name || null
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Server error: ${errorData.error || response.statusText}`);
            }

            const result = await response.json();
            console.log('Violation saved successfully:', result);

            if (!response.ok) {
              throw new Error('Failed to save violation');
            }

            console.log('Violation saved to database');
          } catch (error) {
            console.error('Error saving violation:', error);
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    // Handle errors
    mqttClient.on('error', (err) => {
      console.error('MQTT error:', err);
      setIsConnected(false);
    });

    // Handle disconnection
    mqttClient.on('offline', () => {
      console.log('MQTT client offline');
      setIsConnected(false);
    });

    // Store client in state
    setClient(mqttClient);

    // Cleanup on unmount
    return () => {
      if (mqttClient) {
        mqttClient.end();
      }
    };
  }, []);

  // Function to publish messages (if needed)
  const publish = (topic, message) => {
    if (client && isConnected) {
      client.publish(topic, JSON.stringify(message));
    }
  };

  return (
    <MQTTContext.Provider value={{ 
      isConnected, 
      lastMessage, 
      publish,
      activeWorkOrder,
      setCurrentWorkOrder
    }}>
      {children}
    </MQTTContext.Provider>
  );
};

export const useMQTT = () => {
  const context = useContext(MQTTContext);
  if (!context) {
    throw new Error('useMQTT must be used within an MQTTProvider');
  }
  return context;
};

export default MQTTContext;