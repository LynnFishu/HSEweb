import React, { createContext, useContext } from 'react';
import { useLoadScript } from '@react-google-maps/api';

const GoogleMapsContext = createContext(null);

// Define libraries as a static constant to prevent reloading
const libraries = ['places'];

export const GoogleMapsProvider = ({ children }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
};

export default GoogleMapsContext;