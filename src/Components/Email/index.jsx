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
import AccountSwitcher from './AccountSwitcher';
import AccountManagementDialog from './AccountManagementDialog';
import { 
  createEmailAccount, 
  getAllEmailAccounts,
  setDefaultEmailAccount,
  deleteEmailAccount,
  testEmailConnection, 
  fetchInboxEmails, 
  fetchSentEmails, 
  fetchEmailByUid, 
  transformEmail, 
  sendEmail, 
  sendEmailWithAttachments, 
  replyToEmailWithFiles, 
  replyToEmail 
} from './emailService';
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Multiple accounts state
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [accountManagementOpen, setAccountManagementOpen] = useState(false);
  
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

  // Load all email accounts on mount
  useEffect(() => {
    loadEmailAccounts();
  }, []);

  // Load emails when selected account changes
  useEffect(() => {
    if (selectedAccountId) {
      // Reset pagination when account changes
      setCurrentPage(1);
      setHasMore(true);
      setEmails([]);
      loadEmails(1, true); // Load first page, reset emails
      if (selectedTab === 1) {
        loadSentEmails(1, true);
      }
    }
  }, [selectedAccountId]);
  
  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    setEmails([]);
  }, [selectedTab]);

  // Load email accounts
  const loadEmailAccounts = async () => {
    setAccountsLoading(true);
    try {
      const response = await getAllEmailAccounts();
      const accounts = response?.emailAccounts || response?.data?.emailAccounts || [];
      setEmailAccounts(accounts);
      
      // Set default account if available
      if (accounts.length > 0) {
        const defaultAccount = accounts.find(acc => acc.isDefault) || accounts[0];
        setSelectedAccountId(defaultAccount._id);
        sessionStorage.setItem('emailAccountId', defaultAccount._id);
      }
    } catch (err) {
      console.error('Error loading email accounts:', err);
    } finally {
      setAccountsLoading(false);
    }
  };

  // Handle account switching
  const handleAccountChange = (accountId) => {
    setSelectedAccountId(accountId);
    sessionStorage.setItem('emailAccountId', accountId);
    setEmails([]); // Clear emails while loading
  };

  // Handle set default account
  const handleSetDefaultAccount = async (accountId) => {
    try {
      await setDefaultEmailAccount(accountId);
      await loadEmailAccounts(); // Reload accounts to update default status
    } catch (err) {
      console.error('Error setting default account:', err);
      throw err;
    }
  };

  // Handle delete account
  const handleDeleteAccount = async (accountId) => {
    try {
      await deleteEmailAccount(accountId);
      await loadEmailAccounts(); // Reload accounts
      
      // If deleted account was selected, switch to default or first account
      if (selectedAccountId === accountId) {
        const remainingAccounts = emailAccounts.filter(acc => acc._id !== accountId);
        if (remainingAccounts.length > 0) {
          const defaultAccount = remainingAccounts.find(acc => acc.isDefault) || remainingAccounts[0];
          setSelectedAccountId(defaultAccount._id);
        } else {
          setSelectedAccountId(null);
        }
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      throw err;
    }
  };

  const loadEmails = async (page = 1, reset = false) => {
    if (!selectedAccountId) {
      setEmails(sampleEmails);
      return;
    }

    // Set loading state (full loading for first page, loadingMore for subsequent pages)
    if (page === 1 || reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      // Load 30 emails per page
      const response = await fetchInboxEmails(selectedAccountId, 30, page);





      // Try different response structures
      const fetchedEmails = response?.emails || 
                           response?.data?.emails || 
                           response?.data || 
                           [];

      console.log(`Loaded inbox page ${page}: ${fetchedEmails.length} emails`);
      
      if (fetchedEmails.length > 0) {
        const transformedEmails = fetchedEmails.map((email, index) => {
          const transformed = transformEmail(email, index);
          return transformed;
        });

        if (reset || page === 1) {
          // Replace emails for first page or reset
          setEmails(transformedEmails);
        } else {
          // Append emails for subsequent pages
          setEmails(prev => [...prev, ...transformedEmails]);
        }
        
        // Check if there are more emails to load
        setHasMore(fetchedEmails.length === 30);
      } else {
        setHasMore(false);
        if (reset || page === 1) {
          setEmails(sampleEmails);
        }
      }
    } catch (err) {
      console.error('Error loading emails:', err);
      const errorMessage = err.message || 'Failed to load emails';
      
      // Check if it's a timeout error
      if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('timed out')) {
        setError(`⏱️ ${errorMessage}. The email server may be slow. You can try refreshing.`);
      } else {
        setError(errorMessage);
      }
      
      if (reset || page === 1) {
        setEmails(sampleEmails);
      }
      // Don't set hasMore to false on error - allow retry
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadSentEmails = async (page = 1, reset = false) => {
    if (!selectedAccountId) {
      setEmails(sampleEmails.filter(e => e.folder === 'sent'));
      return;
    }

    // Set loading state (full loading for first page, loadingMore for subsequent pages)
    if (page === 1 || reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      // Load 30 emails per page
      const response = await fetchSentEmails(selectedAccountId, 30, page);

      // Try different response structures
      const fetchedEmails = response?.emails || 
                           response?.data?.emails || 
                           response?.data || 
                           [];

      // Get email account info for sent emails (from response or user data)
      const emailAccount = response?.emailAccount || response?.data?.emailAccount;
      const userEmail = emailAccount?.email || '';
      const displayName = emailAccount?.displayName || 'You';

      console.log(`Loaded sent page ${page}: ${fetchedEmails.length} emails`);
      
      if (fetchedEmails.length > 0) {
        const transformedEmails = fetchedEmails.map((email, index) => {
          const transformed = transformEmail(email, index);
          // Preserve original UID from API response (can be number or string)
          const originalUid = email.uid !== null && email.uid !== undefined && email.uid !== '' 
            ? email.uid 
            : transformed.uid;
          
          // For sent emails, set from to the user's email and ensure folder is 'sent'
          // Preserve content, attachments, and other fields directly from API response
          return {
            ...transformed,
            // Explicitly preserve UID from API response
            uid: originalUid,
            from: userEmail || transformed.from,
            fromName: displayName || transformed.fromName,
            folder: 'sent',
            // Preserve content field from API (it's already in the list response)
            content: email.content || transformed.content || transformed.body,
            body: email.content || transformed.body || transformed.content, // Map content to body
            // Preserve attachments from API response
            attachments: email.attachments || transformed.attachments || [],
            hasAttachments: email.hasAttachments !== undefined ? email.hasAttachments : transformed.hasAttachments,
            attachmentCount: email.attachmentCount !== undefined ? email.attachmentCount : transformed.attachmentCount
          };
        });

        if (reset || page === 1) {
          // Replace emails for first page or reset
          setEmails(transformedEmails);
        } else {
          // Append emails for subsequent pages
          setEmails(prev => [...prev, ...transformedEmails]);
        }
        
        // Check if there are more emails to load
        setHasMore(fetchedEmails.length === 30);
      } else {
        // No more emails
        setHasMore(false);
        if (reset || page === 1) {
          setEmails([]);
        }
      }
    } catch (err) {
      console.error('Error loading sent emails:', err);
      const errorMessage = err.message || 'Failed to load sent emails';
      
      // Check if it's a timeout error
      if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('timed out')) {
        setError(`⏱️ ${errorMessage}. The email server may be slow. You can try refreshing.`);
      } else {
        setError(errorMessage);
      }
      
      if (reset || page === 1) {
        setEmails([]);
      }
      // Don't set hasMore to false on error - allow retry
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  // Load more sent emails (next page)
  const loadMoreSentEmails = async () => {
    if (loadingMore || !hasMore || !selectedAccountId) return;
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadSentEmails(nextPage, false);
  };
  
  // Load more emails (next page)
  const loadMoreEmails = async () => {
    if (loadingMore || !hasMore || !selectedAccountId) return;
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadEmails(nextPage, false);
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
        setSelectedAccountId(accountId);
        setCreateSuccess(true);
        // Reload accounts list
        await loadEmailAccounts();
      } else {
        console.warn('⚠️ Could not find account ID in response');
        setCreateSuccess(true);
        setCreateError('Account created but ID not found. Check console for response structure.');
        // Still reload accounts
        await loadEmailAccounts();
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
    if (!selectedAccountId) {
      setTestError('Please select an email account first');
      return;
    }

    setTestLoading(true);
    setTestError(null);
    setTestSuccess(false);

    try {
      await testEmailConnection(selectedAccountId);
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
    setCurrentPage(1);
    setHasMore(true);
    setEmails([]);
    
    // Load emails based on selected tab
    if (newValue === 0) {
      // Inbox tab
      loadEmails(1, true);
    } else if (newValue === 1) {
      // Sent tab
      loadSentEmails(1, true);
    }
  };

  const handleEmailSelect = async (email) => {
    if (!selectedAccountId) {
      setError('Please select an email account first');
      return;
    }
    
    // Preserve ALL original email properties to ensure correct selection
    const originalId = email.id;
    const originalUid = email.uid;
    const originalSubject = email.subject;
    const originalFrom = email.from;
    const originalTimestamp = email.timestamp;
    const emailFolder = email.folder || 'inbox';
    
    console.log('🔵 Selecting email:', { 
      id: originalId, 
      uid: originalUid, 
      subject: originalSubject,
      from: originalFrom,
      folder: emailFolder,
      hasContent: !!(email.content || email.body),
      contentPreview: (email.content || email.body || '').substring(0, 50)
    });
    
    // Set basic email info first with preserved ID
    setSelectedEmail({
      ...email,
      id: originalId,
      uid: originalUid
    });
    
    if (!email.isRead) {
      markAsRead(originalId);
    }

    // For sent emails, the list response already includes content and attachments
    // We should use that content directly to avoid fetching wrong emails
    const hasValidUid = originalUid !== null && originalUid !== undefined && originalUid !== '';
    const hasContentFromList = email.content || email.body;
    const isSentEmail = emailFolder === 'sent';
    
    // For sent emails, ALWAYS use content from list - never fetch
    if (isSentEmail && hasContentFromList) {
      console.log('✅ Sent email with content - using list data directly (no fetch)');
      const selectedEmailData = {
        ...email,
        id: originalId,
        uid: originalUid,
        subject: originalSubject,
        from: originalFrom,
        fromName: email.fromName || email.from,
        timestamp: originalTimestamp,
        folder: 'sent',
        body: email.content || email.body || email.text || '',
        content: email.content || email.body || email.text || '',
        attachments: email.attachments || [],
        hasAttachments: email.hasAttachments !== undefined ? email.hasAttachments : (email.attachments?.length > 0),
        attachmentCount: email.attachmentCount !== undefined ? email.attachmentCount : (email.attachments?.length || 0)
      };
      console.log('✅ Setting sent email:', {
        id: selectedEmailData.id,
        uid: selectedEmailData.uid,
        subject: selectedEmailData.subject,
        contentPreview: selectedEmailData.content.substring(0, 50)
      });
      setSelectedEmail(selectedEmailData);
      return;
    }
    
    console.log('🔵 Email selection details:', {
      id: originalId,
      uid: originalUid,
      uidType: typeof originalUid,
      hasValidUid,
      hasContentFromList: !!hasContentFromList,
      contentPreview: hasContentFromList ? (hasContentFromList.substring(0, 50) + '...') : 'no content',
      subject: originalSubject,
      attachments: email.attachments?.length || 0
    });
    
    // If we already have content from the list response, use it directly
    // The list response has the correct content for the correct email
    // DO NOT fetch - the list already has all the information we need
    if (hasContentFromList) {
      console.log('✅ Using content from list response - this is the correct email content', {
        uid: originalUid,
        subject: originalSubject,
        contentLength: (email.content || email.body || '').length,
        contentPreview: (email.content || email.body || '').substring(0, 50)
      });
      
      // Use content from list directly (NO FETCH - prevents wrong email from being displayed)
      // Explicitly preserve all original fields including content
      const selectedEmailData = {
        ...email,
        id: originalId,
        uid: originalUid,
        subject: originalSubject,
        from: originalFrom,
        fromName: email.fromName || email.from,
        timestamp: originalTimestamp,
        // Ensure content and body are from the original email (from list)
        body: email.content || email.body || email.text || '',
        content: email.content || email.body || email.text || '',
        // Preserve attachments from list
        attachments: email.attachments || [],
        hasAttachments: email.hasAttachments !== undefined ? email.hasAttachments : (email.attachments?.length > 0),
        attachmentCount: email.attachmentCount !== undefined ? email.attachmentCount : (email.attachments?.length || 0)
      };
      
      console.log('✅ Setting selected email with list content:', {
        id: selectedEmailData.id,
        uid: selectedEmailData.uid,
        subject: selectedEmailData.subject,
        contentPreview: selectedEmailData.content.substring(0, 50)
      });
      
      setSelectedEmail(selectedEmailData);
      return;
    }
    
    // Only fetch if we don't have content from list
    if (hasValidUid && selectedAccountId) {
      try {
        // fetchEmailByUid will convert UID to string if needed
        const response = await fetchEmailByUid(originalUid, selectedAccountId);

        if (response.success && response.email) {
          const fullEmail = response.email;
          
          // Validate that the fetched email matches the selected one by UID
          const fetchedUid = fullEmail.uid;
          const fetchedSubject = fullEmail.subject || fullEmail.Subject || '';
          const fetchedFrom = fullEmail.from || fullEmail.From || '';
          
          console.log('✅ Fetched email:', { 
            requestedUid: originalUid,
            fetchedUid: fetchedUid,
            uidMatch: String(fetchedUid) === String(originalUid),
            subject: fetchedSubject,
            from: fetchedFrom 
          });
          
          // Verify it's the same email by comparing UID first, then subject
          const uidMatches = fetchedUid !== null && fetchedUid !== undefined && String(fetchedUid) === String(originalUid);
          const subjectMatches = !originalSubject || !fetchedSubject || originalSubject.trim() === fetchedSubject.trim();
          const isValidEmail = uidMatches && subjectMatches;
          
          if (!uidMatches) {
            console.error('❌ UID mismatch! Wrong email fetched! Using original email data only.', {
              requested: originalUid,
              fetched: fetchedUid,
              originalSubject: originalSubject,
              fetchedSubject: fetchedSubject
            });
            // Don't use fetched email if UID doesn't match - use original email only
            setSelectedEmail(email);
            return;
          } else if (!subjectMatches) {
            console.warn('⚠️ Subject mismatch (but UID matches):', {
              original: { uid: originalUid, subject: originalSubject },
              fetched: { uid: fetchedUid, subject: fetchedSubject }
            });
            // UID matches but subject doesn't - still use fetched content but preserve original subject
          }
          
          const transformedFullEmail = transformEmail(fullEmail);
          
          // Only use fetched email content if UID matches
          // Always preserve original email's key properties (subject, from, etc.)
          // Priority: Original email content from list > Fetched email content
          // The list response already has the correct content - always use that!
          const updatedEmail = {
            ...email, // Start with ALL original email properties (includes content from list)
            // Only update with fetched data if UID matches
            id: originalId, // Always use the original ID from the list
            uid: originalUid, // Always preserve original UID
            subject: originalSubject, // Always preserve original subject
            from: originalFrom, // Always preserve original from
            fromName: email.fromName, // Always preserve original fromName
            timestamp: originalTimestamp, // Always preserve original timestamp
            // CRITICAL: Always use original content from list first - it's already correct!
            // Only use fetched content if original is missing
            body: email.content || email.body || email.text || fullEmail.content || fullEmail.text || transformedFullEmail.body,
            content: email.content || email.body || email.text || fullEmail.content || fullEmail.text,
            // HTML might only be available from fetched email, but don't overwrite body
            html: email.html || fullEmail.html || transformedFullEmail.html,
            // Attachments: prefer fetched if available (they're more complete), but keep original if fetched is empty
            attachments: fullEmail.attachments?.length > 0 ? fullEmail.attachments : (email.attachments || []),
            hasAttachments: fullEmail.hasAttachments || (fullEmail.attachments?.length > 0) || email.hasAttachments,
            attachmentCount: fullEmail.attachmentCount || (fullEmail.attachments?.length || 0) || email.attachmentCount,
            messageId: fullEmail.messageId || fullEmail.messageID || fullEmail.message_id || email.messageId || null
          };
          
          console.log('📧 Final email to display:', {
            id: updatedEmail.id,
            uid: updatedEmail.uid,
            subject: updatedEmail.subject,
            bodyPreview: updatedEmail.body?.substring(0, 50) + '...',
            from: updatedEmail.from
          });

          console.log('Final email to display:', { 
            id: updatedEmail.id, 
            uid: updatedEmail.uid, 
            subject: updatedEmail.subject,
            from: updatedEmail.from 
          });

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
      // Check if UID is empty/invalid
      const hasValidUid = originalUid !== null && originalUid !== undefined && originalUid !== '';
      if (!hasValidUid) {
        console.log('Email has no valid UID, displaying basic info only:', { subject: originalSubject });
        // Email has no UID, so we can't fetch full details - just use what we have
        setSelectedEmail(email);
      } else {
        console.warn('Cannot fetch full email - missing uid or accountId:', { uid: originalUid, accountId: selectedAccountId });
      }
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
        emailAccountId: selectedAccountId
      });
      setSendSuccess(true);
      // Reload sent emails after sending
      if (selectedAccountId) {
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
        emailAccountId: selectedAccountId
      });

      if (response.success) {
        setReplySuccess(true);
        // Reload sent emails after replying
        if (selectedAccountId) {
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

    // Sort by timestamp (newest first), handling invalid dates
    return filtered.sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      
      // Handle invalid dates - put them at the end
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      // Sort descending (newest first)
      return dateB.getTime() - dateA.getTime();
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const emailDate = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(emailDate.getTime())) {
      return '';
    }
    
    // Get today's date (without time)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const emailDay = new Date(emailDate.getFullYear(), emailDate.getMonth(), emailDate.getDate());
    
    // Calculate difference in days
    const diffInDays = Math.floor((today - emailDay) / (1000 * 60 * 60 * 24));
    
    // If email is from today, show only time with AM/PM
    if (diffInDays === 0) {
      return emailDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } 
    // If email is older than one day, show full date
    else {
      return emailDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: emailDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
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
          {emailAccounts.length > 0 && (
            <AccountSwitcher
              accounts={emailAccounts}
              selectedAccountId={selectedAccountId}
              onAccountChange={handleAccountChange}
              sx={{ mr: 1 }}
            />
          )}
          <Tooltip title="Refresh emails">
            <IconButton 
              size="small" 
              onClick={() => {
                setCurrentPage(1);
                setHasMore(true);
                if (selectedTab === 0) {
                  loadEmails(1, true);
                } else {
                  loadSentEmails(1, true);
                }
              }} 
              disabled={!selectedAccountId}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <IconButton size="small">
            <FilterListIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setAccountManagementOpen(true)}
            disabled={emailAccounts.length === 0}
            sx={{
              textTransform: 'none',
              borderColor: emailAccounts.length === 0 ? '#9e9e9e' : '#1a73e8',
              color: emailAccounts.length === 0 ? '#9e9e9e' : '#1a73e8',
              fontWeight: 500,
              ml: 1,
              '&:hover': { 
                borderColor: emailAccounts.length === 0 ? '#9e9e9e' : '#1557b0', 
                backgroundColor: emailAccounts.length === 0 ? 'transparent' : '#e8f0fe' 
              },
              '&.Mui-disabled': {
                borderColor: '#e0e0e0',
                color: '#9e9e9e'
              }
            }}
          >
            Manage Accounts
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setCreateAccountOpen(true)}
            sx={{
              textTransform: 'none',
              borderColor: '#1a73e8',
              color: '#1a73e8',
              fontWeight: 500,
              ml: 1,
              '&:hover': { 
                borderColor: '#1557b0', 
                backgroundColor: '#e8f0fe' 
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
            disabled={!selectedAccountId}
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
        <Alert 
          severity="error" 
          sx={{ m: 2 }} 
          onClose={() => setError(null)}
          action={
            error.toLowerCase().includes('timeout') && (
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => {
                  setError(null);
                  if (selectedTab === 0) {
                    setCurrentPage(1);
                    setHasMore(true);
                    loadEmails(1, true);
                  } else {
                    setCurrentPage(1);
                    setHasMore(true);
                    loadSentEmails(1, true);
                  }
                }}
              >
                Retry
              </Button>
            )
          }
        >
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
              disabled={!selectedAccountId}
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
              loadingMore={loadingMore}
              hasMore={hasMore}
              onLoadMore={selectedTab === 0 ? loadMoreEmails : loadMoreSentEmails}
              selectedEmail={selectedEmail}
              onEmailSelect={handleEmailSelect}
              onToggleStar={toggleStar}
              formatTimestamp={formatTimestamp}
            />
          </Box>
        </Box>
      </Box>

      {/* Dialogs */}
      <AccountManagementDialog
        open={accountManagementOpen}
        onClose={() => setAccountManagementOpen(false)}
        accounts={emailAccounts}
        onSetDefault={handleSetDefaultAccount}
        onDelete={handleDeleteAccount}
        loading={accountsLoading}
      />

      <CreateAccountDialog
        open={createAccountOpen}
        onClose={() => setCreateAccountOpen(false)}
        accountData={accountData}
        setAccountData={setAccountData}
        handleCreateAccount={handleCreateAccount}
        createLoading={createLoading}
        createSuccess={createSuccess}
        createError={createError}
        createdAccountId={selectedAccountId}
      />

      <TestConnectionDialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        testLoading={testLoading}
        testSuccess={testSuccess}
        testError={testError}
        createdAccountId={selectedAccountId}
      />

      <ComposeDialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={handleSendEmail}
        loading={sendLoading}
        success={sendSuccess}
        error={sendError}
        emailAccountId={selectedAccountId}
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
        emailAccountId={selectedAccountId}
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
