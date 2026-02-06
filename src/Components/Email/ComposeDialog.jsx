import React, { useState, useRef } from 'react';
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

const ComposeDialog = ({ open, onClose, onSend, loading, error, success, emailAccountId }) => {
  const [emailData, setEmailData] = useState({
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

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setEmailData(prev => ({ ...prev, [field]: value }));
    
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
    const currentValue = emailData[field];
    const emails = parseEmailRecipients(currentValue);
    const updatedEmails = emails.filter(email => email.trim() !== emailToRemove.trim());
    const newValue = updatedEmails.join(', ');
    setEmailData(prev => ({ ...prev, [field]: newValue }));
    
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

  const handleSend = () => {
    if (!emailData.to || !emailData.subject || !emailData.text) {
      return;
    }
    
    // Validate emails before sending
    const toValidation = validateEmailRecipients(emailData.to);
    if (!toValidation.valid) {
      setEmailValidation(toValidation);
      return;
    }
    
    if (emailData.cc) {
      const ccValidation = validateEmailRecipients(emailData.cc);
      if (!ccValidation.valid) {
        setCcValidation(ccValidation);
        return;
      }
    }
    
    if (emailData.bcc) {
      const bccValidation = validateEmailRecipients(emailData.bcc);
      if (!bccValidation.valid) {
        setBccValidation(bccValidation);
        return;
      }
    }
    
    // Send email with File objects directly (send-files endpoint expects FormData with files)
    // API accepts comma-separated string for multiple recipients
    const emailPayload = {
      to: emailData.to.trim(), // API handles parsing comma-separated emails
      subject: emailData.subject,
      text: emailData.text,
      html: `<p>${emailData.text.replace(/\n/g, '<br/>')}</p>`,
      emailAccountId,
      attachments: attachments.map(att => att.file) // Send File objects directly
    };
    
    // Add CC and BCC if provided
    if (emailData.cc && emailData.cc.trim()) {
      emailPayload.cc = emailData.cc.trim();
    }
    if (emailData.bcc && emailData.bcc.trim()) {
      emailPayload.bcc = emailData.bcc.trim();
    }
    
    onSend(emailPayload);
  };

  const handleClose = (event, reason) => {
    // Only close when clicking the X button, not on backdrop click or ESC key
    if (reason && reason === 'backdropClick') {
      return;
    }
    if (reason && reason === 'escapeKeyDown') {
      return;
    }
    
    setEmailData({ to: '', cc: '', bcc: '', subject: '', text: '' });
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
          borderRadius: 4, 
          height: '90vh', 
          maxHeight: 800,
          boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        } 
      }}
    >
      {/* Header - Modern Gradient with Better Design */}
      <Box sx={{ 
        p: 3, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none'
        }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <SendIcon sx={{ color: '#ffffff', fontSize: 20 }} />
          </Box>
          <Typography variant="h6" sx={{ 
            fontWeight: 700, 
            color: '#ffffff', 
            fontSize: '1.25rem',
            letterSpacing: '-0.02em'
          }}>
            New Message
          </Typography>
        </Box>
        <IconButton 
          size="medium" 
          onClick={handleClose}
          sx={{ 
            color: '#ffffff',
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            zIndex: 1,
            transition: 'all 0.2s',
            '&:hover': { 
              backgroundColor: 'rgba(255,255,255,0.25)',
              transform: 'scale(1.05)'
            }
          }}
        >
          <CloseIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ 
        p: 0, 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1, 
        overflow: 'hidden', 
        backgroundColor: '#f8f9fa'
      }}>
        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              m: 2.5, 
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(76, 175, 80, 0.2)',
              '& .MuiAlert-icon': { fontSize: 24 }
            }}
          >
            Email sent successfully!
          </Alert>
        )}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              m: 2.5, 
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(244, 67, 54, 0.2)',
              '& .MuiAlert-icon': { fontSize: 24 }
            }}
          >
            {error}
          </Alert>
        )}

        {/* To Field - Enhanced with Chips */}
        <Box sx={{ 
          px: 3, 
          py: 2.5, 
          borderBottom: '1px solid #e8eaed', 
          backgroundColor: '#ffffff',
          transition: 'background-color 0.2s'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
            <Typography variant="body2" sx={{ 
              minWidth: 60, 
              color: '#202124', 
              fontWeight: 600, 
              pt: 1.5,
              fontSize: '0.9rem',
              letterSpacing: '0.01em'
            }}>
              To
            </Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Recipient Chips */}
              {recipientChips.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                  {recipientChips.map((email, index) => (
                    <Chip
                      key={index}
                      label={email}
                      onDelete={() => removeRecipient(email, 'to')}
                      avatar={
                        <Avatar sx={{ 
                          width: 28, 
                          height: 28, 
                          bgcolor: '#667eea',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
                        }}>
                          {email.charAt(0).toUpperCase()}
                        </Avatar>
                      }
                      sx={{
                        height: 36,
                        backgroundColor: '#e8f0fe',
                        color: '#1a73e8',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        borderRadius: 2,
                        border: '1px solid rgba(26, 115, 232, 0.2)',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: '#d2e3fc',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 6px rgba(26, 115, 232, 0.2)'
                        },
                        '& .MuiChip-deleteIcon': {
                          color: '#5f6368',
                          fontSize: 18,
                          transition: 'all 0.2s',
                          '&:hover': { 
                            color: '#d93025',
                            transform: 'scale(1.1)'
                          }
                        },
                        '& .MuiChip-label': {
                          px: 1.75,
                          py: 0.5
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
              <TextField
                fullWidth
                placeholder={recipientChips.length === 0 ? "Recipients (separate multiple emails with commas)" : "Add more recipients..."}
                value={emailData.to}
                onChange={handleChange('to')}
                variant="standard"
                error={!emailValidation.valid && emailData.to.length > 0}
                helperText={
                  emailData.to.length > 0 ? (
                    emailValidation.valid ? (
                      <Box component="span" sx={{ color: '#34a853', fontWeight: 500 }}>
                        {getRecipientCount(emailData.to) > 1 
                          ? `✓ ${getRecipientCount(emailData.to)} recipients` 
                          : '✓ 1 recipient'}
                      </Box>
                    ) : (
                      <Box component="span" sx={{ color: '#d93025' }}>
                        Invalid email(s): {emailValidation.invalidEmails.join(', ')}
                      </Box>
                    )
                  ) : null
                }
                InputProps={{ 
                  disableUnderline: true, 
                  sx: { 
                    fontSize: '0.95rem',
                    fontWeight: 400,
                    '& input': {
                      py: recipientChips.length > 0 ? 0.75 : 1.5,
                      color: '#202124'
                    },
                    '& input::placeholder': {
                      color: '#9aa0a6',
                      opacity: 1
                    }
                  } 
                }}
                FormHelperTextProps={{ sx: { fontSize: '0.75rem', mt: 1, ml: 0, fontWeight: 500 } }}
              />
            </Box>
          </Box>
          
          {/* CC/BCC Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              size="small"
              onClick={() => setShowCcBcc(!showCcBcc)}
              sx={{
                textTransform: 'none',
                color: '#1a73e8',
                fontSize: '0.875rem',
                fontWeight: 600,
                px: 2,
                py: 0.75,
                borderRadius: 2,
                backgroundColor: showCcBcc ? '#e8f0fe' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { 
                  backgroundColor: '#e8f0fe',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 4px rgba(26, 115, 232, 0.15)'
                }
              }}
            >
              {showCcBcc ? '▼ Hide' : '▶ Show'} CC & BCC
            </Button>
          </Box>
          
          {/* CC Field */}
          {showCcBcc && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mt: 2.5 }}>
              <Typography variant="body2" sx={{ 
                minWidth: 60, 
                color: '#202124', 
                fontWeight: 600, 
                pt: 1.5,
                fontSize: '0.9rem',
                letterSpacing: '0.01em'
              }}>
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
                  value={emailData.cc}
                  onChange={handleChange('cc')}
                  variant="standard"
                  error={!ccValidation.valid && emailData.cc.length > 0}
                  helperText={
                    emailData.cc.length > 0 && !ccValidation.valid
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
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mt: 2.5 }}>
              <Typography variant="body2" sx={{ 
                minWidth: 60, 
                color: '#202124', 
                fontWeight: 600, 
                pt: 1.5,
                fontSize: '0.9rem',
                letterSpacing: '0.01em'
              }}>
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
                  value={emailData.bcc}
                  onChange={handleChange('bcc')}
                  variant="standard"
                  error={!bccValidation.valid && emailData.bcc.length > 0}
                  helperText={
                    emailData.bcc.length > 0 && !bccValidation.valid
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
        <Box sx={{ 
          px: 3, 
          py: 2, 
          borderBottom: '1px solid #e8eaed', 
          backgroundColor: '#ffffff',
          transition: 'background-color 0.2s'
        }}>
          <TextField
            fullWidth
            placeholder="Subject"
            value={emailData.subject}
            onChange={handleChange('subject')}
            variant="standard"
            InputProps={{ 
              disableUnderline: true, 
              sx: { 
                fontSize: '1rem',
                fontWeight: 500,
                '& input': {
                  color: '#202124',
                  py: 0.5
                },
                '& input::placeholder': {
                  color: '#9aa0a6',
                  opacity: 1,
                  fontWeight: 400
                }
              } 
            }}
          />
        </Box>

        {/* Body Field */}
        <Box sx={{ 
          px: 3, 
          py: 3, 
          flexGrow: 1, 
          overflow: 'auto', 
          backgroundColor: '#ffffff',
          minHeight: 300
        }}>
          <TextField
            fullWidth
            multiline
            rows={14}
            placeholder="Compose your message..."
            value={emailData.text}
            onChange={handleChange('text')}
            variant="standard"
            InputProps={{ 
              disableUnderline: true, 
              sx: { 
                fontSize: '0.95rem',
                lineHeight: 1.7,
                '& textarea': {
                  resize: 'none',
                  color: '#202124',
                  fontFamily: 'inherit'
                },
                '& textarea::placeholder': {
                  color: '#9aa0a6',
                  opacity: 1,
                  fontSize: '0.95rem'
                }
              } 
            }}
          />
        </Box>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <Box sx={{ 
            px: 3, 
            py: 2.5, 
            borderTop: '1px solid #e8eaed', 
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e8eaed'
          }}>
            <Typography variant="subtitle2" sx={{ 
              color: '#202124', 
              mb: 2, 
              fontWeight: 700, 
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <AttachFileIcon sx={{ fontSize: 18, color: '#5f6368' }} />
              Attachments ({attachments.length}/10)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {attachments.map((att, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2.5,
                    py: 1.75,
                    backgroundColor: '#ffffff',
                    borderRadius: 3,
                    border: '1px solid #e8eaed',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(26, 115, 232, 0.15)',
                      borderColor: '#1a73e8',
                      transform: 'translateY(-2px)'
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

      {/* Footer - Enhanced with Better Design */}
      <Box sx={{ 
        p: 3, 
        borderTop: '1px solid #e8eaed', 
        backgroundColor: '#ffffff',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <SendIcon />}
            onClick={handleSend}
            disabled={!emailData.to || !emailData.subject || !emailData.text || loading || !emailValidation.valid || !ccValidation.valid || !bccValidation.valid}
            sx={{ 
              background: loading ? '#9aa0a6' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none', 
              fontWeight: 700, 
              px: 5, 
              py: 1.25,
              minWidth: 140,
              borderRadius: 3,
              fontSize: '0.95rem',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.35)',
              transition: 'all 0.3s',
              '&:hover': { 
                background: loading ? '#9aa0a6' : 'linear-gradient(135deg, #5568d3 0%, #6a4190 100%)',
                boxShadow: loading ? 'none' : '0 6px 16px rgba(102, 126, 234, 0.45)',
                transform: 'translateY(-1px)'
              },
              '&:active': {
                transform: 'translateY(0px)'
              },
              '&.Mui-disabled': { 
                background: '#e0e0e0',
                color: '#9e9e9e',
                boxShadow: 'none'
              }
            }}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
          <Tooltip title="Attach files (Max 10 files, 25MB each)" arrow>
            <IconButton 
              size="medium" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={attachments.length >= 10}
              sx={{
                width: 44,
                height: 44,
                border: '1.5px solid #e8eaed',
                backgroundColor: '#f8f9fa',
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': { 
                  backgroundColor: '#e8f0fe',
                  borderColor: '#1a73e8',
                  transform: 'scale(1.05)',
                  boxShadow: '0 2px 8px rgba(26, 115, 232, 0.2)'
                },
                '&.Mui-disabled': {
                  backgroundColor: '#f5f5f5',
                  borderColor: '#e0e0e0',
                  opacity: 0.6
                }
              }}
            >
              <AttachFileIcon sx={{ 
                color: attachments.length >= 10 ? '#9e9e9e' : '#5f6368', 
                fontSize: 22 
              }} />
            </IconButton>
          </Tooltip>
          {attachments.length > 0 && (
            <Typography variant="caption" sx={{ 
              color: '#5f6368', 
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 1.5,
              py: 0.75,
              backgroundColor: '#e8f0fe',
              borderRadius: 2,
              border: '1px solid rgba(26, 115, 232, 0.2)'
            }}>
              {attachments.length}/10 file{attachments.length > 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
        <Tooltip title="Discard draft" arrow>
          <IconButton 
            size="medium" 
            onClick={handleClose}
            sx={{
              width: 44,
              height: 44,
              color: '#5f6368',
              borderRadius: 2,
              transition: 'all 0.2s',
              '&:hover': { 
                color: '#d93025',
                backgroundColor: '#fce8e6',
                transform: 'scale(1.05)',
                boxShadow: '0 2px 8px rgba(217, 48, 37, 0.2)'
              }
            }}
          >
            <DeleteIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Dialog>
  );
};

export default ComposeDialog;
