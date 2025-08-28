import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HistoryIcon from '@mui/icons-material/History';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getTabValue = () => {
    switch (location.pathname) {
      case '/':
        return 0;
      case '/upload':
        return 1;
      case '/history':
        return 2;
      default:
        return 0;
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/upload');
        break;
      case 2:
        navigate('/history');
        break;
    }
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
      <Tabs
        value={getTabValue()}
        onChange={handleTabChange}
        aria-label="navigation tabs"
        centered
      >
        <Tab
          icon={<HomeIcon />}
          label="Home"
          iconPosition="start"
          sx={{ minHeight: 64, fontSize: '1rem' }}
        />
        <Tab
          icon={<CloudUploadIcon />}
          label="Upload & Process"
          iconPosition="start"
          sx={{ minHeight: 64, fontSize: '1rem' }}
        />
        <Tab
          icon={<HistoryIcon />}
          label="History"
          iconPosition="start"
          sx={{ minHeight: 64, fontSize: '1rem' }}
        />
      </Tabs>
    </Box>
  );
};

export default Navigation;
