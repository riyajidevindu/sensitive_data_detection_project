import React from 'react';
import { AppBar, Tabs, Tab, Container, styled, useTheme, IconButton, Tooltip } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HistoryIcon from '@mui/icons-material/History';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { motion } from 'framer-motion';
import { useThemeContext } from '../contexts/ThemeContext';

const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: 64,
  fontSize: '1rem',
  fontWeight: 600,
  transition: 'color 0.3s ease-in-out',
  '&.Mui-selected': {
    color: theme.palette.primary.main,
  },
  '&:hover': {
    color: theme.palette.primary.light,
  },
}));

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useThemeContext();

  const getTabValue = () => {
    switch (location.pathname) {
      case '/': return 0;
      case '/upload': return 1;
      case '/history': return 2;
      default: return 0;
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0: navigate('/'); break;
      case 1: navigate('/upload'); break;
      case 2: navigate('/history'); break;
    }
  };

  return (
    <AppBar position="sticky" color="default" elevation={0}>
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Tabs
          value={getTabValue()}
          onChange={handleTabChange}
          centered
          TabIndicatorProps={{
            children: <motion.div layoutId="indicator" style={{ height: '4px', backgroundColor: theme.palette.primary.main, borderRadius: '2px' }} />,
          }}
        >
          <StyledTab icon={<HomeIcon />} label="Home" iconPosition="start" />
          <StyledTab icon={<CloudUploadIcon />} label="Upload & Process" iconPosition="start" />
          <StyledTab icon={<HistoryIcon />} label="History" iconPosition="start" />
        </Tabs>
        <Tooltip title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          <IconButton onClick={toggleTheme} color="inherit" sx={{ ml: 2 }}>
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>
      </Container>
    </AppBar>
  );
};

export default Navigation;
