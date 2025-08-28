import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Tooltip,
  styled,
} from '@mui/material';
import {
  Download,
  Delete,
  Refresh,
  Visibility,
  Close,
  Image as ImageIcon,
  Info,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ApiService from '../services/api';
import { FilesListResponse, FileInfo } from '../types/api';

const AnimatedCard = styled(motion.div)({
  height: '100%',
});

const HistoryPage: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response: FilesListResponse = await ApiService.getOutputFiles();
      setFiles(response.files.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()));
      setError(null);
    } catch (err: any) {
      setError(`Failed to fetch files: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDownload = (filename: string) => {
    const url = ApiService.getDownloadUrl(filename);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (filename: string) => {
    try {
      await ApiService.deleteOutputFile(filename);
      setFiles(prev => prev.filter(file => file.filename !== filename));
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(`Failed to delete file: ${err.response?.data?.detail || err.message}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>Processing History</Typography>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchFiles} disabled={loading}>
            Refresh
          </Button>
        </Box>
      </motion.div>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Paper elevation={2} sx={{ mb: 4, p: 2, borderRadius: 2, display: 'flex', gap: 2 }}>
          <Chip icon={<ImageIcon />} label={`${files.length} Processed Files`} color="primary" />
          <Chip label={`Total Size: ${formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}`} />
        </Paper>
      </motion.div>

      <AnimatePresence>
        {files.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <Paper elevation={1} sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
              <ImageIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" color="text.secondary">No processed files found</Typography>
            </Paper>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <Grid container spacing={3}>
              {files.map((file) => (
                <Grid item xs={12} sm={6} md={4} key={file.filename}>
                  <AnimatedCard variants={itemVariants} whileHover={{ y: -5, boxShadow: '0px 10px 20px rgba(0,0,0,0.1)' }}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" noWrap title={file.filename}>{file.filename}</Typography>
                        <Typography variant="body2" color="text.secondary">Size: {formatFileSize(file.size)}</Typography>
                        <Typography variant="body2" color="text.secondary">Created: {formatDate(file.created)}</Typography>
                      </CardContent>
                      <Box sx={{ p: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="Preview"><IconButton color="primary" onClick={() => setSelectedImage(file.filename)}><Visibility /></IconButton></Tooltip>
                        <Tooltip title="Download"><IconButton color="info" onClick={() => handleDownload(file.filename)}><Download /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton color="error" onClick={() => setDeleteConfirm(file.filename)}><Delete /></IconButton></Tooltip>
                      </Box>
                    </Card>
                  </AnimatedCard>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedImage}
          <IconButton onClick={() => setSelectedImage(null)} sx={{ position: 'absolute', right: 8, top: 8 }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage && <img src={ApiService.getOutputImageUrl(selectedImage)} alt={selectedImage} style={{ width: '100%', height: 'auto' }} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete "{deleteConfirm}"? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="error" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HistoryPage;
