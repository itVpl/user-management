import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Alert,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
  Dialog,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Send as SendIcon,
  Inbox as InboxIcon,
  Send as SentIcon,
} from '@mui/icons-material';

import CreateAccountDialog from './CreateAccountDialog';
import TestConnectionDialog from './TestConnectionDialog';
import ComposeDialog from './ComposeDialog';
import ReplyDialog from './ReplyDialog';
import EmailList from './EmailList';
import EmailViewer from './EmailViewer';
import { createEmailAccount, testEmailConnection, fetchInboxEmails, fetchSentEmails, fetchEmailByUid, transformEmail, sendEmail, sendEmailWithAttachments, replyToEmailWithFiles, replyToEmail } from './emailService';
import { sampleEmails } from './sampleData';

const Email = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State management
  const [selectedTab, setSelectedTab] = useState(0);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Account creation state
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
    // First try to get from sessionStorage (from login response)
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
  
  // Test connection state
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [isAccountTested, setIsAccountTested] = useState(false);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState(null);

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

  // Save account ID to localStorage and load emails when it changes
  useEffect(() => {
    if (createdAccountId) {
      localStorage.setItem('emailAccountId', createdAccountId);
      loadEmails();
    }
  }, [createdAccountId]);

  const loadEmails = async () => {
    if (!createdAccountId) {

      setEmails(sampleEmails);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchInboxEmails(createdAccountId);





      // Try different response structures
      const fetchedEmails = response?.emails || 
                           response?.data?.emails || 
                           response?.data || 
                           [];

      console.log('First email from API (before transform):', fetchedEmails[0]);
      
      if (fetchedEmails.length > 0) {
        const transformedEmails = fetchedEmails.map((email, index) => {
          const transformed = transformEmail(email, index);

          return transformed;
        });


        setEmails(transformedEmails);
      } else {

        setEmails(sampleEmails);
      }
    } catch (err) {
      console.error('Error loading emails:', err);
      setError(err.message || 'Failed to load emails');
      setEmails(sampleEmails);
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
      const response = await fetchSentEmails(createdAccountId);

      // Try different response structures
      const fetchedEmails = response?.emails || 
                           response?.data?.emails || 
                           response?.data || 
                           [];

      // Get email account info for sent emails (from response or user data)
      const emailAccount = response?.emailAccount || response?.data?.emailAccount;
      const userEmail = emailAccount?.email || '';
      const displayName = emailAccount?.displayName || 'You';

      console.log('Sent emails from API (before transform):', fetchedEmails[0]);
      console.log('Email account info:', emailAccount);
      
      if (fetchedEmails.length > 0) {
        const transformedEmails = fetchedEmails.map((email, index) => {
          const transformed = transformEmail(email, index);
          // For sent emails, set from to the user's email and ensure folder is 'sent'
          return {
            ...transformed,
            from: userEmail || transformed.from,
            fromName: displayName || transformed.fromName,
            folder: 'sent',
            // Parse date string if it's a string
            timestamp: email.date ? (typeof email.date === 'string' ? new Date(email.date) : email.date) : transformed.timestamp
          };
        });

        setEmails(transformedEmails);
      } else {
        // Show empty sent folder
        setEmails([]);
      }
    } catch (err) {
      console.error('Error loading sent emails:', err);
      setError(err.message || 'Failed to load sent emails');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(false);

    try {
      const response = await createEmailAccount(accountData);







      // Extract account ID from response - try all possible structures
      const accountId = response._id || 
                       response.id || 
                       response.data?._id || 
                       response.data?.id ||
                       response.emailAccount?._id ||
                       response.emailAccount?.id ||
                       response.account?._id ||
                       response.account?.id;
      
      if (accountId) {

        setCreatedAccountId(accountId);
        setCreateSuccess(true);
      } else {
        console.warn('⚠️ Could not find account ID in response');
        setCreateSuccess(true);
        setCreateError('Account created but ID not found. Check console for response structure.');
      }

      setTimeout(() => {
        setCreateAccountOpen(false);
        setAccountData({ email: '', appPassword: '', displayName: '', notes: '' });
        setCreateSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error creating account:', err);
      setCreateError(err.message || 'Failed to create email account');
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
      await testEmailConnection(createdAccountId);
      setTestSuccess(true);
      setIsAccountTested(true);
      setTimeout(() => {
        setTestDialogOpen(false);
        setTestSuccess(false);
      }, 2000);
    } catch (err) {
      setTestError(err.message || 'Failed to test email connection');
    } finally {
      setTestLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    setSelectedEmail(null);
    
    // Load emails based on selected tab
    if (newValue === 0) {
      // Inbox tab
      loadEmails();
    } else if (newValue === 1) {
      // Sent tab
      loadSentEmails();
    }
  };

  const handleEmailSelect = async (email) => {



    // Set basic email info first
    setSelectedEmail(email);
    if (!email.isRead) {
      markAsRead(email.id);
    }

    // Fetch full email details if uid is available
    if (email.uid && createdAccountId) {

      try {
        const response = await fetchEmailByUid(email.uid, createdAccountId);

        if (response.success && response.email) {
          const fullEmail = response.email;

          const transformedFullEmail = transformEmail(fullEmail);
          const updatedEmail = {
            ...email,
            ...transformedFullEmail,
            id: email.id || transformedFullEmail.uid,
            uid: transformedFullEmail.uid || email.uid,
            body: fullEmail.content || fullEmail.text || email.body,
            html: fullEmail.html || email.html,
            attachments: fullEmail.attachments || email.attachments || [],
            hasAttachments: fullEmail.hasAttachments || (fullEmail.attachments?.length > 0),
            attachmentCount: fullEmail.attachmentCount || (fullEmail.attachments?.length || 0),
            messageId: fullEmail.messageId || fullEmail.messageID || fullEmail.message_id || email.messageId || null
          };

          setSelectedEmail(updatedEmail);
        } else {
          console.warn('Response does not have success or email:', response);
        }
      } catch (err) {
        console.error('Error fetching full email:', err);
        console.error('Error details:', err.response?.data || err.message);
        // Keep the basic email info if fetch fails
      }
    } else {
      console.warn('Cannot fetch full email - missing uid or accountId:', { uid: email.uid, accountId: createdAccountId });
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

  const handleSendEmail = async (emailData) => {
    setSendLoading(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      // Always use send-files endpoint (works with or without attachments)
      await sendEmailWithAttachments({
        ...emailData,
        emailAccountId: createdAccountId
      });
      setSendSuccess(true);
      // Reload sent emails after sending
      if (createdAccountId) {
        setTimeout(() => {
          loadSentEmails();
        }, 500);
      }
      setTimeout(() => {
        setComposeOpen(false);
        setSendSuccess(false);
      }, 2000);
    } catch (err) {
      setSendError(err.response?.data?.message || err.message || 'Failed to send email');
    } finally {
      setSendLoading(false);
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

  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      width: '100%'
    }}>
      {/* Gmail-style Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: 'white', minHeight: 64 }}>
        <Typography variant="h6" sx={{ fontWeight: 400, color: '#5f6368', mr: 4 }}>
          V Power Mail
        </Typography>
        <Box sx={{ flexGrow: 1, maxWidth: 600, position: 'relative' }}>
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
          {createdAccountId && (
            <Chip 
              label={`Account: ${createdAccountId.substring(0, 8)}...`}
              size="small"
              sx={{ 
                mr: 1, 
                bgcolor: '#e8f0fe', 
                color: '#1a73e8',
                maxWidth: { xs: '120px', sm: '200px' },
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }
              }}
            />
          )}
          <Tooltip title="Refresh emails">
            <IconButton size="small" onClick={loadEmails} disabled={!createdAccountId}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
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
              setTimeout(() => handleTestConnection(), 100);
            }}
            disabled={!createdAccountId}
            sx={{
              textTransform: 'none',
              backgroundColor: '#34a853',
              color: 'white',
              fontWeight: 500,
              ml: 1,
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

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}



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
              disabled={!createdAccountId}
              sx={{
                width: '100%',
                borderRadius: '24px',
                textTransform: 'none',
                fontWeight: 500,
                py: 1.5,
                backgroundColor: '#c2e7ff',
                color: '#001d35',
                '&:hover': { backgroundColor: '#a8d8ff' },
                '&.Mui-disabled': { backgroundColor: '#e0e0e0', color: '#9e9e9e' }
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
          <Box sx={{ flexGrow: 1, overflow: 'auto', width: '100%' }}>
            <EmailList
              emails={getFilteredEmails()}
              loading={loading}
              selectedEmail={selectedEmail}
              onEmailSelect={handleEmailSelect}
              onToggleStar={toggleStar}
              formatTimestamp={formatTimestamp}
            />
          </Box>
        </Box>
      </Box>

      {/* Dialogs */}
      <CreateAccountDialog
        open={createAccountOpen}
        onClose={() => setCreateAccountOpen(false)}
        accountData={accountData}
        setAccountData={setAccountData}
        handleCreateAccount={handleCreateAccount}
        createLoading={createLoading}
        createSuccess={createSuccess}
        createError={createError}
        createdAccountId={createdAccountId}
      />

      <TestConnectionDialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        testLoading={testLoading}
        testSuccess={testSuccess}
        testError={testError}
        createdAccountId={createdAccountId}
      />

      <ComposeDialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={handleSendEmail}
        loading={sendLoading}
        success={sendSuccess}
        error={sendError}
        emailAccountId={createdAccountId}
      />

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
        <EmailViewer 
          selectedEmail={selectedEmail}
          onToggleStar={toggleStar}
          onDelete={deleteEmail}
          onClose={() => setSelectedEmail(null)}
          onReply={handleReply}
        />
      </Dialog>
    </Box>
  );
};

export default Email;
