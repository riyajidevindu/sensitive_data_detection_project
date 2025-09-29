import React, { useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Tooltip,
  Slider,
  Stack,
  styled,
  useTheme,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Download,
  Face,
  DirectionsCar,
  Timer,
  Delete,
  InsertDriveFile,
  HelpOutline,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import ApiService, { DetectionOptions } from '../services/api';
import { ProcessingResult } from '../types/api';

const DropzonePaper = styled(Paper)(({ theme, isDragActive }: { theme: any; isDragActive: boolean }) => ({
  padding: theme.spacing(4),
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.grey[400]}`,
  backgroundColor: isDragActive ? theme.palette.action.hover : theme.palette.background.paper,
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

const DEFAULT_MIN_KERNEL = 9;
const DEFAULT_MAX_KERNEL = 45;
const DEFAULT_FOCUS_EXPONENT = 2.5;
const DEFAULT_BASE_WEIGHT = 0.35;

const UploadPage: React.FC = () => {
  const theme = useTheme();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [blurFaces, setBlurFaces] = useState(true);
  const [blurPlates, setBlurPlates] = useState(true);
  const [minKernel, setMinKernel] = useState(DEFAULT_MIN_KERNEL);
  const [maxKernel, setMaxKernel] = useState(DEFAULT_MAX_KERNEL);
  const [focusExponent, setFocusExponent] = useState(DEFAULT_FOCUS_EXPONENT);
  const [baseWeight, setBaseWeight] = useState(DEFAULT_BASE_WEIGHT);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.bmp', '.tiff', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.map(file => file.errors.map(error => error.message).join(', '));
      setError(`Some files were rejected: ${errors.join('; ')}`);
    }
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const ensureOdd = (value: number) => {
    const rounded = Math.round(value);
    return rounded % 2 === 0 ? rounded + 1 : rounded;
  };

  const extractValue = (value: number | number[]): number => (Array.isArray(value) ? value[0] : value);

  const handleMinKernelChange = (_: Event, value: number | number[]) => {
    const newValue = ensureOdd(extractValue(value));
    setMinKernel(newValue);
    setMaxKernel(prev => (prev < newValue ? newValue : ensureOdd(prev)));
  };

  const handleMaxKernelChange = (_: Event, value: number | number[]) => {
    const newValue = ensureOdd(extractValue(value));
    setMaxKernel(newValue < minKernel ? minKernel : newValue);
  };

  const handleFocusExponentChange = (_: Event, value: number | number[]) => {
    const newValue = extractValue(value);
    setFocusExponent(Number(newValue.toFixed(2)));
  };

  const handleBaseWeightChange = (_: Event, value: number | number[]) => {
    const newValue = extractValue(value);
    setBaseWeight(Number(newValue.toFixed(2)));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to process');
      return;
    }

    setProcessing(true);
    setError(null);
    setUploadProgress(0);
    const newResults: ProcessingResult[] = [];
    const sanitizedMin = ensureOdd(minKernel);
    const sanitizedMax = Math.max(ensureOdd(maxKernel), sanitizedMin);
    const requestOptions: DetectionOptions = {
      blurFaces,
      blurPlates,
      minKernel: sanitizedMin,
      maxKernel: sanitizedMax,
      focusExponent,
      baseWeight,
    };

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const result = await ApiService.detectSensitiveData(file, requestOptions);
          newResults.push(result);
          setUploadProgress(((i + 1) / files.length) * 100);
        } catch (err: any) {
          setError(`Failed to process ${file.name}: ${err.response?.data?.detail || err.message}`);
          break;
        }
      }
      
      setResults(prev => [...newResults, ...prev]);
      setFiles([]);
    } catch (err: any) {
      setError(`Processing failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const downloadResult = (filename: string) => {
    const url = ApiService.getDownloadUrl(filename);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const fileItemVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ fontWeight: 700 }}>
          Upload & Process Images
        </Typography>
        <Typography variant="h6" color="text.secondary" align="center" paragraph>
          Drag and drop your images to automatically detect and blur sensitive data.
        </Typography>
      </motion.div>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={4}>
        <Grid item xs={12} md={5}>
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>Upload Files</Typography>
              <DropzonePaper {...getRootProps()} theme={theme} isDragActive={isDragActive}>
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6">{isDragActive ? 'Drop files here' : 'Drag & drop images'}</Typography>
                <Typography variant="body2" color="text.secondary">or click to select</Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>Max 10MB per file</Typography>
              </DropzonePaper>

              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Processing Options</Typography>
                <FormControlLabel control={<Switch checked={blurFaces} onChange={(e) => setBlurFaces(e.target.checked)} />} label="Blur Faces" />
                <FormControlLabel control={<Switch checked={blurPlates} onChange={(e) => setBlurPlates(e.target.checked)} />} label="Blur License Plates" />
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="subtitle2">Blur kernel size range</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Minimum {minKernel}px · Maximum {maxKernel}px
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">Minimum kernel</Typography>
                      <Slider
                        value={minKernel}
                        onChange={handleMinKernelChange}
                        step={2}
                        min={3}
                        max={45}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Maximum kernel</Typography>
                      <Slider
                        value={maxKernel}
                        onChange={handleMaxKernelChange}
                        step={2}
                        min={minKernel}
                        max={65}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Blur focus exponent</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Controls how quickly blur falls off from the center ({focusExponent.toFixed(2)}).
                    </Typography>
                    <Slider
                      sx={{ mt: 1 }}
                      value={focusExponent}
                      onChange={handleFocusExponentChange}
                      min={0.5}
                      max={5}
                      step={0.1}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Baseline blur mix</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ensures a minimum blur across the region ({Math.round(baseWeight * 100)}%).
                    </Typography>
                    <Slider
                      sx={{ mt: 1 }}
                      value={baseWeight}
                      onChange={handleBaseWeightChange}
                      min={0}
                      max={1}
                      step={0.05}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </Stack>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={processFiles}
                  disabled={files.length === 0 || processing}
                  startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                  sx={{ py: 1.5, borderRadius: '50px' }}
                >
                  {processing ? `Processing... (${Math.round(uploadProgress)}%)` : `Process ${files.length} File(s)`}
                </Button>
                {processing && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1, height: 6, borderRadius: 3 }} />}
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={7}>
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                {files.length > 0 ? `Selected Files (${files.length})` : 'Processing Results'}
              </Typography>
              <Box sx={{ minHeight: 400, maxHeight: 600, overflowY: 'auto', pr: 1 }}>
                {files.length > 0 ? (
                  <AnimatePresence>
                    {files.map((file, index) => (
                      <motion.div key={file.name + index} variants={fileItemVariants} initial="hidden" animate="visible" exit="exit">
                        <Paper sx={{ display: 'flex', alignItems: 'center', p: 1.5, mb: 1.5, borderRadius: 2 }} variant="outlined">
                          <InsertDriveFile sx={{ mr: 1.5, color: 'text.secondary' }} />
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body1" fontWeight="medium">{file.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{formatFileSize(file.size)}</Typography>
                          </Box>
                          <IconButton size="small" color="error" onClick={() => removeFile(index)}><Delete /></IconButton>
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
                    {results.map((result, index) => (
                      <motion.div key={result.processed_filename + index} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }}>
                        <Card sx={{ mb: 2, borderRadius: 2 }}>
                          <CardContent>
                            <Typography variant="h6" component="div" sx={{ mb: 2 }}>{result.original_filename}</Typography>
                            <Grid container spacing={1} sx={{ mb: 2 }}>
                              <Grid item><Chip icon={<Face />} label={`${result.face_count} Faces`} size="small" /></Grid>
                              <Grid item><Chip icon={<DirectionsCar />} label={`${result.plate_count} Plates`} size="small" /></Grid>
                              <Grid item><Chip icon={<Timer />} label={`${result.processing_time.toFixed(2)}s`} size="small" /></Grid>
                            </Grid>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Blur: min {result.blur_parameters.min_kernel_size}px · max {result.blur_parameters.max_kernel_size}px · focus {result.blur_parameters.blur_focus_exp.toFixed(2)} · mix {Math.round(result.blur_parameters.blur_base_weight * 100)}%
                              </Typography>
                            </Box>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Download />}
                              onClick={() => downloadResult(result.processed_filename)}
                              fullWidth
                            >
                              Download Processed Image
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </Box>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UploadPage;
