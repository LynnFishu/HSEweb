import React, { createContext, useContext, useState, useEffect } from 'react';
import mqtt from 'mqtt';
import { useAuth } from './AuthContext';

const MQTTContext = createContext(null);

// Using a free public broker for testing over WebSocket
const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';  // Using WSS (WebSocket Secure) port
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

  // Set active work order on mount if user is logged in
  useEffect(() => {
    if (user) {
      console.log('Checking for active work order on mount');
      fetch(`http://localhost:5000/api/work-orders/user/${user.id}`)
        .then(response => response.json())
        .then(orders => {
          const activeOrder = orders.find(order => order.status === 'Approved');
          if (activeOrder) {
            setActiveWorkOrder(activeOrder);
            console.log('Set active work order from API:', activeOrder);
          }
        })
        .catch(error => console.error('Error fetching work orders:', error));
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
            // Ensure we have an active approved work order; if missing, fetch and set one
            let currentActive = activeWorkOrder;
            if (!currentActive && user?.id) {
              console.log('No active work order - attempting to fetch approved orders for user:', user.id);
              try {
                const resp = await fetch(`http://localhost:5000/api/work-orders/user/${user.id}`);
                if (resp.ok) {
                  const orders = await resp.json();
                  const approved = Array.isArray(orders) ? orders.find(o => o.status === 'Approved') : null;
                  if (approved) {
                    setActiveWorkOrder(approved);
                    currentActive = approved;
                    console.log('Fetched and set active approved work order:', approved);
                  } else {
                    console.log('No approved work orders found for user on fallback fetch');
                  }
                } else {
                  console.log('Failed to fetch user work orders for fallback:', resp.status, resp.statusText);
                }
              } catch (e) {
                console.error('Error during fallback fetch for active work order:', e);
              }
            }

            // Check if we have an active work order after fallback
            if (!currentActive) {
              console.log('No active work order after fallback - skipping violation');
              return;
            }

            // Check if work order is approved
            if (currentActive.status !== 'Approved') {
              console.log('Work order not approved - skipping violation');
              return;
            }

            if (currentActive.is_active === false) {
              console.log('Work order is deactivated - skipping violation');
              return;
            }

            // Validate location if coordinates are provided
            if (payload.location && activeWorkOrder.site_location) {
              const { latitude, longitude } = payload.location;
              const siteLocation = activeWorkOrder.site_location;
              
              if (!isWithinSiteBoundary(
                latitude, 
                longitude, 
                parseFloat(siteLocation.lat), 
                parseFloat(siteLocation.lng)
              )) {
                console.log('Violation location outside work site boundary - skipping');
                return;
              }
            }

            // Prepare the violation data
            const violationData = {
              type: payload.type.toLowerCase(), // Normalize to lowercase
              confidence: payload.confidence,
              image_url: payload.image,
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
              contractor_id: user?.id || null,
              work_order_id: currentActive?.id || null,
              site_location: currentActive?.site_location || null
            };

            console.log('Sending violation to backend:', violationData);

            console.log('Attempting to send violation to backend:', {
                url: 'http://localhost:5000/api/violations',
                data: violationData
            });

            const response = await fetch('http://localhost:5000/api/violations', {
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
                contractor_id: user?.id || null,
                work_order_id: currentActive?.id || null,
                work_order_number: currentActive?.work_order_number || null,
                contractor_name: user?.name || null,
                company_name: user?.company_name || null
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