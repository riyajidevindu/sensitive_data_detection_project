import { createTheme } from '@mui/material/styles';

// Common typography and shape definitions
const commonSettings = {
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '3.5rem',
      letterSpacing: '-0.5px',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    body1: {
      fontSize: '1.1rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 20,
  },
};

export const darkTheme = createTheme({
  ...commonSettings,
  palette: {
    mode: 'dark',
    primary: {
      main: '#00F5A0', // A vibrant, futuristic green
    },
    secondary: {
      main: '#9C27B0', // A deep, contrasting purple
    },
    background: {
      default: '#0D0C22', // A very dark, deep blue
      paper: 'rgba(22, 28, 58, 0.8)', // Glassmorphic paper
    },
    text: {
      primary: '#EAEAEA',
      secondary: '#B0B0B0',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '50px',
          fontWeight: 600,
          padding: '10px 25px',
          boxShadow: '0 4px 15px rgba(0, 245, 160, 0.2)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(0, 245, 160, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(22, 28, 58, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(13, 12, 34, 0.7)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'none',
        },
      },
    },
  },
});

export const lightTheme = createTheme({
  ...commonSettings,
  palette: {
    mode: 'light',
    primary: {
      main: '#0062FF', // A bright, professional blue
    },
    secondary: {
      main: '#FF4081', // A vibrant pink for contrast
    },
    background: {
      default: '#F4F7FC', // A light, clean grey-blue
      paper: 'rgba(255, 255, 255, 0.7)',
    },
    text: {
      primary: '#212121',
      secondary: '#5F6368',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '50px',
          fontWeight: 600,
          padding: '10px 25px',
          boxShadow: '0 4px 15px rgba(0, 98, 255, 0.2)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(0, 98, 255, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: 'none',
        },
      },
    },
  },
});
