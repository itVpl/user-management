import React from 'react';
import {
  Box,
  List,
  ListItem,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';

const EmailList = ({ 
  emails, 
  loading, 
  selectedEmail, 
  onEmailSelect, 
  onToggleStar,
  formatTimestamp 
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <List sx={{ p: 0 }}>
      {emails.map((email) => (
        <ListItem
          key={email.id}
          onClick={() => onEmailSelect(email)}
          selected={selectedEmail?.id === email.id}
          sx={{
            borderBottom: '1px solid #e8eaed',
            backgroundColor: email.isRead ? 'white' : '#f2f6fc',
            cursor: 'pointer',
            '&:hover': { backgroundColor: '#f1f3f4' },
            '&.Mui-selected': { backgroundColor: '#c2dbff' },
            py: 1.5,
            px: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(email.id);
              }}
              sx={{ p: 0.5 }}
            >
              {email.isStarred ? 
                <StarIcon sx={{ fontSize: 20, color: '#fbbc04' }} /> : 
                <StarBorderIcon sx={{ fontSize: 20, color: '#5f6368' }} />
              }
            </IconButton>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: email.isRead ? 400 : 600, 
                    color: email.isRead ? '#5f6368' : '#202124',
                    minWidth: 180,
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {email.fromName}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: email.isRead ? 400 : 600, 
                    color: email.isRead ? '#5f6368' : '#202124', 
                    flexGrow: 1,
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap'
                  }}
                >
                  {email.subject}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  {email.attachments?.length > 0 && (
                    <AttachFileIcon sx={{ fontSize: 16, color: '#5f6368' }} />
                  )}
                  <Typography variant="caption" sx={{ color: '#5f6368', minWidth: 50, textAlign: 'right' }}>
                    {formatTimestamp(email.timestamp)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </ListItem>
      ))}
    </List>
  );
};

export default EmailList;
