import React from 'react';
import {
  Box,
  List,
  ListItem,
  Typography,
  IconButton,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';

// Group emails by date
const getDateGroup = (timestamp) => {
  const now = new Date();
  const emailDate = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const emailDay = new Date(emailDate.getFullYear(), emailDate.getMonth(), emailDate.getDate());
  const daysDiff = Math.floor((today - emailDay) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    return 'Today';
  } else if (daysDiff === 1) {
    return 'Yesterday';
  } else if (daysDiff < 7) {
    return 'This Week';
  } else if (daysDiff < 30) {
    return 'This Month';
  } else {
    return 'Older';
  }
};

// Group emails by date
const groupEmailsByDate = (emailList) => {
  const grouped = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'This Month': [],
    'Older': []
  };

  emailList.forEach(email => {
    const group = getDateGroup(email.timestamp);
    if (grouped[group]) {
      grouped[group].push(email);
    }
  });

  // Return groups in order with their emails
  return [
    { label: 'Today', emails: grouped['Today'] },
    { label: 'Yesterday', emails: grouped['Yesterday'] },
    { label: 'This Week', emails: grouped['This Week'] },
    { label: 'This Month', emails: grouped['This Month'] },
    { label: 'Older', emails: grouped['Older'] }
  ].filter(group => group.emails.length > 0);
};

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

  const groupedEmails = groupEmailsByDate(emails);

  return (
    <List sx={{ p: 0 }}>
      {groupedEmails.map((group) => (
        <React.Fragment key={group.label}>
          {/* Date Header */}
          <Box
            sx={{
              px: 2,
              py: 1,
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #e0e0e0',
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: '#5f6368',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.5px'
              }}
            >
              {group.label}
            </Typography>
          </Box>
          {/* Emails in this group */}
          {group.emails.map((email, emailIndex) => {
            // Use UID as primary identifier if available, otherwise use ID
            const emailKey = email.uid !== null && email.uid !== undefined && email.uid !== '' 
              ? `uid-${email.uid}` 
              : `id-${email.id}-${emailIndex}`;
            
            // Compare using UID if both have it, otherwise use ID
            const isSelected = email.uid !== null && email.uid !== undefined && email.uid !== '' && selectedEmail?.uid !== null && selectedEmail?.uid !== undefined && selectedEmail?.uid !== ''
              ? selectedEmail.uid === email.uid
              : selectedEmail?.id === email.id;
            
            return (
            <ListItem
              key={emailKey}
              onClick={() => onEmailSelect(email)}
              selected={isSelected}
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
            );
          })}
        </React.Fragment>
      ))}
    </List>
  );
};

export default EmailList;
