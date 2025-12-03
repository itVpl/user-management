import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Divider,
  Tooltip,
  Chip,
  Button,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  MoreVert as MoreVertIcon,
  Print as PrintIcon,
} from '@mui/icons-material';

const EmailViewer = ({ selectedEmail, onToggleStar, onDelete, onClose }) => {
  if (!selectedEmail) return null;

  // Format email body with clickable links
  const formatEmailBody = (body) => {
    if (!body) return null;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = body.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: '#1a73e8', 
              textDecoration: 'none',
              wordBreak: 'break-all',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#e8f0fe',
              padding: '2px 8px',
              borderRadius: '4px',
              margin: '2px 0',
              fontSize: '0.85rem'
            }}
          >
            🔗 {part.length > 50 ? part.substring(0, 50) + '...' : part}
          </a>
        );
      }
      return part;
    });
  };

  // Get avatar color based on sender name
  const getAvatarColor = (name) => {
    const colors = ['#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#9c27b0', '#ff5722'];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#fff',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.05)'
    }}>
      {/* Header - Clean & Modern */}
      <Box sx={{ 
        p: 2.5, 
        borderBottom: '1px solid #e8eaed',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)'
      }}>
        {/* Top Row - Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Tooltip title="Close">
            <IconButton 
              size="small" 
              onClick={onClose}
              sx={{ 
                backgroundColor: '#f1f3f4',
                '&:hover': { backgroundColor: '#e8eaed' }
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={selectedEmail.isStarred ? 'Unstar' : 'Star'}>
              <IconButton size="small" onClick={() => onToggleStar(selectedEmail.id)}>
                {selectedEmail.isStarred ? 
                  <StarIcon sx={{ color: '#fbbc04', fontSize: 20 }} /> : 
                  <StarBorderIcon sx={{ fontSize: 20, color: '#5f6368' }} />
                }
              </IconButton>
            </Tooltip>
            <Tooltip title="Print">
              <IconButton size="small">
                <PrintIcon sx={{ fontSize: 20, color: '#5f6368' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" onClick={() => onDelete(selectedEmail.id)}>
                <DeleteIcon sx={{ fontSize: 20, color: '#5f6368' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Subject */}
        <Typography variant="h5" sx={{ 
          fontWeight: 400, 
          color: '#202124', 
          mb: 2.5,
          lineHeight: 1.4,
          fontSize: '1.375rem'
        }}>
          {selectedEmail.subject}
        </Typography>

        {/* Sender Card */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: 2,
          p: 2,
          backgroundColor: '#fff',
          borderRadius: 2,
          border: '1px solid #e8eaed'
        }}>
          <Avatar sx={{ 
            width: 48, 
            height: 48, 
            bgcolor: getAvatarColor(selectedEmail.fromName),
            fontSize: '1.25rem',
            fontWeight: 500
          }}>
            {selectedEmail.fromName?.charAt(1)?.toUpperCase() || selectedEmail.fromName?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#202124' }}>
                {selectedEmail.fromName}
              </Typography>
              <Chip 
                label="Inbox" 
                size="small" 
                sx={{ 
                  height: 20, 
                  fontSize: '0.7rem',
                  backgroundColor: '#e8f0fe',
                  color: '#1a73e8'
                }} 
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#5f6368', mb: 0.5 }}>
              {selectedEmail.from}
            </Typography>
            <Typography variant="caption" sx={{ color: '#80868b' }}>
              To: me • {selectedEmail.timestamp ? new Date(selectedEmail.timestamp).toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit', 
                minute: '2-digit'
              }) : ''}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Email Body - Clean Design */}
      <Box sx={{ 
        p: 3, 
        flexGrow: 1, 
        overflow: 'auto', 
        backgroundColor: '#fff'
      }}>
        <Box sx={{ 
          maxWidth: 800,
          mx: 'auto',
          p: 3,
          backgroundColor: '#fafafa',
          borderRadius: 2,
          border: '1px solid #e8eaed'
        }}>
          {selectedEmail.html ? (
            <Box
              component="div"
              dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
              sx={{ 
                lineHeight: 1.9, 
                color: '#3c4043',
                fontSize: '0.95rem',
                fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
                wordBreak: 'break-word',
                '& img': {
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 1,
                  margin: '8px 0'
                },
                '& a': {
                  color: '#1a73e8',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                },
                '& p': { margin: '8px 0' }
              }}
            />
          ) : (
            <Typography 
              component="div"
              sx={{ 
                whiteSpace: 'pre-wrap', 
                lineHeight: 1.9, 
                color: '#3c4043',
                fontSize: '0.95rem',
                fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
                wordBreak: 'break-word',
                '& a': {
                  display: 'inline-block',
                  marginTop: '4px',
                  marginBottom: '4px'
                }
              }}
            >
              {formatEmailBody(selectedEmail.body || selectedEmail.content)}
            </Typography>
          )}
        </Box>

        {/* Attachments */}
        {selectedEmail.attachments?.length > 0 && (
          <Box sx={{ mt: 3, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#202124' }}>
              📎 {selectedEmail.attachments.length} Attachment{selectedEmail.attachments.length > 1 ? 's' : ''}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {selectedEmail.attachments.map((att, i) => {
                // Handle both string and object attachments
                const filename = typeof att === 'string' ? att : (att.filename || att.name || `Attachment ${i + 1}`);
                const downloadUrl = att.downloadUrl || att.url || att.link;
                const previewUrl = att.previewUrl || (att.isImage ? downloadUrl : null);
                const isImage = att.isImage || (att.contentType && att.contentType.startsWith('image/'));
                const size = att.size;
                
                const handleAttachmentClick = () => {
                  if (downloadUrl) {
                    // If downloadUrl is relative, make it absolute
                    const fullUrl = downloadUrl.startsWith('http') 
                      ? downloadUrl 
                      : `https://vpl-liveproject-1.onrender.com${downloadUrl}`;
                    window.open(fullUrl, '_blank');
                  }
                };

                return (
                  <Box 
                    key={i} 
                    onClick={handleAttachmentClick}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1.5, 
                      px: 2, 
                      py: 1.5,
                      backgroundColor: '#fff',
                      borderRadius: 2,
                      border: '1px solid #e8eaed',
                      cursor: downloadUrl ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      '&:hover': downloadUrl ? { 
                        backgroundColor: '#e8f0fe', 
                        borderColor: '#1a73e8',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      } : {}
                    }}
                  >
                    {isImage && previewUrl ? (
                      <img 
                        src={previewUrl.startsWith('http') ? previewUrl : `https://vpl-liveproject-1.onrender.com${previewUrl}`}
                        alt={filename}
                        style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4 }}
                      />
                    ) : (
                      <AttachFileIcon sx={{ fontSize: 20, color: '#5f6368' }} />
                    )}
                    <Typography variant="body2" sx={{ color: '#1a73e8', fontWeight: 500 }}>
                      {filename}
                    </Typography>
                    {size && (
                      <Typography variant="caption" sx={{ color: '#80868b' }}>
                        ({(size / 1024).toFixed(1)} KB)
                      </Typography>
                    )}
                    {downloadUrl && <OpenInNewIcon sx={{ fontSize: 14, color: '#80868b' }} />}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>

      {/* Action Buttons - Bottom Bar */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid #e8eaed',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        gap: 1.5
      }}>
        <Button
          variant="outlined"
          startIcon={<ReplyIcon />}
          sx={{ 
            textTransform: 'none',
            borderColor: '#dadce0',
            color: '#3c4043',
            fontWeight: 500,
            '&:hover': { 
              backgroundColor: '#e8f0fe',
              borderColor: '#1a73e8'
            }
          }}
        >
          Reply
        </Button>
        <Button
          variant="outlined"
          startIcon={<ForwardIcon />}
          sx={{ 
            textTransform: 'none',
            borderColor: '#dadce0',
            color: '#3c4043',
            fontWeight: 500,
            '&:hover': { 
              backgroundColor: '#e8f0fe',
              borderColor: '#1a73e8'
            }
          }}
        >
          Forward
        </Button>
      </Box>
    </Box>
  );
};

export default EmailViewer;
