import React, { useState, useEffect } from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Button,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  SwapHoriz as ReferralsIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  AdminPanelSettings as AdminIcon,
  Login as LoginIcon,
  MedicalServices as ProvidersIcon,
  Description as PatientRecordsIcon,
  Token as TokenIcon,
  Psychology as AIIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import adminAuthService from '../services/adminAuthService';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const getMenuItems = () => [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
  { text: 'Providers', icon: <ProvidersIcon />, path: '/admin/providers' },
  { text: 'Login Audit', icon: <LoginIcon />, path: '/admin/audit/login' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
  { text: 'Patient Records', icon: <PatientRecordsIcon />, path: '/admin/patient-records' },
  { text: 'Referrals', icon: <ReferralsIcon />, path: '/admin/referrals' },
  { text: 'AI Management', icon: <AIIcon />, path: '/admin/ai-management' },
  { text: 'Token Management', icon: <TokenIcon />, path: '/admin/token-management' },
  { text: 'Messaging', icon: <MessageIcon />, path: '/admin/messaging' },
];

const AdminLayout = () => {
  console.log('[AdminLayout] Component rendering');
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [open, setOpen] = useState(!isMobile);

  useEffect(() => {
    console.log('[AdminLayout] Component mounted');
    console.log('[AdminLayout] Current path:', location.pathname);
    return () => {
      console.log('[AdminLayout] Component unmounting');
    };
  }, []);

  useEffect(() => {
    console.log('[AdminLayout] Path changed to:', location.pathname);
  }, [location.pathname]);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBarStyled position="fixed" open={open} color="primary">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ClinicTrust AI Admin
          </Typography>
          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
              startIcon={<DashboardIcon />}
              sx={{
                mr: 2,
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                textTransform: 'none',
                borderRadius: '8px',
                px: 2,
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Home
            </Button>
            <Button 
              variant="contained"
              color="secondary"
              onClick={adminAuthService.adminLogout}
              startIcon={<LoginIcon />}
              sx={{ 
                textTransform: 'none',
                borderRadius: '8px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                px: 2,
                '&:hover': {
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBarStyled>
      
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', px: 2 }}>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Admin Panel
            </Typography>
            <IconButton onClick={handleDrawerClose}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>
        </DrawerHeader>
        
        <Divider />
        
        <List>
          {getMenuItems().map((item) => {
            const isActive = location.pathname === item.path || 
                          (item.path !== '/admin' && location.pathname.startsWith(item.path));
            
            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  selected={isActive}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.12)',
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'primary.main' : 'inherit'
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontWeight: isActive ? 'bold' : 'normal',
                        color: isActive ? 'primary.main' : 'inherit'
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
      
      <Main open={open}>
        <DrawerHeader />
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Main>
    </Box>
  );
};

export default AdminLayout;
