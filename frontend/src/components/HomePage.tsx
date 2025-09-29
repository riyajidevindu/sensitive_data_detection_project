import React from 'react';
import { Container, Typography, Grid, Paper, Box, Button, useTheme, styled } from '@mui/material';
import { Face, DirectionsCar, Speed, CloudUpload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const AnimatedPaper = motion(Paper);
const AnimatedBox = motion(Box);

const FeatureCard = styled(AnimatedPaper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: theme.palette.background.paper,
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-10px)',
    boxShadow: `0 10px 30px ${theme.palette.primary.main}33`,
  },
}));

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

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

  return (
    <AnimatedBox initial="hidden" animate="visible" variants={containerVariants}>
      <Box
        sx={{
          textAlign: 'center',
          py: 15,
          background: `radial-gradient(circle, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 70%)`,
        }}
      >
        <Container maxWidth="md">
          <motion.div variants={itemVariants}>
            <Typography
              variant="h1"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Secure Your Visuals
            </Typography>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Typography variant="h5" color="text.secondary" paragraph sx={{ mb: 4 }}>
              Automatically detect and anonymize sensitive data in your images with our powerful, easy-to-use tool.
            </Typography>
          </motion.div>
          <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CloudUpload />}
              onClick={() => navigate('/upload')}
              sx={{ px: 6, py: 2, fontSize: '1.2rem' }}
            >
              Get Started
            </Button>
          </motion.div>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <motion.div variants={itemVariants}>
          <Typography variant="h2" component="h2" sx={{ textAlign: 'center', mb: 8 }}>
            Key Features
          </Typography>
        </motion.div>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <FeatureCard variants={itemVariants}>
              <Face sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>Face Detection</Typography>
              <Typography color="text.secondary">
                Protect privacy by automatically detecting and blurring faces with high accuracy.
              </Typography>
            </FeatureCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard variants={itemVariants}>
              <DirectionsCar sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>License Plate Detection</Typography>
              <Typography color="text.secondary">
                Ensure vehicle privacy by identifying and redacting license plates.
              </Typography>
            </FeatureCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard variants={itemVariants}>
              <Speed sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>Fast Processing</Typography>
              <Typography color="text.secondary">
                ONNX-optimized models for real-time inference and quick results.
              </Typography>
            </FeatureCard>
          </Grid>
        </Grid>
      </Container>
    </AnimatedBox>
  );
};

export default HomePage;
