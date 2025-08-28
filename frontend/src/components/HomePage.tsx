import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Paper,
} from '@mui/material';
import {
  Security,
  Face,
  DirectionsCar,
  Speed,
  CloudUpload,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/api';
import { HealthResponse, ModelInfo } from '../types/api';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [healthData, modelData] = await Promise.all([
          ApiService.getHealth(),
          ApiService.getModelInfo(),
        ]);
        setHealth(healthData);
        setModelInfo(modelData);
        setError(null);
      } catch (err) {
        setError('Failed to connect to the API. Please ensure the backend is running.');
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom color="primary">
          🔒 Sensitive Data Detector
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Automatically detect and blur faces and license plates in your images
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {health && (
          <Alert 
            severity={health.status === 'healthy' ? 'success' : 'warning'} 
            sx={{ mb: 3 }}
          >
            API Status: {health.status} | Version: {health.version} | 
            Model: {health.model_loaded ? 'Loaded' : 'Not Found'}
          </Alert>
        )}
      </Box>

      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Face sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Face Detection
              </Typography>
              <Typography color="text.secondary" paragraph>
                Automatically detect faces in images and apply blur to protect privacy
              </Typography>
              <Chip label="GDPR Compliant" color="success" />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <DirectionsCar sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                License Plate Detection
              </Typography>
              <Typography color="text.secondary" paragraph>
                Identify and redact license plates to ensure vehicle privacy
              </Typography>
              <Chip label="High Accuracy" color="primary" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Security sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Privacy First
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All processing is done securely with automatic file cleanup
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Speed sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Fast Processing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ONNX-optimized models for real-time inference
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CloudUpload sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Easy to Use
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Simple drag & drop interface for batch processing
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {modelInfo && (
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Model Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Model:</strong> {modelInfo.model_name}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Size:</strong> {modelInfo.model_size}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Confidence Threshold:</strong> {modelInfo.confidence_threshold}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Supported Classes:</strong> {modelInfo.supported_classes.join(', ')}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CloudUpload />}
          onClick={() => navigate('/upload')}
          sx={{ px: 4, py: 2, fontSize: '1.1rem' }}
        >
          Start Processing Images
        </Button>
      </Box>
    </Container>
  );
};

export default HomePage;
