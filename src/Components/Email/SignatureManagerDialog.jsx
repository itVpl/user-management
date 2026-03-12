import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import {
  getSignatures,
  createSignature,
  updateSignature,
  deleteSignature,
  setDefaultSignature,
  uploadSignatureImage,
} from './emailService';

const SignatureManagerDialog = ({ open, onClose, emailAccountId, accountName = '' }) => {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: 'Default',
    contentHtml: '',
    contentText: '',
    isDefault: false,
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = React.useRef(null);

  const fetchSignatures = async () => {
    if (!emailAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getSignatures(emailAccountId);
      setSignatures(res.signatures || []);
    } catch (err) {
      setError(err.message || 'Failed to load signatures');
      setSignatures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && emailAccountId) fetchSignatures();
  }, [open, emailAccountId]);

  const handleAdd = () => {
    setEditingId(null);
    setForm({ name: 'Default', contentHtml: '', contentText: '', isDefault: signatures.length === 0 });
    setEditorOpen(true);
  };

  const handleEdit = (sig) => {
    setEditingId(sig._id);
    setForm({
      name: sig.name || 'Default',
      contentHtml: sig.contentHtml || '',
      contentText: sig.contentText || '',
      isDefault: !!sig.isDefault,
    });
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm({ name: 'Default', contentHtml: '', contentText: '', isDefault: false });
  };

  const handleSave = async () => {
    if (!emailAccountId) return;
    setSaveLoading(true);
    setError(null);
    try {
      if (editingId) {
        await updateSignature(emailAccountId, editingId, form);
      } else {
        await createSignature(emailAccountId, form);
      }
      await fetchSignatures();
      handleEditorClose();
    } catch (err) {
      setError(err.message || 'Failed to save signature');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (sig) => {
    if (!emailAccountId || !window.confirm(`Delete signature "${sig.name}"?`)) return;
    setError(null);
    try {
      await deleteSignature(emailAccountId, sig._id);
      await fetchSignatures();
    } catch (err) {
      setError(err.message || 'Failed to delete signature');
    }
  };

  const handleSetDefault = async (sig) => {
    if (!emailAccountId || sig.isDefault) return;
    setError(null);
    try {
      await setDefaultSignature(emailAccountId, sig._id);
      await fetchSignatures();
    } catch (err) {
      setError(err.message || 'Failed to set default signature');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !emailAccountId) return;
    setUploadingImage(true);
    setError(null);
    try {
      const res = await uploadSignatureImage(emailAccountId, file);
      const url = res.url || res.data?.url;
      if (url) {
        const imgTag = `<img src="${url}" alt="${res.filename || 'Image'}" style="max-width:200px;height:auto;" />`;
        setForm((prev) => ({ ...prev, contentHtml: (prev.contentHtml || '') + imgTag }));
      }
    } catch (err) {
      setError(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #e0e0e0' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Manage Signatures {accountName ? `– ${accountName}` : ''}
          </Typography>
          <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', mt: 0.25 }}>
            The default signature is appended at the end of every email you send (compose and reply).
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {editorOpen ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>{editingId ? 'Edit signature' : 'New signature'}</Typography>
            <TextField
              fullWidth
              size="small"
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              sx={{ mb: 1.5 }}
              placeholder="e.g. Default, With disclaimer"
            />
            <TextField
              fullWidth
              multiline
              minRows={4}
              size="small"
              label="HTML content (links, images, formatting)"
              helperText={'Appended at the end of every email. Use <a href="...">Link text</a> for links, <img src="url"> for images.'}
              value={form.contentHtml}
              onChange={(e) => setForm((f) => ({ ...f, contentHtml: e.target.value }))}
              sx={{ mb: 1 }}
              placeholder={'<p><strong>Your Name</strong><br/>Title<br/>Company<br/>Ph: (123) 456-7890<br/><a href="https://yoursite.com">Visit our website</a></p>'}
            />
            <Box sx={{ mb: 1.5 }}>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <Button
                size="small"
                startIcon={uploadingImage ? <CircularProgress size={16} /> : <ImageIcon />}
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                sx={{ textTransform: 'none' }}
              >
                {uploadingImage ? 'Uploading…' : 'Insert image'}
              </Button>
            </Box>
            <TextField
              fullWidth
              multiline
              minRows={2}
              size="small"
              label="Plain text fallback"
              value={form.contentText}
              onChange={(e) => setForm((f) => ({ ...f, contentText: e.target.value }))}
              sx={{ mb: 1.5 }}
              placeholder="Plain text version of your signature"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                />
              }
              label="Use as default signature"
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button variant="contained" onClick={handleSave} disabled={saveLoading}>
                {saveLoading ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outlined" onClick={handleEditorClose} disabled={saveLoading}>
                Cancel
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            <Box sx={{ p: 2, pt: 1.5 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                disabled={!emailAccountId}
                sx={{ textTransform: 'none' }}
              >
                Add signature
              </Button>
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : signatures.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#5f6368' }}>
                  No signatures yet. Add one to append it to every email you send.
                </Typography>
              </Box>
            ) : (
              <List sx={{ pt: 0 }}>
                {signatures.map((sig) => (
                  <ListItem
                    key={sig._id}
                    sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f0f0f0' }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">{sig.name || 'Unnamed'}</Typography>
                          {sig.isDefault && (
                            <Chip size="small" label="Default" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#e8f0fe', color: '#1a73e8' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', mt: 0.5 }} noWrap>
                          {(sig.contentHtml || sig.contentText || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 60)}…
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      {!sig.isDefault && (
                        <Tooltip title="Set as default">
                          <IconButton size="small" onClick={() => handleSetDefault(sig)} sx={{ mr: 0.5 }}>
                            <CheckCircleIcon sx={{ fontSize: 20, color: '#5f6368' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton size="small" onClick={() => handleEdit(sig)} sx={{ mr: 0.5 }}>
                        <EditIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(sig)}>
                        <DeleteIcon sx={{ fontSize: 20, color: '#d93025' }} />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SignatureManagerDialog;
