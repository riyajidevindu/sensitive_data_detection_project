import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import HomePage from './components/HomePage';
import UploadPage from './components/UploadPage';
import HistoryPage from './components/HistoryPage';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
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
  );
}

export default App;
