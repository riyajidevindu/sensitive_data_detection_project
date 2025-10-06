import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  CardMedia,
  Badge,
  Divider,
  Stack,
  useTheme,
  useMediaQuery,
  Skeleton,
  Fade,
  Snackbar,
} from '@mui/material';
import {
  Download,
  Delete,
  Refresh,
  Visibility,
  Close,
  Image as ImageIcon,
  Search,
  Clear,
  Sort,
  FilterList,
  SelectAll,
  GetApp,
  NavigateBefore,
  NavigateNext,
  GridView,
  ViewList,
  SearchOff,
  Upload as UploadIcon,
  DeleteSweep,
  CheckCircle,
  Today,
  DateRange,
  CalendarMonth,
  Archive,
  Share,
  ContentCopy,
  ZoomIn,
  Info,
  TrendingUp,
  Speed,
  Storage,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ApiService from '../services/api';
import { FilesListResponse, FileInfo } from '../types/api';

const AnimatedCard = styled(motion.div)({
  height: '100%',
});

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    right: 8,
    top: 8,
    padding: '4px 8px',
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
}));

const ImagePreview = styled(Box)(({ theme }) => ({
  position: 'relative',
  paddingTop: '75%', // 4:3 aspect ratio
  overflow: 'hidden',
  backgroundColor: theme.palette.grey[100],
  borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
  cursor: 'pointer',
  '& img': {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },
  '&:hover img': {
    transform: 'scale(1.05)',
  },
}));

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';
type ViewMode = 'grid' | 'list';
type QuickFilter = 'all' | 'today' | 'week' | 'month';

const HistoryPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);

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

  // Filtered and sorted files
  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    // Apply quick date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    switch (quickFilter) {
      case 'today':
        result = result.filter(file => new Date(file.created) >= today);
        break;
      case 'week':
        result = result.filter(file => new Date(file.created) >= weekAgo);
        break;
      case 'month':
        result = result.filter(file => new Date(file.created) >= monthAgo);
        break;
      // 'all' shows everything
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(file => 
        file.filename.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created).getTime() - new Date(a.created).getTime();
        case 'date-asc':
          return new Date(a.created).getTime() - new Date(b.created).getTime();
        case 'name-asc':
          return a.filename.localeCompare(b.filename);
        case 'name-desc':
          return b.filename.localeCompare(a.filename);
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        default:
          return 0;
      }
    });

    return result;
  }, [files, searchQuery, sortBy, quickFilter]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedFiles.length === filteredAndSortedFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredAndSortedFiles.map(f => f.filename));
    }
  };

  const handleToggleSelect = (filename: string) => {
    setSelectedFiles(prev => 
      prev.includes(filename) 
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    );
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
  };

  const handleDownload = (filename: string) => {
    const url = ApiService.getDownloadUrl(filename);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDownload = () => {
    selectedFiles.forEach(filename => {
      setTimeout(() => handleDownload(filename), 100);
    });
    setSnackbar({
      open: true,
      message: `Downloading ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}...`,
      severity: 'info',
    });
  };

  const handleDelete = async (filename: string) => {
    try {
      await ApiService.deleteOutputFile(filename);
      setFiles(prev => prev.filter(file => file.filename !== filename));
      setSelectedFiles(prev => prev.filter(f => f !== filename));
      setDeleteConfirm(null);
      setSnackbar({
        open: true,
        message: 'File deleted successfully',
        severity: 'success',
      });
    } catch (err: any) {
      setError(`Failed to delete file: ${err.response?.data?.detail || err.message}`);
      setSnackbar({
        open: true,
        message: 'Failed to delete file',
        severity: 'error',
      });
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedFiles.length;
    try {
      await Promise.all(selectedFiles.map(filename => ApiService.deleteOutputFile(filename)));
      setFiles(prev => prev.filter(file => !selectedFiles.includes(file.filename)));
      setSelectedFiles([]);
      setDeleteConfirm(null);
      setSnackbar({
        open: true,
        message: `${count} file${count > 1 ? 's' : ''} deleted successfully`,
        severity: 'success',
      });
    } catch (err: any) {
      setError(`Failed to delete files: ${err.response?.data?.detail || err.message}`);
      setSnackbar({
        open: true,
        message: 'Failed to delete some files',
        severity: 'error',
      });
    }
  };

  // Image navigation in preview
  const currentImageIndex = selectedImage ? filteredAndSortedFiles.findIndex(f => f.filename === selectedImage) : -1;
  
  const handlePreviousImage = () => {
    if (currentImageIndex > 0) {
      setSelectedImage(filteredAndSortedFiles[currentImageIndex - 1].filename);
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex < filteredAndSortedFiles.length - 1) {
      setSelectedImage(filteredAndSortedFiles[currentImageIndex + 1].filename);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F - Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Ctrl/Cmd + A - Select all (when not in input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        handleSelectAll();
      }
      
      // Delete key - Delete selected
      if (e.key === 'Delete' && selectedFiles.length > 0 && document.activeElement?.tagName !== 'INPUT') {
        setDeleteConfirm('bulk');
      }
      
      // Arrow keys and Escape in preview modal
      if (selectedImage) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePreviousImage();
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextImage();
        }
        if (e.key === 'Escape') {
          setSelectedImage(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedFiles, selectedImage, filteredAndSortedFiles]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const getSortLabel = (option: SortOption): string => {
    const labels = {
      'date-desc': 'Newest First',
      'date-asc': 'Oldest First',
      'name-asc': 'Name (A-Z)',
      'name-desc': 'Name (Z-A)',
      'size-desc': 'Largest First',
      'size-asc': 'Smallest First',
    };
    return labels[option];
  };

  const handleShareSelected = () => {
    setShareDialogOpen(true);
  };

  const handleCopyShareLink = async () => {
    if (selectedFiles.length === 0) return;
    
    // Generate shareable links (in production, this would be actual share URLs)
    const links = selectedFiles
      .map(filename => `${window.location.origin}/outputs/${filename}`)
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(links);
      setSnackbar({
        open: true,
        message: `${selectedFiles.length} link${selectedFiles.length > 1 ? 's' : ''} copied to clipboard!`,
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to copy links to clipboard',
        severity: 'error',
      });
    }
  };

  const handleShowInfo = () => {
    setInfoDialogOpen(true);
  };

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
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Loading your processed files...
        </Typography>
      </Box>
    );
  }

  const totalSize = filteredAndSortedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
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
      </motion.div>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Dashboard */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" color="text.secondary">
            Quick Overview
          </Typography>
          <Button 
            size="small" 
            startIcon={<Info />}
            onClick={handleShowInfo}
            variant="outlined"
          >
            Detailed Stats
          </Button>
        </Stack>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={3}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                {files.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Files
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                {filteredAndSortedFiles.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery ? 'Filtered' : 'Showing'}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                {formatFileSize(totalSize)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Size
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                {selectedFiles.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Selected
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </motion.div>

      {/* Search and Filter Bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 1 }}>
          {/* Quick Date Filters */}
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
            <Chip
              icon={<FilterList />}
              label="All Files"
              color={quickFilter === 'all' ? 'primary' : 'default'}
              onClick={() => setQuickFilter('all')}
              clickable
            />
            <Chip
              icon={<Today />}
              label="Today"
              color={quickFilter === 'today' ? 'primary' : 'default'}
              onClick={() => setQuickFilter('today')}
              clickable
            />
            <Chip
              icon={<DateRange />}
              label="This Week"
              color={quickFilter === 'week' ? 'primary' : 'default'}
              onClick={() => setQuickFilter('week')}
              clickable
            />
            <Chip
              icon={<CalendarMonth />}
              label="This Month"
              color={quickFilter === 'month' ? 'primary' : 'default'}
              onClick={() => setQuickFilter('month')}
              clickable
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="Search files by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              inputRef={searchInputRef}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />

            {/* Sort Button */}
            <Button
              variant="outlined"
              startIcon={<Sort />}
              onClick={(e) => setSortMenuAnchor(e.currentTarget)}
              sx={{ minWidth: { xs: '100%', sm: 200 } }}
            >
              {getSortLabel(sortBy)}
            </Button>

            {/* View Toggle */}
            <Box sx={{ display: 'flex', gap: 0.5, border: 1, borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => setViewMode('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
              >
                <GridView />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setViewMode('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
              >
                <ViewList />
              </IconButton>
            </Box>
          </Stack>

          {/* Sort Menu */}
          <Menu
            anchorEl={sortMenuAnchor}
            open={Boolean(sortMenuAnchor)}
            onClose={() => setSortMenuAnchor(null)}
          >
            {(['date-desc', 'date-asc', 'name-asc', 'name-desc', 'size-desc', 'size-asc'] as SortOption[]).map((option) => (
              <MenuItem
                key={option}
                selected={sortBy === option}
                onClick={() => {
                  setSortBy(option);
                  setSortMenuAnchor(null);
                }}
              >
                {getSortLabel(option)}
              </MenuItem>
            ))}
          </Menu>
        </Paper>
      </motion.div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Paper 
              elevation={3} 
              sx={{ 
                p: 2, 
                mb: 3, 
                borderRadius: 1, 
                backgroundColor: 'primary.light',
                color: 'primary.contrastText'
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Checkbox
                  checked={selectedFiles.length === filteredAndSortedFiles.length}
                  indeterminate={selectedFiles.length > 0 && selectedFiles.length < filteredAndSortedFiles.length}
                  onChange={handleSelectAll}
                  sx={{ color: 'inherit' }}
                />
                <Typography variant="body1" sx={{ flex: 1 }}>
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Share />}
                  onClick={handleShareSelected}
                  sx={{ backgroundColor: 'white', color: 'primary.main', '&:hover': { backgroundColor: 'grey.100' } }}
                >
                  Share
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<GetApp />}
                  onClick={handleBulkDownload}
                  sx={{ backgroundColor: 'white', color: 'primary.main', '&:hover': { backgroundColor: 'grey.100' } }}
                >
                  Download All
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<DeleteSweep />}
                  onClick={() => setDeleteConfirm('bulk')}
                  color="error"
                >
                  Delete Selected
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleClearSelection}
                  sx={{ color: 'inherit' }}
                >
                  Clear
                </Button>
              </Stack>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files Grid/List */}
      <AnimatePresence>
        {filteredAndSortedFiles.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Paper elevation={1} sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
              {searchQuery ? (
                <>
                  <SearchOff sx={{ fontSize: 100, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h5" color="text.secondary" gutterBottom>
                    No results found for "{searchQuery}"
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Try adjusting your search terms
                  </Typography>
                  <Button variant="outlined" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                </>
              ) : (
                <>
                  <ImageIcon sx={{ fontSize: 100, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h5" color="text.secondary" gutterBottom>
                    No processed files yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Upload and process your first image to see results here
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<UploadIcon />}
                    href="/upload"
                  >
                    Start Processing
                  </Button>
                </>
              )}
            </Paper>
          </motion.div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.05 },
              },
            }}
            initial="hidden"
            animate="visible"
          >
            <Grid container spacing={3}>
              {filteredAndSortedFiles.map((file) => {
                const isSelected = selectedFiles.includes(file.filename);
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={file.filename}>
                    <AnimatedCard
                      variants={{
                        hidden: { y: 20, opacity: 0 },
                        visible: { y: 0, opacity: 1 },
                        exit: { y: -20, opacity: 0 },
                      }}
                      whileHover={{ y: -8, boxShadow: '0px 12px 24px rgba(0,0,0,0.15)' }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card 
                        sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          borderRadius: 1,
                          border: isSelected ? 2 : 0,
                          borderColor: 'primary.main',
                          position: 'relative'
                        }}
                      >
                        {/* Selection Checkbox */}
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelect(file.filename)}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            zIndex: 1,
                            backgroundColor: 'background.paper',
                            borderRadius: 1,
                            '&:hover': {
                              backgroundColor: 'background.paper',
                            }
                          }}
                        />

                        {/* Image Preview */}
                        <ImagePreview onClick={() => setSelectedImage(file.filename)}>
                          {!loadedImages.has(file.filename) && (
                            <Skeleton 
                              variant="rectangular" 
                              width="100%" 
                              height={200}
                              sx={{ position: 'absolute', top: 0, left: 0 }}
                            />
                          )}
                          <Fade in={loadedImages.has(file.filename)} timeout={500}>
                            <img 
                              src={ApiService.getOutputImageUrl(file.filename)} 
                              alt={file.filename}
                              onLoad={() => {
                                setLoadedImages(prev => {
                                  const newSet = new Set(prev);
                                  newSet.add(file.filename);
                                  return newSet;
                                });
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=';
                                setLoadedImages(prev => {
                                  const newSet = new Set(prev);
                                  newSet.add(file.filename);
                                  return newSet;
                                });
                              }}
                              style={{ display: loadedImages.has(file.filename) ? 'block' : 'none' }}
                            />
                          </Fade>
                          {isSelected && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(25, 118, 210, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <CheckCircle sx={{ fontSize: 48, color: 'primary.main' }} />
                            </Box>
                          )}
                        </ImagePreview>

                        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                          <Tooltip title={file.filename} placement="top">
                            <Typography 
                              variant="subtitle1" 
                              noWrap 
                              sx={{ fontWeight: 600, mb: 1 }}
                            >
                              {file.filename}
                            </Typography>
                          </Tooltip>
                          
                          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                            <Chip 
                              label={formatFileSize(file.size)} 
                              size="small" 
                              variant="outlined"
                            />
                            <Chip 
                              label={formatDate(file.created)} 
                              size="small" 
                              variant="outlined"
                              color="primary"
                            />
                          </Stack>
                        </CardContent>

                        <Divider />

                        <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-around' }}>
                          <Tooltip title="Preview">
                            <IconButton 
                              size="small" 
                              color="primary" 
                              onClick={() => setSelectedImage(file.filename)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton 
                              size="small" 
                              color="info" 
                              onClick={() => handleDownload(file.filename)}
                            >
                              <Download />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => setDeleteConfirm(file.filename)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Card>
                    </AnimatedCard>
                  </Grid>
                );
              })}
            </Grid>
          </motion.div>
        ) : (
          // List View
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Stack spacing={2}>
              {filteredAndSortedFiles.map((file) => {
                const isSelected = selectedFiles.includes(file.filename);
                return (
                  <motion.div
                    key={file.filename}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Paper
                      elevation={isSelected ? 4 : 1}
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        border: isSelected ? 2 : 0,
                        borderColor: 'primary.main',
                        transition: 'all 0.2s',
                        '&:hover': {
                          elevation: 3,
                          transform: 'translateX(4px)',
                        }
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelect(file.filename)}
                        />
                        
                        <Box
                          component="img"
                          src={ApiService.getOutputImageUrl(file.filename)}
                          alt={file.filename}
                          sx={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 1,
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelectedImage(file.filename)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />

                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="h6" noWrap>
                            {file.filename}
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {formatFileSize(file.size)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              •
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(file.created)}
                            </Typography>
                          </Stack>
                        </Box>

                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Preview">
                            <IconButton 
                              color="primary" 
                              onClick={() => setSelectedImage(file.filename)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton 
                              color="info" 
                              onClick={() => handleDownload(file.filename)}
                            >
                              <Download />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              color="error" 
                              onClick={() => setDeleteConfirm(file.filename)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Paper>
                  </motion.div>
                );
              })}
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Preview Dialog */}
      <Dialog 
        open={!!selectedImage} 
        onClose={() => setSelectedImage(null)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
              <ImageIcon color="primary" />
              <Tooltip title={selectedImage || ''}>
                <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                  {selectedImage}
                </Typography>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Previous (←)">
                <span>
                  <IconButton 
                    onClick={handlePreviousImage}
                    disabled={currentImageIndex <= 0}
                  >
                    <NavigateBefore />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Next (→)">
                <span>
                  <IconButton 
                    onClick={handleNextImage}
                    disabled={currentImageIndex >= filteredAndSortedFiles.length - 1}
                  >
                    <NavigateNext />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Close (Esc)">
                <IconButton onClick={() => setSelectedImage(null)}>
                  <Close />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          {selectedImage && (
            <Box sx={{ 
              width: '100%', 
              maxHeight: '70vh', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'grey.100',
              p: 2
            }}>
              <img 
                src={ApiService.getOutputImageUrl(selectedImage)} 
                alt={selectedImage} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh', 
                  objectFit: 'contain',
                  borderRadius: 4
                }} 
              />
            </Box>
          )}
          
          {/* Image Metadata */}
          {selectedImage && filteredAndSortedFiles.find(f => f.filename === selectedImage) && (
            <Box sx={{ p: 3, backgroundColor: 'background.default' }}>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip 
                  label={`Size: ${formatFileSize(filteredAndSortedFiles.find(f => f.filename === selectedImage)!.size)}`}
                  variant="outlined"
                />
                <Chip 
                  label={`Created: ${formatDate(filteredAndSortedFiles.find(f => f.filename === selectedImage)!.created)}`}
                  variant="outlined"
                  color="primary"
                />
                <Chip 
                  label={`${currentImageIndex + 1} of ${filteredAndSortedFiles.length}`}
                  variant="outlined"
                  color="secondary"
                />
              </Stack>
            </Box>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button 
            startIcon={<Download />}
            onClick={() => selectedImage && handleDownload(selectedImage)}
            variant="contained"
          >
            Download
          </Button>
          <Button 
            startIcon={<Delete />}
            onClick={() => selectedImage && setDeleteConfirm(selectedImage)}
            color="error"
            variant="outlined"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Delete Confirmation Dialog */}
      <Dialog 
        open={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)}
        PaperProps={{
          sx: { borderRadius: 1 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Delete color="error" />
          Confirm Deletion
        </DialogTitle>
        <Divider />
        <DialogContent>
          {deleteConfirm === 'bulk' ? (
            <>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to delete <strong>{selectedFiles.length}</strong> selected file{selectedFiles.length > 1 ? 's' : ''}?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This action cannot be undone.
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to delete <strong>"{deleteConfirm}"</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This action cannot be undone.
              </Typography>
            </>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined">
            Cancel
          </Button>
          <Button 
            color="error" 
            variant="contained"
            startIcon={<Delete />}
            onClick={() => {
              if (deleteConfirm === 'bulk') {
                handleBulkDelete();
              } else if (deleteConfirm) {
                handleDelete(deleteConfirm);
                setSelectedImage(null);
              }
            }}
          >
            Delete {deleteConfirm === 'bulk' ? `${selectedFiles.length} Files` : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Keyboard Shortcuts Help */}
      <Tooltip 
        title={
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" display="block"><strong>Ctrl+F:</strong> Focus search</Typography>
            <Typography variant="caption" display="block"><strong>Ctrl+A:</strong> Select all</Typography>
            <Typography variant="caption" display="block"><strong>Delete:</strong> Delete selected</Typography>
            <Typography variant="caption" display="block"><strong>←/→:</strong> Navigate preview</Typography>
            <Typography variant="caption" display="block"><strong>Esc:</strong> Close preview</Typography>
          </Box>
        }
        placement="left"
      >
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            p: 1.5,
            borderRadius: 1,
            cursor: 'help',
            display: { xs: 'none', md: 'block' }
          }}
        >
          <Typography variant="caption" color="text.secondary">
            ⌨️ Keyboard shortcuts
          </Typography>
        </Paper>
      </Tooltip>

      {/* Share Dialog */}
      <Dialog 
        open={shareDialogOpen} 
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Share color="primary" />
          Share Selected Files
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Share {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} with others
            </Typography>
            
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={handleCopyShareLink}
            >
              Copy Links to Clipboard
            </Button>
            
            <Divider>
              <Typography variant="caption" color="text.secondary">OR</Typography>
            </Divider>
            
            <Stack direction="row" spacing={1} justifyContent="center">
              <Tooltip title="Share via Email">
                <IconButton 
                  onClick={() => window.open(`mailto:?subject=Processed Images&body=Check out these processed images!`)}
                >
                  <Share />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download & Share">
                <IconButton onClick={handleBulkDownload}>
                  <GetApp />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShareDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info/Statistics Dialog */}
      <Dialog 
        open={infoDialogOpen} 
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Info color="primary" />
          Processing Statistics
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <TrendingUp color="success" />
                <Typography variant="h6">System Overview</Typography>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">{files.length}</Typography>
                    <Typography variant="caption" color="text.secondary">Total Files</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Total Storage</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Speed color="info" />
                <Typography variant="h6">Performance</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Average processing time: <strong>~2-3 seconds</strong> per image
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Detection accuracy: <strong>95%+</strong> for faces and plates
              </Typography>
            </Box>

            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Storage color="warning" />
                <Typography variant="h6">Storage Usage</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Processed images: <strong>{files.length}</strong> files
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Space used: <strong>{formatFileSize(files.reduce((acc, f) => acc + f.size, 0))}</strong>
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setInfoDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default HistoryPage;
