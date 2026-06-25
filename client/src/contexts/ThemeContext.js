import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { 
  getThemeMode, 
  setThemeMode, 
  createAppTheme, 
  getEffectiveThemeMode,
  addSystemThemeListener
} from '../utils/themeUtils';

// Create theme context
const ThemeContext = createContext({
  mode: 'light',
  effectiveMode: 'light',
  setMode: () => {},
  toggleMode: () => {}
});

/**
 * Custom hook to use the theme context
 * 
 * @returns {Object} Theme context
 */
export const useTheme = () => useContext(ThemeContext);

/**
 * Theme provider component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const ThemeProvider = ({ children }) => {
  // Get initial theme mode from storage
  const initialMode = getThemeMode();
  const [mode, setMode] = useState(initialMode);
  const [effectiveMode, setEffectiveMode] = useState(getEffectiveThemeMode());
  
  // Create theme based on effective mode
  const theme = useMemo(() => createAppTheme(effectiveMode), [effectiveMode]);
  
  // Update effective mode when mode changes
  useEffect(() => {
    if (mode === 'system') {
      setEffectiveMode(getEffectiveThemeMode());
    } else {
      setEffectiveMode(mode);
    }
  }, [mode]);
  
  // Listen for system theme changes
  useEffect(() => {
    if (mode === 'system') {
      const removeListener = addSystemThemeListener((systemMode) => {
        setEffectiveMode(systemMode);
      });
      
      return () => {
        removeListener();
      };
    }
  }, [mode]);
  
  // Handle mode change
  const handleSetMode = (newMode) => {
    setMode(newMode);
    setThemeMode(newMode);
  };
  
  // Toggle between light and dark mode
  const toggleMode = () => {
    const newMode = effectiveMode === 'light' ? 'dark' : 'light';
    handleSetMode(newMode);
  };
  
  // Context value
  const contextValue = {
    mode,
    effectiveMode,
    setMode: handleSetMode,
    toggleMode
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
