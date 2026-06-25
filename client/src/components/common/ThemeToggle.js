import React from 'react';
import {
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  BrightnessAuto as BrightnessAutoIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ThemeToggle component
 * 
 * A component that allows users to toggle between light and dark mode
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Toggle variant (icon, switch, menu)
 * @param {string} props.size - Size of the toggle (small, medium, large)
 * @param {string} props.tooltip - Tooltip text
 * @param {boolean} props.showTooltip - Whether to show the tooltip
 */
export default function ThemeToggle({
  variant = 'icon',
  size = 'medium',
  tooltip = 'Toggle theme',
  showTooltip = true
}) {
  const { mode, effectiveMode, setMode, toggleMode } = useTheme();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  
  // Handle menu open
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle menu close
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  // Handle mode selection from menu
  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    handleClose();
  };
  
  // Icon toggle variant
  if (variant === 'icon') {
    return (
      <Tooltip title={showTooltip ? tooltip : ''} arrow>
        <IconButton
          onClick={toggleMode}
          color="inherit"
          size={size}
          aria-label={tooltip}
        >
          {effectiveMode === 'light' ? (
            <Brightness4Icon fontSize={size} />
          ) : (
            <Brightness7Icon fontSize={size} />
          )}
        </IconButton>
      </Tooltip>
    );
  }
  
  // Switch toggle variant
  if (variant === 'switch') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={effectiveMode === 'dark'}
            onChange={toggleMode}
            color="primary"
            size={size}
          />
        }
        label={effectiveMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
      />
    );
  }
  
  // Menu toggle variant
  return (
    <>
      <Tooltip title={showTooltip ? tooltip : ''} arrow>
        <IconButton
          onClick={handleClick}
          color="inherit"
          size={size}
          aria-label={tooltip}
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <SettingsIcon fontSize={size} />
        </IconButton>
      </Tooltip>
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'theme-button',
        }}
      >
        <MenuItem
          selected={mode === 'light'}
          onClick={() => handleModeSelect('light')}
        >
          <ListItemIcon>
            <Brightness7Icon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Light Mode</ListItemText>
        </MenuItem>
        <MenuItem
          selected={mode === 'dark'}
          onClick={() => handleModeSelect('dark')}
        >
          <ListItemIcon>
            <Brightness4Icon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Dark Mode</ListItemText>
        </MenuItem>
        <MenuItem
          selected={mode === 'system'}
          onClick={() => handleModeSelect('system')}
        >
          <ListItemIcon>
            <BrightnessAutoIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>System Default</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
