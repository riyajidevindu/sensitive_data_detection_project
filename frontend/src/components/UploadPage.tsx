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
  CardMedia,
  Chip,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error,
  Download,
  Face,
  DirectionsCar,
  Timer,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import ApiService from '../services/api';
import { ProcessingResult } from '../types/api';

const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [blurFaces, setBlurFaces] = useState(true);
  const [blurPlates, setBlurPlates] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.bmp', '.tiff', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.map(file => 
        file.errors.map(error => error.message).join(', ')
      );
      setError(`Some files were rejected: ${errors.join('; ')}`);
    }
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to process');
      return;
    }

    setProcessing(true);
    setError(null);
    const newResults: ProcessingResult[] = [];

    try {
      for (const file of files) {
        try {
          const result = await ApiService.detectSensitiveData(file, blurFaces, blurPlates);
          newResults.push(result);
        } catch (err: any) {
          setError(`Failed to process ${file.name}: ${err.response?.data?.detail || err.message}`);
          break;
        }
      }
      
      setResults(prev => [...prev, ...newResults]);
      setFiles([]); // Clear files after successful processing
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
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Upload & Process Images
      </Typography>
      
      <Typography variant="body1" color="text.secondary" align="center" paragraph>
        Upload your images to automatically detect and blur sensitive data
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              File Upload
            </Typography>
            
            {/* Dropzone */}
            <Paper
              {...getRootProps()}
              sx={{
                p: 4,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                bgcolor: isDragActive ? 'action.hover' : 'background.default',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop the files here' : 'Drag & drop images here'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to select files
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Supported formats: JPEG, PNG, BMP, TIFF, WebP (max 10MB each)
              </Typography>
            </Paper>

            {/* File List */}
            {files.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Selected Files ({files.length})
                </Typography>
                {files.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      border: 1,
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => removeFile(index)}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Box>
            )}

            {/* Processing Options */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Processing Options
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={blurFaces}
                    onChange={(e) => setBlurFaces(e.target.checked)}
                    color="primary"
                  />
                }
                label="Blur detected faces"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={blurPlates}
                    onChange={(e) => setBlurPlates(e.target.checked)}
                    color="primary"
                  />
                }
                label="Blur license plates"
              />
            </Box>

            {/* Process Button */}
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={processFiles}
                disabled={files.length === 0 || processing}
                startIcon={processing ? <CircularProgress size={20} /> : <CloudUpload />}
              >
                {processing ? 'Processing...' : `Process ${files.length} File(s)`}
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom>
              Processing Results
            </Typography>
            
            {results.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No results yet. Upload and process some images to see results here.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
                {results.map((result, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                        <Typography variant="h6" component="div">
                          {result.original_filename}
                        </Typography>
                      </Box>
                      
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item>
                          <Chip
                            icon={<Face />}
                            label={`${result.face_count} Faces`}
                            color="primary"
                            size="small"
                          />
                        </Grid>
                        <Grid item>
                          <Chip
                            icon={<DirectionsCar />}
                            label={`${result.plate_count} Plates`}
                            color="secondary"
                            size="small"
                          />
                        </Grid>
                        <Grid item>
                          <Chip
                            icon={<Timer />}
                            label={`${result.processing_time.toFixed(2)}s`}
                            color="info"
                            size="small"
                          />
                        </Grid>
                      </Grid>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Total detections: {result.total_detections}
                      </Typography>
                      
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
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UploadPage;
