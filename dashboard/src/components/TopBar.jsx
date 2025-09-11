import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useAuth } from '../contexts/AuthContext';

const TopBar = ({ handleDrawerToggle }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);

  const handleSettingsClick = (event) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleSettingsClose();
  };
  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: '#fff',
        boxShadow: '0 2px 8px #f0f1f2',
        color: '#222',
        transition: 'all 0.2s',
      }}
      elevation={0}
    >
      <Toolbar sx={{ minHeight: 64, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton color="inherit">
            <Badge badgeContent={2} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <Box
            component="button"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: '4px 8px',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              },
              '&:focus': {
                outline: 'none',
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
            onClick={handleSettingsClick}
            aria-controls={Boolean(settingsAnchorEl) ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={Boolean(settingsAnchorEl) ? 'true' : undefined}
          >
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
              <AccountCircleIcon />
            </Avatar>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.name || user?.email || 'User'}
            </Typography>
          </Box>

          <Menu
            anchorEl={settingsAnchorEl}
            id="account-menu"
            open={Boolean(settingsAnchorEl)}
            onClose={handleSettingsClose}
            onClick={handleSettingsClose}
            keepMounted
            disablePortal
            slotProps={{
              paper: {
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  minWidth: 200,
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled tabIndex={-1}>
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              <Typography>Profile</Typography>
            </MenuItem>
            <MenuItem disabled tabIndex={-1}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <Typography>Settings</Typography>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={handleLogout}
              tabIndex={0}
              role="menuitem"
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              <Typography color="error">Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar; 