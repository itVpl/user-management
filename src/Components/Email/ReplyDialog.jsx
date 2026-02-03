import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogContent,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { validateEmailRecipients, getRecipientCount, parseEmailRecipients } from '../../utils/emailUtils';

const ReplyDialog = ({ 
  open, 
  onClose, 
  onReply, 
  loading, 
  error, 
  success, 
  emailAccountId,
  originalEmail 
}) => {
  const [replyData, setReplyData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    text: '',
  });
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [emailValidation, setEmailValidation] = useState({ valid: true, invalidEmails: [] });
  const [ccValidation, setCcValidation] = useState({ valid: true, invalidEmails: [] });
  const [bccValidation, setBccValidation] = useState({ valid: true, invalidEmails: [] });
  const [recipientChips, setRecipientChips] = useState([]);
  const [ccChips, setCcChips] = useState([]);
  const [bccChips, setBccChips] = useState([]);
  const fileInputRef = useRef(null);

  // Initialize reply data when dialog opens or originalEmail changes
  useEffect(() => {
    if (open && originalEmail) {
      // Extract email address from "Name <email@domain.com>" format or use as-is
      const fromEmail = originalEmail.from || '';
      const parsedEmails = parseEmailRecipients(fromEmail);
      // Use the first valid email address, or the original string if parsing fails
      const replyTo = parsedEmails.length > 0 ? parsedEmails[0] : fromEmail;
      
      const replySubject = originalEmail.subject?.startsWith('Re:') 
        ? originalEmail.subject 
        : `Re: ${originalEmail.subject || ''}`;
      
      setReplyData({
        to: replyTo,
        cc: '',
        bcc: '',
        subject: replySubject,
        text: '',
      });
      
      // Initialize recipient chips with parsed emails
      if (replyTo) {
        const emails = parseEmailRecipients(replyTo);
        const validEmails = emails.filter(email => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email.trim());
        });
        setRecipientChips(validEmails);
        
        // Validate immediately
        const validation = validateEmailRecipients(replyTo);
        setEmailValidation(validation);
      } else {
        setEmailValidation({ valid: false, invalidEmails: [], emails: [] });
        setRecipientChips([]);
      }
    } else if (open && !originalEmail) {
      // Reset if dialog opens without an email
      setReplyData({ to: '', cc: '', bcc: '', subject: '', text: '' });
      setEmailValidation({ valid: true, invalidEmails: [] });
      setCcValidation({ valid: true, invalidEmails: [] });
      setBccValidation({ valid: true, invalidEmails: [] });
      setRecipientChips([]);
      setCcChips([]);
      setBccChips([]);
    }
  }, [open, originalEmail]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setReplyData(prev => ({ ...prev, [field]: value }));
    
    // Validate emails when recipient fields change
    if (field === 'to') {
      const validation = validateEmailRecipients(value);
      setEmailValidation(validation);
      
      // Update recipient chips
      const emails = parseEmailRecipients(value);
      const validEmails = emails.filter(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
      });
      setRecipientChips(validEmails);
    } else if (field === 'cc') {
      const validation = validateEmailRecipients(value);
      setCcValidation(validation);
      
      const emails = parseEmailRecipients(value);
      const validEmails = emails.filter(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
      });
      setCcChips(validEmails);
    } else if (field === 'bcc') {
      const validation = validateEmailRecipients(value);
      setBccValidation(validation);
      
      const emails = parseEmailRecipients(value);
      const validEmails = emails.filter(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
      });
      setBccChips(validEmails);
    }
  };

  const removeRecipient = (emailToRemove, field = 'to') => {
    const currentValue = replyData[field];
    const emails = parseEmailRecipients(currentValue);
    const updatedEmails = emails.filter(email => email.trim() !== emailToRemove.trim());
    const newValue = updatedEmails.join(', ');
    setReplyData(prev => ({ ...prev, [field]: newValue }));
    
    const validation = validateEmailRecipients(newValue);
    const validEmails = updatedEmails.filter(email => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.trim());
    });
    
    if (field === 'to') {
      setEmailValidation(validation);
      setRecipientChips(validEmails);
    } else if (field === 'cc') {
      setCcValidation(validation);
      setCcChips(validEmails);
    } else if (field === 'bcc') {
      setBccValidation(validation);
      setBccChips(validEmails);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file count (max 10 files)
    if (attachments.length + files.length > 10) {
      alert('Maximum 10 files allowed. Please remove some files first.');
      e.target.value = '';
      return;
    }

    // Validate file size (max 25MB each)
    const oversizedFiles = files.filter(file => file.size > 25 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`File size exceeds 25MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      e.target.value = '';
      return;
    }

    const newAttachments = files.map(file => ({
      file,
      filename: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = ''; // Reset input
  };

  const removeAttachment = (index) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      if (newAttachments[index].preview) {
        URL.revokeObjectURL(newAttachments[index].preview);
      }
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleReply = () => {
    if (!replyData.to || !replyData.subject || !replyData.text) {
      return;
    }
    
    // Validate emails before sending
    const toValidation = validateEmailRecipients(replyData.to);
    if (!toValidation.valid) {
      setEmailValidation(toValidation);
      return;
    }
    
    if (replyData.cc) {
      const ccValidation = validateEmailRecipients(replyData.cc);
      if (!ccValidation.valid) {
        setCcValidation(ccValidation);
        return;
      }
    }
    
    if (replyData.bcc) {
      const bccValidation = validateEmailRecipients(replyData.bcc);
      if (!bccValidation.valid) {
        setBccValidation(bccValidation);
        return;
      }
    }
    
    // Prepare reply data with threading information
    // API accepts comma-separated string for multiple recipients
    const replyPayload = {
      to: replyData.to.trim(), // API handles parsing comma-separated emails
      subject: replyData.subject,
      text: replyData.text,
      html: `<p>${replyData.text.replace(/\n/g, '<br/>')}</p>`,
      emailAccountId,
      attachments: attachments.map(att => att.file), // Send File objects directly
    };

    // Add CC and BCC if provided
    if (replyData.cc && replyData.cc.trim()) {
      replyPayload.cc = replyData.cc.trim();
    }
    if (replyData.bcc && replyData.bcc.trim()) {
      replyPayload.bcc = replyData.bcc.trim();
    }

    // Add threading information if available
    if (originalEmail) {
      if (originalEmail.messageId) {
        replyPayload.inReplyTo = originalEmail.messageId;
      }
      if (originalEmail.messageId) {
        // Build references chain
        const existingRefs = originalEmail.references || '';
        replyPayload.references = existingRefs 
          ? `${existingRefs} ${originalEmail.messageId}` 
          : originalEmail.messageId;
      }
    }
    
    onReply(replyPayload);
  };

  const handleClose = (event, reason) => {
    // Only close when clicking the X button, not on backdrop click or ESC key
    if (reason && reason === 'backdropClick') {
      return;
    }
    if (reason && reason === 'escapeKeyDown') {
      return;
    }
    
    setReplyData({ to: '', cc: '', bcc: '', subject: '', text: '' });
    setEmailValidation({ valid: true, invalidEmails: [] });
    setCcValidation({ valid: true, invalidEmails: [] });
    setBccValidation({ valid: true, invalidEmails: [] });
    setRecipientChips([]);
    setCcChips([]);
    setBccChips([]);
    setShowCcBcc(false);
    attachments.forEach(att => {
      if (att.preview) URL.revokeObjectURL(att.preview);
    });
    setAttachments([]);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ 
        sx: { 
          borderRadius: 3, 
          height: '85vh', 
          maxHeight: 750,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          overflow: 'hidden'
        } 
      }}
    >
      {/* Header - Modern Gradient */}
      <Box sx={{ 
        p: 2.5, 
        borderBottom: '1px solid #e0e0e0', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff', fontSize: '1.1rem' }}>
          Reply
        </Typography>
        <IconButton 
          size="small" 
          onClick={handleClose}
          sx={{ 
            color: '#ffffff',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
          }}
        >
          <CloseIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden', backgroundColor: '#fafafa' }}>
        {success && <Alert severity="success" sx={{ m: 2, borderRadius: 2 }}>Reply sent successfully!</Alert>}
        {error && <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>{error}</Alert>}

        {/* To Field - Enhanced with Chips */}
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e8eaed', backgroundColor: '#ffffff' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography variant="body2" sx={{ minWidth: 50, color: '#5f6368', fontWeight: 500, pt: 1.5 }}>
              To
            </Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Recipient Chips */}
              {recipientChips.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                  {recipientChips.map((email, index) => (
                    <Chip
                      key={index}
                      label={email}
                      onDelete={() => removeRecipient(email, 'to')}
                      avatar={
                        <Avatar sx={{ 
                          width: 24, 
                          height: 24, 
                          bgcolor: '#667eea',
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }}>
                          {email.charAt(0).toUpperCase()}
                        </Avatar>
                      }
                      sx={{
                        height: 32,
                        backgroundColor: '#e8f0fe',
                        color: '#1a73e8',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        '& .MuiChip-deleteIcon': {
                          color: '#5f6368',
                          fontSize: 18,
                          '&:hover': { color: '#d93025' }
                        },
                        '& .MuiChip-label': {
                          px: 1.5
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
              <TextField
                fullWidth
                placeholder={recipientChips.length === 0 ? "Recipients (separate multiple emails with commas)" : ""}
                value={replyData.to}
                onChange={handleChange('to')}
                variant="standard"
                error={!emailValidation.valid && replyData.to.length > 0}
                helperText={
                  replyData.to.length > 0 ? (
                    emailValidation.valid ? (
                      getRecipientCount(replyData.to) > 1 
                        ? `${getRecipientCount(replyData.to)} recipients` 
                        : '1 recipient'
                    ) : (
                      emailValidation.invalidEmails.length > 0
                        ? `Invalid email(s): ${emailValidation.invalidEmails.join(', ')}`
                        : 'Please enter at least one valid email address'
                    )
                  ) : null
                }
                InputProps={{ 
                  disableUnderline: true, 
                  sx: { 
                    fontSize: '0.95rem',
                    '& input': {
                      py: recipientChips.length > 0 ? 0.5 : 1.5
                    }
                  } 
                }}
                FormHelperTextProps={{ sx: { fontSize: '0.7rem', mt: 0.5, ml: 0 } }}
              />
            </Box>
          </Box>
          
          {/* CC/BCC Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              size="small"
              onClick={() => setShowCcBcc(!showCcBcc)}
              sx={{
                textTransform: 'none',
                color: '#1a73e8',
                fontSize: '0.875rem',
                '&:hover': { backgroundColor: '#e8f0fe' }
              }}
            >
              {showCcBcc ? 'Hide' : 'Show'} CC & BCC
            </Button>
          </Box>
          
          {/* CC Field */}
          {showCcBcc && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 2 }}>
              <Typography variant="body2" sx={{ minWidth: 50, color: '#5f6368', fontWeight: 500, pt: 1.5 }}>
                Cc
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {ccChips.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                    {ccChips.map((email, index) => (
                      <Chip
                        key={index}
                        label={email}
                        onDelete={() => removeRecipient(email, 'cc')}
                        avatar={
                          <Avatar sx={{ 
                            width: 24, 
                            height: 24, 
                            bgcolor: '#667eea',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}>
                            {email.charAt(0).toUpperCase()}
                          </Avatar>
                        }
                        sx={{
                          height: 32,
                          backgroundColor: '#e8f0fe',
                          color: '#1a73e8',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          '& .MuiChip-deleteIcon': {
                            color: '#5f6368',
                            fontSize: 18,
                            '&:hover': { color: '#d93025' }
                          },
                          '& .MuiChip-label': {
                            px: 1.5
                          }
                        }}
                      />
                    ))}
                  </Box>
                )}
                <TextField
                  fullWidth
                  placeholder="Cc (separate multiple emails with commas)"
                  value={replyData.cc}
                  onChange={handleChange('cc')}
                  variant="standard"
                  error={!ccValidation.valid && replyData.cc.length > 0}
                  helperText={
                    replyData.cc.length > 0 && !ccValidation.valid
                      ? `Invalid email(s): ${ccValidation.invalidEmails.join(', ')}`
                      : null
                  }
                  InputProps={{ 
                    disableUnderline: true, 
                    sx: { 
                      fontSize: '0.95rem',
                      '& input': {
                        py: ccChips.length > 0 ? 0.5 : 1.5
                      }
                    } 
                  }}
                  FormHelperTextProps={{ sx: { fontSize: '0.7rem', mt: 0.5, ml: 0 } }}
                />
              </Box>
            </Box>
          )}
          
          {/* BCC Field */}
          {showCcBcc && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 2 }}>
              <Typography variant="body2" sx={{ minWidth: 50, color: '#5f6368', fontWeight: 500, pt: 1.5 }}>
                Bcc
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {bccChips.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                    {bccChips.map((email, index) => (
                      <Chip
                        key={index}
                        label={email}
                        onDelete={() => removeRecipient(email, 'bcc')}
                        avatar={
                          <Avatar sx={{ 
                            width: 24, 
                            height: 24, 
                            bgcolor: '#667eea',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}>
                            {email.charAt(0).toUpperCase()}
                          </Avatar>
                        }
                        sx={{
                          height: 32,
                          backgroundColor: '#e8f0fe',
                          color: '#1a73e8',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          '& .MuiChip-deleteIcon': {
                            color: '#5f6368',
                            fontSize: 18,
                            '&:hover': { color: '#d93025' }
                          },
                          '& .MuiChip-label': {
                            px: 1.5
                          }
                        }}
                      />
                    ))}
                  </Box>
                )}
                <TextField
                  fullWidth
                  placeholder="Bcc (separate multiple emails with commas)"
                  value={replyData.bcc}
                  onChange={handleChange('bcc')}
                  variant="standard"
                  error={!bccValidation.valid && replyData.bcc.length > 0}
                  helperText={
                    replyData.bcc.length > 0 && !bccValidation.valid
                      ? `Invalid email(s): ${bccValidation.invalidEmails.join(', ')}`
                      : null
                  }
                  InputProps={{ 
                    disableUnderline: true, 
                    sx: { 
                      fontSize: '0.95rem',
                      '& input': {
                        py: bccChips.length > 0 ? 0.5 : 1.5
                      }
                    } 
                  }}
                  FormHelperTextProps={{ sx: { fontSize: '0.7rem', mt: 0.5, ml: 0 } }}
                />
              </Box>
            </Box>
          )}
        </Box>

        {/* Subject Field */}
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #e8eaed', backgroundColor: '#ffffff' }}>
          <TextField
            fullWidth
            placeholder="Subject"
            value={replyData.subject}
            onChange={handleChange('subject')}
            variant="standard"
            InputProps={{ 
              disableUnderline: true, 
              sx: { 
                fontSize: '0.95rem',
                fontWeight: 500
              } 
            }}
          />
        </Box>

        {/* Body Field */}
        <Box sx={{ px: 2.5, py: 2.5, flexGrow: 1, overflow: 'auto', backgroundColor: '#ffffff' }}>
          <TextField
            fullWidth
            multiline
            rows={12}
            placeholder="Type your reply here..."
            value={replyData.text}
            onChange={handleChange('text')}
            variant="standard"
            InputProps={{ 
              disableUnderline: true, 
              sx: { 
                fontSize: '0.95rem',
                lineHeight: 1.6,
                '& textarea': {
                  resize: 'none'
                }
              } 
            }}
          />
        </Box>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid #e8eaed', backgroundColor: '#f8f9fa' }}>
            <Typography variant="subtitle2" sx={{ color: '#202124', mb: 1.5, fontWeight: 600, fontSize: '0.875rem' }}>
              📎 Attachments ({attachments.length}/10)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {attachments.map((att, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    backgroundColor: '#ffffff',
                    borderRadius: 2,
                    border: '1px solid #e8eaed',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      borderColor: '#1a73e8'
                    }
                  }}
                >
                  {att.preview ? (
                    <img 
                      src={att.preview} 
                      alt={att.filename}
                      style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                    />
                  ) : (
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: '#e8f0fe',
                      borderRadius: 1
                    }}>
                      {att.type.startsWith('image/') ? (
                        <ImageIcon sx={{ color: '#1a73e8', fontSize: 24 }} />
                      ) : (
                        <FileIcon sx={{ color: '#1a73e8', fontSize: 24 }} />
                      )}
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 500, 
                      color: '#202124',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {att.filename}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#5f6368' }}>
                      {formatFileSize(att.size)}
                    </Typography>
                  </Box>
                  <IconButton 
                    size="small" 
                    onClick={() => removeAttachment(index)}
                    sx={{ 
                      color: '#5f6368',
                      '&:hover': { color: '#d93025', backgroundColor: '#fce8e6' }
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        style={{ display: 'none' }}
      />

      {/* Footer - Enhanced */}
      <Box sx={{ 
        p: 2.5, 
        borderTop: '1px solid #e8eaed', 
        backgroundColor: '#ffffff',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)'
      }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <SendIcon />}
            onClick={handleReply}
            disabled={!replyData.to || !replyData.subject || !replyData.text || loading || !emailValidation.valid || !ccValidation.valid || !bccValidation.valid}
            sx={{ 
              background: loading ? '#9aa0a6' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none', 
              fontWeight: 600, 
              px: 4, 
              py: 1,
              minWidth: 130,
              borderRadius: 2,
              boxShadow: loading ? 'none' : '0 2px 8px rgba(102, 126, 234, 0.3)',
              '&:hover': { 
                background: loading ? '#9aa0a6' : 'linear-gradient(135deg, #5568d3 0%, #6a4190 100%)',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)'
              },
              '&.Mui-disabled': { 
                background: '#9aa0a6',
                color: 'white'
              }
            }}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
          <Tooltip title="Attach files">
            <IconButton 
              size="medium" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={attachments.length >= 10}
              sx={{
                border: '1px solid #e8eaed',
                backgroundColor: '#f8f9fa',
                '&:hover': { 
                  backgroundColor: '#e8f0fe',
                  borderColor: '#1a73e8'
                },
                '&.Mui-disabled': {
                  backgroundColor: '#f5f5f5',
                  borderColor: '#e0e0e0'
                }
              }}
            >
              <AttachFileIcon sx={{ 
                color: attachments.length >= 10 ? '#9e9e9e' : '#5f6368', 
                fontSize: 20 
              }} />
            </IconButton>
          </Tooltip>
          {attachments.length > 0 && (
            <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 500 }}>
              {attachments.length}/10 file{attachments.length > 1 ? 's' : ''} attached
            </Typography>
          )}
        </Box>
        <Tooltip title="Discard">
          <IconButton 
            size="medium" 
            onClick={handleClose}
            sx={{
              color: '#5f6368',
              '&:hover': { 
                color: '#d93025',
                backgroundColor: '#fce8e6'
              }
            }}
          >
            <DeleteIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Dialog>
  );
};

export default ReplyDialog;
