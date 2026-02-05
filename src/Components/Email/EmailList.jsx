import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  Typography,
  IconButton,
  CircularProgress,
  Divider,
  Checkbox,
  Avatar,
  Chip,
  Button,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AttachFile as AttachFileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  TableChart as ExcelIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';

// Get file type icon component based on contentType or filename
const getFileIconComponent = (attachment) => {
  const contentType = attachment.contentType?.toLowerCase() || '';
  const filename = attachment.filename?.toLowerCase() || '';
  
  if (contentType.includes('pdf') || filename.endsWith('.pdf')) {
    return PdfIcon;
  }
  if (contentType.includes('image') || attachment.isImage || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filename)) {
    return ImageIcon;
  }
  if (contentType.includes('excel') || contentType.includes('spreadsheet') || /\.(xls|xlsx|csv)$/i.test(filename)) {
    return ExcelIcon;
  }
  if (contentType.includes('word') || /\.(doc|docx)$/i.test(filename)) {
    return DocumentIcon;
  }
  return FileIcon;
};

// Get file icon color based on file type
const getFileIconColor = (attachment) => {
  const contentType = attachment.contentType?.toLowerCase() || '';
  const filename = attachment.filename?.toLowerCase() || '';
  
  if (contentType.includes('pdf') || filename.endsWith('.pdf')) {
    return '#ea4335'; // Red for PDF
  }
  if (contentType.includes('image') || attachment.isImage || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filename)) {
    return '#4285f4'; // Blue for images
  }
  if (contentType.includes('excel') || contentType.includes('spreadsheet') || /\.(xls|xlsx|csv)$/i.test(filename)) {
    return '#34a853'; // Green for Excel
  }
  if (contentType.includes('word') || /\.(doc|docx)$/i.test(filename)) {
    return '#4285f4'; // Blue for Word
  }
  return '#5f6368'; // Grey for other files
};

// Get initials from name or email
const getInitials = (name, email) => {
  if (name && name !== email) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return '?';
};

// Get avatar color based on name/email
const getAvatarColor = (name, email) => {
  const str = name || email || '';
  const colors = [
    '#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#4285f4',
    '#9c27b0', '#00bcd4', '#ff9800', '#e91e63', '#009688'
  ];
  const index = str.charCodeAt(0) % colors.length;
  return colors[index];
};

// Truncate filename for display
const truncateFilename = (filename, maxLength = 25) => {
  if (!filename) return '';
  if (filename.length <= maxLength) return filename;
  return filename.substring(0, maxLength) + '...';
};

// Group emails by date
const getDateGroup = (timestamp) => {
  if (!timestamp) {
    return 'Older';
  }
  
  const now = new Date();
  const emailDate = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  // Validate date
  if (isNaN(emailDate.getTime())) {
    console.warn('getDateGroup: Invalid timestamp:', timestamp);
    return 'Older';
  }
  
  // Get today's date at midnight (without time)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const emailDay = new Date(emailDate.getFullYear(), emailDate.getMonth(), emailDate.getDate());
  
  // Calculate difference in days
  const daysDiff = Math.floor((today - emailDay) / (1000 * 60 * 60 * 24));

  // Handle future dates (shouldn't happen, but handle gracefully)
  if (daysDiff < 0) {
    return 'Today'; // Treat future dates as today
  }

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

  // Sort emails within each group by timestamp (newest first)
  Object.keys(grouped).forEach(groupKey => {
    grouped[groupKey].sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      
      // Handle invalid dates
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      // Sort descending (newest first)
      return dateB.getTime() - dateA.getTime();
    });
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
  loadingMore,
  hasMore,
  onLoadMore,
  selectedEmail, 
  onEmailSelect, 
  onToggleStar,
  formatTimestamp,
  userEmail = '' // User's email address to show "me" instead
}) => {
  const scrollContainerRef = useRef(null);
  const loadingTriggerRef = useRef(null);
  const [selectedEmails, setSelectedEmails] = useState(new Set());

  // Infinite scroll handler
  useEffect(() => {
    if (!onLoadMore || loadingMore || !hasMore) return;

    // Find the scrollable parent container
    const findScrollContainer = (element) => {
      if (!element) return null;
      const style = window.getComputedStyle(element);
      if (style.overflow === 'auto' || style.overflowY === 'auto' || style.overflow === 'scroll' || style.overflowY === 'scroll') {
        return element;
      }
      return findScrollContainer(element.parentElement);
    };

    const scrollContainer = findScrollContainer(scrollContainerRef.current);
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Trigger load more when user scrolls to within 500px of bottom (more aggressive)
      // Also trigger if we're already at the bottom (scrollHeight - scrollTop - clientHeight <= 10)
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceFromBottom < 500 || distanceFromBottom <= 10) {
        onLoadMore();
      }
    };
    
    // Also check on mount if we're already near the bottom (e.g., if there are few emails)
    const checkInitialScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceFromBottom < 500) {
        // Small delay to avoid immediate trigger
        setTimeout(() => {
          if (hasMore && !loadingMore) {
            onLoadMore();
          }
        }, 500);
      }
    };
    
    // Check initial scroll position after a short delay
    setTimeout(checkInitialScroll, 1000);

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [onLoadMore, loadingMore, hasMore, emails.length]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const groupedEmails = groupEmailsByDate(emails);

  return (
    <List ref={scrollContainerRef} sx={{ p: 0, backgroundColor: 'white' }}>
      {groupedEmails.map((group) => (
        <React.Fragment key={group.label}>
          {/* Date Header - Gmail style */}
          <Box
            sx={{
              px: 3,
              py: 1.5,
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
                fontWeight: 500,
                color: '#5f6368',
                fontSize: '0.8125rem',
                letterSpacing: '0.2px'
              }}
            >
              {group.label.toUpperCase()}
            </Typography>
          </Box>
          {/* Emails in this group */}
          {group.emails.map((email, emailIndex) => {
            // Debug: Log attachment data for first email in each group
            if (emailIndex === 0 && group.label === 'Today') {
              console.log('EmailList - First email attachments:', {
                subject: email.subject,
                hasAttachments: email.hasAttachments,
                attachmentCount: email.attachmentCount,
                attachments: email.attachments,
                attachmentsLength: email.attachments?.length
              });
            }
            
            // Use UID as primary identifier if available, otherwise use ID
            const emailKey = email.uid !== null && email.uid !== undefined && email.uid !== '' 
              ? `uid-${email.uid}` 
              : `id-${email.id}-${emailIndex}`;
            
            // Compare using UID if both have it, otherwise use ID
            const isSelected = email.uid !== null && email.uid !== undefined && email.uid !== '' && selectedEmail?.uid !== null && selectedEmail?.uid !== undefined && selectedEmail?.uid !== ''
              ? selectedEmail.uid === email.uid
              : selectedEmail?.id === email.id;
            
            const isEmailSelected = selectedEmails.has(email.id || emailKey);
            // For sent emails, show recipient's initial; for inbox, show sender's initial
            const displayName = email.folder === 'sent' ? email.to : email.fromName;
            const displayEmail = email.folder === 'sent' ? email.to : email.from;
            const avatarColor = getAvatarColor(displayName, displayEmail);
            const initials = getInitials(displayName, displayEmail);
            
            return (
            <ListItem
              key={emailKey}
              onClick={() => onEmailSelect(email)}
              selected={isSelected}
              sx={{
                borderBottom: '1px solid #e8eaed',
                backgroundColor: 'white',
                cursor: 'pointer',
                '&:hover': { 
                  backgroundColor: '#f5f5f5',
                  boxShadow: 'inset 1px 0 0 #dadce0, inset -1px 0 0 #dadce0',
                  '& .star-icon': {
                    opacity: '1 !important'
                  }
                },
                '&.Mui-selected': { 
                  backgroundColor: '#f2f6fc',
                  boxShadow: 'inset 1px 0 0 #1a73e8, inset -1px 0 0 #dadce0'
                },
                py: 0,
                px: 0,
                minHeight: 48,
                transition: 'background-color 0.1s'
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                width: '100%', 
                gap: 0,
                px: 1,
                py: 0.5
              }}>
                {/* Checkbox - Gmail style */}
                <Checkbox
                  size="small"
                  checked={isEmailSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSelectedEmails(prev => {
                      const newSet = new Set(prev);
                      if (e.target.checked) {
                        newSet.add(email.id || emailKey);
                      } else {
                        newSet.delete(email.id || emailKey);
                      }
                      return newSet;
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    p: 0.5,
                    color: '#5f6368',
                    '&.Mui-checked': {
                      color: '#1a73e8'
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.04)'
                    }
                  }}
                />
                
                {/* Star Icon - Gmail style (shows on hover) */}
                <Box
                  sx={{
                    position: 'relative',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 0.5
                  }}
                  onMouseEnter={(e) => {
                    const icon = e.currentTarget.querySelector('.star-icon');
                    if (icon) icon.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const icon = e.currentTarget.querySelector('.star-icon');
                    if (icon && !email.isStarred) icon.style.opacity = '0';
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(email.id);
                    }}
                    sx={{ 
                      p: 0.5,
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.04)'
                      }
                    }}
                  >
                    {email.isStarred ? 
                      <StarIcon sx={{ fontSize: 18, color: '#fbbc04' }} /> : 
                      <StarBorderIcon 
                        className="star-icon"
                        sx={{ 
                          fontSize: 18, 
                          color: '#5f6368', 
                          opacity: email.isStarred ? 1 : 0,
                          transition: 'opacity 0.2s'
                        }} 
                      />
                    }
                  </IconButton>
                </Box>
                
                {/* Sender Avatar */}
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: avatarColor,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mr: 1.5,
                    flexShrink: 0
                  }}
                >
                  {initials}
                </Avatar>
                
                {/* Email Content */}
                <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Sender/Recipient Name - Show thread count if it's a thread */}
                  <Box
                    sx={{ 
                      fontWeight: email.isRead ? 400 : 600, 
                      color: '#202124',
                      minWidth: 200,
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <Typography 
                      component="span"
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'inherit',
                        color: 'inherit',
                        fontSize: 'inherit',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      {(() => {
                        // For threads, show all participants like Gmail: "me, abhishek"
                        if (email.isThread && email.participants && email.participants.length > 0) {
                          // Format participants: replace user's email with "me"
                          const formattedParticipants = email.participants
                            .slice(0, 3) // Show max 3 participants
                            .map(p => {
                              // Check if this participant is the user
                              if (userEmail) {
                                const pLower = p.toLowerCase();
                                const userEmailLower = userEmail.toLowerCase();
                                
                                // If participant matches user's email or name, show "me"
                                if (pLower === userEmailLower || 
                                    pLower.includes(userEmailLower) ||
                                    userEmailLower.includes(pLower.split('@')[0])) {
                                  return 'me';
                                }
                              }
                              
                              // Extract first name from full name (remove quotes, extract first word)
                              let displayName = p.replace(/^["']|["']$/g, '').trim();
                              
                              // If it's an email, extract the name part before @
                              if (displayName.includes('@')) {
                                displayName = displayName.split('@')[0];
                              }
                              
                              // Extract first name (first word)
                              const firstName = displayName.split(' ')[0] || displayName.split('<')[0] || displayName;
                              
                              // Return lowercase first name
                              return firstName.toLowerCase();
                            })
                            .filter((p, i, arr) => arr.indexOf(p) === i) // Remove duplicates
                            .filter(p => p !== ''); // Remove empty strings
                          
                          // Join with commas: "me, abhishek"
                          return formattedParticipants.length > 0 
                            ? formattedParticipants.join(', ')
                            : (email.folder === 'sent' ? (email.to || 'Recipient') : email.fromName);
                        }
                        
                        // For single emails, show sender/recipient
                        return email.folder === 'sent' ? (email.to || 'Recipient') : email.fromName;
                      })()}
                    </Typography>
                    {email.isThread && email.messageCount > 1 && (
                      <Chip 
                        label={email.messageCount} 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: '#e8f0fe',
                          color: '#1a73e8',
                          minWidth: 24,
                          flexShrink: 0,
                          '& .MuiChip-label': { px: 0.75 }
                        }} 
                      />
                    )}
                  </Box>
                  
                  {/* Subject and Preview */}
                  <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: email.isRead ? 400 : 600, 
                          color: '#202124',
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          fontSize: '0.875rem'
                        }}
                      >
                        {email.subject || '(No Subject)'}
                      </Typography>
                      {(email.contentPreview || email.body) && (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#5f6368',
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            fontSize: '0.8125rem',
                            display: { xs: 'none', md: 'block' }
                          }}
                        >
                          - {(email.contentPreview || email.body || '').substring(0, 50)}
                        </Typography>
                      )}
                    </Box>
                    
                    {/* Attachments - Gmail style chips */}
                    {(() => {
                      // Debug attachment display logic
                      const hasAttachmentsArray = email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0;
                      const hasAttachmentsFlag = email.hasAttachments === true;
                      const shouldShow = hasAttachmentsArray || hasAttachmentsFlag;
                      
                      if (emailIndex === 0 && group.label === 'Today') {
                        console.log('Attachment display check:', {
                          subject: email.subject,
                          hasAttachmentsArray,
                          hasAttachmentsFlag,
                          shouldShow,
                          attachments: email.attachments,
                          attachmentCount: email.attachmentCount
                        });
                      }
                      
                      return shouldShow;
                    })() ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', mt: 0.25 }}>
                        {email.attachments && email.attachments.length > 0 ? (
                          <>
                            {email.attachments.slice(0, 5).map((attachment, attIndex) => {
                              const IconComponent = getFileIconComponent(attachment);
                              const iconColor = getFileIconColor(attachment);
                              return (
                                <Chip
                                  key={attIndex}
                                  icon={<IconComponent sx={{ fontSize: 16, color: iconColor }} />}
                                  label={truncateFilename(attachment.filename || `Attachment ${attIndex + 1}`, 20)}
                                  size="small"
                                  sx={{
                                    height: 24,
                                    fontSize: '0.75rem',
                                    backgroundColor: '#f1f3f4',
                                    color: '#202124',
                                    border: 'none',
                                    '& .MuiChip-icon': {
                                      marginLeft: '6px',
                                      marginRight: '-4px'
                                    },
                                    '& .MuiChip-label': {
                                      paddingLeft: '8px',
                                      paddingRight: '8px',
                                      fontWeight: 400
                                    },
                                    '&:hover': {
                                      backgroundColor: '#e8eaed'
                                    }
                                  }}
                                />
                              );
                            })}
                            {email.attachments.length > 5 && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: '#5f6368',
                                  fontSize: '0.75rem',
                                  ml: 0.5
                                }}
                              >
                                +{email.attachments.length - 5} more
                              </Typography>
                            )}
                          </>
                        ) : (
                          // Fallback: Show paperclip icon if hasAttachments is true but no attachment details
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AttachFileIcon sx={{ fontSize: 16, color: '#5f6368' }} />
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: '#5f6368',
                                fontSize: '0.75rem'
                              }}
                            >
                              {email.attachmentCount || 1} attachment{email.attachmentCount !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ) : null}
                  </Box>
                  
                  {/* Time */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, minWidth: 100 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#5f6368', 
                        minWidth: 60, 
                        textAlign: 'right',
                        fontSize: '0.8125rem',
                        fontWeight: email.isRead ? 400 : 500
                      }}
                    >
                      {formatTimestamp(email.timestamp)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </ListItem>
            );
          })}
        </React.Fragment>
      ))}
      
      {/* Loading more indicator */}
      {loadingMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      
      {/* Load More button (fallback if scroll doesn't trigger) */}
      {hasMore && !loadingMore && emails.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onLoadMore}
            sx={{
              textTransform: 'none',
              color: '#1967d2',
              borderColor: '#dadce0',
              '&:hover': {
                borderColor: '#1967d2',
                backgroundColor: '#f8f9fa'
              }
            }}
          >
            Load More Emails
          </Button>
        </Box>
      )}
      
      {/* End of list indicator */}
      {!hasMore && emails.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Typography variant="caption" sx={{ color: '#5f6368' }}>
            No more emails to load ({emails.length} {emails.length === 1 ? 'email' : 'emails'} loaded)
          </Typography>
        </Box>
      )}
    </List>
  );
};

export default EmailList;
