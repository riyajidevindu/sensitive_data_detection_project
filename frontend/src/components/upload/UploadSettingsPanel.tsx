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
} from '@mui/material';
import { CloudUpload, CheckCircle, HelpOutline } from '@mui/icons-material';
import { DropzoneBindings } from './useUploadProcessing';

const DropzonePaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isDragActive',
})<{ isDragActive: boolean }>(({ theme, isDragActive }) => ({
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
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>Upload Files</Typography>
      <DropzonePaper
        {...dropzone.getRootProps()}
        isDragActive={dropzone.isDragActive}
      >
        <input {...dropzone.getInputProps()} />
        <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6">{dropzone.isDragActive ? 'Drop files here' : 'Drag & drop images'}</Typography>
        <Typography variant="body2" color="text.secondary">or click to select</Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>Max 10MB per file</Typography>
      </DropzonePaper>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>Processing Options</Typography>
        <FormControlLabel
          control={<Switch checked={blurFaces} onChange={(e) => onToggleBlurFaces(e.target.checked)} />}
          label="Blur Faces"
        />
        <FormControlLabel
          control={<Switch checked={blurPlates} onChange={(e) => onToggleBlurPlates(e.target.checked)} />}
          label="Blur License Plates"
        />
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
                onChange={onMinKernelChange}
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
                onChange={onMaxKernelChange}
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
              onChange={onFocusExponentChange}
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
              Ensures a minimum blur across the region ({formatPercent(baseWeight)}).
            </Typography>
            <Slider
              sx={{ mt: 1 }}
              value={baseWeight}
              onChange={onBaseWeightChange}
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
            onClick={onReset}
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
          onClick={onProcess}
          disabled={filesCount === 0 || processing}
          startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
          sx={{ py: 1.5, borderRadius: '50px' }}
        >
          {processing ? `Processing... (${Math.round(uploadProgress)}%)` : `Process ${filesCount} File(s)`}
        </Button>
        {processing && (
          <LinearProgress
            variant="determinate"
            value={uploadProgress}
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        )}
      </Box>
    </Paper>
  );
};

export default UploadSettingsPanel;
