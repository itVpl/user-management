import React from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon, Email as EmailIcon } from '@mui/icons-material';

const TestConnectionDialog = ({
  open,
  onClose,
  testLoading,
  testSuccess,
  testError,
  createdAccountId
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 500, color: '#202124' }}>
          Test Email Connection
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <DeleteIcon sx={{ fontSize: 20, color: '#5f6368' }} />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 3 }}>
        {testSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Email connection test successful!
          </Alert>
        )}
        {testError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {testError}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', py: 3 }}>
          {testLoading ? (
            <>
              <CircularProgress size={48} sx={{ color: '#1a73e8', mb: 2 }} />
              <Typography variant="body1" sx={{ color: '#202124', textAlign: 'center' }}>
                Testing email connection...
              </Typography>
              <Typography variant="caption" sx={{ color: '#5f6368', textAlign: 'center' }}>
                Please wait
              </Typography>
            </>
          ) : createdAccountId ? (
            <>
              <EmailIcon sx={{ fontSize: 48, color: '#1a73e8', mb: 1 }} />
              <Typography variant="body1" sx={{ color: '#202124', textAlign: 'center' }}>
                Testing your email connection
              </Typography>
              <Typography variant="caption" sx={{ color: '#5f6368', textAlign: 'center' }}>
                Account ID: {createdAccountId}
              </Typography>
            </>
          ) : (
            <>
              <EmailIcon sx={{ fontSize: 48, color: '#9e9e9e', mb: 1, opacity: 0.5 }} />
              <Typography variant="body1" sx={{ color: '#5f6368', textAlign: 'center' }}>
                No email account found
              </Typography>
              <Typography variant="caption" sx={{ color: '#9e9e9e', textAlign: 'center' }}>
                Please create an email account first
              </Typography>
            </>
          )}
        </Box>
      </DialogContent>
      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'center' }}>
        <Button 
          onClick={onClose} 
          variant="contained"
          sx={{ 
            backgroundColor: '#1a73e8', 
            color: 'white',
            textTransform: 'none', 
            fontWeight: 500,
            px: 4,
            '&:hover': { backgroundColor: '#1557b0' }
          }}
        >
          Close
        </Button>
      </Box>
    </Dialog>
  );
};

export default TestConnectionDialog;
