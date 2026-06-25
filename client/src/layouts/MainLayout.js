import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  SwapHoriz as ReferralsIcon,
  Analytics as AnalyticsIcon,
  Token as TokenIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountIcon,
  ChevronLeft as ChevronLeftIcon,
  AdminPanelSettings as AdminIcon,
  Storage as BlockchainIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useAuth, useToken, useNotification } from '../contexts';
import referralService from '../services/referralService';
import { ThemeToggle } from '../components/common';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';

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

// Menu items will be defined inside the MainLayout component

export default function MainLayout() {
  const { currentUser, logout } = useAuth();
  const { balance } = useToken();
  const { notifySuccess } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [referralCounts, setReferralCounts] = useState({
    pending: 0,
    accepted: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    total: 0
  });

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };
  
  // Define menu items inside the component to access balance
  const getMenuItems = (userRole, counts) => {
    const items = [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/app/dashboard' },
      { text: 'Patients', icon: <PeopleIcon />, path: '/app/patients' },
      { text: 'Referrals', icon: <ReferralsIcon />, path: '/app/referrals', badgeContent: counts.total, badgeColor: 'secondary' },
      { text: 'Analytics', icon: <AnalyticsIcon />, path: '/app/analytics' },
      { text: 'Tokens', icon: <TokenIcon />, path: '/app/tokens', badgeContent: balance, badgeColor: 'secondary' },
      { text: 'Blockchain', icon: <BlockchainIcon />, path: '/app/blockchain/history' },
      { text: 'Prior Auth', icon: <AssignmentIcon />, path: '/app/prior-auth' },
      { text: 'Settings', icon: <SettingsIcon />, path: '/app/settings' }
    ];
    
    // Add admin link for users with admin role
    if (userRole === 'admin') {
      items.push({ text: 'Admin Panel', icon: <AdminIcon color="error" />, path: '/app/admin' });
    }
    
    return items;
  };
  
  // Fetch referral counts when component mounts
  useEffect(() => {
    const fetchReferralCounts = async () => {
      try {
        const counts = await referralService.getReferralStatusCounts();
        setReferralCounts({
          pending: counts.pending || 0,
          accepted: counts.accepted || 0,
          completed: counts.completed || 0,
          rejected: counts.rejected || 0,
          cancelled: counts.cancelled || 0,
          total: Object.values(counts).reduce((sum, count) => sum + count, 0)
        });
      } catch (error) {
        console.error('Error fetching referral counts:', error);
      }
    };
    
    fetchReferralCounts();
    
    // Refresh counts every 5 minutes
    const intervalId = setInterval(fetchReferralCounts, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      notifySuccess('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBarStyled position="fixed" open={open} color="default">
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
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            ClinicTrust AI
          </Typography>
          
          {/* Theme Toggle */}
          <ThemeToggle variant="icon" size="medium" />
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              size="large"
              color="inherit"
              component={RouterLink}
              to="/app/tokens"
            >
              <Badge 
                badgeContent={149} 
                color="secondary"
                overlap="circular"
                max={999}
                showZero={false}
              >
                <TokenIcon />
              </Badge>
            </IconButton>
            <IconButton
              size="large"
              color="inherit"
              onClick={handleNotificationsOpen}
            >
              <Badge badgeContent={4} color="error" showZero={false}>
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Box>
          
          <IconButton
            size="large"
            color="inherit"
            onClick={handleProfileMenuOpen}
          >
            {currentUser && currentUser.firstName ? (
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {currentUser.firstName.charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <AccountIcon />
            )}
          </IconButton>
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
        variant={isMobile ? "temporary" : "persistent"}
        anchor="left"
        open={open}
        onClose={handleDrawerClose}
      >
        <DrawerHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', px: 2 }}>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              ClinicTrust AI
            </Typography>
            <IconButton onClick={handleDrawerClose}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>
        </DrawerHeader>
        <Divider />
        
        {currentUser && (
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar 
              sx={{ width: 40, height: 40, bgcolor: 'primary.main', mr: 2 }}
              src={currentUser.profileImage}
            >
              {currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() : ''}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {currentUser.firstName} {currentUser.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentUser.role}
                {currentUser.specialty ? ` - ${currentUser.specialty}` : ''}
              </Typography>
            </Box>
          </Box>
        )}
        
        <Divider />
        
        <List>
          {getMenuItems(currentUser?.role, referralCounts).map((item) => {
            // Check if this menu item is active - improved matching logic
            const isActive = location.pathname === item.path || 
                          (item.path !== '/app/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  onClick={isMobile ? handleDrawerClose : undefined}
                  selected={isActive}
                  sx={{
                    position: 'relative',
                    borderRadius: '0 20px 20px 0',
                    marginRight: 2,
                    marginLeft: 1,
                    marginY: 0.5,
                    transition: 'all 0.2s ease-in-out',
                    '&.Mui-selected': {
                      backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      '&:hover': {
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: -8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: '65%',
                        width: 4,
                        backgroundColor: 'primary.main',
                        borderRadius: 4,
                        boxShadow: '0 0 8px rgba(0, 0, 0, 0.15)',
                        transition: 'all 0.3s ease',
                      },
                    },
                    '&:hover': {
                      backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isActive ? 'primary.main' : 'inherit',
                      transition: 'transform 0.2s ease-in-out',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'primary.main' : 'text.primary',
                      fontSize: '0.95rem',
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
        <Outlet />
      </Main>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem component={RouterLink} to="/app/profile" onClick={handleProfileMenuClose}>
          Profile
        </MenuItem>
        <MenuItem component={RouterLink} to="/app/settings" onClick={handleProfileMenuClose}>
          Settings
        </MenuItem>
        {currentUser?.role === 'admin' && (
          <MenuItem component={RouterLink} to="/app/admin" onClick={handleProfileMenuClose}>
            Admin Panel
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
      
      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleNotificationsClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleNotificationsClose}>
          <Typography variant="body2" fontWeight="bold">New referral received</Typography>
        </MenuItem>
        <MenuItem onClick={handleNotificationsClose}>
          <Typography variant="body2" fontWeight="bold">Analytics report completed</Typography>
        </MenuItem>
        <MenuItem onClick={handleNotificationsClose}>
          <Typography variant="body2" fontWeight="bold">15 tokens received</Typography>
        </MenuItem>
        <MenuItem onClick={handleNotificationsClose}>
          <Typography variant="body2" fontWeight="bold">High-risk patient alert</Typography>
        </MenuItem>
        <Divider />
        <MenuItem 
          component={RouterLink} 
          to="/app/notifications" 
          onClick={handleNotificationsClose}
        >
          <Typography variant="body2" color="primary">View all notifications</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
}
