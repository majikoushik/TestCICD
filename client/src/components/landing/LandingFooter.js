import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Divider,
  Grid,
  IconButton,
  Link,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Instagram as InstagramIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';

/**
 * Landing page footer component
 */
export default function LandingFooter() {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  
  // Footer sections
  const sections = [
    {
      title: 'Platform',
      links: [
        { name: 'Features', path: '#capabilities' },
        { name: 'How It Works', path: '#how-it-works' },
        { name: 'Security', path: '/security' },
        { name: 'Pricing', path: '/pricing' },
        { name: 'FAQ', path: '/faq' }
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', path: '/about' },
        { name: 'Team', path: '/team' },
        { name: 'Careers', path: '/careers' },
        { name: 'Blog', path: '/blog' },
        { name: 'Contact', path: '/contact' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'Documentation', path: '/docs' },
        { name: 'API Reference', path: '/api' },
        { name: 'Case Studies', path: '/case-studies' },
        { name: 'Webinars', path: '/webinars' },
        { name: 'Support', path: '/support' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { name: 'Terms of Service', path: '/terms' },
        { name: 'Privacy Policy', path: '/privacy' },
        { name: 'HIPAA Compliance', path: '/hipaa' },
        { name: 'Data Processing', path: '/data-processing' },
        { name: 'Cookies', path: '/cookies' }
      ]
    }
  ];
  
  // Social media links
  const socialLinks = [
    { icon: <FacebookIcon />, url: 'https://facebook.com/clinictrustai' },
    { icon: <TwitterIcon />, url: 'https://twitter.com/clinictrustai' },
    { icon: <LinkedInIcon />, url: 'https://linkedin.com/company/clinictrustai' },
    { icon: <InstagramIcon />, url: 'https://instagram.com/clinictrustai' }
  ];
  
  // Contact information
  const contactInfo = [
    { icon: <EmailIcon />, text: 'contact@clinictrustai.com' },
    { icon: <PhoneIcon />, text: '+1 (800) 555-1234' },
    { icon: <LocationIcon />, text: '123 Health Plaza, San Francisco, CA 94105' }
  ];
  
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: theme.palette.mode === 'dark' 
          ? theme.palette.grey[900] 
          : theme.palette.grey[100],
        py: 6,
        mt: 'auto'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Logo and Company Info */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                component="img"
                src="/logo.svg"
                alt="ClinicTrust AI"
                sx={{ height: 40, mr: 1 }}
              />
              <Typography variant="h6" color="primary" fontWeight={700}>
                ClinicTrust AI
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Transforming healthcare collaboration with blockchain security,
              AI analytics, and token incentives. Join our network of healthcare
              providers to improve patient outcomes.
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
              {socialLinks.map((social, index) => (
                <IconButton
                  key={index}
                  component="a"
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="primary"
                  size="small"
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Stack>
            
            <Box>
              {contactInfo.map((contact, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1 
                  }}
                >
                  <Box sx={{ mr: 1, color: theme.palette.primary.main }}>
                    {contact.icon}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {contact.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
          
          {/* Footer Sections */}
          {sections.map((section) => (
            <Grid item xs={6} sm={3} md={2} key={section.title}>
              <Typography 
                variant="subtitle1" 
                color="text.primary" 
                fontWeight={600} 
                gutterBottom
              >
                {section.title}
              </Typography>
              
              <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
                {section.links.map((link) => (
                  <Box component="li" key={link.name} sx={{ mb: 1 }}>
                    <Link
                      component={RouterLink}
                      to={link.path}
                      color="text.secondary"
                      sx={{ 
                        textDecoration: 'none',
                        '&:hover': { color: theme.palette.primary.main }
                      }}
                    >
                      {link.name}
                    </Link>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>
        
        <Divider sx={{ my: 4 }} />
        
        {/* Bottom Footer */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            © {currentYear} ClinicTrust AI. All rights reserved.
          </Typography>
          
          <Box>
            <Link
              component={RouterLink}
              to="/terms"
              color="text.secondary"
              sx={{ 
                mr: 3,
                textDecoration: 'none',
                '&:hover': { color: theme.palette.primary.main }
              }}
            >
              Terms
            </Link>
            <Link
              component={RouterLink}
              to="/privacy"
              color="text.secondary"
              sx={{ 
                textDecoration: 'none',
                '&:hover': { color: theme.palette.primary.main }
              }}
            >
              Privacy
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
