import React, { useState } from 'react';
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
import LabelActions from './LabelActions';

const EmailViewer = ({ selectedEmail, onToggleStar, onDelete, onClose, onReply, emailAccountId, folder, emailAccounts = [] }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  if (!selectedEmail) return null;

  const handleLabelUpdate = () => {
    // Refresh the email to get updated labels
    setRefreshKey(prev => prev + 1);
  };

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
      {/* Header - Gmail Style */}
      <Box sx={{ 
        px: { xs: 2, md: 3 }, 
        pt: 2,
        pb: 1.5,
        borderBottom: '1px solid #e8eaed',
        backgroundColor: '#ffffff',
        flexShrink: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* Top Row - Close Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
          <Tooltip title="Close">
            <IconButton 
              size="small" 
              onClick={onClose}
              sx={{ 
                color: '#5f6368',
                '&:hover': { 
                  backgroundColor: '#f1f3f4',
                  color: '#202124'
                }
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Subject - Gmail Style */}
        <Typography variant="h6" sx={{ 
          fontWeight: 400, 
          color: '#202124', 
          mb: 1.5,
          lineHeight: 1.4,
          fontSize: '1.25rem',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          letterSpacing: '-0.01em'
        }}>
          {selectedEmail.subject || '(No Subject)'}
        </Typography>

        {/* Labels Section - Gmail Style */}
        <Box sx={{ mb: 1.5 }}>
          <LabelActions
            email={selectedEmail}
            folder={folder}
            emailAccountId={emailAccountId}
            onUpdate={handleLabelUpdate}
          />
        </Box>
        
        {/* Thread Info - Gmail Style */}
        {hasThread && (
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1.5,
            flexWrap: 'wrap'
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#5f6368', 
                fontSize: '0.8125rem',
                fontWeight: 400
              }}
            >
              {selectedEmail.messageCount || threadMessages.length} message{(selectedEmail.messageCount || threadMessages.length) > 1 ? 's' : ''}
            </Typography>
            {selectedEmail.participants && selectedEmail.participants.length > 0 && (
              <>
                <Typography component="span" variant="body2" sx={{ color: '#dadce0', fontSize: '0.75rem' }}>•</Typography>
                <Typography 
                  component="span" 
                  variant="body2" 
                  sx={{ 
                    color: '#5f6368', 
                    fontSize: '0.8125rem',
                    fontWeight: 400
                  }}
                >
                  {selectedEmail.participants.slice(0, 3).join(', ')}
                  {selectedEmail.participants.length > 3 && ` +${selectedEmail.participants.length - 3} more`}
                </Typography>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Email Body - Gmail Style */}
      <Box sx={{ 
        px: { xs: 2, md: 3 }, 
        py: 2,
        flexGrow: 1, 
        overflow: 'auto', 
        backgroundColor: '#ffffff',
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
                mb: !isLastMessage ? 3 : 0,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderBottom: !isLastMessage ? '1px solid #e8eaed' : 'none',
                pb: !isLastMessage ? 3 : 0
              }}
            >
              {/* Message Header - Gmail Style */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: 1.5,
                mb: 1.5
              }}>
                <Avatar sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: getAvatarColor(senderName),
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  flexShrink: 0
                }}>
                  {senderName.split(' ').length > 1 
                    ? (senderName.split(' ')[0][0] + senderName.split(' ')[1][0]).toUpperCase()
                    : senderName.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* Sender Name and Date Row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: '#202124', fontSize: '0.875rem' }}>
                        {isFromCurrentUser ? 'me' : senderName}
                      </Typography>
                      {displaySenderEmail && !isFromCurrentUser && (
                        <Typography variant="body2" sx={{ color: '#5f6368', fontSize: '0.8125rem' }}>
                          &lt;{displaySenderEmail}&gt;
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: '#5f6368', fontSize: '0.75rem', fontWeight: 400 }}>
                      {formattedDate || 'Date not available'}
                    </Typography>
                  </Box>
                  
                  {/* To/From Row - Gmail Style (only show if different from sender) */}
                  {displayRecipientEmail && displayRecipientEmail !== displaySenderEmail && (
                    <Typography variant="body2" sx={{ color: '#5f6368', fontSize: '0.8125rem', mb: 0.5 }}>
                      to {displayRecipientEmail}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              {/* Message Content - Gmail Style */}
              <Box sx={{ 
                maxWidth: '100%',
                width: '100%',
                pl: 5.5, // Align with avatar
                pr: 0,
                mb: 1.5
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
                        lineHeight: 1.5, 
                        color: '#202124',
                        fontSize: '0.875rem',
                        fontFamily: 'Roboto, Arial, sans-serif',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        maxWidth: '100%',
                        '& img': {
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: 1,
                          margin: '12px 0'
                        },
                        '& a': {
                          color: '#1a73e8',
                          textDecoration: 'none',
                          wordBreak: 'break-all',
                          '&:hover': { textDecoration: 'underline' }
                        },
                        '& p': { 
                          margin: '0 0 12px 0',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          lineHeight: 1.5
                        },
                        '& table': {
                          maxWidth: '100%',
                          overflow: 'auto',
                          display: 'block',
                          margin: '12px 0'
                        }
                      }}
                    />
                  ) : bodyContent ? (
                    <Typography 
                      component="div"
                      sx={{ 
                        whiteSpace: 'pre-wrap', 
                        lineHeight: 1.5, 
                        color: '#202124',
                        fontSize: '0.875rem',
                        fontFamily: 'Roboto, Arial, sans-serif',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        maxWidth: '100%',
                        '& a': {
                          color: '#1a73e8',
                          textDecoration: 'none',
                          wordBreak: 'break-all',
                          '&:hover': { textDecoration: 'underline' }
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
                    <Typography variant="body2" sx={{ color: '#80868b', fontStyle: 'italic' }}>
                      No content available for this message.
                    </Typography>
                  );
                })()}
              </Box>
              
              {/* Message Attachments - Gmail Style */}
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
                  mt: 2, 
                  pl: 5.5, // Align with avatar
                  pr: 0
                }}>
                  <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500, color: '#5f6368', fontSize: '0.8125rem' }}>
                    {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                            p: 1,
                            backgroundColor: '#f8f9fa',
                            borderRadius: 1,
                            maxWidth: 600,
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: '#e8f0fe',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadAttachment(att, message);
                          }}
                        >
                          {isImage && previewUrl ? (
                            <Box
                              component="img"
                              src={previewUrl.startsWith('http') ? previewUrl : `${API_CONFIG.BASE_URL}${previewUrl}`}
                              alt={filename}
                              sx={{
                                width: 40,
                                height: 40,
                                objectFit: 'cover',
                                borderRadius: 1
                              }}
                            />
                          ) : (
                            <AttachFileIcon sx={{ fontSize: 20, color: '#5f6368' }} />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 400, 
                                color: '#202124',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.8125rem'
                              }}
                            >
                              {filename}
                            </Typography>
                            {size && (
                              <Typography variant="caption" sx={{ color: '#5f6368', fontSize: '0.75rem' }}>
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
                              size="small"
                              sx={{
                                color: '#5f6368',
                                '&:hover': {
                                  backgroundColor: 'rgba(26, 115, 232, 0.1)'
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

      {/* Action Buttons - Gmail Style Bottom Bar */}
      <Box sx={{ 
        px: 3, 
        py: 1.5, 
        borderTop: '1px solid #e8eaed',
        backgroundColor: '#ffffff',
        display: 'flex',
        gap: 1,
        flexShrink: 0,
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <Button
          variant="text"
          startIcon={<ReplyIcon />}
          onClick={() => onReply && onReply(selectedEmail)}
          sx={{ 
            textTransform: 'none',
            color: '#5f6368',
            fontWeight: 500,
            fontSize: '0.875rem',
            minWidth: 'auto',
            px: 1.5,
            '&:hover': { 
              backgroundColor: '#f1f3f4'
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
