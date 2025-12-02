import React from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

const CreateAccountDialog = ({
  open,
  onClose,
  accountData,
  setAccountData,
  handleCreateAccount,
  createLoading,
  createSuccess,
  createError,
  createdAccountId
}) => {
  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason !== 'backdropClick') {
          onClose();
        }
      }}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={false}
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 500, color: '#202124' }}>
          Create Email Account
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <DeleteIcon sx={{ fontSize: 20, color: '#5f6368' }} />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 3 }}>
        {createSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Email account created successfully!
              </Typography>
              {createdAccountId && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                  Account ID: {createdAccountId}
                </Typography>
              )}
            </Box>
          </Alert>
        )}
        {createError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {createError}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email Address"
            value={accountData.email}
            onChange={(e) => setAccountData(prev => ({ ...prev, email: e.target.value }))}
            fullWidth
            required
            placeholder="example@gmail.com"
            variant="outlined"
            autoComplete="off"
          />
          <TextField
            label="App Password"
            value={accountData.appPassword}
            onChange={(e) => setAccountData(prev => ({ ...prev, appPassword: e.target.value }))}
            fullWidth
            required
            placeholder="xxxx xxxx xxxx xxxx"
            variant="outlined"
            helperText="Generate app password from your email provider settings"
            autoComplete="off"
          />
          <TextField
            label="Display Name"
            value={accountData.displayName}
            onChange={(e) => setAccountData(prev => ({ ...prev, displayName: e.target.value }))}
            fullWidth
            required
            placeholder="John Doe"
            variant="outlined"
            autoComplete="off"
          />
          <TextField
            label="Notes"
            value={accountData.notes}
            onChange={(e) => setAccountData(prev => ({ ...prev, notes: e.target.value }))}
            fullWidth
            multiline
            rows={3}
            placeholder="Work email account"
            variant="outlined"
            autoComplete="off"
          />
        </Box>
      </DialogContent>
      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          onClick={handleCreateAccount}
          disabled={!accountData.email || !accountData.appPassword || !accountData.displayName || createLoading}
          sx={{ backgroundColor: '#1a73e8', textTransform: 'none', fontWeight: 500, px: 3 }}
        >
          {createLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Create Account'}
        </Button>
        <Button onClick={onClose} sx={{ color: '#5f6368', textTransform: 'none' }}>
          Cancel
        </Button>
      </Box>
    </Dialog>
  );
};

export default CreateAccountDialog;
