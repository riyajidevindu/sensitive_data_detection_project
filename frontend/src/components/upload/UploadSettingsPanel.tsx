import React from 'react';
import {
  Paper,
  Typography,
  Box,
  FormControlLabel,
  Switch,
  Slider,
  Stack,
  Tooltip,
  Button,
  CircularProgress,
  LinearProgress,
  styled,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { CloudUpload, CheckCircle, HelpOutline, ExpandMore } from '@mui/icons-material';
import { DropzoneBindings } from './useUploadProcessing';

const DropzonePaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isDragActive',
})<{ isDragActive: boolean }>(({ theme, isDragActive }) => ({
  padding: theme.spacing(6),
  border: `3px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.grey[500]}`,
  backgroundColor: isDragActive ? theme.palette.action.hover : 'transparent',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

interface UploadSettingsPanelProps {
  dropzone: DropzoneBindings;
  filesCount: number;
  blurFaces: boolean;
  blurPlates: boolean;
  minKernel: number;
  maxKernel: number;
  focusExponent: number;
  baseWeight: number;
  hasCustomSettings: boolean;
  processing: boolean;
  uploadProgress: number;
  onToggleBlurFaces: (checked: boolean) => void;
  onToggleBlurPlates: (checked: boolean) => void;
  onMinKernelChange: (event: Event, value: number | number[]) => void;
  onMaxKernelChange: (event: Event, value: number | number[]) => void;
  onFocusExponentChange: (event: Event, value: number | number[]) => void;
  onBaseWeightChange: (event: Event, value: number | number[]) => void;
  onProcess: () => void;
  onReset: () => void;
}

const UploadSettingsPanel: React.FC<UploadSettingsPanelProps> = ({
  dropzone,
  filesCount,
  blurFaces,
  blurPlates,
  minKernel,
  maxKernel,
  focusExponent,
  baseWeight,
  hasCustomSettings,
  processing,
  uploadProgress,
  onToggleBlurFaces,
  onToggleBlurPlates,
  onMinKernelChange,
  onMaxKernelChange,
  onFocusExponentChange,
  onBaseWeightChange,
  onProcess,
  onReset,
}) => {
  return (
    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        Upload & Configure
      </Typography>
      <DropzonePaper
        {...dropzone.getRootProps()}
        isDragActive={dropzone.isDragActive}
        elevation={0}
      >
        <input {...dropzone.getInputProps()} />
        <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6">{dropzone.isDragActive ? 'Drop to upload' : 'Drag & drop images'}</Typography>
        <Typography variant="body2" color="text.secondary">or click to select</Typography>
      </DropzonePaper>

      <Box sx={{ mt: 4 }}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Basic Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              <FormControlLabel
                control={<Switch checked={blurFaces} onChange={(e) => onToggleBlurFaces(e.target.checked)} />}
                label="Blur Faces"
              />
              <FormControlLabel
                control={<Switch checked={blurPlates} onChange={(e) => onToggleBlurPlates(e.target.checked)} />}
                label="Blur License Plates"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Advanced Blur Control</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="subtitle1">Kernel Size</Typography>
                  <Tooltip title="Controls the size of the blur area. Larger values produce stronger blur.">
                    <HelpOutline fontSize="small" color="action" />
                  </Tooltip>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Min: {minKernel}px · Max: {maxKernel}px
                </Typography>
                <Slider
                  value={[minKernel, maxKernel]}
                  onChange={(e, val) => {
                    const [min, max] = val as number[];
                    onMinKernelChange(e, min);
                    onMaxKernelChange(e, max);
                  }}
                  step={2}
                  min={3}
                  max={65}
                  valueLabelDisplay="auto"
                />
              </Box>
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="subtitle1">Focus Exponent</Typography>
                  <Tooltip title="Higher values keep the center heavily blurred while tapering more quickly.">
                    <HelpOutline fontSize="small" color="action" />
                  </Tooltip>
                </Stack>
                <Slider
                  value={focusExponent}
                  onChange={onFocusExponentChange}
                  min={0.5}
                  max={5}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
              </Box>
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="subtitle1">Baseline Blur Mix</Typography>
                  <Tooltip title="Adjusts the minimum amount of blur retained across the region.">
                    <HelpOutline fontSize="small" color="action" />
                  </Tooltip>
                </Stack>
                <Slider
                  value={baseWeight}
                  onChange={onBaseWeightChange}
                  min={0}
                  max={1}
                  step={0.05}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatPercent}
                />
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={onReset}
                  disabled={!hasCustomSettings}
                >
                  Reset Advanced
                </Button>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={onProcess}
          disabled={filesCount === 0 || processing}
          startIcon={processing ? <CircularProgress size={24} color="inherit" /> : <CheckCircle />}
          sx={{ py: 2, fontSize: '1.1rem' }}
        >
          {processing ? `Processing... (${Math.round(uploadProgress)}%)` : `Process ${filesCount} File(s)`}
        </Button>
        {processing && (
          <LinearProgress
            variant="determinate"
            value={uploadProgress}
            sx={{ mt: 1.5, height: 8, borderRadius: 4 }}
          />
        )}
      </Box>
    </Paper>
  );
};

export default UploadSettingsPanel;
