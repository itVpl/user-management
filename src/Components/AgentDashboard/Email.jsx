import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  TextField,
  IconButton,
  Chip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  Reply as ReplyIcon,
  ReplyAll as ReplyAllIcon,
  Forward as ForwardIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  AttachFile as AttachFileIcon,
  Inbox as InboxIcon,
  Send as SentIcon,
  MoreVert as MoreVertIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import axios from 'axios';
import ReplyDialog from '../Email/ReplyDialog';
import { replyToEmailWithFiles } from '../Email/emailService';

// API Base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

const Email = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State management
  const [selectedTab, setSelectedTab] = useState(0);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [accountData, setAccountData] = useState({
    email: '',
    appPassword: '',
    displayName: '',
    notes: ''
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createdAccountId, setCreatedAccountId] = useState(() => {
    // First try to get from sessionStorage user object (from login response)
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.emailAccountId) {
          return user.emailAccountId;
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    // Fallback to sessionStorage emailAccountId
    const sessionAccountId = sessionStorage.getItem('emailAccountId');
    if (sessionAccountId) {
      return sessionAccountId;
    }
    // Last fallback to localStorage (for backward compatibility)
    return localStorage.getItem('emailAccountId') || null;
  });
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [isAccountTested, setIsAccountTested] = useState(false);

  // Compose email state
  const [composeData, setComposeData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    attachments: []
  });

  // Reply state
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [replyError, setReplyError] = useState(null);
  const [replyToEmail, setReplyToEmail] = useState(null);

  // Tab configuration
  const tabs = [
    { label: 'Inbox', icon: <InboxIcon />, count: emails.filter(e => !e.isRead && e.folder === 'inbox').length },
    { label: 'Sent', icon: <SentIcon />, count: emails.filter(e => e.folder === 'sent').length },
  ];

  // Sample email data
  const sampleEmails = [
    {
      id: 1,
      from: 'john.doe@logistics.com',
      fromName: 'John Doe',
      to: 'user@example.com',
      subject: 'Shipment Update - LD0331',
      body: 'Your shipment LD0331 has been successfully delivered to the destination. Please find the delivery confirmation attached.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isRead: false,
      isStarred: false,
      folder: 'inbox',
      priority: 'high',
      attachments: ['delivery_confirmation.pdf']
    },
    {
      id: 2,
      from: 'support@vpower.com',
      fromName: 'V Power Support',
      to: 'user@example.com',
      subject: 'Welcome to V Power Logistics Platform',
      body: 'Thank you for joining V Power Logistics. We are excited to have you on board. Your account has been successfully created.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isRead: true,
      isStarred: true,
      folder: 'inbox',
      priority: 'normal',
      attachments: []
    },
    {
      id: 3,
      from: 'user@example.com',
      fromName: 'You',
      to: 'billing@logistics.com',
      subject: 'Invoice Query - March 2024',
      body: 'I have a question regarding the invoice for March 2024. Could you please clarify the charges?',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      isRead: true,
      isStarred: false,
      folder: 'sent',
      priority: 'normal',
      attachments: []
    },
  ];

  // Load emails on component mount
  useEffect(() => {
    if (createdAccountId) {
      loadEmails();
    }
  }, [createdAccountId]);

  const loadEmails = async () => {
    if (!createdAccountId) {

      setEmails(sampleEmails); // Show sample emails if no account
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Get authentication token
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || 
                    sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        setError('Please login to access emails');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/email-inbox/inbox?emailAccountId=${createdAccountId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Transform API response to match our email format
      const fetchedEmails = response.data?.emails || response.data?.data || [];
      const transformedEmails = fetchedEmails.map((email, index) => ({
        id: email._id || email.id || index,
        uid: email.uid || email._id || email.id,
        from: email.from || email.sender || 'unknown@example.com',
        fromName: email.fromName || email.senderName || email.from || 'Unknown Sender',
        to: email.to || email.recipient || 'you@example.com',
        subject: email.subject || 'No Subject',
        body: email.body || email.text || email.textBody || email.content || '',
        html: email.html || email.htmlBody || email.htmlContent || '',
        timestamp: email.timestamp || email.date || email.createdAt || new Date(),
        isRead: email.isRead || email.read || email.seen || false,
        isStarred: email.isStarred || email.starred || false,
        folder: email.folder || 'inbox',
        priority: email.priority || 'normal',
        attachments: email.attachments || [],
        hasAttachments: email.hasAttachments || false,
        attachmentCount: email.attachmentCount || 0,
        inlineImages: email.inlineImages || email.images || []
      }));

      setEmails(transformedEmails.length > 0 ? transformedEmails : sampleEmails);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load emails');
      console.error('Error loading emails:', err);
      setEmails(sampleEmails); // Fallback to sample emails on error
    } finally {
      setLoading(false);
    }
  };

  const loadSentEmails = async () => {
    if (!createdAccountId) {
      setEmails(sampleEmails.filter(e => e.folder === 'sent'));
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Get authentication token
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || 
                    sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        setError('Please login to access emails');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/email-inbox/sent?emailAccountId=${createdAccountId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Transform API response to match our email format
      const fetchedEmails = response.data?.emails || response.data?.data || [];
      const transformedEmails = fetchedEmails.map((email, index) => ({
        id: email._id || email.id || index,
        uid: email.uid || email._id || email.id,
        from: email.from || email.sender || 'unknown@example.com',
        fromName: email.fromName || email.senderName || email.from || 'Unknown Sender',
        to: email.to || email.recipient || 'you@example.com',
        subject: email.subject || 'No Subject',
        body: email.body || email.text || email.textBody || email.content || '',
        html: email.html || email.htmlBody || email.htmlContent || '',
        timestamp: email.timestamp || email.date || email.createdAt || new Date(),
        isRead: email.isRead || email.read || email.seen || false,
        isStarred: email.isStarred || email.starred || false,
        folder: 'sent', // Ensure folder is 'sent'
        priority: email.priority || 'normal',
        attachments: email.attachments || [],
        hasAttachments: email.hasAttachments || false,
        attachmentCount: email.attachmentCount || 0,
        inlineImages: email.inlineImages || email.images || []
      }));

      setEmails(transformedEmails.length > 0 ? transformedEmails : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sent emails');
      console.error('Error loading sent emails:', err);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    setSelectedEmail(null);
    
    // Load sent emails when Sent tab (index 1) is selected
    if (newValue === 1 && createdAccountId) {
      loadSentEmails();
    } else if (newValue === 0 && createdAccountId) {
      // Load inbox emails when Inbox tab (index 0) is selected
      loadEmails();
    }
  };

  // State for loading single email
  const [emailLoading, setEmailLoading] = useState(false);

  const handleEmailSelect = async (email) => {
    // Set basic email info first
    setSelectedEmail(email);
    
    if (!email.isRead) {
      markAsRead(email.id);
    }

    // Always fetch full email to get attachments and full content
    setEmailLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || 
                    sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token || !createdAccountId) {

        setEmailLoading(false);
        return;
      }

      const uid = email.uid || email.id;

      const response = await axios.get(
        `${API_BASE_URL}/email-inbox/${uid}?emailAccountId=${createdAccountId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.email) {
        const fullEmail = response.data.email;
        setSelectedEmail({
          ...email,
          ...fullEmail,
          id: email.id || fullEmail.uid,
          uid: fullEmail.uid || email.uid,
          body: fullEmail.content || fullEmail.text || email.body,
          html: fullEmail.html || email.html,
          attachments: fullEmail.attachments || [],
          hasAttachments: fullEmail.hasAttachments || (fullEmail.attachments?.length > 0)
        });
      }
    } catch (err) {
      console.error('Error fetching full email:', err);
      // Keep the basic email info if fetch fails
    } finally {
      setEmailLoading(false);
    }
  };

  const markAsRead = (emailId) => {
    setEmails(prev => prev.map(email => 
      email.id === emailId ? { ...email, isRead: true } : email
    ));
  };

  const toggleStar = (emailId) => {
    setEmails(prev => prev.map(email => 
      email.id === emailId ? { ...email, isStarred: !email.isStarred } : email
    ));
  };

  const deleteEmail = (emailId) => {
    setEmails(prev => prev.map(email => 
      email.id === emailId ? { ...email, folder: 'trash' } : email
    ));
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null);
    }
  };

  // State for compose loading and sending
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState(null);

  // Convert file to base64 (without data:xxx;base64, prefix)
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data:image/xxx;base64, prefix
        const result = reader.result;
        const base64 = result.includes(',') ? result.split(',')[1] : result;

        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file selection for attachments
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    const newAttachments = await Promise.all(
      files.map(async (file) => ({
        file,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      }))
    );
    setComposeData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setComposeData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleComposeSubmit = async () => {
    setComposeSending(true);
    setComposeError(null);

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || 
                    sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        setComposeError('Please login to send emails');
        setComposeSending(false);
        return;
      }

      // Use FormData for file uploads (new API endpoint)
      const formData = new FormData();
      formData.append('to', composeData.to);
      formData.append('subject', composeData.subject);
      formData.append('text', composeData.body);
      
      // Add emailAccountId if available
      if (createdAccountId) {
        formData.append('emailAccountId', createdAccountId);
      }

      // Add file attachments
      composeData.attachments.forEach((att) => {
        formData.append('attachments', att.file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/email-inbox/send-files`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        // Add to sent emails locally
        const newEmail = {
          id: Date.now(),
          from: response.data.sentFrom?.email || 'user@example.com',
          fromName: response.data.sentFrom?.displayName || 'You',
          to: composeData.to,
          subject: composeData.subject,
          body: composeData.body,
          timestamp: new Date(),
          isRead: true,
          isStarred: false,
          folder: 'sent',
          priority: 'normal',
          attachments: composeData.attachments.map(att => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size
          }))
        };
        setEmails(prev => [newEmail, ...prev]);
        setComposeOpen(false);
        setComposeData({ to: '', cc: '', bcc: '', subject: '', body: '', attachments: [] });
      } else {
        setComposeError(response.data.message || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
      setComposeError(err.response?.data?.message || 'Failed to send email');
    } finally {
      setComposeSending(false);
    }
  };

  const handleCreateAccount = async () => {
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(false);

    try {
      // Get authentication token
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || 
                    sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        setCreateError('Please login to access this resource');
        setCreateLoading(false);
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/email-accounts/create`,
        accountData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Full Response Object:', JSON.stringify(response.data, null, 2));
      
      // Store the created account ID - handle different response structures
      let accountId = null;
      if (response.data) {
        // Try different possible response structures
        accountId = response.data._id || 
                   response.data.id || 
                   response.data.data?._id || 
                   response.data.data?.id ||
                   response.data.emailAccount?._id ||
                   response.data.emailAccount?.id ||
                   response.data.account?._id ||
                   response.data.account?.id ||
                   response.data.result?._id ||
                   response.data.result?.id;
        
        if (accountId) {
          setCreatedAccountId(accountId);
          localStorage.setItem('emailAccountId', accountId); // Save to localStorage

          setCreateSuccess(true);
        } else {
          console.warn('⚠️ Could not find account ID in response. Full response:', response.data);
          // Still show success but with a message to manually enter ID
          setCreateSuccess(true);
          setCreateError('Account created but ID not found. Please copy the ID from database and paste in Test Connection.');
        }
      } else {
        setCreateSuccess(true);
      }
      setTimeout(() => {
        setCreateAccountOpen(false);
        setAccountData({ email: '', appPassword: '', displayName: '', notes: '' });
        setCreateSuccess(false);
      }, 2000);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create email account');
      console.error('Error creating email account:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleTestConnection = async () => {

    if (!createdAccountId) {
      setTestError('Please create an email account first');
      return;
    }

    setTestLoading(true);
    setTestError(null);
    setTestSuccess(false);

    try {
      // Get authentication token
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || 
                    sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        setTestError('Please login to access this resource');
        setTestLoading(false);
        return;
      }

      const testUrl = `${API_BASE_URL}/email-accounts/${createdAccountId}/test`;

      const response = await axios.post(
        testUrl,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setTestSuccess(true);
      setIsAccountTested(true);
      setTimeout(() => {
        setTestDialogOpen(false);
        setTestSuccess(false);
      }, 2000);
    } catch (err) {
      setTestError(err.response?.data?.message || 'Failed to test email connection');
      console.error('Error testing email connection:', err);
      console.error('Error response:', err.response?.data);
    } finally {
      setTestLoading(false);
    }
  };

  const handleReply = (email) => {
    setReplyToEmail(email);
    setReplyOpen(true);
    setReplyError(null);
    setReplySuccess(false);
  };

  const handleReplySubmit = async (replyData) => {
    setReplyLoading(true);
    setReplyError(null);
    setReplySuccess(false);

    try {
      // Use reply-files endpoint with FormData
      const response = await replyToEmailWithFiles({
        ...replyData,
        emailAccountId: createdAccountId
      });

      if (response.success) {
        setReplySuccess(true);
        // Reload sent emails after replying
        if (createdAccountId) {
          setTimeout(() => {
            loadSentEmails();
          }, 500);
        }
        setTimeout(() => {
          setReplyOpen(false);
          setReplySuccess(false);
          setReplyToEmail(null);
        }, 2000);
      } else {
        setReplyError(response.message || 'Failed to send reply');
      }
    } catch (err) {
      setReplyError(err.response?.data?.message || err.message || 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const getFilteredEmails = () => {
    let filtered = emails;
    const tabFolders = ['inbox', 'sent'];
    
    if (selectedTab < tabs.length) {
      filtered = filtered.filter(email => email.folder === tabFolders[selectedTab]);
    }

    if (searchQuery) {
      filtered = filtered.filter(email => 
        email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.fromName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.body.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const emailDate = new Date(timestamp);
    const diffInHours = (now - emailDate) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return emailDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return emailDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Check if content is HTML
  const isHtmlContent = (content) => {
    if (!content) return false;
    return /<[a-z][\s\S]*>/i.test(content);
  };

  // Get image attachments from email
  const getImageAttachments = (email) => {
    if (!email?.attachments || !Array.isArray(email.attachments)) return [];
    return email.attachments.filter(att => {
      if (!att) return false;
      const filename = att.filename || att.name || att.fileName || (typeof att === 'string' ? att : '');
      const contentType = att.contentType || att.mimeType || att.type || '';
      if (typeof filename === 'string' && filename) {
        return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename) || contentType.startsWith('image/');
      }
      return contentType.startsWith('image/');
    });
  };

  // Build image URL from attachment data
  const getAttachmentUrl = (att) => {
    if (!att) return null;
    // Direct URL
    if (att.url) return att.url;
    if (att.path) return att.path;
    if (att.link) return att.link;
    // Base64 data - use contentType from API response
    const base64Data = att.content || att.data || att.base64;
    const mimeType = att.contentType || att.mimeType || att.type || 'application/octet-stream';
    if (base64Data) {
      // Check if already has data URI prefix
      if (typeof base64Data === 'string' && base64Data.startsWith('data:')) {
        return base64Data;
      }
      // Build data URL: data:contentType;base64,content
      return `data:${mimeType};base64,${base64Data}`;
    }
    return null;
  };

  // Get non-image attachments
  const getOtherAttachments = (email) => {
    if (!email?.attachments) return [];
    return email.attachments.filter(att => {
      const filename = att.filename || att.name || att;
      const contentType = att.contentType || att.mimeType || '';
      if (typeof filename === 'string') {
        return !/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename) && !contentType.startsWith('image/');
      }
      return !contentType.startsWith('image/');
    });
  };

  // Get MIME type from filename
  const getMimeTypeFromFilename = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'json': 'application/json',
      'xml': 'application/xml',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  // Download attachment - using data URL method from API docs
  const downloadAttachment = (att) => {
    const filename = att.filename || att.name || att.fileName || 'attachment';
    const base64Data = att.content || att.data || att.base64;
    const contentType = att.contentType || att.mimeType || att.type || getMimeTypeFromFilename(filename);
    
    if (!base64Data) {
      // If there's a direct URL, open it
      if (att.url || att.path || att.link) {
        window.open(att.url || att.path || att.link, '_blank');
        return;
      }
      console.error('No attachment data found');
      return;
    }

    try {
      // Create download link using data URL format
      // Format: data:contentType;base64,content
      const link = document.createElement('a');
      link.href = `data:${contentType};base64,${base64Data}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error downloading attachment:', error);
    }
  };

  const EmailViewer = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
      {selectedEmail ? (
        <>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 400, color: '#202124' }}>
                {selectedEmail.subject}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title={selectedEmail.isStarred ? 'Remove from starred' : 'Add to starred'}>
                  <IconButton size="small" onClick={() => toggleStar(selectedEmail.id)}>
                    {selectedEmail.isStarred ? 
                      <StarIcon sx={{ color: '#fbbc04', fontSize: 20 }} /> : 
                      <StarBorderIcon sx={{ fontSize: 20, color: '#5f6368' }} />
                    }
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reply">
                  <IconButton size="small" onClick={() => handleReply(selectedEmail)}>
                    <ReplyIcon sx={{ fontSize: 20, color: '#5f6368' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => deleteEmail(selectedEmail.id)}>
                    <DeleteIcon sx={{ fontSize: 20, color: '#5f6368' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#202124', mb: 0.5 }}>
                  {selectedEmail.fromName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#5f6368' }}>
                  to me
                </Typography>
                <Typography variant="caption" sx={{ color: '#5f6368', ml: 1 }}>
                  {new Date(selectedEmail.timestamp).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {selectedEmail.priority === 'high' && (
                  <Chip label="High Priority" size="small" sx={{ bgcolor: '#fce8e6', color: '#d93025', fontWeight: 500 }} />
                )}
                {(selectedEmail.hasAttachments || selectedEmail.attachmentCount > 0) && (
                  <Chip 
                    icon={<AttachFileIcon sx={{ fontSize: 14 }} />}
                    label={`${selectedEmail.attachmentCount || selectedEmail.attachments?.length || ''} attachment(s)`}
                    size="small" 
                    sx={{ bgcolor: '#e8f0fe', color: '#1a73e8', fontWeight: 500 }} 
                  />
                )}
              </Box>
            </Box>
          </Box>
          
          {/* Loading indicator for attachments */}
          {emailLoading && (
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e0e0e0' }}>
              <CircularProgress size={16} />
              <Typography variant="caption" sx={{ color: '#5f6368' }}>Loading attachments...</Typography>
            </Box>
          )}
          
          {/* Email Body Content */}
          <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
            {isHtmlContent(selectedEmail.body) || isHtmlContent(selectedEmail.html) ? (
              <Box
                sx={{
                  '& img': {
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: 1,
                    my: 1
                  },
                  '& a': {
                    color: '#1a73e8',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  },
                  '& p': { margin: '8px 0' },
                  '& table': { maxWidth: '100%' },
                  lineHeight: 1.6,
                  color: '#202124',
                  fontSize: '0.875rem'
                }}
                dangerouslySetInnerHTML={{ 
                  __html: selectedEmail.html || selectedEmail.body 
                }}
              />
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: 1.6, 
                  color: '#202124',
                  '& a': {
                    color: '#1a73e8',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }
                }}
              >
                {selectedEmail.body}
              </Typography>
            )}

            {/* Display Image Attachments */}
            {getImageAttachments(selectedEmail).length > 0 && (
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle2" sx={{ color: '#5f6368', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachFileIcon sx={{ fontSize: 18 }} />
                  Images ({getImageAttachments(selectedEmail).length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {getImageAttachments(selectedEmail).map((att, index) => {
                    const filename = att.filename || att.name || att.fileName || `Image ${index + 1}`;
                    const imageUrl = getAttachmentUrl(att);
                    
                    return (
                      <Box 
                        key={index} 
                        sx={{ 
                          border: '1px solid #e0e0e0', 
                          borderRadius: 2, 
                          overflow: 'hidden',
                          maxWidth: 300,
                          cursor: 'pointer',
                          '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                        }}
                        onClick={() => downloadAttachment(att)}
                      >
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={filename}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: 200, 
                              objectFit: 'contain',
                              display: 'block'
                            }}
                            onError={(e) => {

                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Box sx={{ 
                            width: 150, 
                            height: 100, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            backgroundColor: '#f5f5f5'
                          }}>
                            <AttachFileIcon sx={{ fontSize: 32, color: '#9e9e9e' }} />
                          </Box>
                        )}
                        <Box sx={{ p: 1, backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" sx={{ color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>
                            {filename}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#1a73e8', ml: 1, flexShrink: 0 }}>
                            Download
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Display Other Attachments */}
            {getOtherAttachments(selectedEmail).length > 0 && (
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle2" sx={{ color: '#5f6368', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachFileIcon sx={{ fontSize: 18 }} />
                  Attachments ({getOtherAttachments(selectedEmail).length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {getOtherAttachments(selectedEmail).map((att, index) => {
                    const filename = att.filename || att.name || att.fileName || `Attachment ${index + 1}`;
                    const hasContent = att.content || att.data || att.base64 || att.url;
                    
                    return (
                      <Chip
                        key={index}
                        icon={<AttachFileIcon sx={{ fontSize: 16 }} />}
                        label={typeof filename === 'string' ? filename : `Attachment ${index + 1}`}
                        variant="outlined"
                        onClick={() => downloadAttachment(att)}
                        sx={{ 
                          cursor: hasContent ? 'pointer' : 'default',
                          '&:hover': { backgroundColor: '#e8f0fe', borderColor: '#1a73e8' }
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5f6368' }}>
          <EmailIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 400 }}>
            Select an email to read
          </Typography>
        </Box>
      )}
    </Box>
  );

  const ComposeDialog = () => (
    <Dialog
      open={composeOpen}
      onClose={() => !composeSending && setComposeOpen(false)}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, minHeight: isMobile ? '100vh' : 600 } }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 400, color: '#202124' }}>
          New Message
        </Typography>
        <IconButton size="small" onClick={() => !composeSending && setComposeOpen(false)}>
          <DeleteIcon sx={{ fontSize: 20, color: '#5f6368' }} />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {composeError && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setComposeError(null)}>
            {composeError}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ minWidth: 60, color: '#5f6368', fontWeight: 500 }}>To</Typography>
            <TextField
              value={composeData.to}
              onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
              fullWidth
              placeholder="Recipients"
              variant="standard"
              InputProps={{ disableUnderline: true, sx: { fontSize: '0.875rem' } }}
              required
            />
          </Box>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ minWidth: 60, color: '#5f6368', fontWeight: 500 }}>Subject</Typography>
            <TextField
              value={composeData.subject}
              onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
              fullWidth
              placeholder="Subject"
              variant="standard"
              InputProps={{ disableUnderline: true, sx: { fontSize: '0.875rem' } }}
              required
            />
          </Box>
          <Box sx={{ flexGrow: 1, p: 2 }}>
            <TextField
              value={composeData.body}
              onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
              fullWidth
              multiline
              placeholder="Compose email"
              variant="standard"
              InputProps={{ disableUnderline: true, sx: { fontSize: '0.875rem', '& textarea': { minHeight: 200, resize: 'none' } } }}
              required
            />
          </Box>

          {/* Attachments Section */}
          {composeData.attachments.length > 0 && (
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
              <Typography variant="caption" sx={{ color: '#5f6368', mb: 1, display: 'block' }}>
                Attachments ({composeData.attachments.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {composeData.attachments.map((att, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      backgroundColor: 'white',
                      maxWidth: 200
                    }}
                  >
                    {att.preview ? (
                      <img 
                        src={att.preview} 
                        alt={att.filename}
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                      />
                    ) : (
                      <AttachFileIcon sx={{ fontSize: 24, color: '#5f6368' }} />
                    )}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#202124' }}>
                        {att.filename}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#5f6368' }}>
                        {(att.size / 1024).toFixed(1)} KB
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => removeAttachment(index)}>
                      <DeleteIcon sx={{ fontSize: 16, color: '#5f6368' }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={composeSending ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <SendIcon />}
            onClick={handleComposeSubmit}
            disabled={!composeData.to || !composeData.subject || !composeData.body || composeSending}
            sx={{ backgroundColor: '#1a73e8', textTransform: 'none', fontWeight: 500, px: 3 }}
          >
            {composeSending ? 'Sending...' : 'Send'}
          </Button>
          <input
            type="file"
            id="compose-file-input"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <Tooltip title="Attach files">
            <IconButton 
              onClick={() => document.getElementById('compose-file-input').click()}
              disabled={composeSending}
            >
              <AttachFileIcon sx={{ color: '#5f6368' }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Button 
          onClick={() => {
            setComposeOpen(false);
            setComposeData({ to: '', cc: '', bcc: '', subject: '', body: '', attachments: [] });
            setComposeError(null);
          }} 
          disabled={composeSending}
          sx={{ color: '#5f6368', textTransform: 'none' }}
        >
          Discard
        </Button>
      </Box>
    </Dialog>
  );

  return (
    <Box sx={{ 
      height: 'calc(100vh - 120px)', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden',
      width: '100%'
    }}>
      {/* Gmail-style Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 2, 
        borderBottom: '1px solid #e0e0e0', 
        backgroundColor: 'white', 
        minHeight: 64, 
        flexShrink: 0,
        overflow: 'hidden',
        minWidth: 0
      }}>
        <Typography variant="h6" sx={{ fontWeight: 400, color: '#5f6368', mr: 4, flexShrink: 0 }}>
          V Power Mail
        </Typography>
        <Box sx={{ flexGrow: 1, maxWidth: 600, position: 'relative', minWidth: 0 }}>
          <TextField
            placeholder="Search mail"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: '#5f6368', mr: 1 }} />,
              sx: {
                backgroundColor: '#f1f3f4',
                borderRadius: '24px',
                '& fieldset': { border: 'none' },
                '&:hover': { backgroundColor: '#e8eaed' }
              }
            }}
            sx={{ width: '100%' }}
          />
        </Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          ml: 'auto',
          flexShrink: 0,
          minWidth: 0,
          flexWrap: 'wrap'
        }}>
          <IconButton size="small" onClick={loadEmails}>
            <RefreshIcon />
          </IconButton>
          <IconButton size="small">
            <FilterListIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setCreateAccountOpen(true)}
            disabled={isAccountTested}
            sx={{
              textTransform: 'none',
              borderColor: isAccountTested ? '#9e9e9e' : '#1a73e8',
              color: isAccountTested ? '#9e9e9e' : '#1a73e8',
              fontWeight: 500,
              ml: 1,
              whiteSpace: 'nowrap',
              '&:hover': { 
                borderColor: isAccountTested ? '#9e9e9e' : '#1557b0', 
                backgroundColor: isAccountTested ? 'transparent' : '#e8f0fe' 
              },
              '&.Mui-disabled': {
                borderColor: '#e0e0e0',
                color: '#9e9e9e'
              }
            }}
          >
            Create Account
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => {
              setTestDialogOpen(true);
              // Trigger test automatically when dialog opens
              setTimeout(() => {
                handleTestConnection();
              }, 100);
            }}
            disabled={!createdAccountId}
            sx={{
              textTransform: 'none',
              backgroundColor: '#34a853',
              color: 'white',
              fontWeight: 500,
              ml: 1,
              whiteSpace: 'nowrap',
              '&:hover': { backgroundColor: '#2d8e47' },
              '&.Mui-disabled': {
                backgroundColor: '#e0e0e0',
                color: '#9e9e9e'
              }
            }}
          >
            Test Connection
          </Button>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1, 
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        position: 'relative',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Left Sidebar */}
        <Box sx={{ 
          width: 256, 
          backgroundColor: 'white', 
          borderRight: '1px solid #e0e0e0', 
          display: 'flex', 
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <Box sx={{ p: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setComposeOpen(true)}
              sx={{
                width: '100%',
                borderRadius: '24px',
                textTransform: 'none',
                fontWeight: 500,
                py: 1.5,
                backgroundColor: '#c2e7ff',
                color: '#001d35',
                '&:hover': { backgroundColor: '#a8d8ff' }
              }}
            >
              Compose
            </Button>
          </Box>
          <Box sx={{ flexGrow: 1, px: 1 }}>
            {tabs.map((tab, index) => (
              <Box
                key={index}
                onClick={() => handleTabChange(null, index)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1.5,
                  borderRadius: '0 24px 24px 0',
                  cursor: 'pointer',
                  backgroundColor: selectedTab === index ? '#fce8e6' : 'transparent',
                  color: selectedTab === index ? '#d93025' : '#5f6368',
                  '&:hover': { backgroundColor: selectedTab === index ? '#fce8e6' : '#f1f3f4' }
                }}
              >
                <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>{tab.icon}</Box>
                <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: selectedTab === index ? 500 : 400 }}>
                  {tab.label}
                </Typography>
                {tab.count > 0 && (
                  <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 500, ml: 1 }}>
                    {tab.count}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Email List */}
        <Box sx={{ 
          width: { xs: '100%', md: 'calc(100% - 256px)' },
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'white',
          boxSizing: 'border-box'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', p: 1, borderBottom: '1px solid #e0e0e0', backgroundColor: 'white', minHeight: 48 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
              <IconButton size="small" onClick={loadEmails}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
            <Typography variant="caption" sx={{ color: '#5f6368', mr: 2 }}>
              1-{getFilteredEmails().length}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {getFilteredEmails().map((email) => (
                  <ListItem
                    key={email.id}
                    onClick={() => handleEmailSelect(email)}
                    selected={selectedEmail?.id === email.id}
                    sx={{
                      borderBottom: '1px solid #e0e0e0',
                      backgroundColor: email.isRead ? 'white' : '#f8f9fa',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#f1f3f4' },
                      '&.Mui-selected': { backgroundColor: '#e8f0fe' },
                      py: 0.5
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(email.id);
                        }}
                        sx={{ p: 0.5 }}
                      >
                        {email.isStarred ? 
                          <StarIcon sx={{ fontSize: 18, color: '#fbbc04' }} /> : 
                          <StarBorderIcon sx={{ fontSize: 18, color: '#5f6368' }} />
                        }
                      </IconButton>
                      <Typography variant="body2" sx={{ minWidth: 200, fontWeight: email.isRead ? 400 : 600, color: email.isRead ? '#5f6368' : '#202124' }}>
                        {email.fromName}
                      </Typography>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: email.isRead ? 400 : 600, color: email.isRead ? '#5f6368' : '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {email.subject}
                          </Typography>
                          {email.attachments.length > 0 && (
                            <AttachFileIcon sx={{ fontSize: 16, color: '#5f6368' }} />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {email.body.substring(0, 80)}...
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#5f6368', minWidth: 60, textAlign: 'right' }}>
                        {formatTimestamp(email.timestamp)}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </Box>
      
      {/* Create Account Dialog */}
      <Dialog
        open={createAccountOpen}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') {
            setCreateAccountOpen(false);
          }
        }}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={false}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 500, color: '#202124' }}>
            Create Email Account
          </Typography>
          <IconButton size="small" onClick={() => setCreateAccountOpen(false)}>
            <DeleteIcon sx={{ fontSize: 20, color: '#5f6368' }} />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          {createSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Email account created successfully!
                </Typography>
                {createdAccountId && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                    Account ID: {createdAccountId}
                  </Typography>
                )}
              </Box>
            </Alert>
          )}
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email Address"
              value={accountData.email}
              onChange={(e) => setAccountData(prev => ({ ...prev, email: e.target.value }))}
              fullWidth
              required
              placeholder="example@gmail.com"
              variant="outlined"
              autoComplete="off"
            />
            <TextField
              label="App Password"
              value={accountData.appPassword}
              onChange={(e) => setAccountData(prev => ({ ...prev, appPassword: e.target.value }))}
              fullWidth
              required
              placeholder="xxxx xxxx xxxx xxxx"
              variant="outlined"
              helperText="Generate app password from your email provider settings"
              autoComplete="off"
            />
            <TextField
              label="Display Name"
              value={accountData.displayName}
              onChange={(e) => setAccountData(prev => ({ ...prev, displayName: e.target.value }))}
              fullWidth
              required
              placeholder="John Doe"
              variant="outlined"
              autoComplete="off"
            />
            <TextField
              label="Notes"
              value={accountData.notes}
              onChange={(e) => setAccountData(prev => ({ ...prev, notes: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              placeholder="Work email account"
              variant="outlined"
              autoComplete="off"
            />
            
            {/* Manual Account ID Entry */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="caption" sx={{ color: '#5f6368', mb: 1, display: 'block' }}>
                Or enter existing Account ID:
              </Typography>
              <TextField
                label="Account ID (if you already have one)"
                value={createdAccountId || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setCreatedAccountId(id);
                  if (id) {
                    localStorage.setItem('emailAccountId', id);
                  }
                }}
                fullWidth
                placeholder="692f002a48abf5029e44db26"
                variant="outlined"
                size="small"
                autoComplete="off"
              />
            </Box>
          </Box>
        </DialogContent>
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="contained"
            onClick={handleCreateAccount}
            disabled={!accountData.email || !accountData.appPassword || !accountData.displayName || createLoading}
            sx={{ backgroundColor: '#1a73e8', textTransform: 'none', fontWeight: 500, px: 3 }}
          >
            {createLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Create Account'}
          </Button>
          <Button onClick={() => setCreateAccountOpen(false)} sx={{ color: '#5f6368', textTransform: 'none' }}>
            Cancel
          </Button>
        </Box>
      </Dialog>

      {/* Test Connection Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 500, color: '#202124' }}>
            Test Email Connection
          </Typography>
          <IconButton size="small" onClick={() => setTestDialogOpen(false)}>
            <DeleteIcon sx={{ fontSize: 20, color: '#5f6368' }} />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          {testSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Email connection test successful!
            </Alert>
          )}
          {testError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {testError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', py: 3 }}>
            {testLoading ? (
              <>
                <CircularProgress size={48} sx={{ color: '#1a73e8', mb: 2 }} />
                <Typography variant="body1" sx={{ color: '#202124', textAlign: 'center' }}>
                  Testing email connection...
                </Typography>
                <Typography variant="caption" sx={{ color: '#5f6368', textAlign: 'center' }}>
                  Please wait
                </Typography>
              </>
            ) : createdAccountId ? (
              <>
                <EmailIcon sx={{ fontSize: 48, color: '#1a73e8', mb: 1 }} />
                <Typography variant="body1" sx={{ color: '#202124', textAlign: 'center' }}>
                  Testing your email connection
                </Typography>
                <Typography variant="caption" sx={{ color: '#5f6368', textAlign: 'center' }}>
                  Account ID: {createdAccountId}
                </Typography>
              </>
            ) : (
              <>
                <EmailIcon sx={{ fontSize: 48, color: '#9e9e9e', mb: 1, opacity: 0.5 }} />
                <Typography variant="body1" sx={{ color: '#5f6368', textAlign: 'center' }}>
                  No email account found
                </Typography>
                <Typography variant="caption" sx={{ color: '#9e9e9e', textAlign: 'center' }}>
                  Please create an email account first
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'center' }}>
          <Button 
            onClick={() => setTestDialogOpen(false)} 
            variant="contained"
            sx={{ 
              backgroundColor: '#1a73e8', 
              color: 'white',
              textTransform: 'none', 
              fontWeight: 500,
              px: 4,
              '&:hover': { backgroundColor: '#1557b0' }
            }}
          >
            Close
          </Button>
        </Box>
      </Dialog>

      <ComposeDialog />

      <ReplyDialog
        open={replyOpen}
        onClose={() => {
          setReplyOpen(false);
          setReplyToEmail(null);
          setReplyError(null);
          setReplySuccess(false);
        }}
        onReply={handleReplySubmit}
        loading={replyLoading}
        success={replySuccess}
        error={replyError}
        emailAccountId={createdAccountId}
        originalEmail={replyToEmail}
      />

      {/* Email Viewer Modal */}
      <Dialog
        open={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh',
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        {selectedEmail && (
          <Box sx={{ 
            height: '100%', 
            width: '100%',
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            minWidth: 0
          }}>
            {/* Email Header */}
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 500, color: '#202124', wordBreak: 'break-word', overflowWrap: 'break-word', flex: 1, pr: 1 }}>
                  {selectedEmail.subject}
                </Typography>
                <IconButton size="small" onClick={() => setSelectedEmail(null)}>
                  <CloseIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                  <IconButton size="small" onClick={() => toggleStar(selectedEmail.id)}>
                    {selectedEmail.isStarred ? 
                      <StarIcon sx={{ color: '#fbbc04', fontSize: 20 }} /> : 
                      <StarBorderIcon sx={{ fontSize: 20, color: '#5f6368' }} />
                    }
                  </IconButton>
                  <Tooltip title="Reply">
                    <IconButton size="small" onClick={() => handleReply(selectedEmail)}>
                      <ReplyIcon sx={{ fontSize: 20, color: '#5f6368' }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => deleteEmail(selectedEmail.id)}>
                      <DeleteIcon sx={{ fontSize: 20, color: '#5f6368' }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  {selectedEmail.priority === 'high' && (
                    <Chip label="High Priority" size="small" sx={{ bgcolor: '#fce8e6', color: '#d93025', fontWeight: 500 }} />
                  )}
                  {(selectedEmail.hasAttachments || selectedEmail.attachmentCount > 0) && (
                    <Chip 
                      icon={<AttachFileIcon sx={{ fontSize: 14 }} />}
                      label={`${selectedEmail.attachmentCount || selectedEmail.attachments?.length || ''} attachment(s)`}
                      size="small" 
                      sx={{ bgcolor: '#e8f0fe', color: '#1a73e8', fontWeight: 500 }} 
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#202124', mb: 0.5, wordBreak: 'break-word' }}>
                  {selectedEmail.fromName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#5f6368', wordBreak: 'break-all' }}>
                  {selectedEmail.from}
                </Typography>
                <Typography variant="caption" sx={{ color: '#5f6368', ml: 1, display: 'block', mt: 0.5 }}>
                  {new Date(selectedEmail.timestamp).toLocaleString()}
                </Typography>
              </Box>
            </Box>
            
            {/* Loading indicator for attachments */}
            {emailLoading && (
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" sx={{ color: '#5f6368' }}>Loading attachments...</Typography>
              </Box>
            )}
            
            {/* Email Body Content */}
            <Box sx={{ 
              p: 2, 
              flexGrow: 1, 
              overflow: 'auto',
              minWidth: 0,
              '& *': {
                maxWidth: '100%'
              }
            }}>
              {isHtmlContent(selectedEmail.body) || isHtmlContent(selectedEmail.html) ? (
                <Box
                  sx={{
                    '& img': {
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: 1,
                      my: 1
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
                      display: 'block',
                      wordBreak: 'break-word'
                    },
                    lineHeight: 1.6,
                    color: '#202124',
                    fontSize: '0.875rem',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: selectedEmail.html || selectedEmail.body 
                  }}
                />
              ) : (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    whiteSpace: 'pre-wrap', 
                    lineHeight: 1.6, 
                    color: '#202124',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    '& a': {
                      color: '#1a73e8',
                      textDecoration: 'none',
                      wordBreak: 'break-all',
                      '&:hover': { textDecoration: 'underline' }
                    }
                  }}
                >
                  {selectedEmail.body}
                </Typography>
              )}

              {/* Display Image Attachments */}
              {selectedEmail.inlineImages && selectedEmail.inlineImages.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Images:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedEmail.inlineImages.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img.url || img.src} 
                        alt={img.alt || `Image ${idx + 1}`}
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '200px', 
                          borderRadius: '4px',
                          objectFit: 'contain'
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            {/* Action Buttons */}
            <Box sx={{ 
              p: 2, 
              borderTop: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              gap: 1.5,
              flexShrink: 0,
              flexWrap: 'wrap'
            }}>
              <Button
                variant="outlined"
                startIcon={<ReplyIcon />}
                onClick={() => handleReply(selectedEmail)}
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
        )}
      </Dialog>
    </Box>
  );
};

export default Email;
