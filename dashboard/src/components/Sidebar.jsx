import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import StorageIcon from '@mui/icons-material/Storage';
import Toolbar from '@mui/material/Toolbar';
import { useTheme } from '@mui/material/styles';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const drawerWidth = 260;
const miniDrawerWidth = 72;

const Sidebar = ({ 
  sidebarSections, 
  isMobile, 
  mobileOpen, 
  collapsed, 
  handleDrawerToggle 
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [openMenus, setOpenMenus] = useState({});

  const handleNavigation = (path) => {
    if (path) {
      navigate(path);
      if (isMobile) {
        handleDrawerToggle();
      }
    }
  };

  const handleSubmenuToggle = (menuId) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const drawerContent = (
    <>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <StorageIcon color="primary" sx={{ mr: collapsed ? 0 : 1 }} />
          {!collapsed && (
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
              BERRY
            </Typography>
          )}
        </Box>
      </Toolbar>
      <Divider />
      <Box sx={{ overflow: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {sidebarSections.map((section, idx) => (
          <Box key={section.title} sx={{ mb: 1 }}>
            {!collapsed && (
              <Typography variant="caption" sx={{ pl: 2, pt: 2, color: '#888', fontWeight: 600 }}>
                {section.title}
              </Typography>
            )}
            <List>
              {section.items.map((item) => (
                <React.Fragment key={item.text}>
                  {item.submenu ? (
                    <>
                      <ListItemButton
                        onClick={() => handleSubmenuToggle(item.text)}
                        sx={{ justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 2 : 3 }}
                      >
                        <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: 'center' }}>
                          {item.icon}
                        </ListItemIcon>
                        {!collapsed && (
                          <>
                            <ListItemText primary={item.text} />
                            {openMenus[item.text] ? <ExpandLess /> : <ExpandMore />}
                          </>
                        )}
                      </ListItemButton>
                      {!collapsed && (
                        <Collapse in={openMenus[item.text]} timeout={200}>
                          <List component="div" disablePadding>
                            {item.submenu.map((subItem) => (
                              <ListItemButton
                                key={subItem.text}
                                onClick={() => handleNavigation(subItem.path)}
                                sx={{ pl: 6 }}
                              >
                                <ListItemIcon sx={{ minWidth: 0, mr: 2, justifyContent: 'center' }}>
                                  {subItem.icon}
                                </ListItemIcon>
                                <ListItemText primary={subItem.text} />
                              </ListItemButton>
                            ))}
                          </List>
                        </Collapse>
                      )}
                    </>
                  ) : (
                    <ListItemButton
                      onClick={() => handleNavigation(item.path)}
                      sx={{ justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 2 : 3 }}
                    >
                      <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: 'center' }}>
                        {item.icon}
                      </ListItemIcon>
                      {!collapsed && <ListItemText primary={item.text} />}
                    </ListItemButton>
                  )}
                </React.Fragment>
              ))}
            </List>
            {idx < sidebarSections.length - 1 && <Divider />}
          </Box>
        ))}
      </Box>
    </>
  );

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? mobileOpen : true}
      onClose={handleDrawerToggle}
      sx={{
        width: !isMobile ? (collapsed ? miniDrawerWidth : drawerWidth) : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? miniDrawerWidth : drawerWidth,
          boxSizing: 'border-box',
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.easeInOut,
            duration: 200,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar; 