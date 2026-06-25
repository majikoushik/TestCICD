import React, { useTransition } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Divider,
  Paper,
  Stack,
  useTheme,
  useMediaQuery,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Verified as VerifiedIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

/**
 * Landing Page Component
 * 
 * A professional landing page showcasing the ClinicTrust AI platform's capabilities
 */
export default function LandingPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  
  const handleNavigation = (path) => {
    console.log(path);
    startTransition(() => {
      // Ensure path is valid before navigation
      if (path) {
        navigate(path);
      }
    });
  };
  
  // Hero Section
  const Hero = () => {
    return (
    <Box
      sx={{
        background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        color: 'white',
        py: { xs: 8, md: 12 },
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography 
              variant="h1" 
              component="h1" 
              sx={{ 
                fontWeight: 700, 
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                mb: 2 
              }}
            >
              Secure Healthcare Collaboration with Blockchain
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 4, 
                fontWeight: 400,
                opacity: 0.9
              }}
            >
              ClinicTrust AI transforms healthcare data sharing with secure, transparent, and incentivized collaboration.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button 
                variant="contained" 
                color="secondary" 
                size="large"
                onClick={() => handleNavigation('/register')}
                sx={{ 
                  py: 1.5, 
                  px: 4, 
                  fontWeight: 600,
                  fontSize: '1rem'
                }}
              >
                {isPending ? 'Loading...' : 'Get Started'}
              </Button>
              <Button 
                variant="outlined" 
                color="inherit" 
                size="large"
                onClick={() => handleNavigation('/login')}
                sx={{ 
                  py: 1.5, 
                  px: 4, 
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderColor: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                {isPending ? 'Loading...' : 'Sign In'}
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box
              sx={{
                width: '100%',
                maxWidth: 600,
                height: 400,
                position: 'relative',
                borderRadius: 4,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #0a2463 0%, #3e92cc 100%)',
                boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.25)',
                transform: 'perspective(1000px) rotateY(-10deg)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                p: 4
              }}
            >
              {/* Floating icons */}
              <Box
                component="img"
                src="/blockchain-icon.svg"
                alt="Blockchain"
                sx={{
                  position: 'absolute',
                  width: 80,
                  height: 80,
                  top: '15%',
                  left: '15%',
                  filter: 'drop-shadow(0px 5px 10px rgba(0, 0, 0, 0.2))',
                  animation: 'float 6s ease-in-out infinite'
                }}
              />
              <Box
                component="img"
                src="/ai-icon.svg"
                alt="AI"
                sx={{
                  position: 'absolute',
                  width: 90,
                  height: 90,
                  top: '25%',
                  right: '15%',
                  filter: 'drop-shadow(0px 5px 10px rgba(0, 0, 0, 0.2))',
                  animation: 'float 8s ease-in-out infinite',
                  animationDelay: '1s'
                }}
              />
              <Box
                component="img"
                src="/analytics-icon.svg"
                alt="Analytics"
                sx={{
                  position: 'absolute',
                  width: 70,
                  height: 70,
                  bottom: '20%',
                  left: '20%',
                  filter: 'drop-shadow(0px 5px 10px rgba(0, 0, 0, 0.2))',
                  animation: 'float 7s ease-in-out infinite',
                  animationDelay: '0.5s'
                }}
              />
              <Box
                component="img"
                src="/storage-icon.svg"
                alt="Storage"
                sx={{
                  position: 'absolute',
                  width: 75,
                  height: 75,
                  bottom: '25%',
                  right: '20%',
                  filter: 'drop-shadow(0px 5px 10px rgba(0, 0, 0, 0.2))',
                  animation: 'float 9s ease-in-out infinite',
                  animationDelay: '1.5s'
                }}
              />
              
              {/* Center logo */}
              <Box
                component="img"
                src="/logo.svg"
                alt="ClinicTrust AI Logo"
                sx={{
                  width: 150,
                  height: 150,
                  filter: 'drop-shadow(0px 10px 20px rgba(0, 0, 0, 0.3))',
                  animation: 'pulse 3s ease-in-out infinite'
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
      
      {/* Decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          zIndex: 0
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 400,
          height: 400,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          zIndex: 0
        }}
      />
    </Box>
  );
}
  
  // Features Section
  const Features = () => {
    const features = [
      {
        icon: <Box component="img" src="/blockchain-icon.svg" alt="Blockchain Security" sx={{ width: 60, height: 60 }} />,
        title: 'Blockchain Security',
        description: 'Patient data secured with immutable blockchain technology, ensuring transparency and trust.'
      },
      {
        icon: <Box component="img" src="/ai-icon.svg" alt="AI-Powered Analytics" sx={{ width: 60, height: 60 }} />,
        title: 'AI-Powered Analytics',
        description: 'Advanced analytics identify high-risk patients and optimize care pathways.'
      },
      {
        icon: <Box component="img" src="/token-icon.svg" alt="Token Economy" sx={{ width: 60, height: 60 }} />,
        title: 'Token Economy',
        description: 'Incentivize data sharing and collaboration through a transparent token system.'
      },
      {
        icon: <Box component="img" src="/referral-icon.svg" alt="Smart Referrals" sx={{ width: 60, height: 60 }} />,
        title: 'Smart Referrals',
        description: 'Streamlined patient referrals with secure data sharing between providers.'
      }
    ];
    
    return (
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.background.default }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography 
              variant="h2" 
              component="h2" 
              sx={{ 
                fontWeight: 700, 
                mb: 2,
                fontSize: { xs: '2rem', md: '2.5rem' }
              }}
            >
              Transforming Healthcare Collaboration
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary"
              sx={{ 
                maxWidth: 700, 
                mx: 'auto',
                mb: 6
              }}
            >
              Our platform combines blockchain security, AI analytics, and token incentives
              to create a new standard for healthcare data sharing.
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card 
                  elevation={2}
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 3,
                    borderRadius: 2,
                    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: theme.shadows[8]
                    }
                  }}
                >
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  };
  
  // How It Works Section
  const HowItWorks = () => {
    const steps = [
      {
        number: '01',
        title: 'Secure Registration',
        description: 'Healthcare providers join the platform with verified credentials and blockchain identity.'
      },
      {
        number: '02',
        title: 'Patient Consent',
        description: 'Patients provide granular consent for data sharing, recorded on the blockchain.'
      },
      {
        number: '03',
        title: 'Smart Collaboration',
        description: 'Providers share patient data securely with smart contracts governing access.'
      },
      {
        number: '04',
        title: 'Token Rewards',
        description: 'Participants earn tokens for contributing valuable data and insights.'
      }
    ];
    
    return (
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.background.paper }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography 
              variant="h2" 
              component="h2" 
              sx={{ 
                fontWeight: 700, 
                mb: 2,
                fontSize: { xs: '2rem', md: '2.5rem' }
              }}
            >
              How ClinicTrust AI Works
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary"
              sx={{ 
                maxWidth: 700, 
                mx: 'auto',
                mb: 6
              }}
            >
              Our platform streamlines healthcare collaboration while maintaining
              the highest standards of security and patient privacy.
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            {steps.map((step, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Box sx={{ display: 'flex', mb: 4 }}>
                  <Box 
                    sx={{ 
                      mr: 3, 
                      p: 1,
                      width: 60,
                      height: 60,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 2,
                      backgroundColor: theme.palette.primary.main,
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.5rem'
                    }}
                  >
                    {step.number}
                  </Box>
                  <Box>
                    <Typography variant="h5" component="h3" sx={{ mb: 1, fontWeight: 600 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {step.description}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => handleNavigation('/register')}
              sx={{ 
                py: 1.5, 
                px: 4, 
                fontWeight: 600,
                fontSize: '1rem'
              }}
            >
              {isPending ? 'Loading...' : 'Join the Network'}
            </Button>
          </Box>
        </Container>
      </Box>
    );
  };
  
  // Benefits Section
  const Benefits = () => {
    const benefitsList = [
      'Reduce administrative burden with automated referrals',
      'Improve patient outcomes with AI-powered risk assessment',
      'Increase revenue through token incentives',
      'Enhance patient trust with transparent data handling',
      'Streamline collaboration across healthcare networks',
      'Ensure regulatory compliance with audit trails'
    ];
    
    return (
      <Box 
        sx={{ 
          py: { xs: 6, md: 10 }, 
          backgroundColor: theme.palette.mode === 'dark' 
            ? theme.palette.grey[900] 
            : theme.palette.grey[50]
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography 
                variant="h2" 
                component="h2" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 3,
                  fontSize: { xs: '2rem', md: '2.5rem' }
                }}
              >
                Benefits for Healthcare Providers
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ mb: 4 }}
              >
                ClinicTrust AI delivers tangible benefits that improve both clinical outcomes
                and operational efficiency for healthcare organizations of all sizes.
              </Typography>
              
              <List>
                {benefitsList.map((benefit, index) => (
                  <ListItem key={index} sx={{ py: 1 }}>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary={benefit} />
                  </ListItem>
                ))}
              </List>
              
              <Button 
                variant="outlined" 
                color="primary" 
                size="large"
                onClick={() => handleNavigation('/register')}
                sx={{ 
                  mt: 2,
                  py: 1.5, 
                  px: 4, 
                  fontWeight: 600,
                  fontSize: '1rem'
                }}
              >
                {isPending ? 'Loading...' : 'Learn More'}
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  width: '100%',
                  height: 400,
                  borderRadius: 2,
                  boxShadow: theme.shadows[10],
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 3
                }}
              >
                {/* Center graphic */}
                <Box
                  sx={{
                    width: 280,
                    height: 280,
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0px 5px 20px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 2
                  }}
                >
                  <Box
                    component="img"
                    src="/certification-icon.svg"
                    alt="Certification"
                    sx={{
                      width: 120,
                      height: 120,
                      filter: 'drop-shadow(0px 5px 10px rgba(0, 0, 0, 0.1))',
                      animation: 'pulse 3s ease-in-out infinite'
                    }}
                  />
                </Box>
                
                {/* Floating icons */}
                <Box
                  component="img"
                  src="/membership-icon.svg"
                  alt="Membership"
                  sx={{
                    position: 'absolute',
                    width: 70,
                    height: 70,
                    top: '15%',
                    left: '15%',
                    filter: 'drop-shadow(0px 5px 10px rgba(0, 0, 0, 0.1))',
                    animation: 'float 7s ease-in-out infinite'
                  }}
                />
                <Box
                  component="img"
                  src="/storage-icon.svg"
                  alt="Storage"
                  sx={{
                    position: 'absolute',
                    width: 60,
                    height: 60,
                    top: '25%',
                    right: '20%',
                    filter: 'drop-shadow(0px 5px 10px rgba(0, 0, 0, 0.1))',
                    animation: 'float 9s ease-in-out infinite',
                    animationDelay: '0.5s'
                  }}
                />
                <Box
                  component="img"
                  src="/blockchain-icon.svg"
                  alt="Blockchain"
                  sx={{
                    position: 'absolute',
                    width: 65,
                    height: 65,
                    bottom: '20%',
                    left: '20%',
                    filter: 'drop-shadow(0px 5px 10px rgba(0, 0, 0, 0.1))',
                    animation: 'float 8s ease-in-out infinite',
                    animationDelay: '1s'
                  }}
                />
                <Box
                  component="img"
                  src="/ai-icon.svg"
                  alt="AI"
                  sx={{
                    position: 'absolute',
                    width: 75,
                    height: 75,
                    bottom: '15%',
                    right: '15%',
                    filter: 'drop-shadow(0px 5px 10px rgba(0, 0, 0, 0.1))',
                    animation: 'float 6s ease-in-out infinite',
                    animationDelay: '1.5s'
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    );
  };
  
  // Testimonials Section
  const Testimonials = () => {
    const testimonials = [
      {
        quote: "ClinicTrust AI has transformed how we collaborate with specialists. Patient referrals that used to take days now happen in minutes.",
        author: "Dr. Sarah Johnson",
        role: "Chief Medical Officer",
        organization: "Metro Health System"
      },
      {
        quote: "The blockchain verification gives our patients confidence that their data is secure, while allowing us to share critical information with partners.",
        author: "Dr. Michael Chen",
        role: "Neurologist",
        organization: "Advanced Care Partners"
      },
      {
        quote: "The analytics platform identified high-risk patients we would have missed with traditional methods, allowing for early intervention.",
        author: "Dr. Lisa Rodriguez",
        role: "Primary Care Physician",
        organization: "Community Health Network"
      }
    ];
    
    return (
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.background.default }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography 
              variant="h2" 
              component="h2" 
              sx={{ 
                fontWeight: 700, 
                mb: 2,
                fontSize: { xs: '2rem', md: '2.5rem' }
              }}
            >
              What Healthcare Providers Say
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary"
              sx={{ 
                maxWidth: 700, 
                mx: 'auto',
                mb: 6
              }}
            >
              Hear from healthcare professionals who have transformed their practice
              with ClinicTrust AI.
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            {testimonials.map((testimonial, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card 
                  elevation={2}
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    p: 4,
                    borderRadius: 2
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        mb: 3, 
                        fontStyle: 'italic',
                        fontSize: '1.1rem',
                        lineHeight: 1.6
                      }}
                    >
                      "{testimonial.quote}"
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: theme.palette.primary.main,
                          mr: 2
                        }}
                      >
                        {testimonial.author.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {testimonial.author}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {testimonial.role}, {testimonial.organization}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  };
  
  // Call to Action Section
  const CallToAction = () => {return (
    <Box
      sx={{
        py: { xs: 6, md: 10 },
        background: `linear-gradient(120deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
        color: 'white',
        textAlign: 'center'
      }}
    >
      <Container maxWidth="md">
        <Typography 
          variant="h3" 
          component="h2" 
          sx={{ 
            fontWeight: 700, 
            mb: 3,
            fontSize: { xs: '1.75rem', md: '2.5rem' }
          }}
        >
          Ready to Transform Your Healthcare Practice?
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 4, 
            opacity: 0.9,
            maxWidth: 700,
            mx: 'auto'
          }}
        >
          Join thousands of healthcare providers already using ClinicTrust AI
          to improve patient outcomes and streamline collaboration.
        </Typography>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={3}
          justifyContent="center"
        >
          <Button 
            variant="contained" 
            color="secondary" 
            size="large"
            onClick={() => handleNavigation('/register')}
            component={RouterLink}
            to="/register"
            sx={{ 
              py: 1.5, 
              px: 4, 
              fontWeight: 600,
              fontSize: '1rem'
            }}
          >
            {isPending ? 'Loading...' : 'Sign Up Now'}
          </Button>
          <Button 
            variant="outlined" 
            color="inherit" 
            size="large"
            onClick={() => handleNavigation('/contact')}
            component={RouterLink}
            to="/contact"
            sx={{ 
              py: 1.5, 
              px: 4, 
              fontWeight: 600,
              fontSize: '1rem',
              borderColor: 'white',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            {isPending ? 'Loading...' : 'Request a Demo'}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
  }
  
  // Stats Section
  const Stats = () => {
    const stats = [
      { value: '2,500+', label: 'Healthcare Providers' },
      { value: '1M+', label: 'Patient Records Secured' },
      { value: '85%', label: 'Reduction in Referral Time' },
      { value: '99.9%', label: 'Uptime Reliability' }
    ];
    
    return (
      <Box 
        sx={{ 
          py: { xs: 4, md: 6 }, 
          backgroundColor: theme.palette.mode === 'dark' 
            ? theme.palette.grey[900] 
            : theme.palette.grey[100]
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={3} justifyContent="center">
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index} sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="h3" 
                  component="p" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 1,
                    color: theme.palette.primary.main
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {stat.label}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  };
  
    
  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Hero />
      <Stats />
      <Box id="features">
        <Features />
      </Box>
      <Box id="how-it-works">
        <HowItWorks />
      </Box>
      <Box id="benefits">
        <Benefits />
      </Box>
      <Box id="testimonials">
        <Testimonials />
      </Box>
      <Box id="contact">
        <CallToAction />
      </Box>
    </Box>
  );
}

