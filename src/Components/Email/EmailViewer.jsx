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
  Reply as ReplyIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import API_CONFIG from '../../config/api';

const EmailViewer = ({ selectedEmail, onToggleStar, onDelete, onClose, onReply, emailAccountId, folder, emailAccounts = [] }) => {
  if (!selectedEmail) return null;

  // Get authentication token
  const getAuthToken = () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token") || 
           sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  };

  // Helper: Convert base64 to Blob
  const base64ToBlob = (base64, contentType) => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: contentType || 'application/octet-stream' });
    } catch (error) {
      console.error('Error converting base64 to blob:', error);
      throw new Error('Failed to decode attachment content');
    }
  };

  // Helper: Trigger browser download
  const triggerDownload = (blob, filename) => {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  };

  // Download attachment with authentication
  const downloadAttachment = async (attachment, message) => {
    try {
      // ✅ Priority 1: Use content directly if available (INSTANT DOWNLOAD)
      if (attachment.hasContent && attachment.content) {
        console.log('📥 Downloading from API response content (instant):', {
          filename: attachment.filename || attachment.name,
          contentType: attachment.contentType,
          contentLength: attachment.content.length,
          size: attachment.size
        });
        
        try {
          const blob = base64ToBlob(attachment.content, attachment.contentType);
          const filename = attachment.filename || attachment.name || 'attachment';
          triggerDownload(blob, filename);
          
          console.log('✅ Downloaded instantly from API response:', filename);
          return;
        } catch (error) {
          console.error('❌ Failed to decode base64 content, falling back to URL:', error);
          // Fall through to URL download
        }
      }
      
      // ✅ Priority 2: Check if content is too large
      if (attachment.contentTooLarge) {
        console.log('⚠️ Attachment too large for instant download, using download URL:', {
          filename: attachment.filename || attachment.name,
          size: attachment.size,
          maxSize: attachment.maxSize || 5242880
        });
      } else if (!attachment.hasContent) {
        console.log('📥 Content not in response, fetching from download URL');
      }
      
      // ✅ Priority 3: Fallback to download URL
      let downloadUrl = attachment.downloadUrl || attachment.url || attachment.link;
      
      // If no downloadUrl, construct it from message UID and attachment index
      if (!downloadUrl && message?.uid !== undefined && attachment?.index !== undefined) {
        const messageUid = message.uid;
        const attachmentIndex = attachment.index;
        const accountId = emailAccountId || sessionStorage.getItem('emailAccountId');
        const messageFolder = folder || message.folder || 'INBOX';
        
        if (accountId && messageUid !== undefined && attachmentIndex !== undefined) {
          downloadUrl = `/api/v1/email-inbox/${messageUid}/attachment/${attachmentIndex}?emailAccountId=${accountId}&folder=${messageFolder}`;
        } else {
          console.error('Cannot construct download URL - missing required fields:', {
            messageUid,
            attachmentIndex,
            accountId,
            messageFolder
          });
          alert('Cannot download: Missing required information (UID, account ID, or folder)');
          return;
        }
      }
      
      if (!downloadUrl) {
        console.error('No download URL found for attachment:', attachment);
        alert('Download URL not available for this attachment');
        return;
      }

      // Ensure downloadUrl has required query parameters
      const accountId = emailAccountId || sessionStorage.getItem('emailAccountId');
      const messageFolder = folder || message?.folder || 'INBOX';
      
      let fullUrl;
      if (downloadUrl.startsWith('http')) {
        // Absolute URL - parse and add parameters
        const urlObj = new URL(downloadUrl);
        if (accountId && !urlObj.searchParams.has('emailAccountId')) {
          urlObj.searchParams.set('emailAccountId', accountId);
        }
        if (messageFolder && !urlObj.searchParams.has('folder')) {
          urlObj.searchParams.set('folder', messageFolder);
        }
        fullUrl = urlObj.toString();
      } else {
        // Relative URL - construct with base URL
        const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, ''); // Remove trailing slash
        const relativePath = downloadUrl.startsWith('/') ? downloadUrl : `/${downloadUrl}`;
        const urlObj = new URL(`${baseUrl}${relativePath}`);
        
        // Add/update required parameters
        if (accountId) {
          urlObj.searchParams.set('emailAccountId', accountId);
        }
        if (messageFolder) {
          urlObj.searchParams.set('folder', messageFolder);
        }
        fullUrl = urlObj.toString();
      }

      console.log('📥 Downloading attachment:', {
        filename: attachment.filename || attachment.name,
        downloadUrl: fullUrl,
        accountId,
        folder: messageFolder,
        messageUid: message?.uid,
        attachmentIndex: attachment.index,
        attachmentMetadata: {
          contentType: attachment.contentType,
          size: attachment.size,
          isImage: attachment.isImage
        }
      });
      
      console.log('💡 Tip: Check backend server logs for detailed attachment fetch information');

      const token = getAuthToken();
      if (!token) {
        alert('Please login to download attachments');
        return;
      }

      // Fetch the file with authentication
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = `Failed to download: ${response.status} ${response.statusText}`;
        
        // Try to parse error message from response
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            if (errorData?.message) {
              errorMessage = errorData.message;
            }
          } else {
            const errorText = await response.text();
            if (errorText) {
              try {
                const parsed = JSON.parse(errorText);
                if (parsed.message) errorMessage = parsed.message;
              } catch {
                // Not JSON, use text if it's short
                if (errorText.length < 200) errorMessage = errorText;
              }
            }
          }
        } catch (e) {
          // Failed to parse error, use default message
          console.warn('Could not parse error response:', e);
        }
        
        console.error('❌ Download failed:', {
          status: response.status,
          statusText: response.statusText,
          url: fullUrl,
          errorMessage,
          attachment: {
            filename: attachment.filename || attachment.name,
            index: attachment.index,
            messageUid: message?.uid,
            downloadUrl: attachment.downloadUrl
          }
        });
        
        // Show user-friendly error message based on status code
        if (response.status === 404) {
          alert(`❌ Attachment Not Found\n\nThe server reports that this attachment doesn't exist.\n\nEmail UID: ${message?.uid || 'unknown'}\nAttachment: ${attachment.filename || attachment.name || 'unknown'}\nIndex: ${attachment.index ?? 'unknown'}\n\n⚠️ This might be a backend issue:\n- The email list shows attachments exist\n- But the download endpoint can't find them\n\nPlease check with the backend team.`);
        } else {
          alert(`❌ Failed to download attachment\n\n${errorMessage}\n\nEmail UID: ${message?.uid || 'unknown'}\nAttachment: ${attachment.filename || attachment.name || 'unknown'}`);
        }
        
        throw new Error(errorMessage);
      }

      // Get the blob data
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const filename = attachment.filename || attachment.name || 'attachment';
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      console.log('✅ Successfully downloaded:', filename);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert(`Failed to download attachment: ${error.message}`);
    }
  };

  // Check if we have thread messages
  const threadMessages = selectedEmail.threadMessages || (selectedEmail.messages ? selectedEmail.messages : null);
  const hasThread = threadMessages && Array.isArray(threadMessages) && threadMessages.length > 0;
  
  // If thread exists, use all messages; otherwise use single email
  const messagesToDisplay = hasThread ? threadMessages : [selectedEmail];
  
  // Get current user email for comparison
  const currentUserEmail = emailAccountId 
    ? emailAccounts?.find(acc => acc._id === emailAccountId)?.email || ''
    : '';
  
  // Get conversation metadata if available
  const conversationMetadata = selectedEmail.conversationMetadata || null;

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
      width: '100%',
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#fff',
      overflow: 'hidden',
      minWidth: 0,
      position: 'relative'
    }}>
      {/* Header - Clean & Modern */}
      <Box sx={{ 
        p: { xs: 1.5, md: 2.5 }, 
        borderBottom: '1px solid #e8eaed',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
        flexShrink: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
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
        </Box>

        {/* Subject */}
        <Typography variant="h5" sx={{ 
          fontWeight: 400, 
          color: '#202124', 
          mb: hasThread ? 1.5 : 2.5,
          lineHeight: 1.4,
          fontSize: '1.375rem',
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}>
          {selectedEmail.subject}
        </Typography>
        
        {/* Thread Info */}
        {hasThread && (
          <Box sx={{ 
            mb: 2,
            p: 1.5,
            backgroundColor: '#f8f9fa',
            borderRadius: 1,
            border: '1px solid #e8eaed'
          }}>
            <Box sx={{ 
              color: '#5f6368', 
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap'
            }}>
              <Chip 
                label={selectedEmail.messageCount || threadMessages.length} 
                size="small" 
                sx={{ 
                  height: 20, 
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: '#e8f0fe',
                  color: '#1a73e8',
                  minWidth: 28
                }} 
              />
              <Typography 
                component="span"
                variant="body2" 
                sx={{ 
                  color: '#5f6368', 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                message{(selectedEmail.messageCount || threadMessages.length) > 1 ? 's' : ''} in this conversation
              </Typography>
              {selectedEmail.participants && selectedEmail.participants.length > 0 && (
                <>
                  <Typography component="span" variant="body2" sx={{ color: '#5f6368', mx: 0.5 }}>•</Typography>
                  <Typography component="span" variant="caption" sx={{ color: '#5f6368' }}>
                    {selectedEmail.participants.length} participant{selectedEmail.participants.length > 1 ? 's' : ''}
                  </Typography>
                </>
              )}
              {conversationMetadata && (
                <>
                  <Typography component="span" variant="body2" sx={{ color: '#5f6368', mx: 0.5 }}>•</Typography>
                  <Typography component="span" variant="caption" sx={{ color: '#5f6368' }}>
                    {conversationMetadata.startDate} - {conversationMetadata.endDate}
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        )}

        {/* Sender Card - Only show if single email (no thread) */}
        {!hasThread && (
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
                  {selectedEmail.folder === 'sent' ? 'You' : selectedEmail.fromName}
                </Typography>
                <Chip 
                  label={selectedEmail.folder === 'sent' ? 'Sent' : 'Inbox'} 
                  size="small" 
                  sx={{ 
                    height: 20, 
                    fontSize: '0.7rem',
                    backgroundColor: selectedEmail.folder === 'sent' ? '#fce8e6' : '#e8f0fe',
                    color: selectedEmail.folder === 'sent' ? '#d93025' : '#1a73e8'
                  }} 
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#5f6368', mb: 0.5 }}>
                {selectedEmail.folder === 'sent' ? (selectedEmail.from || 'Your email') : selectedEmail.from}
              </Typography>
              <Typography variant="caption" sx={{ color: '#80868b' }}>
                {selectedEmail.folder === 'sent' ? 'To' : 'From'}: {selectedEmail.folder === 'sent' ? (selectedEmail.to || 'me') : (selectedEmail.fromName || selectedEmail.from || 'me')} • {selectedEmail.timestamp ? new Date(selectedEmail.timestamp).toLocaleDateString('en-US', { 
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
        )}
      </Box>

      {/* Email Body - Clean Design */}
      <Box sx={{ 
        p: { xs: 1.5, md: 2 }, 
        flexGrow: 1, 
        overflow: 'auto', 
        backgroundColor: '#fff',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Display all messages in thread (oldest first) */}
        {messagesToDisplay.map((message, index) => {
          // Use API-provided sequential metadata if available, otherwise calculate from index
          const sequenceNumber = message.sequenceNumber !== undefined ? message.sequenceNumber : (index + 1);
          const isFirstMessage = message.isFirstMessage !== undefined ? message.isFirstMessage : (index === 0);
          const isLastMessage = message.isLastMessage !== undefined ? message.isLastMessage : (index === messagesToDisplay.length - 1);
          const isReply = message.isReply !== undefined ? message.isReply : (index > 0);
          
          // Determine if message is from current user
          const isFromCurrentUser = message.isFromCurrentUser !== undefined 
            ? message.isFromCurrentUser 
            : (message.from && currentUserEmail && message.from.toLowerCase() === currentUserEmail.toLowerCase());
          
          // Use formatted date from API if available
          const useFormattedDate = message.dateFormatted || null;
          
          // Debug: Log message content
          console.log(`📧 Rendering message ${index + 1}:`, {
            uid: message.uid,
            hasBody: !!message.body,
            hasContent: !!message.content,
            hasHtml: !!message.html,
            bodyLength: message.body?.length || 0,
            htmlLength: message.html?.length || 0,
            bodyPreview: message.body?.substring(0, 50) || 'NO BODY',
            htmlPreview: message.html?.substring(0, 50) || 'NO HTML'
          });
          
          // Parse date correctly (handle DD/MM/YYYY format with time)
          // Priority: Use API-provided dateFormatted > timestamp > parse date string
          let formattedDate = '';
          let dateObj = null;
          
          if (useFormattedDate) {
            // Use API-provided formatted date
            formattedDate = useFormattedDate;
            // Try to parse it for dateObj if needed
            dateObj = new Date(message.timestamp || message.date || useFormattedDate);
          } else if (message.timestamp) {
            // Use already-parsed timestamp
            dateObj = new Date(message.timestamp);
            formattedDate = dateObj.toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          } else if (message.date) {
            // Parse date string (DD/MM/YYYY format from API with time)
            const dateStr = String(message.date);
            // Match: "3/2/2026, 10:40:12 pm" or "3/2/2026, 22:40:12"
            const dateTimeMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)?/i);
            if (dateTimeMatch) {
              const [, day, month, year, hour, minute, second, ampm] = dateTimeMatch;
              let hour24 = parseInt(hour, 10);
              
              // Convert to 24-hour format if am/pm is present
              if (ampm) {
                if (ampm.toLowerCase() === 'pm' && hour24 !== 12) {
                  hour24 += 12;
                } else if (ampm.toLowerCase() === 'am' && hour24 === 12) {
                  hour24 = 0;
                }
              }
              
              dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour24, parseInt(minute), parseInt(second));
              formattedDate = dateObj.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
            } else {
              // Try date-only format
              const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              if (dateMatch) {
                const [, day, month, year] = dateMatch;
                dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                formattedDate = dateObj.toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
              } else {
                // Fallback: try parsing as-is
                dateObj = new Date(message.date);
                if (!isNaN(dateObj.getTime())) {
                  formattedDate = dateObj.toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                }
              }
            }
          }
          
          // Extract sender info properly and remove quotes
          const cleanFromName = (name) => {
            if (!name) return '';
            // Remove quotes from name: "abhishek choudhary" -> abhishek choudhary
            return name.replace(/^["']|["']$/g, '').trim();
          };
          
          const rawSenderName = message.fromName || message.from || 'Unknown';
          const senderName = cleanFromName(rawSenderName);
          const senderEmail = message.from || '';
          const recipientEmail = message.to || '';
          
          // Also clean the email if it contains quoted name
          const cleanEmail = (email) => {
            if (!email) return '';
            // Remove pattern: "Name" <email@domain.com> -> email@domain.com
            const emailMatch = email.match(/<([^>]+)>/);
            if (emailMatch) {
              return emailMatch[1];
            }
            // Remove quotes if present
            return email.replace(/^["']|["']$/g, '').trim();
          };
          
          const displaySenderEmail = cleanEmail(senderEmail);
          const displayRecipientEmail = cleanEmail(recipientEmail);
          
          // Extract actual message content (remove quoted content)
          const extractMessageContent = (body) => {
            if (!body) return '';
            
            // Common patterns for quoted content
            const quotedPatterns = [
              /^On .+ wrote:[\s\S]*$/m,  // "On [date] [person] wrote:"
              /^From: .+[\s\S]*$/m,       // "From: [email]"
              /^> .+$/m,                  // "> quoted text"
              /^-----Original Message-----[\s\S]*$/m,  // "-----Original Message-----"
            ];
            
            let cleanBody = body;
            for (const pattern of quotedPatterns) {
              const match = cleanBody.match(pattern);
              if (match) {
                cleanBody = cleanBody.substring(0, match.index).trim();
                break;
              }
            }
            
            return cleanBody || body;
          };
          
          const messageContent = extractMessageContent(message.body || message.content || '');
          const hasQuotedContent = (message.body || message.content || '').length > messageContent.length;
          
          return (
            <Box 
              key={message.uid || message.id || index}
              sx={{ 
                mb: !isLastMessage ? 2 : 0,
                maxWidth: isFromCurrentUser ? '85%' : '100%',
                width: '100%',
                ml: isFromCurrentUser ? 'auto' : 0,
                mr: isFromCurrentUser ? 0 : 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Message Header - Sequential Conversation View */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: 2,
                p: 2.5,
                backgroundColor: isFromCurrentUser ? '#e8f5e9' : (index % 2 === 0 ? '#ffffff' : '#f8f9fa'),
                borderRadius: 2,
                border: isFromCurrentUser 
                  ? '2px solid #4caf50' 
                  : '2px solid #e8eaed',
                mb: 2,
                position: 'relative',
                alignSelf: isFromCurrentUser ? 'flex-end' : 'flex-start',
                maxWidth: isFromCurrentUser ? '85%' : '100%',
                ml: isFromCurrentUser ? 'auto' : 0,
                mr: isFromCurrentUser ? 0 : 'auto',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: isFromCurrentUser ? 'auto' : 0,
                  right: isFromCurrentUser ? 0 : 'auto',
                  top: 0,
                  bottom: 0,
                  width: 4,
                  backgroundColor: isFromCurrentUser ? '#4caf50' : getAvatarColor(senderName),
                  borderRadius: isFromCurrentUser ? '0 2px 2px 0' : '2px 0 0 2px'
                }
              }}>
                {/* Sequence Number */}
                <Box sx={{ 
                  minWidth: 40,
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: 'primary.main',
                  fontSize: '1rem',
                  pt: 0.5
                }}>
                  #{sequenceNumber}
                </Box>
                
                <Avatar sx={{ 
                  width: 48, 
                  height: 48, 
                  bgcolor: getAvatarColor(senderName),
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  border: '2px solid #fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {senderName.split(' ').length > 1 
                    ? (senderName.split(' ')[0][0] + senderName.split(' ')[1][0]).toUpperCase()
                    : senderName.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#202124', fontSize: '0.95rem' }}>
                      {senderName}
                    </Typography>
                    {isFromCurrentUser && (
                      <Chip 
                        label="You" 
                        size="small" 
                        sx={{ 
                          height: 22, 
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: '#4caf50',
                          color: '#fff'
                        }} 
                      />
                    )}
                    {message.folder === 'sent' && !isFromCurrentUser && (
                      <Chip 
                        label="Sent" 
                        size="small" 
                        sx={{ 
                          height: 22, 
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: '#fce8e6',
                          color: '#d93025'
                        }} 
                      />
                    )}
                    {isFirstMessage && (
                      <Chip 
                        label="First" 
                        size="small" 
                        sx={{ 
                          height: 20, 
                          fontSize: '0.65rem',
                          backgroundColor: '#4caf50',
                          color: '#fff'
                        }} 
                      />
                    )}
                    {isLastMessage && (
                      <Chip 
                        label="Latest" 
                        size="small" 
                        sx={{ 
                          height: 20, 
                          fontSize: '0.65rem',
                          backgroundColor: '#2196f3',
                          color: '#fff'
                        }} 
                      />
                    )}
                    {isReply && (
                      <Tooltip title={`Reply to message #${sequenceNumber - 1}`}>
                        <ReplyIcon sx={{ fontSize: 18, color: '#5f6368' }} />
                      </Tooltip>
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ color: '#5f6368', mb: 0.5, fontSize: '0.85rem' }}>
                    {displaySenderEmail && (
                      <>
                        <strong>From:</strong> {displaySenderEmail}
                        {displayRecipientEmail && (
                          <>
                            {' • '}
                            <strong>To:</strong> {displayRecipientEmail}
                          </>
                        )}
                      </>
                    )}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#80868b', fontSize: '0.8rem', fontWeight: 500 }}>
                    {formattedDate || 'Date not available'}
                  </Typography>
                  {isReply && (
                    <Typography variant="caption" sx={{ color: '#80868b', fontSize: '0.75rem', fontStyle: 'italic', ml: 1 }}>
                      ↳ Reply to #{sequenceNumber - 1}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              {/* Recipients Info - Show for clarity */}
              {message.recipientEmails && Array.isArray(message.recipientEmails) && message.recipientEmails.length > 0 && (
                <Box sx={{ px: 2.5, pb: 1, pt: 0 }}>
                  <Typography variant="caption" sx={{ color: '#5f6368', fontSize: '0.75rem' }}>
                    <strong>To:</strong> {message.recipientEmails.join(', ')}
                  </Typography>
                </Box>
              )}
              
              {/* Message Content - Clear separation */}
              <Box sx={{ 
                maxWidth: '100%',
                width: '100%',
                mx: 'auto',
                p: { xs: 2, md: 2.5 },
                backgroundColor: '#ffffff',
                borderRadius: 2,
                border: '1px solid #e8eaed',
                boxSizing: 'border-box',
                overflow: 'hidden',
                mb: index < messagesToDisplay.length - 1 ? 2 : 0
              }}>
                {(() => {
                  const htmlContent = message.html || message.htmlBody || message.htmlContent || '';
                  const bodyContent = messageContent || message.body || message.content || message.text || '';
                  
                  // Debug: Log what we're rendering
                  if (!htmlContent && !bodyContent) {
                    console.warn('⚠️ No content (HTML or body) for message:', message.uid, {
                      messageKeys: Object.keys(message),
                      hasHtml: !!message.html,
                      hasBody: !!message.body,
                      hasContent: !!message.content
                    });
                  }
                  
                  return htmlContent ? (
                    <Box
                      component="div"
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    sx={{ 
                      lineHeight: 1.9, 
                      color: '#3c4043',
                      fontSize: '0.95rem',
                      fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%',
                      '& img': {
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: 1,
                        margin: '8px 0'
                      },
                      '& a': {
                        color: '#1a73e8',
                        textDecoration: 'none',
                        wordBreak: 'break-all',
                        '&:hover': { textDecoration: 'underline' }
                      },
                      '& p': { 
                        margin: '8px 0',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word'
                      },
                      '& table': {
                        maxWidth: '100%',
                        overflow: 'auto',
                        display: 'block'
                      }
                    }}
                  />
                  ) : bodyContent ? (
                    <Typography 
                    component="div"
                    sx={{ 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: 1.9, 
                      color: '#3c4043',
                      fontSize: '0.95rem',
                      fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%',
                      '& a': {
                        display: 'inline-block',
                        marginTop: '4px',
                        marginBottom: '4px',
                        wordBreak: 'break-all'
                      }
                    }}
                  >
                    {(() => {
                      // Use extracted message content (without quoted parts)
                      const bodyText = messageContent || message.body || message.content || message.text || '';
                      if (!bodyText || bodyText.trim() === '') {
                        console.warn('⚠️ Empty body for message:', message.uid, message);
                        return <Typography variant="body2" sx={{ color: '#80868b', fontStyle: 'italic' }}>No content available</Typography>;
                      }
                      return formatEmailBody(bodyText);
                    })()}
                  </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#80868b', fontStyle: 'italic', p: 2 }}>
                      No content available for this message.
                    </Typography>
                  );
                })()}
              </Box>
              
              {/* Message Attachments */}
              {(() => {
                // Debug: Log attachments for this message
                const hasAttachments = message.hasAttachments || (message.attachments && message.attachments.length > 0);
                const attachments = message.attachments || [];
                
                console.log(`📎 Message ${index + 1} attachment check:`, {
                  uid: message.uid,
                  hasAttachments,
                  attachmentCount: message.attachmentCount,
                  attachmentsLength: attachments.length,
                  attachments: attachments.map(a => ({
                    filename: a.filename || a.name,
                    size: a.size,
                    downloadUrl: a.downloadUrl
                  }))
                });
                
                return hasAttachments && attachments.length > 0;
              })() && (
                <Box sx={{ 
                  mt: 2.5, 
                  pt: 2,
                  borderTop: '1px solid #e8eaed',
                  maxWidth: 800, 
                  mx: 'auto' 
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#202124', fontSize: '0.9rem' }}>
                    📎 {message.attachments.length} Attachment{message.attachments.length > 1 ? 's' : ''} from {senderName}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    {message.attachments.map((att, i) => {
                      const filename = typeof att === 'string' ? att : (att.filename || att.name || `Attachment ${i + 1}`);
                      const downloadUrl = att.downloadUrl || att.url || att.link;
                      const previewUrl = att.previewUrl || (att.isImage ? downloadUrl : null);
                      const isImage = att.isImage || (att.contentType && att.contentType.startsWith('image/'));
                      const size = att.size;
                      
                      return (
                        <Box
                          key={i}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1.5,
                            backgroundColor: '#fff',
                            border: '1px solid #e8eaed',
                            borderRadius: 2,
                            minWidth: 200,
                            maxWidth: 400,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: '#f8f9fa',
                              borderColor: '#1a73e8',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }
                          }}
                        >
                          {isImage && previewUrl ? (
                            <Box
                              component="img"
                              src={previewUrl.startsWith('http') ? previewUrl : `${API_CONFIG.BASE_URL}${previewUrl}`}
                              alt={filename}
                              sx={{
                                width: 48,
                                height: 48,
                                objectFit: 'cover',
                                borderRadius: 1
                              }}
                            />
                          ) : (
                            <AttachFileIcon sx={{ fontSize: 32, color: '#5f6368' }} />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 500, 
                                color: '#202124',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                mb: 0.5
                              }}
                            >
                              {filename}
                            </Typography>
                            {size && (
                              <Typography variant="caption" sx={{ color: '#5f6368' }}>
                                {(size / 1024).toFixed(1)} KB
                              </Typography>
                            )}
                          </Box>
                          <Tooltip title="Download">
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAttachment(att, message);
                              }}
                              sx={{
                                color: '#1a73e8',
                                '&:hover': {
                                  backgroundColor: '#e8f0fe'
                                }
                              }}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
              
              {/* Message Footer - Sequence Info */}
              <Box sx={{ 
                px: 2.5, 
                pb: 1, 
                pt: 0.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #e8eaed',
                mt: 1
              }}>
                <Typography variant="caption" sx={{ color: '#80868b', fontSize: '0.75rem' }}>
                  Message {sequenceNumber} of {messagesToDisplay.length}
                </Typography>
                {isReply && (
                  <Typography variant="caption" sx={{ color: '#80868b', fontSize: '0.75rem', fontStyle: 'italic' }}>
                    ↳ Reply to #{sequenceNumber - 1}
                  </Typography>
                )}
              </Box>
              
              {/* Divider between messages (except last) */}
              {!isLastMessage && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  my: 2,
                  gap: 2
                }}>
                  <Box sx={{ 
                    flex: 1, 
                    height: 1, 
                    backgroundColor: '#e8eaed' 
                  }} />
                  <Typography variant="caption" sx={{ 
                    color: '#80868b', 
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    px: 2
                  }}>
                    Message #{sequenceNumber + 1} ↓
                  </Typography>
                  <Box sx={{ 
                    flex: 1, 
                    height: 1, 
                    backgroundColor: '#e8eaed' 
                  }} />
                </Box>
              )}
              
              {/* Old divider - keeping for reference but not used */}
              {false && index < messagesToDisplay.length - 1 && (
                <Divider sx={{ my: 3, borderColor: '#e8eaed' }} />
              )}
            </Box>
          );
        })}

        {/* Legacy Attachments Section - Only show if NOT a thread (for backward compatibility) */}
        {!hasThread && selectedEmail.attachments?.length > 0 && (
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

                return (
                  <Box 
                    key={i} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1.5, 
                      px: 2, 
                      py: 1.5,
                      backgroundColor: '#fff',
                      borderRadius: 2,
                      border: '1px solid #e8eaed',
                      transition: 'all 0.2s ease',
                      '&:hover': { 
                        backgroundColor: '#e8f0fe', 
                        borderColor: '#1a73e8',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    {isImage && previewUrl ? (
                      <img 
                        src={previewUrl.startsWith('http') ? previewUrl : `${API_CONFIG.BASE_URL}${previewUrl}`}
                        alt={filename}
                        style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4 }}
                      />
                    ) : (
                      <AttachFileIcon sx={{ fontSize: 20, color: '#5f6368' }} />
                    )}
                    <Typography variant="body2" sx={{ color: '#1a73e8', fontWeight: 500, flex: 1 }}>
                      {filename}
                    </Typography>
                    {size && (
                      <Typography variant="caption" sx={{ color: '#80868b' }}>
                        ({(size / 1024).toFixed(1)} KB)
                      </Typography>
                    )}
                    <Tooltip title="Download">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAttachment(att, selectedEmail);
                        }}
                        size="small"
                        sx={{
                          color: '#1a73e8',
                          '&:hover': {
                            backgroundColor: '#e8f0fe'
                          }
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>

      {/* Action Buttons - Bottom Bar */}
      <Box sx={{ 
        p: { xs: 1.5, md: 2 }, 
        borderTop: '1px solid #e8eaed',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        gap: 1.5,
        flexShrink: 0,
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <Button
          variant="outlined"
          startIcon={<ReplyIcon />}
          onClick={() => onReply && onReply(selectedEmail)}
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
      </Box>
    </Box>
  );
};

export default EmailViewer;
