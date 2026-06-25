import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563EB', // Blue
      light: '#60A5FA',
      dark: '#1E40AF',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#10B981', // Green
      light: '#34D399',
      dark: '#059669',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF4444', // Red
      light: '#F87171',
      dark: '#B91C1C',
    },
    warning: {
      main: '#F59E0B', // Amber
      light: '#FBBF24',
      dark: '#D97706',
    },
    info: {
      main: '#3B82F6', // Light blue
      light: '#60A5FA',
      dark: '#2563EB',
    },
    success: {
      main: '#10B981', // Green
      light: '#34D399',
      dark: '#059669',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827',
      secondary: '#4B5563',
      disabled: '#9CA3AF',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
    },
    body1: {
      fontWeight: 400,
      fontSize: '1rem',
    },
    body2: {
      fontWeight: 400,
      fontSize: '0.875rem',
    },
    button: {
      fontWeight: 500,
      fontSize: '0.875rem',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 1px 2px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.1)',
    '0px 1px 5px rgba(0, 0, 0, 0.05), 0px 1px 8px rgba(0, 0, 0, 0.1)',
    '0px 2px 4px rgba(0, 0, 0, 0.05), 0px 3px 6px rgba(0, 0, 0, 0.1)',
    '0px 4px 8px rgba(0, 0, 0, 0.05), 0px 5px 12px rgba(0, 0, 0, 0.1)',
    '0px 5px 10px rgba(0, 0, 0, 0.05), 0px 8px 16px rgba(0, 0, 0, 0.1)',
    '0px 6px 12px rgba(0, 0, 0, 0.05), 0px 10px 20px rgba(0, 0, 0, 0.1)',
    '0px 7px 14px rgba(0, 0, 0, 0.05), 0px 12px 24px rgba(0, 0, 0, 0.1)',
    '0px 8px 16px rgba(0, 0, 0, 0.05), 0px 14px 28px rgba(0, 0, 0, 0.1)',
    '0px 9px 18px rgba(0, 0, 0, 0.05), 0px 16px 32px rgba(0, 0, 0, 0.1)',
    '0px 10px 20px rgba(0, 0, 0, 0.05), 0px 18px 36px rgba(0, 0, 0, 0.1)',
    '0px 11px 22px rgba(0, 0, 0, 0.05), 0px 20px 40px rgba(0, 0, 0, 0.1)',
    '0px 12px 24px rgba(0, 0, 0, 0.05), 0px 22px 44px rgba(0, 0, 0, 0.1)',
    '0px 13px 26px rgba(0, 0, 0, 0.05), 0px 24px 48px rgba(0, 0, 0, 0.1)',
    '0px 14px 28px rgba(0, 0, 0, 0.05), 0px 26px 52px rgba(0, 0, 0, 0.1)',
    '0px 15px 30px rgba(0, 0, 0, 0.05), 0px 28px 56px rgba(0, 0, 0, 0.1)',
    '0px 16px 32px rgba(0, 0, 0, 0.05), 0px 30px 60px rgba(0, 0, 0, 0.1)',
    '0px 17px 34px rgba(0, 0, 0, 0.05), 0px 32px 64px rgba(0, 0, 0, 0.1)',
    '0px 18px 36px rgba(0, 0, 0, 0.05), 0px 34px 68px rgba(0, 0, 0, 0.1)',
    '0px 19px 38px rgba(0, 0, 0, 0.05), 0px 36px 72px rgba(0, 0, 0, 0.1)',
    '0px 20px 40px rgba(0, 0, 0, 0.05), 0px 38px 76px rgba(0, 0, 0, 0.1)',
    '0px 21px 42px rgba(0, 0, 0, 0.05), 0px 40px 80px rgba(0, 0, 0, 0.1)',
    '0px 22px 44px rgba(0, 0, 0, 0.05), 0px 42px 84px rgba(0, 0, 0, 0.1)',
    '0px 23px 46px rgba(0, 0, 0, 0.05), 0px 44px 88px rgba(0, 0, 0, 0.1)',
    '0px 24px 48px rgba(0, 0, 0, 0.05), 0px 46px 92px rgba(0, 0, 0, 0.1)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
        contained: {
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
});

export default theme;
