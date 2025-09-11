import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import { useAuth } from '../contexts/AuthContext';
import CssBaseline from '@mui/material/CssBaseline';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import DescriptionIcon from '@mui/icons-material/Description';
import HelpIcon from '@mui/icons-material/Help';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';

const drawerWidth = 260;
const miniDrawerWidth = 72;

const sidebarSections = [
  {
    title: 'Dashboard',
    items: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/contractor/dashboard' },
    ],
  },
  {
    title: 'Requests',
    items: [
      { 
        text: 'Requests', 
        icon: <PeopleIcon />,
        submenu: [
          { text: 'Submit Request', icon: <AddIcon />, path: '/contractor/submit-request' },
          { text: 'Request History', icon: <HistoryIcon />, path: '/contractor/request-history' }
        ]
      },
    ],
  },
  {
    title: 'Utilities',
    items: [
      { text: 'Documentation', icon: <DescriptionIcon /> },
      { text: 'Help & Support', icon: <HelpIcon /> },
    ],
  },
];

const ContractorLayout = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (!user || user.role !== 'contractor') {
    return <Navigate to="/login" replace />;
  }

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh', 
      overflow: 'hidden',
      '& ::-webkit-scrollbar': { display: 'none' },
      scrollbarWidth: 'none',
    }}>
      <CssBaseline />
      <TopBar handleDrawerToggle={handleDrawerToggle} />
      
      <Sidebar
        sidebarSections={sidebarSections}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        collapsed={collapsed}
        handleDrawerToggle={handleDrawerToggle}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { 
            xs: '100%',
            sm: `calc(100% - ${collapsed ? miniDrawerWidth : drawerWidth}px)`
          },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.easeInOut,
            duration: 200,
          }),
        }}
      >
        <Toolbar /> {/* Add spacing under AppBar */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default ContractorLayout; 