import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Star as StarIcon,
} from '@mui/icons-material';

const AccountManagementDialog = ({
  open,
  onClose,
  accounts,
  onSetDefault,
  onDelete,
  onUpdate,
  loading = false,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleMenuOpen = (event, account) => {
    setAnchorEl(event.currentTarget);
    setSelectedAccount(account);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAccount(null);
  };

  const handleSetDefault = async () => {
    if (!selectedAccount) return;
    
    setActionLoading(true);
    setError(null);
    try {
      await onSetDefault(selectedAccount._id);
      handleMenuClose();
    } catch (err) {
      setError(err.message || 'Failed to set default account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;
    
    if (!window.confirm(`Are you sure you want to delete "${selectedAccount.displayName || selectedAccount.email}"?`)) {
      handleMenuClose();
      return;
    }
    
    setActionLoading(true);
    setError(null);
    try {
      await onDelete(selectedAccount._id);
      handleMenuClose();
    } catch (err) {
      setError(err.message || 'Failed to delete account');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Manage Email Accounts
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : accounts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#5f6368' }}>
              No email accounts found. Create one to get started!
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {accounts.map((account, index) => (
              <React.Fragment key={account._id}>
                <ListItem
                  sx={{
                    py: 2,
                    px: 2,
                    '&:hover': { backgroundColor: '#f8f9fa' },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: account.isDefault ? '#1a73e8' : '#5f6368',
                        width: 40,
                        height: 40,
                      }}
                    >
                      {account.email?.charAt(0).toUpperCase() || '?'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {account.displayName || account.email}
                        </Typography>
                        {account.isDefault && (
                          <Chip
                            icon={<StarIcon sx={{ fontSize: 14 }} />}
                            label="Default"
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              bgcolor: '#e8f0fe',
                              color: '#1a73e8',
                              fontWeight: 500,
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
                          {account.email}
                        </Typography>
                        {account.notes && (
                          <Typography variant="caption" sx={{ color: '#9e9e9e', display: 'block', mt: 0.5 }}>
                            {account.notes}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: '#9e9e9e', display: 'block', mt: 0.5 }}>
                          Status: {account.isActive ? 'Active' : 'Inactive'} •{' '}
                          {account.connectionStatus === 'connected'
                            ? 'Connected'
                            : account.connectionStatus === 'not_tested'
                            ? 'Not Tested'
                            : 'Disconnected'}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => handleMenuOpen(e, account)}
                      disabled={actionLoading}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < accounts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            minWidth: 180,
            borderRadius: 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        }}
      >
        {selectedAccount && !selectedAccount.isDefault && (
          <MenuItem onClick={handleSetDefault} disabled={actionLoading}>
            <CheckCircleIcon sx={{ mr: 1.5, fontSize: 20, color: '#1a73e8' }} />
            Set as Default
          </MenuItem>
        )}
        <MenuItem onClick={handleDelete} disabled={actionLoading}>
          <DeleteIcon sx={{ mr: 1.5, fontSize: 20, color: '#d93025' }} />
          Delete Account
        </MenuItem>
      </Menu>
    </Dialog>
  );
};

export default AccountManagementDialog;
