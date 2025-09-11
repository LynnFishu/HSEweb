import { createContext, useContext, useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material';

const AuthContext = createContext({
  user: null,
  currentWorkOrder: null,
  login: () => {},
  logout: () => {},
  isLoading: false,
  setCurrentWorkOrder: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [currentWorkOrder, setCurrentWorkOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user data exists in sessionStorage (using sessionStorage instead of localStorage)
    try {
      // Generate a unique tab ID if it doesn't exist
      if (!sessionStorage.getItem('tabId')) {
        sessionStorage.setItem('tabId', Math.random().toString(36).substring(7));
      }

      const savedUser = sessionStorage.getItem(`user_${sessionStorage.getItem('tabId')}`);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      sessionStorage.removeItem(`user_${sessionStorage.getItem('tabId')}`);
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password, workId = null) => {
    try {
      setIsLoading(true);
      console.log('Attempting login with:', { email, workId });

      const requestBody = JSON.stringify({ email, password, workId });
      console.log('Request body:', requestBody);
      
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: requestBody
      });

      console.log('Backend response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      const data = await response.json();
      console.log('Login response data:', data);

      if (response.ok) {
        // Store user data in sessionStorage with unique tab ID
        const tabId = sessionStorage.getItem('tabId');
        sessionStorage.setItem(`user_${tabId}`, JSON.stringify(data));
        setUser(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsLoading(true);
    try {
      // Only remove the user data for the current tab
      const tabId = sessionStorage.getItem('tabId');
      sessionStorage.removeItem(`user_${tabId}`);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const checkWorkId = async (workId) => {
    try {
      console.log('Checking Work ID:', workId);
      const response = await fetch(`http://localhost:5000/api/contractors/check-workid/${workId}`);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Work ID check response:', data);
      return data;
    } catch (error) {
      console.error('Error checking Work ID:', error);
      return { exists: false, error: error.message };
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(90deg, #c3a8f7 0%, #a8e6ef 100%)'
      }}>
        <div style={{
          padding: '20px',
          borderRadius: '8px',
          background: 'white',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CircularProgress size={30} sx={{ color: '#2B3467' }} />
          <div style={{ color: '#2B3467' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      currentWorkOrder,
      setCurrentWorkOrder,
      login, 
      logout, 
      checkWorkId,
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;