import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
  Typography,
  Divider,
} from '@mui/material';
import {
  Label as LabelIcon,
  Add as AddIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { labelService } from './emailLabelService';

const LabelActions = ({ email, folder, emailAccountId, onUpdate }) => {
  const [availableLabels, setAvailableLabels] = useState([]);
  const [emailLabels, setEmailLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLabels, setFetchingLabels] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    if (email?.uid && emailAccountId) {
      fetchAvailableLabels();
      fetchEmailLabels();
    }
  }, [email?.uid, emailAccountId]);

  const fetchAvailableLabels = async () => {
    try {
      setFetchingLabels(true);
      const labels = await labelService.getAllLabels(emailAccountId);
      setAvailableLabels(labels || []);
    } catch (error) {
      console.error('Error fetching available labels:', error);
    } finally {
      setFetchingLabels(false);
    }
  };

  const fetchEmailLabels = async () => {
    try {
      const labels = await labelService.getEmailLabels(
        email.uid,
        folder,
        emailAccountId
      );
      setEmailLabels(labels || []);
    } catch (error) {
      console.error('Error fetching email labels:', error);
      // Fallback to labels from email object
      setEmailLabels(email?.labels || []);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const addLabel = async (labelId) => {
    try {
      setLoading(true);
      const updatedLabels = await labelService.addLabelsToEmail(
        email.uid,
        folder,
        [labelId],
        emailAccountId
      );
      setEmailLabels(updatedLabels || []);
      handleMenuClose();
      if (onUpdate) {
        onUpdate(); // Refresh email list/viewer
      }
    } catch (error) {
      console.error('Error adding label:', error);
      alert('Failed to add label: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const removeLabel = async (labelId) => {
    try {
      setLoading(true);
      const updatedLabels = await labelService.removeLabelsFromEmail(
        email.uid,
        folder,
        [labelId],
        emailAccountId
      );
      setEmailLabels(updatedLabels || []);
      if (onUpdate) {
        onUpdate(); // Refresh email list/viewer
      }
    } catch (error) {
      console.error('Error removing label:', error);
      alert('Failed to remove label: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Get labels that are not yet applied to this email
  const unappliedLabels = availableLabels.filter(
    label => !emailLabels.some(el => el.id === label._id || el._id === label._id)
  );

  // Check if a label is applied
  const isLabelApplied = (labelId) => {
    return emailLabels.some(el => el.id === labelId || el._id === labelId);
  };

  if (!email?.uid || !emailAccountId) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      {/* Current Labels */}
      {emailLabels.length > 0 && (
        <>
          {emailLabels.map((label) => (
            <Chip
              key={label.id || label._id}
              label={label.name}
              size="small"
              onDelete={() => removeLabel(label.id || label._id)}
              disabled={loading}
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: label.color || '#667eea',
                color: '#ffffff',
                borderRadius: 1.5,
                '& .MuiChip-deleteIcon': {
                  color: '#ffffff',
                  fontSize: 16,
                  '&:hover': {
                    color: '#ffebee'
                  }
                },
                '& .MuiChip-label': {
                  px: 1
                }
              }}
            />
          ))}
        </>
      )}

      {/* Add Label Button */}
      {unappliedLabels.length > 0 && (
        <>
          <Tooltip title="Add label">
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              disabled={loading || fetchingLabels}
              sx={{
                border: '1px dashed #dadce0',
                borderRadius: 1.5,
                width: 32,
                height: 24,
                '&:hover': {
                  borderColor: '#1a73e8',
                  backgroundColor: '#e8f0fe'
                },
                '&.Mui-disabled': {
                  borderColor: '#e0e0e0',
                  opacity: 0.5
                }
              }}
            >
              {loading || fetchingLabels ? (
                <CircularProgress size={14} />
              ) : (
                <AddIcon sx={{ fontSize: 14, color: '#5f6368' }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Label Selection Menu */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
                maxHeight: 300,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#202124', fontSize: '0.875rem' }}>
                Add Label
              </Typography>
            </Box>
            <Divider />
            {unappliedLabels.map((label) => (
              <MenuItem
                key={label._id}
                onClick={() => addLabel(label._id)}
                disabled={loading}
                sx={{
                  py: 1,
                  px: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  '&:hover': {
                    backgroundColor: '#f1f3f4'
                  }
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: label.color || '#667eea',
                    flexShrink: 0
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    fontSize: '0.875rem',
                    color: '#202124'
                  }}
                >
                  {label.name}
                </Typography>
                {label.emailCount > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#5f6368',
                      fontSize: '0.75rem'
                    }}
                  >
                    ({label.emailCount})
                  </Typography>
                )}
              </MenuItem>
            ))}
            {unappliedLabels.length === 0 && (
              <MenuItem disabled>
                <Typography variant="body2" sx={{ color: '#9aa0a6', fontStyle: 'italic' }}>
                  No labels available
                </Typography>
              </MenuItem>
            )}
          </Menu>
        </>
      )}

      {/* Show message if no labels available */}
      {availableLabels.length === 0 && (
        <Typography variant="caption" sx={{ color: '#9aa0a6', fontSize: '0.75rem' }}>
          No labels available. Create one first!
        </Typography>
      )}
    </Box>
  );
};

export default LabelActions;
