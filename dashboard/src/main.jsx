import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import { WorkOrderProvider } from './contexts/WorkOrderContext'
import { GoogleMapsProvider } from './contexts/GoogleMapsContext'
import { MQTTProvider } from './contexts/MQTTContext'
import theme from './theme'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <WorkOrderProvider>
            <GoogleMapsProvider>
              <MQTTProvider>
                <App />
              </MQTTProvider>
            </GoogleMapsProvider>
          </WorkOrderProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
