import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Download,
  Delete,
  Refresh,
  Visibility,
  Close,
  Image as ImageIcon,
} from '@mui/icons-material';
import ApiService from '../services/api';
import { FilesListResponse, FileInfo } from '../types/api';

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
      setFiles(response.files);
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

  const handlePreview = (filename: string) => {
    setSelectedImage(filename);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Processing History
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchFiles}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Chip
              icon={<ImageIcon />}
              label={`${files.length} Processed Files`}
              color="primary"
            />
          </Grid>
          <Grid item>
            <Chip
              label={`Total Size: ${formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}`}
              color="info"
            />
          </Grid>
        </Grid>
      </Paper>

      {files.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <ImageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No processed files found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload and process some images to see them here.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Table View for larger screens */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <TableContainer component={Paper} elevation={2}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Filename</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.filename} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {file.filename}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>{formatDate(file.created)}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handlePreview(file.filename)}
                          title="Preview"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleDownload(file.filename)}
                          title="Download"
                        >
                          <Download />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteConfirm(file.filename)}
                          title="Delete"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Card View for smaller screens */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <Grid container spacing={2}>
              {files.map((file) => (
                <Grid item xs={12} sm={6} key={file.filename}>
                  <Card elevation={2}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom noWrap>
                        {file.filename}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Size: {formatFileSize(file.size)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Created: {formatDate(file.created)}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => handlePreview(file.filename)}
                        >
                          Preview
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Download />}
                          onClick={() => handleDownload(file.filename)}
                        >
                          Download
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => setDeleteConfirm(file.filename)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {selectedImage}
          </Typography>
          <IconButton onClick={() => setSelectedImage(null)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={ApiService.getOutputImageUrl(selectedImage)}
                alt={selectedImage}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<Download />}
            onClick={() => selectedImage && handleDownload(selectedImage)}
          >
            Download
          </Button>
          <Button onClick={() => setSelectedImage(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteConfirm}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button
            color="error"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HistoryPage;
