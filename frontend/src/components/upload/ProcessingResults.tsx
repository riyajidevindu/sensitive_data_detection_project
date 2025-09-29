import React from 'react';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Button,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  InsertDriveFile,
  Delete,
  Face,
  DirectionsCar,
  Timer,
  Download,
  Autorenew,
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

const ProcessingResults: React.FC<ProcessingResultsProps> = ({
  files,
  results,
  removeFile,
  reprocessImage,
  downloadResult,
}) => {
  const theme = useTheme();

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        {files.length > 0 ? `Selected Files (${files.length})` : 'Processing Results'}
      </Typography>
      <Box sx={{ minHeight: 400, maxHeight: 600, overflowY: 'auto', pr: 1 }}>
        {files.length > 0 ? (
          <AnimatePresence>
            {files.map((file, index) => (
              <motion.div
                key={file.name + index}
                variants={fileItemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Paper sx={{ display: 'flex', alignItems: 'center', p: 1.5, mb: 1.5, borderRadius: 2 }} variant="outlined">
                  <InsertDriveFile sx={{ mr: 1.5, color: 'text.secondary' }} />
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
        ) : results.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">No results yet. Upload images to begin.</Typography>
          </Box>
        ) : (
          <AnimatePresence>
            {results.map((item, index) => {
              const { result } = item;
              const processedImageUrl = ApiService.getDownloadUrl(result.processed_filename, item.cacheBust);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card sx={{ mb: 2, borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                        {result.original_filename}
                      </Typography>
                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid item>
                          <Chip icon={<Face />} label={`${result.face_count} Faces`} size="small" />
                        </Grid>
                        <Grid item>
                          <Chip icon={<DirectionsCar />} label={`${result.plate_count} Plates`} size="small" />
                        </Grid>
                        <Grid item>
                          <Chip icon={<Timer />} label={`${result.processing_time.toFixed(2)}s`} size="small" />
                        </Grid>
                      </Grid>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>Original Image</Typography>
                          <Box
                            sx={{
                              borderRadius: 2,
                              border: `1px solid ${theme.palette.divider}`,
                              backgroundColor: theme.palette.background.default,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              p: 1,
                            }}
                          >
                            <Box
                              component="img"
                              src={item.originalPreviewUrl}
                              alt={`Original preview for ${result.original_filename}`}
                              sx={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: { xs: 320, sm: 380, md: 460 },
                                objectFit: 'contain',
                                borderRadius: 1,
                                display: 'block',
                              }}
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>Processed Image</Typography>
                          <Box
                            sx={{
                              borderRadius: 2,
                              border: `1px solid ${theme.palette.divider}`,
                              backgroundColor: theme.palette.background.default,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              p: 1,
                            }}
                          >
                            <Box
                              component="img"
                              src={processedImageUrl}
                              alt={`Processed preview for ${result.original_filename}`}
                              sx={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: { xs: 320, sm: 380, md: 460 },
                                objectFit: 'contain',
                                borderRadius: 1,
                                display: 'block',
                              }}
                            />
                          </Box>
                        </Grid>
                      </Grid>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Blur: min {result.blur_parameters.min_kernel_size}px · max {result.blur_parameters.max_kernel_size}px · focus {result.blur_parameters.blur_focus_exp.toFixed(2)} · mix {Math.round(result.blur_parameters.blur_base_weight * 100)}%
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ px: 3, pb: 3 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={item.isReprocessing ? <CircularProgress size={16} color="inherit" /> : <Autorenew />}
                        onClick={() => reprocessImage(index)}
                        disabled={item.isReprocessing}
                      >
                        {item.isReprocessing ? 'Reprocessing...' : 'Reprocess with current settings'}
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Download />}
                        onClick={() => downloadResult(result.processed_filename, item.cacheBust)}
                      >
                        Download Processed Image
                      </Button>
                    </CardActions>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </Box>
    </Paper>
  );
};

export default ProcessingResults;
