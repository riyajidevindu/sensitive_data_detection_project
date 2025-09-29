import React from 'react';
import { Container, Typography, Alert, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import UploadSettingsPanel from './upload/UploadSettingsPanel';
import ProcessingResults from './upload/ProcessingResults';
import { useUploadProcessing } from './upload/useUploadProcessing';

const UploadPage: React.FC = () => {
  const {
    files,
    results,
    processing,
    error,
    uploadProgress,
    blurFaces,
    blurPlates,
    minKernel,
    maxKernel,
    focusExponent,
    baseWeight,
    hasCustomSettings,
    dropzone,
    setBlurFaces,
    setBlurPlates,
    handleMinKernelChange,
    handleMaxKernelChange,
    handleFocusExponentChange,
    handleBaseWeightChange,
    resetParameters,
    processFiles,
    removeFile,
    reprocessImage,
    downloadResult,
  } = useUploadProcessing();

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
            <UploadSettingsPanel
              dropzone={dropzone}
              filesCount={files.length}
              blurFaces={blurFaces}
              blurPlates={blurPlates}
              minKernel={minKernel}
              maxKernel={maxKernel}
              focusExponent={focusExponent}
              baseWeight={baseWeight}
              hasCustomSettings={hasCustomSettings}
              processing={processing}
              uploadProgress={uploadProgress}
              onToggleBlurFaces={setBlurFaces}
              onToggleBlurPlates={setBlurPlates}
              onMinKernelChange={handleMinKernelChange}
              onMaxKernelChange={handleMaxKernelChange}
              onFocusExponentChange={handleFocusExponentChange}
              onBaseWeightChange={handleBaseWeightChange}
              onProcess={processFiles}
              onReset={resetParameters}
            />
          </motion.div>
        </Grid>

        <Grid item xs={12} md={7}>
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <ProcessingResults
              files={files}
              results={results}
              removeFile={removeFile}
              reprocessImage={reprocessImage}
              downloadResult={downloadResult}
            />
          </motion.div>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UploadPage;
