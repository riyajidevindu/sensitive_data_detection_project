import React from 'react';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  useTheme,
  styled,
  Stack,
} from '@mui/material';
import {
  InsertDriveFile,
  Delete,
  Face,
  DirectionsCar,
  Timer,
  Download,
  Autorenew,
  Image,
  ArrowForward,
  CheckCircleOutline,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import ApiService from '../../services/api';
import { ProcessedItem } from './types';

interface ProcessingResultsProps {
  files: File[];
  results: ProcessedItem[];
  removeFile: (index: number) => void;
  reprocessImage: (index: number) => void | Promise<void>;
  downloadResult: (filename: string, cacheBust?: number) => void;
}

const fileItemVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const ImageContainer = styled(Box)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden',
  position: 'relative',
  '&:hover .image-overlay': {
    opacity: 1,
  },
}));

const ImageOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0,
  transition: 'opacity 0.3s ease',
});

const ProcessingResults: React.FC<ProcessingResultsProps> = ({
  files,
  results,
  removeFile,
  reprocessImage,
  downloadResult,
}) => {
  const theme = useTheme();

  if (files.length === 0 && results.length === 0) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          textAlign: 'center', 
          py: 12, 
          px: 4,
          borderRadius: 1,
          border: '1px dashed',
          borderColor: 'divider',
          backgroundColor: 'background.default'
        }}
      >
        <Image sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No files uploaded yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload images to see processing results here
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Results Summary Header */}
      {results.length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 1, backgroundColor: 'primary.light' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.dark" fontWeight={700}>
                  {results.length}
                </Typography>
                <Typography variant="caption" color="primary.dark">
                  Processed Images
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.dark" fontWeight={700}>
                  {results.reduce((sum, r) => sum + r.result.face_count, 0)}
                </Typography>
                <Typography variant="caption" color="primary.dark">
                  Faces Detected
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.dark" fontWeight={700}>
                  {results.reduce((sum, r) => sum + r.result.plate_count, 0)}
                </Typography>
                <Typography variant="caption" color="primary.dark">
                  Plates Detected
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      <AnimatePresence>
        {files.map((file, index) => (
          <motion.div
            key={file.name + index}
            variants={fileItemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Paper sx={{ display: 'flex', alignItems: 'center', p: 2, mb: 2, borderRadius: 1 }} variant="outlined" elevation={0}>
              <InsertDriveFile sx={{ mr: 2, color: 'text.secondary' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1" fontWeight="medium">{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">{formatFileSize(file.size)}</Typography>
              </Box>
              <IconButton size="small" color="error" onClick={() => removeFile(index)}>
                <Delete />
              </IconButton>
            </Paper>
          </motion.div>
        ))}
      </AnimatePresence>

      <Grid container spacing={3}>
        <AnimatePresence>
          {results.map((item, index) => {
            const { result } = item;
            const processedImageUrl = ApiService.getDownloadUrl(result.processed_filename, item.cacheBust);

            return (
              <Grid item xs={12} key={item.id}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card sx={{ borderRadius: 1 }} elevation={2}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 700, flex: 1 }}>
                          {result.original_filename}
                        </Typography>
                        <Chip 
                          icon={<CheckCircleOutline />} 
                          label="Processed" 
                          color="success" 
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={5}>
                          <Box sx={{ position: 'relative' }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                position: 'absolute', 
                                top: 8, 
                                left: 8, 
                                backgroundColor: 'rgba(0,0,0,0.7)', 
                                color: 'white',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                fontWeight: 600,
                                zIndex: 1
                              }}
                            >
                              Original
                            </Typography>
                            <ImageContainer>
                            <img
                              src={item.originalPreviewUrl}
                              alt={`Original preview for ${result.original_filename}`}
                              style={{ width: '100%', display: 'block' }}
                            />
                            <ImageOverlay className="image-overlay">
                              <Typography variant="body2" fontWeight={600}>👁️ View Original</Typography>
                            </ImageOverlay>
                          </ImageContainer>
                          </Box>
                        </Grid>
                        
                        {/* Arrow Separator */}
                        <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            color: 'white'
                          }}>
                            <ArrowForward />
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={5}>
                          <Box sx={{ position: 'relative' }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                position: 'absolute', 
                                top: 8, 
                                left: 8, 
                                backgroundColor: 'rgba(76, 175, 80, 0.9)', 
                                color: 'white',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                fontWeight: 600,
                                zIndex: 1
                              }}
                            >
                              ✓ Processed
                            </Typography>
                            <ImageContainer>
                            <img
                              src={processedImageUrl}
                              alt={`Processed preview for ${result.original_filename}`}
                              style={{ width: '100%', display: 'block' }}
                            />
                            <ImageOverlay className="image-overlay">
                              <Typography variant="body2" fontWeight={600}>👁️ View Processed</Typography>
                            </ImageOverlay>
                          </ImageContainer>
                          </Box>
                        </Grid>
                      </Grid>
                      
                      {/* Statistics and Actions */}
                      <Box sx={{ 
                        mt: 3, 
                        pt: 3, 
                        borderTop: 1, 
                        borderColor: 'divider',
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        flexWrap: 'wrap', 
                        gap: 2 
                      }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip 
                            icon={<Face />} 
                            label={`${result.face_count} Face${result.face_count !== 1 ? 's' : ''}`}
                            color={result.face_count > 0 ? 'primary' : 'default'}
                            variant={result.face_count > 0 ? 'filled' : 'outlined'}
                          />
                          <Chip 
                            icon={<DirectionsCar />} 
                            label={`${result.plate_count} Plate${result.plate_count !== 1 ? 's' : ''}`}
                            color={result.plate_count > 0 ? 'primary' : 'default'}
                            variant={result.plate_count > 0 ? 'filled' : 'outlined'}
                          />
                          <Chip 
                            icon={<Timer />} 
                            label={`${result.processing_time.toFixed(2)}s`}
                            variant="outlined"
                          />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            size="medium"
                            startIcon={item.isReprocessing ? <CircularProgress size={16} /> : <Autorenew />}
                            onClick={() => reprocessImage(index)}
                            disabled={item.isReprocessing}
                          >
                            Reprocess
                          </Button>
                          <Button
                            variant="contained"
                            size="medium"
                            startIcon={<Download />}
                            onClick={() => downloadResult(result.processed_filename, item.cacheBust)}
                          >
                            Download
                          </Button>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </AnimatePresence>
      </Grid>
    </Box>
  );
};

export default ProcessingResults;
