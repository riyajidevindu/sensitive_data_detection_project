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
  useTheme,
  styled,
} from '@mui/material';
import {
  Security,
  Face,
  DirectionsCar,
  Speed,
  CloudUpload,
  VerifiedUser,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ApiService from '../services/api';
import { HealthResponse, ModelInfo } from '../types/api';

const AnimatedCard = motion(Card);
const AnimatedBox = motion(Box);

const FeatureCard = styled(AnimatedCard)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  textAlign: 'center',
  padding: theme.spacing(4),
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-10px)',
    boxShadow: theme.shadows[10],
  },
}));

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
      },
    },
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <AnimatedBox sx={{ textAlign: 'center', mb: 8 }} variants={itemVariants}>
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Sensitive Data Detector
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Seamlessly detect and anonymize faces and license plates in your images.
          </Typography>
        </AnimatedBox>

        {error && (
          <motion.div variants={itemVariants}>
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          </motion.div>
        )}
        
        {health && (
          <motion.div variants={itemVariants}>
            <Alert 
              severity={health.status === 'healthy' ? 'success' : 'warning'} 
              sx={{ mb: 4 }}
              iconMapping={{
                success: <VerifiedUser fontSize="inherit" />,
              }}
            >
              API Status: <strong>{health.status}</strong> | Version: {health.version} | Model: {health.model_loaded ? 'Loaded' : 'Not Found'}
            </Alert>
          </motion.div>
        )}

        <Grid container spacing={4} sx={{ mb: 8 }}>
          <Grid item xs={12} md={6}>
            <FeatureCard variants={itemVariants} whileHover={{ scale: 1.05 }}>
              <Face sx={{ fontSize: 80, color: 'primary.main', mb: 2, mx: 'auto' }} />
              <Typography variant="h4" gutterBottom>Face Detection</Typography>
              <Typography color="text.secondary" paragraph>
                Protect privacy by automatically detecting and blurring faces with high accuracy.
              </Typography>
              <Chip label="GDPR Compliant" color="success" variant="outlined" />
            </FeatureCard>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FeatureCard variants={itemVariants} whileHover={{ scale: 1.05 }}>
              <DirectionsCar sx={{ fontSize: 80, color: 'primary.main', mb: 2, mx: 'auto' }} />
              <Typography variant="h4" gutterBottom>License Plate Detection</Typography>
              <Typography color="text.secondary" paragraph>
                Ensure vehicle privacy by identifying and redacting license plates from images.
              </Typography>
              <Chip label="High Precision" color="primary" variant="outlined" />
            </FeatureCard>
          </Grid>
        </Grid>

        <motion.div variants={itemVariants}>
          <Typography variant="h4" component="h2" sx={{ textAlign: 'center', mb: 6, fontWeight: 600 }}>
            Why Choose Us?
          </Typography>
        </motion.div>
        
        <Grid container spacing={4} sx={{ mb: 8 }}>
          {[
            { icon: <Security sx={{ fontSize: 40, color: 'success.main' }} />, title: 'Privacy First', description: 'All processing is done securely with automatic file cleanup.' },
            { icon: <Speed sx={{ fontSize: 40, color: 'warning.main' }} />, title: 'Fast Processing', description: 'ONNX-optimized models for real-time inference.' },
            { icon: <CloudUpload sx={{ fontSize: 40, color: 'info.main' }} />, title: 'Easy to Use', description: 'Simple drag & drop interface for batch processing.' },
          ].map((item, index) => (
            <Grid item xs={12} md={4} key={index}>
              <AnimatedBox variants={itemVariants} sx={{ textAlign: 'center' }}>
                {item.icon}
                <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>{item.title}</Typography>
                <Typography variant="body1" color="text.secondary">{item.description}</Typography>
              </AnimatedBox>
            </Grid>
          ))}
        </Grid>

        {modelInfo && (
          <motion.div variants={itemVariants}>
            <Paper elevation={2} sx={{ p: 4, mb: 6, borderRadius: 2, background: theme.palette.grey[50] }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>Model Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><Typography><strong>Model:</strong> {modelInfo.model_name}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Size:</strong> {modelInfo.model_size}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Confidence Threshold:</strong> {modelInfo.confidence_threshold}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Supported Classes:</strong> {modelInfo.supported_classes.join(', ')}</Typography></Grid>
              </Grid>
            </Paper>
          </motion.div>
        )}

        <AnimatedBox sx={{ textAlign: 'center' }} variants={itemVariants}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CloudUpload />}
              onClick={() => navigate('/upload')}
              sx={{ px: 5, py: 2, fontSize: '1.2rem', borderRadius: '50px', textTransform: 'none' }}
            >
              Start Processing Images
            </Button>
          </motion.div>
        </AnimatedBox>
      </Container>
    </motion.div>
  );
};

export default HomePage;
