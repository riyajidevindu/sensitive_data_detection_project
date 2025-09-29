import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  CardActions,
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
  Autorenew,
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

interface ProcessedItem {
  id: string;
  originalFile: File;
  originalPreviewUrl: string;
  parameters: DetectionOptions;
  result: ProcessingResult;
  isReprocessing: boolean;
  cacheBust: number;
}

const UploadPage: React.FC = () => {
  const theme = useTheme();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedItem[]>([]);
  const [blurFaces, setBlurFaces] = useState(true);
  const [blurPlates, setBlurPlates] = useState(true);
  const [minKernel, setMinKernel] = useState(DEFAULT_MIN_KERNEL);
  const [maxKernel, setMaxKernel] = useState(DEFAULT_MAX_KERNEL);
  const [focusExponent, setFocusExponent] = useState(DEFAULT_FOCUS_EXPONENT);
  const [baseWeight, setBaseWeight] = useState(DEFAULT_BASE_WEIGHT);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, []);

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

  const hasCustomSettings =
    minKernel !== DEFAULT_MIN_KERNEL ||
    maxKernel !== DEFAULT_MAX_KERNEL ||
    Number(focusExponent.toFixed(2)) !== Number(DEFAULT_FOCUS_EXPONENT.toFixed(2)) ||
    Number(baseWeight.toFixed(2)) !== Number(DEFAULT_BASE_WEIGHT.toFixed(2));

  const resetParameters = () => {
    setMinKernel(DEFAULT_MIN_KERNEL);
    setMaxKernel(DEFAULT_MAX_KERNEL);
    setFocusExponent(DEFAULT_FOCUS_EXPONENT);
    setBaseWeight(DEFAULT_BASE_WEIGHT);
  };

  const buildRequestOptions = (): DetectionOptions => {
    const sanitizedMin = ensureOdd(minKernel);
    const sanitizedMax = Math.max(ensureOdd(maxKernel), sanitizedMin);
    const sanitizedFocus = Number(focusExponent.toFixed(2));
    const sanitizedBaseWeight = Number(baseWeight.toFixed(2));

    return {
      blurFaces,
      blurPlates,
      minKernel: sanitizedMin,
      maxKernel: sanitizedMax,
      focusExponent: sanitizedFocus,
      baseWeight: sanitizedBaseWeight,
    };
  };

  const reprocessImage = async (index: number) => {
    const item = results[index];
    if (!item) {
      return;
    }

    const requestOptions = buildRequestOptions();
    setError(null);
    setResults(prev => prev.map((entry, idx) => (
      idx === index ? { ...entry, isReprocessing: true } : entry
    )));

    try {
      const updatedResult = await ApiService.detectSensitiveData(item.originalFile, requestOptions);
      const cacheBust = Date.now();
      setResults(prev => prev.map((entry, idx) => (
        idx === index
          ? { ...entry, result: updatedResult, parameters: requestOptions, isReprocessing: false, cacheBust }
          : entry
      )));
    } catch (err: any) {
      setError(`Failed to reprocess ${item.originalFile.name}: ${err.response?.data?.detail || err.message}`);
      setResults(prev => prev.map((entry, idx) => (
        idx === index ? { ...entry, isReprocessing: false } : entry
      )));
    }
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to process');
      return;
    }

    setProcessing(true);
    setError(null);
    setUploadProgress(0);

    const requestOptions = buildRequestOptions();
    const pendingResults: ProcessedItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const previewUrl = URL.createObjectURL(file);
          previewUrlsRef.current.push(previewUrl);

          const result = await ApiService.detectSensitiveData(file, requestOptions);
          const processedItem: ProcessedItem = {
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
            originalFile: file,
            originalPreviewUrl: previewUrl,
            parameters: { ...requestOptions },
            result,
            isReprocessing: false,
            cacheBust: Date.now(),
          };
          pendingResults.push(processedItem);
          setUploadProgress(((i + 1) / files.length) * 100);
        } catch (err: any) {
          setError(`Failed to process ${file.name}: ${err.response?.data?.detail || err.message}`);
          break;
        }
      }

      if (pendingResults.length > 0) {
        setResults(prev => [...pendingResults, ...prev]);
      }
      setFiles([]);
    } catch (err: any) {
      setError(`Processing failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const downloadResult = (filename: string, cacheBust?: number) => {
    const url = ApiService.getDownloadUrl(filename, cacheBust);
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
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="subtitle2">Blur kernel size range</Typography>
                      <Tooltip title="Controls the size of the area blurred for each detection. Larger values produce stronger blur but may affect more background.">
                        <HelpOutline fontSize="small" color="action" sx={{ cursor: 'help' }} />
                      </Tooltip>
                    </Stack>
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
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="subtitle2">Blur focus exponent</Typography>
                      <Tooltip title="Higher values keep the center heavily blurred while tapering more quickly toward the box edges.">
                        <HelpOutline fontSize="small" color="action" sx={{ cursor: 'help' }} />
                      </Tooltip>
                    </Stack>
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
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="subtitle2">Baseline blur mix</Typography>
                      <Tooltip title="Adjusts the minimum amount of blur retained across the region. Higher percentages keep edges more blurred.">
                        <HelpOutline fontSize="small" color="action" sx={{ cursor: 'help' }} />
                      </Tooltip>
                    </Stack>
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
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={resetParameters}
                    disabled={!hasCustomSettings}
                  >
                    Reset to defaults
                  </Button>
                </Box>
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
                    {results.map((item, index) => {
                      const { result } = item;
                      const processedImageUrl = ApiService.getDownloadUrl(result.processed_filename, item.cacheBust);

                      return (
                        <motion.div key={item.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }}>
                          <Card sx={{ mb: 2, borderRadius: 2 }}>
                            <CardContent>
                              <Typography variant="h6" component="div" sx={{ mb: 2 }}>{result.original_filename}</Typography>
                              <Grid container spacing={1} sx={{ mb: 2 }}>
                                <Grid item><Chip icon={<Face />} label={`${result.face_count} Faces`} size="small" /></Grid>
                                <Grid item><Chip icon={<DirectionsCar />} label={`${result.plate_count} Plates`} size="small" /></Grid>
                                <Grid item><Chip icon={<Timer />} label={`${result.processing_time.toFixed(2)}s`} size="small" /></Grid>
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
          </motion.div>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UploadPage;
