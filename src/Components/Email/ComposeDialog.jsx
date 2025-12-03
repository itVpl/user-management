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
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';

const ComposeDialog = ({ open, onClose, onSend, loading, error, success, emailAccountId }) => {
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    text: '',
  });
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const handleChange = (field) => (e) => {
    setEmailData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
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
    
    // Send email with File objects directly (send-files endpoint expects FormData with files)
    onSend({
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: `<p>${emailData.text.replace(/\n/g, '<br/>')}</p>`,
      emailAccountId,
      attachments: attachments.map(att => att.file) // Send File objects directly
    });
  };

  const handleClose = () => {
    setEmailData({ to: '', subject: '', text: '' });
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
      PaperProps={{ sx: { borderRadius: 2, height: '80vh', maxHeight: 700 } }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 500, color: '#202124' }}>
          New Message
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon sx={{ fontSize: 20, color: '#5f6368' }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        {success && <Alert severity="success" sx={{ m: 2 }}>Email sent successfully!</Alert>}
        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

        {/* To Field */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e0e0e0' }}>
          <TextField
            fullWidth
            placeholder="To"
            value={emailData.to}
            onChange={handleChange('to')}
            variant="standard"
            InputProps={{ disableUnderline: true, sx: { fontSize: '0.95rem' } }}
          />
        </Box>

        {/* Subject Field */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e0e0e0' }}>
          <TextField
            fullWidth
            placeholder="Subject"
            value={emailData.subject}
            onChange={handleChange('subject')}
            variant="standard"
            InputProps={{ disableUnderline: true, sx: { fontSize: '0.95rem' } }}
          />
        </Box>

        {/* Body Field */}
        <Box sx={{ px: 2, py: 2, flexGrow: 1, overflow: 'auto' }}>
          <TextField
            fullWidth
            multiline
            rows={10}
            placeholder="Compose email"
            value={emailData.text}
            onChange={handleChange('text')}
            variant="standard"
            InputProps={{ disableUnderline: true, sx: { fontSize: '0.95rem' } }}
          />
        </Box>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>
            <Typography variant="caption" sx={{ color: '#5f6368', mb: 1, display: 'block' }}>
              Attachments ({attachments.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {attachments.map((att, index) => (
                <Chip
                  key={index}
                  icon={att.type.startsWith('image/') ? <ImageIcon /> : <FileIcon />}
                  label={`${att.filename} (${formatFileSize(att.size)})`}
                  onDelete={() => removeAttachment(index)}
                  sx={{
                    backgroundColor: '#e8f0fe',
                    '& .MuiChip-icon': { color: '#1a73e8' },
                    '& .MuiChip-deleteIcon': { color: '#5f6368', '&:hover': { color: '#d93025' } }
                  }}
                />
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
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        style={{ display: 'none' }}
      />

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <SendIcon />}
            onClick={handleSend}
            disabled={!emailData.to || !emailData.subject || !emailData.text || loading}
            sx={{ 
              backgroundColor: loading ? '#5f6368' : '#1a73e8', 
              textTransform: 'none', 
              fontWeight: 500, 
              px: 3, 
              minWidth: 120,
              '&:hover': { backgroundColor: loading ? '#5f6368' : '#1557b0' },
              '&.Mui-disabled': { backgroundColor: '#5f6368', color: 'white' }
            }}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
          <IconButton size="small" onClick={() => fileInputRef.current?.click()} title="Attach files">
            <AttachFileIcon sx={{ color: '#5f6368' }} />
          </IconButton>
          <Typography variant="caption" sx={{ color: '#80868b', ml: 1 }}>
            {attachments.length > 0 ? `${attachments.length} file(s) attached` : 'Add attachments'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} title="Discard">
          <DeleteIcon sx={{ color: '#5f6368' }} />
        </IconButton>
      </Box>
    </Dialog>
  );
};

export default ComposeDialog;
