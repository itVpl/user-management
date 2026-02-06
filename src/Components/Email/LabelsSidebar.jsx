import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Label as LabelIcon,
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { labelService } from './emailLabelService';
import LabelManager from './LabelManager';

const LabelsSidebar = ({ emailAccountId, onLabelClick, selectedLabelId }) => {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const labelManagerRef = useRef(null);

  useEffect(() => {
    if (emailAccountId) {
      fetchLabels();
    } else {
      setLabels([]);
      setLoading(false);
    }
  }, [emailAccountId]);

  // Refresh labels periodically (every 30 seconds) to get updated counts
  useEffect(() => {
    if (!emailAccountId) return;
    
    const interval = setInterval(() => {
      fetchLabels();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [emailAccountId]);

  const fetchLabels = async () => {
    try {
      setLoading(true);
      setError(null);
      const labelsData = await labelService.getAllLabels(emailAccountId);
      setLabels(labelsData || []);
    } catch (err) {
      console.error('Error fetching labels:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLabelClick = (labelId) => {
    if (onLabelClick) {
      onLabelClick(labelId);
    }
  };

  const handleCreateLabel = () => {
    if (labelManagerRef.current) {
      labelManagerRef.current.handleOpen();
    }
  };

  const handleEditLabel = (e, label) => {
    e.stopPropagation(); // Prevent label click
    if (labelManagerRef.current) {
      labelManagerRef.current.handleOpen(label);
    }
  };

  const handleLabelCreated = () => {
    fetchLabels(); // Refresh labels list
  };

  const handleLabelUpdated = () => {
    fetchLabels(); // Refresh labels list
  };

  const handleLabelDeleted = () => {
    fetchLabels(); // Refresh labels list
    // Clear selection if deleted label was selected
    if (selectedLabelId && labels.find(l => l._id === selectedLabelId)) {
      if (onLabelClick) {
        onLabelClick(null); // Clear selection
      }
    }
  };

  if (!emailAccountId) {
    return null;
  }

  return (
    <Box sx={{ 
      px: 1, 
      py: 2,
      borderTop: '1px solid #e8eaed',
      maxHeight: 'calc(100vh - 400px)',
      overflow: 'auto'
    }}>
      {/* Labels Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        px: 2,
        mb: 1.5
      }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            color: '#5f6368', 
            fontWeight: 600, 
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          Labels
        </Typography>
        <Tooltip title="Create new label">
          <IconButton
            size="small"
            onClick={handleCreateLabel}
            disabled={!emailAccountId}
            sx={{
              color: '#5f6368',
              '&:hover': {
                backgroundColor: '#f1f3f4',
                color: '#1a73e8'
              },
              '&.Mui-disabled': {
                color: '#9e9e9e'
              }
            }}
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ mb: 1 }} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ color: '#d93025' }}>
            Error loading labels
          </Typography>
        </Box>
      ) : labels.length === 0 ? (
        <Box sx={{ px: 2, py: 2 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#9aa0a6',
              fontSize: '0.75rem',
              fontStyle: 'italic'
            }}
          >
            No labels yet. Create your first label!
          </Typography>
        </Box>
      ) : (
        <List sx={{ p: 0 }}>
          {labels.map((label) => {
            const isSelected = selectedLabelId === label._id;
            return (
              <ListItem
                key={label._id}
                disablePadding
                sx={{ mb: 0.5 }}
                secondaryAction={
                  <Tooltip title="Edit label">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => handleEditLabel(e, label)}
                      sx={{
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        color: '#5f6368',
                        '&:hover': {
                          color: '#1a73e8',
                          backgroundColor: '#e8f0fe'
                        }
                      }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                }
                sx={{
                  '&:hover .MuiListItemSecondaryAction-root': {
                    opacity: 1
                  }
                }}
              >
                <ListItemButton
                  onClick={() => handleLabelClick(label._id)}
                  selected={isSelected}
                  sx={{
                    borderRadius: '0 24px 24px 0',
                    py: 0.75,
                    px: 2,
                    pr: 6, // Make room for edit button
                    minHeight: 40,
                    transition: 'all 0.15s',
                    backgroundColor: isSelected ? '#e8f0fe' : 'transparent',
                    '&:hover': {
                      backgroundColor: isSelected ? '#e8f0fe' : '#f1f3f4'
                    },
                    '&.Mui-selected': {
                      backgroundColor: '#e8f0fe',
                      '&:hover': {
                        backgroundColor: '#e8f0fe'
                      }
                    }
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: label.color || '#667eea',
                      mr: 1.5,
                      flexShrink: 0,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  />
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? '#1a73e8' : '#202124',
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {label.name}
                      </Typography>
                    }
                    secondary={
                      label.emailCount > 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: isSelected ? '#1a73e8' : '#5f6368',
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}
                        >
                          {label.emailCount}
                        </Typography>
                      )
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      )}

      {/* Label Manager Dialog */}
      <LabelManager
        ref={labelManagerRef}
        emailAccountId={emailAccountId}
        onLabelCreated={handleLabelCreated}
        onLabelUpdated={handleLabelUpdated}
        onLabelDeleted={handleLabelDeleted}
      />
    </Box>
  );
};

export default LabelsSidebar;
