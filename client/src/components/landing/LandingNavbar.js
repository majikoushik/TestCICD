import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon
} from '@mui/icons-material';
import { useThemeContext as useAppTheme } from '../../contexts';

/**
 * Landing page navigation component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.transparent - Whether the navbar should be transparent initially
 */
export default function LandingNavbar({ transparent = false }) {
  const theme = useTheme();
  const { mode, toggleMode } = useAppTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleNavigation = (path) => {
    closeMobileMenu();
    navigate(path);
  };
  
  // Handle scrolling to sections on the landing page
  const scrollToSection = (sectionId) => {
    closeMobileMenu();
    if (!isLandingPage) {
      // Navigate to landing page and pass the target section via state
      navigate('/', { state: { scrollTo: sectionId } });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Navigation links
  const navLinks = [
    { name: 'Features',     path: '#capabilities' },
    { name: 'Blockchain',   path: '#blockchain' },
    { name: 'How It Works', path: '#how-it-works' },
    { name: 'Benefits',     path: '#benefits' },
    { name: 'Contact',      path: '/contact', isPage: true },
  ];
  
  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Close mobile menu
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  
  // Determine if we're on the landing page
  const isLandingPage = location.pathname === '/';
  
  // Navbar styles based on scroll position and transparency setting
  const navbarStyles = {
    backgroundColor: (transparent && isLandingPage && !isScrolled) 
      ? 'transparent' 
      : theme.palette.background.paper,
    boxShadow: (transparent && isLandingPage && !isScrolled) 
      ? 'none' 
      : theme.shadows[3],
    transition: 'all 0.3s ease',
    position: 'fixed',
    zIndex: theme.zIndex.appBar
  };
  
  // Logo component
  const Logo = () => (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box
        component="img"
        src="/logo.svg"
        alt="ClinicTrust AI"
        sx={{ 
          height: 40, 
          mr: 1,
          display: { xs: 'none', sm: 'block' }
        }}
      />
      <Typography 
        variant="h6" 
        component={RouterLink} 
        to="/" 
        sx={{ 
          fontWeight: 700, 
          textDecoration: 'none',
          color: (transparent && isLandingPage && !isScrolled) 
            ? 'white' 
            : theme.palette.primary.main
        }}
      >
        ClinicTrust AI
      </Typography>
    </Box>
  );
  
  // Desktop navigation
  const DesktopNav = () => (
    <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
      {navLinks.map((link) =>
        link.isPage ? (
          <Button
            key={link.name}
            component={RouterLink}
            to={link.path}
            color={(transparent && isLandingPage && !isScrolled) ? 'inherit' : 'primary'}
            sx={{ fontWeight: 500, textTransform: 'none', fontSize: '1rem' }}
            onClick={closeMobileMenu}
          >
            {link.name}
          </Button>
        ) : (
          <Button
            key={link.name}
            color={(transparent && isLandingPage && !isScrolled) ? 'inherit' : 'primary'}
            sx={{ fontWeight: 500, textTransform: 'none', fontSize: '1rem' }}
            onClick={() => scrollToSection(link.path.substring(1))}
          >
            {link.name}
          </Button>
        )
      )}
    </Stack>
  );
  
  // Mobile navigation drawer
  const MobileNav = () => (
    <Drawer
      anchor="right"
      open={mobileMenuOpen}
      onClose={closeMobileMenu}
      sx={{
        '& .MuiDrawer-paper': { 
          width: '70%', 
          maxWidth: 300,
          boxSizing: 'border-box',
          p: 2
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Logo />
        <IconButton onClick={closeMobileMenu}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <List>
        {navLinks.map((link) => (
          <ListItem key={link.name} disablePadding>
            <ListItemButton
              {...(link.isPage ? { component: RouterLink, to: link.path } : {})}
              onClick={() => {
                if (link.isPage) {
                  closeMobileMenu();
                } else {
                  scrollToSection(link.path.substring(1));
                }
              }}
            >
              <ListItemText
                primary={link.name}
                primaryTypographyProps={{ fontWeight: 500, fontSize: '1.1rem' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          component={RouterLink}
          to="/login"
          sx={{ mb: 1 }}
          onClick={() => handleNavigation('/login')}
        >
          Sign In
        </Button>
        <Button
          variant="outlined"
          color="primary"
          fullWidth
          onClick={() => handleNavigation('/register')}
        >
          Get Started
        </Button>
      </Box>
    </Drawer>
  );
  
  return (
    <>
      <AppBar position="fixed" elevation={0} sx={navbarStyles}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ py: 1 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Logo />
            </Box>
            
            {/* Desktop Navigation */}
            <DesktopNav />
            
            {/* Action Buttons */}
            <Box sx={{ 
              display: { xs: 'none', md: 'flex' }, 
              alignItems: 'center',
              ml: 2
            }}>
              <IconButton 
                onClick={toggleMode} 
                color={(transparent && isLandingPage && !isScrolled) ? 'inherit' : 'default'}
                sx={{ mr: 1 }}
              >
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
              
              <Button
                color={(transparent && isLandingPage && !isScrolled) ? 'inherit' : 'primary'}
                onClick={() => handleNavigation('/login')}
                sx={{ 
                  mr: 1,
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                Sign In
              </Button>
              
              <Button
                variant="contained"
                color="secondary"
                onClick={() => handleNavigation('/register')}
                sx={{ 
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                Get Started
              </Button>
            </Box>
            
            {/* Mobile Menu Button */}
            <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                color={(transparent && isLandingPage && !isScrolled) ? 'inherit' : 'default'}
                onClick={toggleMobileMenu}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Add toolbar spacer */}
      <Toolbar />
      
      {/* Mobile Navigation Drawer */}
      <MobileNav />
    </>
  );
}
