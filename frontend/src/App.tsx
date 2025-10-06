import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/aurora.css';
import HomePage from './components/HomePage';
import UploadPage from './components/UploadPage';
import HistoryPage from './components/HistoryPage';
import Navigation from './components/Navigation';
import ApiService from './services/api';

function App() {
  // Initialize session on app startup
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const sessionId = await ApiService.ensureSession();
        console.log('Session initialized:', sessionId);
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };

    initializeSession();
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <div className="aurora-background" />
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navigation />
          <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
