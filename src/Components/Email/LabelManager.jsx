import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Grid,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Label as LabelIcon,
} from '@mui/icons-material';
import { labelService } from './emailLabelService';

// Predefined color palette for labels
const LABEL_COLORS = [
  '#ea4335', '#fbbc04', '#34a853', '#4285f4', '#9c27b0',
  '#00bcd4', '#ff9800', '#e91e63', '#009688', '#795548',
  '#607d8b', '#ff5722', '#3f51b5', '#8bc34a', '#ffc107'
];

const LabelManager = forwardRef(({ emailAccountId, onLabelCreated, onLabelUpdated, onLabelDeleted }, ref) => {
  const [open, setOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [labelData, setLabelData] = useState({
    name: '',
    color: LABEL_COLORS[0],
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const nameInputRef = useRef(null);

  // Expose handleOpen method via ref
  useImperativeHandle(ref, () => ({
    handleOpen: (label = null) => {
      if (label) {
        // Editing existing label
        setEditingLabel(label);
        setLabelData({
          name: label.name || '',
          color: label.color || LABEL_COLORS[0],
          description: label.description || ''
        });
      } else {
        // Creating new label
        setEditingLabel(null);
        setLabelData({
          name: '',
          color: LABEL_COLORS[0],
          description: ''
        });
      }
      setError(null);
      setSuccess(false);
      setOpen(true);
    }
  }));

  // Focus the name input when dialog opens
  useEffect(() => {
    if (open && nameInputRef.current) {
      // Small delay to ensure dialog is fully rendered
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setEditingLabel(null);
    setLabelData({
      name: '',
      color: LABEL_COLORS[0],
      description: ''
    });
    setError(null);
    setSuccess(false);
  };

  const handleChange = (field) => (e) => {
    setLabelData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError(null);
  };

  const handleColorSelect = (color) => {
    setLabelData(prev => ({
      ...prev,
      color
    }));
  };

  const handleSubmit = async () => {
    if (!labelData.name.trim()) {
      setError('Label name is required');
      return;
    }

    if (!emailAccountId) {
      setError('Please select an email account first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const payload = {
        name: labelData.name.trim(),
        color: labelData.color,
        description: labelData.description.trim(),
        emailAccountId
      };

      if (editingLabel) {
        // Update existing label
        await labelService.updateLabel(editingLabel._id, payload);
        setSuccess(true);
        if (onLabelUpdated) {
          onLabelUpdated();
        }
      } else {
        // Create new label
        await labelService.createLabel(payload);
        setSuccess(true);
        if (onLabelCreated) {
          onLabelCreated();
        }
      }

      // Close dialog after a short delay
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      console.error('Error saving label:', err);
      setError(err.message || 'Failed to save label');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingLabel || !window.confirm(`Are you sure you want to delete the label "${editingLabel.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await labelService.deleteLabel(editingLabel._id);
      setSuccess(true);
      if (onLabelDeleted) {
        onLabelDeleted();
      }
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      console.error('Error deleting label:', err);
      setError(err.message || 'Failed to delete label');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEnforceFocus={false}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 2,
        borderBottom: '1px solid #e8eaed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#e8f0fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <LabelIcon sx={{ color: '#1a73e8', fontSize: 22 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            {editingLabel ? 'Edit Label' : 'Create New Label'}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{
            color: '#5f6368',
            '&:hover': { backgroundColor: '#f1f3f4' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
            {editingLabel ? 'Label updated successfully!' : 'Label created successfully!'}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Label Name */}
          <TextField
            inputRef={nameInputRef}
            fullWidth
            label="Label Name"
            placeholder="e.g., Important, Work, Personal"
            value={labelData.name}
            onChange={handleChange('name')}
            variant="outlined"
            required
            disabled={loading}
            autoFocus
            inputProps={{
              autoComplete: 'off',
              'data-testid': 'label-name-input'
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1a73e8'
                  }
                },
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1a73e8',
                    borderWidth: 2
                  }
                },
                '&.Mui-disabled': {
                  backgroundColor: '#f5f5f5'
                }
              },
              '& .MuiInputLabel-root': {
                '&.Mui-focused': {
                  color: '#1a73e8'
                }
              }
            }}
          />

          {/* Color Selection */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#202124' }}>
              Choose Color
            </Typography>
            <Grid container spacing={1.5}>
              {LABEL_COLORS.map((color) => (
                <Grid item key={color}>
                  <Tooltip title={color}>
                    <Box
                      onClick={() => handleColorSelect(color)}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: color,
                        cursor: 'pointer',
                        border: labelData.color === color ? '3px solid #202124' : '2px solid transparent',
                        boxShadow: labelData.color === color 
                          ? '0 2px 8px rgba(0,0,0,0.2)' 
                          : '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }
                      }}
                    />
                  </Tooltip>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: labelData.color,
                  border: '2px solid #e8eaed',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              />
              <Typography variant="caption" sx={{ color: '#5f6368', fontFamily: 'monospace' }}>
                {labelData.color}
              </Typography>
            </Box>
          </Box>

          {/* Description */}
          <TextField
            fullWidth
            label="Description (Optional)"
            placeholder="Add a description for this label"
            value={labelData.description}
            onChange={handleChange('description')}
            variant="outlined"
            multiline
            rows={3}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        px: 3, 
        py: 2.5, 
        borderTop: '1px solid #e8eaed',
        gap: 1.5
      }}>
        {editingLabel && (
          <Button
            onClick={handleDelete}
            color="error"
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              mr: 'auto'
            }}
          >
            Delete
          </Button>
        )}
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            color: '#5f6368'
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !labelData.name.trim()}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a4190 100%)',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
            },
            '&.Mui-disabled': {
              background: '#e0e0e0',
              color: '#9e9e9e'
            }
          }}
        >
          {loading ? 'Saving...' : editingLabel ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

LabelManager.displayName = 'LabelManager';

export default LabelManager;
