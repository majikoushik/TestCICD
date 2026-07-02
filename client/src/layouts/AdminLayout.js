import React, { useMemo, useState } from 'react';
import { Outlet, Link as RouterLink, useLocation, Navigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Box,
  Typography,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  InputBase,
  Avatar,
  Tooltip,
  Fab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Home as HomeIcon,
  People as PeopleIcon,
  SwapHoriz as ReferralsIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  MedicalServices as ProvidersIcon,
  Description as PatientRecordsIcon,
  Token as TokenIcon,
  Psychology as AIIcon,
  SmartToy as AIManagementIcon,
  Message as MessageIcon,
  Security as SecurityIcon,
  Api as ApiIcon,
  Assignment as AssignmentIcon,
  Event as AppointmentsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Mic as MicIcon,
  Storefront as StorefrontIcon,
  ContactMail as ContactMailIcon,
  VerifiedUser as VerifiedUserIcon,
  TuneRounded as TuneIcon,
  AccountTree as BlockchainIcon,
  Search as SearchIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import adminAuthService from '../services/adminAuthService';
import { isAuthenticated, hasRole, getCurrentUser } from '../utils/authUtils';

const DRAWER_WIDTH = 264;
const DRAWER_WIDTH_COLLAPSED = 80;

// Grouped so a 22-item menu reads as a handful of labeled sections instead of
// one long undifferentiated list — mirrors the left nav of most modern admin
// consoles (Stripe, Vercel, Linear).
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
    ],
  },
  {
    label: 'People & Access',
    items: [
      { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
      { text: 'Providers', icon: <ProvidersIcon />, path: '/admin/providers' },
      { text: 'KYC Verification', icon: <VerifiedUserIcon />, path: '/admin/kyc' },
    ],
  },
  {
    label: 'Clinical Operations',
    items: [
      { text: 'Patient Records', icon: <PatientRecordsIcon />, path: '/admin/patient-records' },
      { text: 'Patient Engagement', icon: <NotificationsActiveIcon />, path: '/admin/patient-engagement' },
      { text: 'Appointments', icon: <AppointmentsIcon />, path: '/admin/appointments' },
      { text: 'Ambient AI Sessions', icon: <MicIcon />, path: '/admin/ambient-sessions' },
      { text: 'Prior Authorizations', icon: <AssignmentIcon />, path: '/admin/prior-auth' },
      { text: 'DTx Marketplace', icon: <StorefrontIcon />, path: '/admin/dtx' },
    ],
  },
  {
    label: 'Referrals & Matching',
    items: [
      { text: 'Referrals', icon: <ReferralsIcon />, path: '/admin/referrals' },
      { text: 'AI Referral Matching', icon: <AIIcon />, path: '/admin/referral-matching' },
      { text: 'Matching Rules', icon: <TuneIcon />, path: '/admin/matching-config' },
    ],
  },
  {
    label: 'AI & Automation',
    items: [
      { text: 'AI Management', icon: <AIManagementIcon />, path: '/admin/ai-management' },
    ],
  },
  {
    label: 'Financial',
    items: [
      { text: 'Token Management', icon: <TokenIcon />, path: '/admin/token-management' },
      { text: 'Blockchain Ledger', icon: <BlockchainIcon />, path: '/admin/blockchain' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { text: 'Messaging', icon: <MessageIcon />, path: '/admin/messaging' },
      { text: 'Contact Inquiries', icon: <ContactMailIcon />, path: '/admin/contacts' },
    ],
  },
  {
    label: 'Compliance & Integrations',
    items: [
      { text: 'Login Audit', icon: <LoginIcon />, path: '/admin/audit/login' },
      { text: 'EHI Audit', icon: <SecurityIcon />, path: '/admin/audit/ehi' },
      { text: 'FHIR R4 API', icon: <ApiIcon />, path: '/admin/fhir' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
    ],
  },
];

// The desktop drawer is variant="permanent", which keeps it in normal flex
// flow (unlike "temporary", which renders position:fixed) — so Main already
// sits right after it with no manual offset needed. There's no top AppBar to
// compensate for either: logout/home live in the drawer itself, so the page
// content gets the full viewport height.
const Main = styled('main')(({ theme }) => ({
  flexGrow: 1,
  minWidth: 0,
  padding: theme.spacing(3),
}));

const AdminLayout = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navFilter, setNavFilter] = useState('');

  const currentUser = getCurrentUser();

  const filteredGroups = useMemo(() => {
    const q = navFilter.trim().toLowerCase();
    if (!q) return NAV_GROUPS;
    return NAV_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.text.toLowerCase().includes(q)),
      }))
      .filter((group) => group.items.length > 0);
  }, [navFilter]);

  if (!isAuthenticated() || !hasRole('admin')) {
    return <Navigate to="/admin/login" replace />;
  }

  const isRailMode = collapsed && !isMobile;
  const sidebarWidth = isMobile ? 0 : (collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH);

  const handleMenuButtonClick = () => {
    if (isMobile) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  const isItemActive = (path) =>
    location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand header — in rail mode this becomes a single centered burger
          button that re-expands the menu (no separate control needed). */}
      {isRailMode ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, minHeight: 64 }}>
          <Tooltip title="Expand menu" placement="right">
            <IconButton onClick={() => setCollapsed(false)} sx={{ bgcolor: 'action.hover' }}>
              <MenuIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2.5,
            py: 2,
            minHeight: 64,
          }}
        >
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 36,
              height: 36,
              flexShrink: 0,
            }}
          >
            <ShieldIcon fontSize="small" />
          </Avatar>
          <Box sx={{ overflow: 'hidden', flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap lineHeight={1.2}>
              ClinicTrust AI
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Admin Console
            </Typography>
          </Box>
          {isMobile ? (
            <Tooltip title="Close menu">
              <IconButton size="small" onClick={() => setMobileOpen(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Collapse menu">
              <IconButton size="small" onClick={() => setCollapsed(true)}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      <Divider />

      {/* Search / filter */}
      {!isRailMode && (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'action.hover',
              borderRadius: 2,
              px: 1.5,
              py: 0.75,
            }}
          >
            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <InputBase
              placeholder="Search menu…"
              value={navFilter}
              onChange={(e) => setNavFilter(e.target.value)}
              sx={{ fontSize: 14, flex: 1 }}
              inputProps={{ 'aria-label': 'Search admin menu' }}
            />
          </Box>
        </Box>
      )}

      {/* Scrollable nav — minHeight:0 is required so this flex item actually
          shrinks and scrolls internally instead of growing past the drawer's
          height and forcing the whole drawer to scroll too (double scrollbar). */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 1,
          pb: 1,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 3 },
        }}
      >
        {filteredGroups.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
            No matching pages
          </Typography>
        )}
        {filteredGroups.map((group) => (
          <Box key={group.label} sx={{ mt: 1.5, '&:first-of-type': { mt: 0.5 } }}>
            {!isRailMode && (
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  px: 1.5,
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  letterSpacing: 0.6,
                }}
              >
                {group.label}
              </Typography>
            )}
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {group.items.map((item) => {
                const active = isItemActive(item.path);
                const button = (
                  <ListItemButton
                    component={RouterLink}
                    to={item.path}
                    selected={active}
                    onClick={() => { if (isMobile) setMobileOpen(false); }}
                    sx={{
                      borderRadius: 2,
                      mx: 0.5,
                      mb: 0.25,
                      minHeight: 42,
                      justifyContent: isRailMode ? 'center' : 'flex-start',
                      px: isRailMode ? 1 : 1.5,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                      },
                      '&:not(.Mui-selected):hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: isRailMode ? 0 : 1.5,
                        justifyContent: 'center',
                        color: active ? 'inherit' : 'text.secondary',
                        '& svg': { fontSize: 20 },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!isRailMode && (
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: 14,
                          fontWeight: active ? 600 : 500,
                          noWrap: true,
                        }}
                      />
                    )}
                  </ListItemButton>
                );

                return (
                  <ListItem key={item.text} disablePadding>
                    {isRailMode ? (
                      <Tooltip title={item.text} placement="right">
                        {button}
                      </Tooltip>
                    ) : button}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Divider />

      {/* Footer: current admin + home/logout (rail mode shows icons only,
          re-expanding lives solely in the header burger above, not here) */}
      <Box
        sx={{
          p: isRailMode ? 1 : 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isRailMode ? 'center' : 'flex-start',
          gap: isRailMode ? 0.5 : 1.5,
          flexDirection: isRailMode ? 'column' : 'row',
        }}
      >
        {isRailMode ? (
          <>
            <Tooltip title="Back to site" placement="right">
              <IconButton size="small" component={RouterLink} to="/">
                <HomeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Logout" placement="right">
              <IconButton size="small" onClick={adminAuthService.adminLogout}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14, flexShrink: 0 }}>
              {(currentUser?.name || currentUser?.email || 'A').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ overflow: 'hidden', flex: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {currentUser?.name || 'Admin'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ textTransform: 'capitalize' }}>
                {currentUser?.role || 'Administrator'}
              </Typography>
            </Box>
            <Tooltip title="Back to site">
              <IconButton size="small" component={RouterLink} to="/">
                <HomeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Logout">
              <IconButton size="small" onClick={adminAuthService.adminLogout}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Mobile-only floating trigger — the drawer is an overlay on small
          screens, so this is the only way to reopen it once closed. Hidden
          once the drawer is open (it gets its own close button instead). */}
      {isMobile && !mobileOpen && (
        <Fab
          size="medium"
          color="primary"
          aria-label="open navigation"
          onClick={handleMenuButtonClick}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: (t) => t.zIndex.drawer + 1,
            boxShadow: 3,
          }}
        >
          <MenuIcon />
        </Fab>
      )}

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        anchor="left"
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isMobile ? DRAWER_WIDTH : sidebarWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          '& .MuiDrawer-paper': {
            width: isMobile ? DRAWER_WIDTH : sidebarWidth,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: '1px 0 0 0 rgba(0,0,0,0.08)',
            overflow: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Main>
        <Outlet />
      </Main>
    </Box>
  );
};

export default AdminLayout;
