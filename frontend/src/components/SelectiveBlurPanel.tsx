import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Slider,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  styled,
} from '@mui/material';
import {
  Upload,
  Face,
  BlurOn,
  CheckCircle,
  Clear,
  ExpandMore,
  PersonAdd,
  HelpOutline,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import ApiService from '../services/api';
import { ProcessedItem } from './upload/types';

const DropzonePaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isDragActive',
})<{ isDragActive: boolean }>(({ theme, isDragActive }) => ({
  padding: theme.spacing(4),
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.grey[400]}`,
  backgroundColor: isDragActive ? theme.palette.action.hover : 'transparent',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

interface SelectiveBlurPanelProps {
  onProcessingResult?: (result: ProcessedItem) => void;
}

const SelectiveBlurPanel: React.FC<SelectiveBlurPanelProps> = ({ onProcessingResult }) => {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceUploaded, setReferenceUploaded] = useState(false);
  const [referenceStatus, setReferenceStatus] = useState<{
    has_reference: boolean;
    uploaded_at?: number;
  } | null>(null);
  const [filesToProcess, setFilesToProcess] = useState<File[]>([]);
  const [processingFile, setProcessingFile] = useState<File | null>(null);
  const [tolerance, setTolerance] = useState(0.75);
  const [blurKernel, setBlurKernel] = useState(51);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check reference status on component mount
  useEffect(() => {
    checkReferenceStatus();
  }, []);

  const checkReferenceStatus = async () => {
    try {
      const status = await ApiService.getReferenceStatus();
      setReferenceStatus(status);
    } catch (err) {
      console.error('Failed to check reference status:', err);
    }
  };

  const handleReferenceUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await ApiService.uploadReferenceFace(file);
      setReferenceFile(file);
      setReferenceUploaded(true);
      setSuccess(`Reference face uploaded successfully! Shape: ${result.encoding_shape.join('x')}`);
      checkReferenceStatus();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload reference face');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectiveBlur = async (file: File) => {
    setProcessing(true);
    setError(null);
    setSuccess(null);
    setProcessingFile(file);

    try {
      const result = await ApiService.applySelectiveBlur(file, tolerance, blurKernel);
      setSuccess(`Selective blur applied successfully! Output: ${result.processed_filename}`);
      
      // Create ProcessedItem for result display
      if (onProcessingResult) {
        const processedItem: ProcessedItem = {
          id: `selective-${Date.now()}`,
          originalFile: file,
          result: result,
          originalPreviewUrl: URL.createObjectURL(file),
          cacheBust: Date.now(),
          parameters: {}, // Selective blur doesn't use the same parameters as general processing
          isReprocessing: false,
        };
        onProcessingResult(processedItem);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply selective blur');
    } finally {
      setProcessing(false);
      setProcessingFile(null);
    }
  };

  const clearReference = async () => {
    setLoading(true);
    try {
      await ApiService.clearReferenceFace();
      setReferenceFile(null);
      setReferenceUploaded(false);
      setReferenceStatus({ has_reference: false });
      setSuccess('Reference face cleared successfully');
    } catch (err: any) {
      setError('Failed to clear reference face');
    } finally {
      setLoading(false);
    }
  };

  const referenceDropzone = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: false,
    onDrop: useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleReferenceUpload(acceptedFiles[0]);
      }
    }, []),
  });

  const processDropzone = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: true,
    onDrop: useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setFilesToProcess(prev => [...prev, ...acceptedFiles]);
        setError(null);
      }
    }, []),
  });

  const processAllFiles = async () => {
    if (filesToProcess.length === 0) return;
    
    setProcessing(true);
    setError(null);
    
    for (const file of filesToProcess) {
      setProcessingFile(file);
      try {
        await handleSelectiveBlur(file);
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err);
      }
    }
    
    setProcessing(false);
    setProcessingFile(null);
    setFilesToProcess([]);
  };

  const removeFileToProcess = (index: number) => {
    setFilesToProcess(prev => prev.filter((_, i) => i !== index));
  };

  const hasReference = referenceUploaded || referenceStatus?.has_reference;

  return (
    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Face color="primary" />
        Selective Face Blur
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Upload a reference face to keep unblurred, then process images to blur all other faces.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Reference Face Upload */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAdd />
          Step 1: Upload Reference Face
        </Typography>
        
        {hasReference ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip
              icon={<CheckCircle />}
              label={referenceFile?.name || 'Reference face ready'}
              color="success"
              variant="filled"
            />
            <Tooltip title="Clear reference face">
              <IconButton 
                onClick={clearReference} 
                disabled={loading}
                size="small"
                color="error"
              >
                <Clear />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <DropzonePaper {...referenceDropzone.getRootProps()} isDragActive={referenceDropzone.isDragActive}>
            <input {...referenceDropzone.getInputProps()} />
            {loading ? (
              <CircularProgress size={40} />
            ) : (
              <>
                <Upload sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6">
                  {referenceDropzone.isDragActive ? 'Drop reference image' : 'Upload reference face'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Drag & drop or click to select an image with your face
                </Typography>
              </>
            )}
          </DropzonePaper>
        )}
      </Box>

      {/* Settings */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Blur Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <Box>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1">Similarity Threshold</Typography>
                <Tooltip title="Higher values require stronger similarity to the reference face (more strict matching)">
                  <HelpOutline fontSize="small" color="action" />
                </Tooltip>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current: {tolerance.toFixed(2)} (0.0 = loose, 1.0 = strict)
              </Typography>
              <Slider
                value={tolerance}
                onChange={(_, value) => setTolerance(value as number)}
                min={0.3}
                max={0.95}
                step={0.05}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1">Blur Strength</Typography>
                <Tooltip title="Size of the blur kernel - higher values create stronger blur">
                  <HelpOutline fontSize="small" color="action" />
                </Tooltip>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current: {blurKernel}px
              </Typography>
              <Slider
                value={blurKernel}
                onChange={(_, value) => setBlurKernel(value as number)}
                min={15}
                max={101}
                step={2}
                valueLabelDisplay="auto"
              />
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Process Images */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BlurOn />
          Step 2: Process Images
        </Typography>
        
        <DropzonePaper 
          {...processDropzone.getRootProps()} 
          isDragActive={processDropzone.isDragActive}
          sx={{ opacity: hasReference ? 1 : 0.5, pointerEvents: (hasReference && !processing) ? 'auto' : 'none' }}
        >
          <input {...processDropzone.getInputProps()} disabled={!hasReference || processing} />
          {processing ? (
            <>
              <CircularProgress size={40} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Processing {processingFile?.name}...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filesToProcess.indexOf(processingFile!) + 1} of {filesToProcess.length}
              </Typography>
            </>
          ) : (
            <>
              <BlurOn sx={{ fontSize: 40, color: hasReference ? 'primary.main' : 'grey.400', mb: 1 }} />
              <Typography variant="h6" color={hasReference ? 'text.primary' : 'text.disabled'}>
                {processDropzone.isDragActive 
                  ? 'Drop images to process' 
                  : hasReference 
                    ? 'Add images to process'
                    : 'Upload reference face first'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {hasReference 
                  ? 'All faces except your reference will be blurred'
                  : 'Reference face required before processing'
                }
              </Typography>
            </>
          )}
        </DropzonePaper>

        {/* Files Queue */}
        {filesToProcess.length > 0 && !processing && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Files to Process ({filesToProcess.length})
            </Typography>
            <Stack spacing={1}>
              {filesToProcess.map((file, index) => (
                <Paper key={index} sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} variant="outlined">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Upload fontSize="small" color="action" />
                    <Typography variant="body2">{file.name}</Typography>
                    <Chip size="small" label={`${(file.size / 1024).toFixed(1)} KB`} />
                  </Box>
                  <IconButton size="small" onClick={() => removeFileToProcess(index)} color="error">
                    <Clear fontSize="small" />
                  </IconButton>
                </Paper>
              ))}
            </Stack>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<BlurOn />}
              onClick={processAllFiles}
              sx={{ mt: 2 }}
            >
              Process {filesToProcess.length} {filesToProcess.length === 1 ? 'Image' : 'Images'}
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default SelectiveBlurPanel;