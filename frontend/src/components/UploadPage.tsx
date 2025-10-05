import React, { useState } from 'react';
import { Container, Typography, Alert, Grid, Box, Tabs, Tab, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { PhotoLibrary, BlurOn } from '@mui/icons-material';
import UploadSettingsPanel from './upload/UploadSettingsPanel';
import ProcessingResults from './upload/ProcessingResults';
import SelectiveBlurPanel from './SelectiveBlurPanel';
import { useUploadProcessing } from './upload/useUploadProcessing';
import { ProcessedItem } from './upload/types';

const UploadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectiveBlurResults, setSelectiveBlurResults] = useState<ProcessedItem[]>([]);
  
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

  const handleSelectiveBlurResult = (processedItem: ProcessedItem) => {
    // Add the selective blur result to the selective blur results
    setSelectiveBlurResults(prev => [...prev, processedItem]);
  };

  const removeSelectiveBlurResult = (index: number) => {
    setSelectiveBlurResults(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 8 }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Typography variant="h2" component="h1" gutterBottom align="center" sx={{ fontWeight: 700 }}>
          Image Processing Hub
        </Typography>
        <Typography variant="h6" color="text.secondary" align="center" paragraph sx={{ mb: 6 }}>
          Drag & drop images, configure settings, and view results in one seamless workflow.
        </Typography>
      </motion.div>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Tab Navigation */}
      <Paper elevation={0} sx={{ mb: 4, borderRadius: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<PhotoLibrary />} 
            label="General Processing" 
            sx={{ minHeight: 64, fontSize: '1rem' }} 
          />
          <Tab 
            icon={<BlurOn />} 
            label="Selective Face Blur" 
            sx={{ minHeight: 64, fontSize: '1rem' }} 
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              <Box sx={{ position: 'sticky', top: 100 }}>
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
              </Box>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={8}>
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
      )}

      {activeTab === 1 && (
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <SelectiveBlurPanel onProcessingResult={handleSelectiveBlurResult} />
            </motion.div>
          </Grid>

          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <ProcessingResults
                files={selectiveBlurResults.map(r => r.originalFile)}
                results={selectiveBlurResults}
                removeFile={removeSelectiveBlurResult}
                reprocessImage={() => {}}
                downloadResult={downloadResult}
              />
            </motion.div>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default UploadPage;
