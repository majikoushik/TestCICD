/**
 * Theme Utilities
 * 
 * This utility provides functions for theme customization
 */

import { createTheme } from '@mui/material/styles';
import { settingsStorage } from './storageUtils';

// Default light theme colors
const defaultLightPalette = {
  primary: {
    main: '#3f51b5',
    light: '#757de8',
    dark: '#002984',
    contrastText: '#ffffff'
  },
  secondary: {
    main: '#f50057',
    light: '#ff4081',
    dark: '#c51162',
    contrastText: '#ffffff'
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
    contrastText: '#ffffff'
  },
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
    contrastText: 'rgba(0, 0, 0, 0.87)'
  },
  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
    contrastText: '#ffffff'
  },
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
    contrastText: 'rgba(0, 0, 0, 0.87)'
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff'
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)'
  }
};

// Default dark theme colors
const defaultDarkPalette = {
  primary: {
    main: '#5c6bc0',
    light: '#8e99f3',
    dark: '#26418f',
    contrastText: '#ffffff'
  },
  secondary: {
    main: '#f48fb1',
    light: '#ffc1e3',
    dark: '#bf5f82',
    contrastText: 'rgba(0, 0, 0, 0.87)'
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
    contrastText: '#ffffff'
  },
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
    contrastText: 'rgba(0, 0, 0, 0.87)'
  },
  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
    contrastText: '#ffffff'
  },
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
    contrastText: 'rgba(0, 0, 0, 0.87)'
  },
  background: {
    default: '#121212',
    paper: '#1e1e1e'
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    disabled: 'rgba(255, 255, 255, 0.5)'
  }
};

// Default theme options
const defaultThemeOptions = {
  typography: {
    fontFamily: [
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500
    }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12
        }
      }
    }
  }
};

/**
 * Get the current theme mode from storage
 * 
 * @returns {string} Theme mode (light, dark, system)
 */
export const getThemeMode = () => {
  return settingsStorage.get('themeMode') || 'system';
};

/**
 * Set the theme mode in storage
 * 
 * @param {string} mode - Theme mode (light, dark, system)
 */
export const setThemeMode = (mode) => {
  settingsStorage.set('themeMode', mode);
};

/**
 * Get the current theme colors from storage
 * 
 * @param {string} mode - Theme mode (light, dark)
 * @returns {Object} Theme colors
 */
export const getThemeColors = (mode) => {
  const themeColors = settingsStorage.get('themeColors') || {};
  return themeColors[mode] || (mode === 'dark' ? defaultDarkPalette : defaultLightPalette);
};

/**
 * Set the theme colors in storage
 * 
 * @param {string} mode - Theme mode (light, dark)
 * @param {Object} colors - Theme colors
 */
export const setThemeColors = (mode, colors) => {
  const themeColors = settingsStorage.get('themeColors') || {};
  themeColors[mode] = colors;
  settingsStorage.set('themeColors', themeColors);
};

/**
 * Reset the theme colors to defaults
 * 
 * @param {string} mode - Theme mode (light, dark)
 */
export const resetThemeColors = (mode) => {
  const themeColors = settingsStorage.get('themeColors') || {};
  themeColors[mode] = mode === 'dark' ? defaultDarkPalette : defaultLightPalette;
  settingsStorage.set('themeColors', themeColors);
};

/**
 * Get the current theme typography from storage
 * 
 * @returns {Object} Theme typography
 */
export const getThemeTypography = () => {
  return settingsStorage.get('themeTypography') || defaultThemeOptions.typography;
};

/**
 * Set the theme typography in storage
 * 
 * @param {Object} typography - Theme typography
 */
export const setThemeTypography = (typography) => {
  settingsStorage.set('themeTypography', typography);
};

/**
 * Reset the theme typography to defaults
 */
export const resetThemeTypography = () => {
  settingsStorage.set('themeTypography', defaultThemeOptions.typography);
};

/**
 * Create a theme based on the current settings
 * 
 * @param {string} mode - Theme mode (light, dark)
 * @returns {Object} Material-UI theme
 */
export const createAppTheme = (mode = 'light') => {
  // Get theme colors and typography from storage or use defaults
  const colors = getThemeColors(mode);
  const typography = getThemeTypography();
  
  // Create the theme
  return createTheme({
    palette: {
      mode,
      ...colors
    },
    typography,
    shape: defaultThemeOptions.shape,
    components: defaultThemeOptions.components
  });
};

/**
 * Determine if the system is using dark mode
 * 
 * @returns {boolean} Whether the system is using dark mode
 */
export const isSystemDarkMode = () => {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Get the effective theme mode based on settings
 * 
 * @returns {string} Effective theme mode (light, dark)
 */
export const getEffectiveThemeMode = () => {
  const themeMode = getThemeMode();
  
  if (themeMode === 'system') {
    return isSystemDarkMode() ? 'dark' : 'light';
  }
  
  return themeMode;
};

/**
 * Listen for system theme changes
 * 
 * @param {Function} callback - Callback function
 * @returns {Function} Function to remove the listener
 */
export const addSystemThemeListener = (callback) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const listener = (e) => {
    callback(e.matches ? 'dark' : 'light');
  };
  
  mediaQuery.addEventListener('change', listener);
  
  return () => {
    mediaQuery.removeEventListener('change', listener);
  };
};
