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
      <Box sx={{ textAlign: 'center', py: 12 }}>
        <Image sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Your processed images will appear here.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <AnimatePresence>
        {files.map((file, index) => (
          <motion.div
            key={file.name + index}
            variants={fileItemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Paper sx={{ display: 'flex', alignItems: 'center', p: 2, mb: 2, borderRadius: 3 }} variant="outlined">
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
                  <Card sx={{ borderRadius: 4 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h5" component="div" sx={{ mb: 2, fontWeight: 600 }}>
                        {result.original_filename}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <ImageContainer>
                            <img
                              src={item.originalPreviewUrl}
                              alt={`Original preview for ${result.original_filename}`}
                              style={{ width: '100%', display: 'block' }}
                            />
                            <ImageOverlay className="image-overlay">
                              <Typography variant="h6">Original</Typography>
                            </ImageOverlay>
                          </ImageContainer>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <ImageContainer>
                            <img
                              src={processedImageUrl}
                              alt={`Processed preview for ${result.original_filename}`}
                              style={{ width: '100%', display: 'block' }}
                            />
                            <ImageOverlay className="image-overlay">
                              <Typography variant="h6">Processed</Typography>
                            </ImageOverlay>
                          </ImageContainer>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                          <Chip icon={<Face />} label={`${result.face_count} Faces`} sx={{ mr: 1 }} />
                          <Chip icon={<DirectionsCar />} label={`${result.plate_count} Plates`} sx={{ mr: 1 }} />
                          <Chip icon={<Timer />} label={`${result.processing_time.toFixed(2)}s`} />
                        </Box>
                        <Box>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={item.isReprocessing ? <CircularProgress size={16} /> : <Autorenew />}
                            onClick={() => reprocessImage(index)}
                            disabled={item.isReprocessing}
                            sx={{ mr: 1 }}
                          >
                            Reprocess
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Download />}
                            onClick={() => downloadResult(result.processed_filename, item.cacheBust)}
                          >
                            Download
                          </Button>
                        </Box>
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
