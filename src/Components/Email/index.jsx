import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
  Dialog,
} from '@mui/material';
import {
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
import LabelsSidebar from './LabelsSidebar';
import { 
  createEmailAccount, 
  getAllEmailAccounts,
  setDefaultEmailAccount,
  deleteEmailAccount,
  testEmailConnection, 
  fetchInboxEmails, 
  fetchSentEmails, 
  fetchEmailByUid, 
  fetchEmailsByLabel,
  transformEmail, 
  sendEmail, 
  sendEmailWithAttachments, 
  replyToEmailWithFiles, 
  replyToEmail,
  markEmailAsRead
} from './emailService';
import { groupEmailsByThread } from './threadUtils';
import API_CONFIG from '../../config/api';

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

  // Label filtering state
  const [selectedLabelId, setSelectedLabelId] = useState(null);

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

  // Load emails when label selection changes
  // Note: EmailList component now handles label filtering internally
  // This useEffect only handles reloading normal emails when label filter is cleared
  useEffect(() => {
    if (!selectedLabelId && selectedAccountId) {
      // Clear label filter - reload normal emails
      setCurrentPage(1);
      setHasMore(true);
      setEmails([]);
      if (selectedTab === 0) {
        loadEmails(1, true);
      } else {
        loadSentEmails(1, true);
      }
    }
  }, [selectedLabelId, selectedAccountId]);

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

  // Helper function to deduplicate threads by UID
  const deduplicateThreadsByUid = (threads) => {
    const seenUids = new Set();
    const uniqueThreads = [];
    const threadMap = new Map(); // Map by threadId to merge threads with same ID
    
    threads.forEach(thread => {
      // Get all UIDs in this thread
      const threadUids = thread.messages && Array.isArray(thread.messages)
        ? thread.messages.map(m => String(m.uid || m.id || '')).filter(Boolean)
        : thread.uid ? [String(thread.uid)] : [];
      
      // Check if any UID is already seen
      const hasDuplicate = threadUids.some(uid => seenUids.has(uid));
      
      if (!hasDuplicate && threadUids.length > 0) {
        // No duplicates - add this thread
        const threadKey = thread.threadId || thread.id || thread.uid;
        
        if (threadKey && threadMap.has(threadKey)) {
          // Merge with existing thread with same threadId
          const existing = threadMap.get(threadKey);
          const allMessages = [...(existing.messages || [existing]), ...(thread.messages || [thread])];
          // Remove duplicates by UID
          const uniqueMessages = Array.from(
            new Map(allMessages.map(msg => [String(msg.uid || msg.id || ''), msg])).values()
          ).filter(msg => msg.uid || msg.id); // Filter out messages without UID
          
          threadMap.set(threadKey, {
            ...thread,
            messages: uniqueMessages,
            messageCount: uniqueMessages.length
          });
          
          // Update seen UIDs
          uniqueMessages.forEach(msg => {
            const uid = String(msg.uid || msg.id || '');
            if (uid) seenUids.add(uid);
          });
        } else if (threadKey) {
          threadMap.set(threadKey, thread);
          // Mark UIDs as seen
          threadUids.forEach(uid => seenUids.add(uid));
        } else {
          // No threadKey but has UIDs - add as standalone
          uniqueThreads.push(thread);
          threadUids.forEach(uid => seenUids.add(uid));
        }
      } else if (hasDuplicate) {
        console.warn(`⚠️ Skipping duplicate thread (deduplication):`, {
          threadId: thread.threadId || thread.id || thread.uid,
          uids: threadUids,
          subject: thread.subject
        });
      }
    });
    
    // Combine map values and standalone threads
    const result = [...Array.from(threadMap.values()), ...uniqueThreads];
    console.log(`✅ Deduplicated threads: ${threads.length} → ${result.length}`);
    return result;
  };

  const loadEmails = async (page = 1, reset = false) => {
    if (!selectedAccountId) {
      setEmails([]);
      setLoading(false);
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
      // Load 25 emails per page for better performance and pagination
      const limit = 25; // Load 25 emails per page
      const response = await fetchInboxEmails(selectedAccountId, limit, page);





      // Try different response structures
      const fetchedEmails = response?.emails || 
                           response?.data?.emails || 
                           response?.data || 
                           [];

      console.log(`📬 Loaded inbox page ${page}: ${fetchedEmails.length} emails (limit: ${limit})`);
      
      // First, deduplicate fetched emails by UID before transformation
      const seenUids = new Set();
      const uniqueFetchedEmails = fetchedEmails.filter(email => {
        const uid = String(email.uid || email.id || '');
        if (!uid || uid === 'undefined' || uid === 'null') {
          console.warn('⚠️ Email without valid UID:', email.subject);
          return true; // Keep emails without UID for now
        }
        if (seenUids.has(uid)) {
          console.warn(`⚠️ Duplicate email detected (UID: ${uid}):`, email.subject);
          return false; // Skip duplicate
        }
        seenUids.add(uid);
        return true;
      });
      
      console.log(`📧 Deduplicated fetched emails: ${fetchedEmails.length} → ${uniqueFetchedEmails.length}`);
      
      // Check if backend is limiting results
      if (uniqueFetchedEmails.length < limit && page === 1) {
        console.warn(`⚠️ Backend returned ${uniqueFetchedEmails.length} emails but limit was ${limit}. Backend might be limiting results.`);
      }
      
      if (uniqueFetchedEmails.length > 0) {
        
        const transformedEmails = uniqueFetchedEmails.map((email, index) => {
          const transformed = transformEmail(email, index);
          // Explicitly preserve attachment data from API response (same as sent emails)
          const emailWithAttachments = {
            ...transformed,
            // Preserve attachments from API response
            attachments: email.attachments || transformed.attachments || [],
            hasAttachments: email.hasAttachments !== undefined ? email.hasAttachments : transformed.hasAttachments,
            attachmentCount: email.attachmentCount !== undefined ? email.attachmentCount : transformed.attachmentCount,
            // Preserve threading headers
            messageId: email.messageId || email.messageID || email.message_id || transformed.messageId || null,
            inReplyTo: email.inReplyTo || email.inReplyToHeader || null,
            references: email.references || email.referencesHeader || null,
            // Preserve labels from API response
            labels: email.labels || transformed.labels || [],
            // CRITICAL: Preserve seen property from API response (for read/unread status)
            seen: email.seen !== undefined ? email.seen : transformed.seen,
            isRead: email.seen !== undefined ? email.seen : transformed.isRead
          };
          
          // Log attachment data and seen status for first few emails to debug
          if (index < 3) {
            console.log(`Inbox email ${index + 1} attachments & seen status:`, {
              subject: email.subject,
              seen: email.seen,
              isRead: email.isRead,
              hasAttachments: email.hasAttachments,
              attachmentCount: email.attachmentCount,
              attachments: email.attachments,
              transformedAttachments: emailWithAttachments.attachments,
              finalSeen: emailWithAttachments.seen,
              finalIsRead: emailWithAttachments.isRead
            });
          }
          return emailWithAttachments;
        });

        // Group emails by thread (Gmail-style conversation threading)
        // Debug: Log threading headers before grouping
        console.log('🔍 Threading headers check:', transformedEmails.slice(0, 3).map(e => ({
          uid: e.uid,
          subject: e.subject,
          hasMessageId: !!e.messageId,
          hasInReplyTo: !!e.inReplyTo,
          hasReferences: !!e.references,
          messageId: e.messageId,
          inReplyTo: e.inReplyTo,
          references: e.references
        })));
        
        const threadedEmails = groupEmailsByThread(transformedEmails);
        
        console.log(`📧 Grouped ${transformedEmails.length} emails into ${threadedEmails.length} threads`);
        
        // Debug: Log thread details
        threadedEmails.slice(0, 3).forEach((thread, idx) => {
          console.log(`Thread ${idx + 1}:`, {
            threadId: thread.threadId,
            messageCount: thread.messageCount,
            participants: thread.participants,
            subject: thread.subject,
            messageUids: thread.messages.map(m => m.uid)
          });
        });
        
        if (reset || page === 1) {
          // Replace emails for first page or reset
          // Deduplicate by UID to prevent duplicates
          const uniqueThreads = deduplicateThreadsByUid(threadedEmails);
          console.log(`✅ Deduplicated: ${threadedEmails.length} → ${uniqueThreads.length} threads`);
          setEmails(uniqueThreads);
        } else {
          // Append emails for subsequent pages
          // Need to merge threads - combine threads with same threadId AND deduplicate by UID
          setEmails(prev => {
            // First, deduplicate existing emails by UID
            const prevUnique = deduplicateThreadsByUid(prev);
            
            const prevMap = new Map();
            const seenUids = new Set(); // Track all UIDs we've seen
            
            // Build map of existing threads and track UIDs
            prevUnique.forEach(email => {
              const key = email.threadId || email.id || email.uid;
              if (key) {
                prevMap.set(key, email);
                // Track all UIDs in this thread
                if (email.messages && Array.isArray(email.messages)) {
                  email.messages.forEach(msg => {
                    if (msg.uid) seenUids.add(String(msg.uid));
                  });
                } else if (email.uid) {
                  seenUids.add(String(email.uid));
                }
              }
            });
            
            // Process new threads and filter out duplicates
            const newThreads = [];
            threadedEmails.forEach(thread => {
              const key = thread.threadId || thread.id || thread.uid;
              
              // Check if any message UID in this thread already exists
              const threadUids = thread.messages && Array.isArray(thread.messages)
                ? thread.messages.map(m => String(m.uid || m.id || '')).filter(Boolean)
                : thread.uid ? [String(thread.uid)] : [];
              
              const hasDuplicate = threadUids.some(uid => uid && seenUids.has(uid));
              
              if (key && prevMap.has(key)) {
                // Merge messages from both threads
                const existing = prevMap.get(key);
                const allMessages = [...(existing.messages || [existing]), ...(thread.messages || [thread])];
                // Remove duplicates by UID
                const uniqueMessages = Array.from(
                  new Map(allMessages.map(msg => [String(msg.uid || msg.id || ''), msg])).values()
                ).filter(msg => msg.uid || msg.id); // Filter out messages without UID
                
                prevMap.set(key, {
                  ...thread,
                  messages: uniqueMessages,
                  messageCount: uniqueMessages.length
                });
                // Update seen UIDs
                uniqueMessages.forEach(msg => {
                  const uid = String(msg.uid || msg.id || '');
                  if (uid && uid !== 'undefined' && uid !== 'null') {
                    seenUids.add(uid);
                  }
                });
              } else if (key && !hasDuplicate && threadUids.length > 0) {
                // New thread, no duplicates
                prevMap.set(key, thread);
                threadUids.forEach(uid => {
                  if (uid && uid !== 'undefined' && uid !== 'null') {
                    seenUids.add(uid);
                  }
                });
                newThreads.push(thread);
              } else if (hasDuplicate) {
                // Duplicate detected - skip this thread
                console.warn(`⚠️ Skipping duplicate thread (pagination merge):`, {
                  threadId: key,
                  uids: threadUids,
                  subject: thread.subject
                });
              }
            });
            
            const result = Array.from(prevMap.values());
            console.log(`✅ Merged pages: ${prevUnique.length} + ${newThreads.length} new = ${result.length} total threads`);
            return result;
          });
        }
        
        // Check if there are more emails to load
        // Strategy: Keep loading as long as we get emails, only stop when we get 0
        // This ensures we load ALL emails even if backend returns fewer per page than requested
        const expectedCount = 25;
        // Only stop loading if we got 0 emails OR if backend explicitly says no more
        // If backend has a 'hasMore' field, use it; otherwise, assume more if we got emails
        const backendIndicatesNoMore = response?.hasMore === false || response?.data?.hasMore === false;
        // IMPORTANT: Continue loading if we got fewer emails than expected BUT still got some emails
        // This handles cases where backend returns partial results (e.g., 20 emails when limit is 25)
        // Only stop if we got exactly 0 emails OR backend explicitly says no more
        const hasMoreEmails = uniqueFetchedEmails.length > 0 && !backendIndicatesNoMore;
        setHasMore(hasMoreEmails);
        
        // Log detailed pagination info for debugging email count mismatches
        const totalEmailsLoaded = (reset || page === 1) ? threadedEmails.length : (emails.length + threadedEmails.length);
        console.log(`📊 Pagination check:`, {
          page,
          fetchedCount: uniqueFetchedEmails.length,
          originalCount: fetchedEmails.length,
          expectedCount,
          hasMore: hasMoreEmails,
          totalEmailsSoFar: totalEmailsLoaded,
          totalThreads: threadedEmails.length,
          backendHasMore: response?.hasMore ?? response?.data?.hasMore,
          backendIndicatesNoMore,
          note: uniqueFetchedEmails.length > 0 
            ? 'Got emails, will continue loading more on scroll' 
            : 'No emails returned, stopping pagination',
          // Log date range of loaded emails for debugging
          dateRange: uniqueFetchedEmails.length > 0 ? {
            oldest: uniqueFetchedEmails[uniqueFetchedEmails.length - 1]?.date || uniqueFetchedEmails[uniqueFetchedEmails.length - 1]?.timestamp,
            newest: uniqueFetchedEmails[0]?.date || uniqueFetchedEmails[0]?.timestamp
          } : null
        });
        
        // Warn if we got fewer emails than expected on first page
        if (page === 1 && uniqueFetchedEmails.length < expectedCount && uniqueFetchedEmails.length > 0) {
          console.warn(`⚠️ First page returned ${uniqueFetchedEmails.length} emails (expected ${expectedCount}). This might indicate backend is limiting results or there are fewer emails available.`);
        }
      } else {
        setHasMore(false);
        if (reset || page === 1) {
          setEmails([]);
        }
      }
    } catch (err) {
      console.error('Error loading emails:', err);
      const errorMessage = err.message || 'Failed to load emails';
      
      // Don't show timeout errors to users - silently handle them
      if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('timed out')) {
        // Silently handle timeout - don't show error message
        console.warn('Email request timed out, but continuing silently');
        setError(null);
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
      setEmails([]);
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
      console.log('Sent emails API response:', {
        emailAccount: emailAccount,
        firstEmail: fetchedEmails[0],
        totalEmails: fetchedEmails.length
      });
      
      // First, deduplicate fetched emails by UID before transformation
      const seenUids = new Set();
      const uniqueFetchedEmails = fetchedEmails.filter(email => {
        const uid = String(email.uid || email.id || '');
        if (!uid || uid === 'undefined' || uid === 'null') {
          console.warn('⚠️ Sent email without valid UID:', email.subject);
          return true; // Keep emails without UID for now
        }
        if (seenUids.has(uid)) {
          console.warn(`⚠️ Duplicate sent email detected (UID: ${uid}):`, email.subject);
          return false; // Skip duplicate
        }
        seenUids.add(uid);
        return true;
      });
      
      console.log(`📧 Deduplicated fetched sent emails: ${fetchedEmails.length} → ${uniqueFetchedEmails.length}`);
      
      if (uniqueFetchedEmails.length > 0) {
        const transformedEmails = uniqueFetchedEmails.map((email, index) => {
          const transformed = transformEmail(email, index);
          // Preserve original UID from API response (can be number or string)
          const originalUid = email.uid !== null && email.uid !== undefined && email.uid !== '' 
            ? email.uid 
            : transformed.uid;
          
          // For sent emails:
          // - "to" field contains recipients (not "from")
          // - "from" should be the user's email
          // - Preserve contentPreview if available
          return {
            ...transformed,
            // Explicitly preserve UID from API response
            uid: originalUid,
            from: userEmail || transformed.from,
            fromName: displayName || transformed.fromName || 'You',
            // For sent emails, "to" field is the recipient (from API)
            to: email.to || transformed.to || '',
            folder: 'sent',
            // Preserve contentPreview from API (preview snippet)
            contentPreview: email.contentPreview || '',
            // Preserve content field from API (full content if includeContent=true)
            content: email.content || email.contentPreview || transformed.content || transformed.body,
            body: email.content || email.contentPreview || transformed.body || transformed.content, // Map content to body
            html: email.html || transformed.html || '',
            // Preserve attachments from API response with download URLs
            attachments: email.attachments || transformed.attachments || [],
            hasAttachments: email.hasAttachments !== undefined ? email.hasAttachments : transformed.hasAttachments,
            attachmentCount: email.attachmentCount !== undefined ? email.attachmentCount : transformed.attachmentCount,
            // Preserve labels from API response
            labels: email.labels || transformed.labels || [],
            // CRITICAL: Preserve seen property from API response (for read/unread status)
            seen: email.seen !== undefined ? email.seen : transformed.seen,
            isRead: email.seen !== undefined ? email.seen : transformed.isRead
          };
        });

        if (reset || page === 1) {
          // Replace emails for first page or reset
          // Deduplicate by UID
          const seenUids = new Set();
          const uniqueEmails = transformedEmails.filter(email => {
            const uid = String(email.uid || email.id || '');
            if (!uid || uid === 'undefined' || uid === 'null') return true;
            if (seenUids.has(uid)) {
              console.warn(`⚠️ Duplicate sent email after transform (UID: ${uid}):`, email.subject);
              return false;
            }
            seenUids.add(uid);
            return true;
          });
          console.log(`✅ Deduplicated sent emails: ${transformedEmails.length} → ${uniqueEmails.length}`);
          setEmails(uniqueEmails);
        } else {
          // Append emails for subsequent pages - deduplicate against existing
          setEmails(prev => {
            const prevUids = new Set(prev.map(e => String(e.uid || e.id || '')).filter(Boolean));
            const newUniqueEmails = transformedEmails.filter(email => {
              const uid = String(email.uid || email.id || '');
              if (!uid || uid === 'undefined' || uid === 'null') return true;
              if (prevUids.has(uid)) {
                console.warn(`⚠️ Duplicate sent email in pagination (UID: ${uid}):`, email.subject);
                return false;
              }
              prevUids.add(uid);
              return true;
            });
            console.log(`✅ Merged sent emails: ${prev.length} + ${newUniqueEmails.length} new = ${prev.length + newUniqueEmails.length} total`);
            return [...prev, ...newUniqueEmails];
          });
        }
        
        // Check if there are more emails to load
        // If we got fewer emails than requested, there are no more
        const expectedCount = 30; // Sent emails use 30 per page
        setHasMore(uniqueFetchedEmails.length >= expectedCount);
        
        console.log(`📊 Sent emails pagination:`, {
          page,
          fetchedCount: uniqueFetchedEmails.length,
          originalCount: fetchedEmails.length,
          expectedCount,
          hasMore: uniqueFetchedEmails.length >= expectedCount
        });
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
      
      // Don't show timeout errors to users - silently handle them
      if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('timed out')) {
        // Silently handle timeout - don't show error message
        console.warn('Sent email request timed out, but continuing silently');
        setError(null);
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
  const loadMoreSentEmails = useCallback(async () => {
    // Prevent duplicate calls - check multiple conditions
    if (loadingMore || !hasMore || !selectedAccountId || loading) {
      console.log('loadMoreSentEmails: Skipping duplicate call', { loadingMore, hasMore, selectedAccountId, loading });
      return;
    }
    
    const nextPage = currentPage + 1;
    console.log('loadMoreSentEmails: Loading page', nextPage);
    setCurrentPage(nextPage);
    await loadSentEmails(nextPage, false);
  }, [loadingMore, hasMore, selectedAccountId, currentPage, loading]);
  
  // Load more emails (next page)
  const loadMoreEmails = useCallback(async () => {
    // Prevent duplicate calls - check multiple conditions
    if (loadingMore || !hasMore || !selectedAccountId || loading) {
      console.log('loadMoreEmails: Skipping duplicate call', { loadingMore, hasMore, selectedAccountId, loading });
      return;
    }
    
    const nextPage = currentPage + 1;
    console.log('loadMoreEmails: Loading page', nextPage);
    setCurrentPage(nextPage);
    await loadEmails(nextPage, false);
  }, [loadingMore, hasMore, selectedAccountId, currentPage, loading]);

  // Load emails filtered by label
  const loadEmailsByLabel = async () => {
    if (!selectedAccountId || !selectedLabelId) {
      setEmails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Determine folder based on selected tab
      const folder = selectedTab === 0 ? 'INBOX' : 'SENT';
      
      // Fetch emails by label
      const response = await fetchEmailsByLabel(selectedLabelId, selectedAccountId, folder);

      // Extract emails from response
      const fetchedEmails = response?.emails || response?.data?.emails || [];

      console.log(`📬 Loaded emails by label: ${fetchedEmails.length} emails (label: ${selectedLabelId}, folder: ${folder})`);
      
      if (fetchedEmails.length > 0) {
        // Transform emails using the same transformEmail function
        const transformedEmails = fetchedEmails.map((email, index) => {
          const transformed = transformEmail(email, index);
          
          // Preserve attachment data from API response (same as regular emails)
          const emailWithAttachments = {
            ...transformed,
            // Preserve attachments from API response
            attachments: email.attachments || transformed.attachments || [],
            hasAttachments: email.hasAttachments !== undefined ? email.hasAttachments : transformed.hasAttachments,
            attachmentCount: email.attachmentCount !== undefined ? email.attachmentCount : transformed.attachmentCount,
            // Preserve threading headers
            messageId: email.messageId || email.messageID || email.message_id || transformed.messageId || null,
            inReplyTo: email.inReplyTo || email.inReplyToHeader || null,
            references: email.references || email.referencesHeader || null,
            // Preserve labels from API response
            labels: email.labels || [],
            // CRITICAL: Preserve seen property from API response (for read/unread status)
            seen: email.seen !== undefined ? email.seen : transformed.seen,
            isRead: email.seen !== undefined ? email.seen : transformed.isRead
          };
          
          return emailWithAttachments;
        });

        // For inbox emails, group by thread (same as regular inbox emails)
        // For sent emails, keep as individual emails (same as regular sent emails)
        if (folder === 'INBOX') {
          // Group emails by thread (Gmail-style conversation threading)
          const threadedEmails = groupEmailsByThread(transformedEmails);
          
          console.log(`📧 Grouped ${transformedEmails.length} label-filtered emails into ${threadedEmails.length} threads`);
          
          // Deduplicate by UID
          const uniqueThreads = deduplicateThreadsByUid(threadedEmails);
          console.log(`✅ Deduplicated label-filtered emails: ${threadedEmails.length} → ${uniqueThreads.length} threads`);
          
          setEmails(uniqueThreads);
        } else {
          // For sent emails, keep as individual emails (no threading)
          // Deduplicate by UID
          const seenUids = new Set();
          const uniqueEmails = transformedEmails.filter(email => {
            const uid = String(email.uid || email.id || '');
            if (!uid || uid === 'undefined' || uid === 'null') return true;
            if (seenUids.has(uid)) {
              console.warn(`⚠️ Duplicate label-filtered sent email (UID: ${uid}):`, email.subject);
              return false;
            }
            seenUids.add(uid);
            return true;
          });
          
          console.log(`✅ Deduplicated label-filtered sent emails: ${transformedEmails.length} → ${uniqueEmails.length}`);
          setEmails(uniqueEmails);
        }
        
        // Label filtering doesn't support pagination yet
        setHasMore(false);
      } else {
        setEmails([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading emails by label:', err);
      const errorMessage = err.message || 'Failed to load emails by label';
      
      // Don't show timeout errors to users - silently handle them
      if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('timed out')) {
        console.warn('Label email request timed out, but continuing silently');
        setError(null);
      } else {
        setError(errorMessage);
      }
      
      setEmails([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
    
    // If label is selected, reload emails by label with new folder
    if (selectedLabelId) {
      // The useEffect will handle reloading emails by label
      return;
    }
    
    // Load emails based on selected tab
    if (newValue === 0) {
      // Inbox tab
      loadEmails(1, true);
    } else if (newValue === 1) {
      // Sent tab
      loadSentEmails(1, true);
    }
  };

  // Handle label click - filter emails by label
  const handleLabelClick = (labelId) => {
    setSelectedLabelId(labelId);
    // The useEffect will handle loading emails by label
  };

  // Clear label filter
  const handleClearLabelFilter = () => {
    setSelectedLabelId(null);
    // The useEffect will handle reloading normal emails
  };

  const handleEmailSelect = async (email) => {
    // Check if this is a thread (has messages array)
    if (email.isThread && email.messages && Array.isArray(email.messages) && email.messages.length > 1) {
      console.log('🧵 Thread selected:', {
        threadId: email.threadId,
        messageCount: email.messageCount,
        messages: email.messages.length
      });
      
      // Use the latest message as the base, but include all messages for thread view
      const latestMessage = email.latestMessage || email.messages[email.messages.length - 1];
      
      // Set selected email with thread data
      setSelectedEmail({
        ...latestMessage,
        threadMessages: email.messages,
        messages: email.messages,
        messageCount: email.messageCount,
        threadId: email.threadId,
        subject: email.subject,
        // Use thread-level attachments (combined from all messages)
        attachments: email.attachments || latestMessage.attachments || [],
        hasAttachments: email.hasAttachments || latestMessage.hasAttachments,
        attachmentCount: email.attachmentCount || latestMessage.attachmentCount || 0
      });
      
      // Fetch full thread details if needed
      if (latestMessage.uid && selectedAccountId) {
        try {
          const folder = latestMessage.folder === 'sent' ? 'SENT' : 'INBOX';
          // Auto-mark as read for INBOX emails (default behavior)
          const shouldMarkAsRead = folder === 'INBOX';
          const response = await fetchEmailByUid(latestMessage.uid, selectedAccountId, folder, true, shouldMarkAsRead);
          
          if (response.success && response.email && response.email.messages) {
            // Update with full thread data from backend
            setSelectedEmail(prev => ({
              ...prev,
              threadMessages: response.email.messages,
              messages: response.email.messages,
              messageCount: response.email.messageCount || response.email.messages.length,
              seen: response.email.seen !== undefined ? response.email.seen : prev.seen,
              isRead: response.email.seen !== undefined ? response.email.seen : prev.isRead
            }));
            
            // Update email in list to reflect read status
            if (shouldMarkAsRead && response.email.seen === true) {
              updateEmailInList(latestMessage.uid, { seen: true, isRead: true });
            }
          }
        } catch (err) {
          console.warn('Failed to fetch full thread, using cached messages:', err);
          // Continue with cached messages
        }
      }
      
      return;
    }
    
    // Continue with normal email selection (single email)
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
    
    // Note: markAsRead is now handled by fetchEmailByUid API call (auto-mark as read)
    // The old markAsRead function is kept for backward compatibility but won't be called here

    // For sent emails, the list response already includes content and attachments
    // We should use that content directly to avoid fetching wrong emails
    const hasValidUid = originalUid !== null && originalUid !== undefined && originalUid !== '';
    const hasContentFromList = email.content || email.body;
    const isSentEmail = emailFolder === 'sent';
    
      // For sent emails, use contentPreview if available, or fetch full details
      if (isSentEmail) {
        // If we have contentPreview or content, use it
        if (hasContentFromList || email.contentPreview) {
          console.log('✅ Sent email with content/preview - using list data');
          const selectedEmailData = {
            ...email,
            id: originalId,
            uid: originalUid,
            subject: originalSubject,
            from: originalFrom,
            fromName: email.fromName || email.from || 'You',
            to: email.to || '', // Preserve "to" field for sent emails
            timestamp: originalTimestamp,
            folder: 'sent',
            body: email.content || email.contentPreview || email.body || email.text || '',
            content: email.content || email.contentPreview || email.body || email.text || '',
            contentPreview: email.contentPreview || '',
            html: email.html || '',
            attachments: email.attachments || [],
            hasAttachments: email.hasAttachments !== undefined ? email.hasAttachments : (email.attachments?.length > 0),
            attachmentCount: email.attachmentCount !== undefined ? email.attachmentCount : (email.attachments?.length || 0)
          };
          console.log('✅ Setting sent email:', {
            id: selectedEmailData.id,
            uid: selectedEmailData.uid,
            subject: selectedEmailData.subject,
            to: selectedEmailData.to,
            contentPreview: selectedEmailData.contentPreview || selectedEmailData.content.substring(0, 50)
          });
          setSelectedEmail(selectedEmailData);
          
          // If we don't have full content, fetch it in background
          if (!email.content && hasValidUid && selectedAccountId) {
            // Fetch full content in background using folder=SENT (don't mark as read for SENT)
            fetchEmailByUid(originalUid, selectedAccountId, 'SENT', false, false) // Don't fetch thread, don't mark as read
              .then(response => {
                if (response.success && response.email) {
                  setSelectedEmail(prev => ({
                    ...prev,
                    content: response.email.content || prev.content,
                    body: response.email.content || prev.body,
                    html: response.email.html || prev.html,
                    cc: response.email.cc || prev.cc,
                    bcc: response.email.bcc || prev.bcc,
                    seen: response.email.seen !== undefined ? response.email.seen : prev.seen,
                    isRead: response.email.seen !== undefined ? response.email.seen : prev.isRead
                  }));
                }
              })
              .catch(err => console.error('Error fetching sent email details:', err));
          }
          return;
        }
        
        // If no content/preview, fetch full details
        if (hasValidUid && selectedAccountId) {
          try {
            // Don't mark SENT emails as read
            const response = await fetchEmailByUid(originalUid, selectedAccountId, 'SENT', false, false); // Don't fetch thread, don't mark as read
            if (response.success && response.email) {
              const fullEmail = response.email;
              setSelectedEmail({
                ...email,
                id: originalId,
                uid: originalUid,
                subject: originalSubject,
                from: originalFrom,
                fromName: email.fromName || email.from || 'You',
                to: fullEmail.to || email.to || '',
                timestamp: originalTimestamp,
                folder: 'sent',
                body: fullEmail.content || fullEmail.body || '',
                content: fullEmail.content || fullEmail.body || '',
                html: fullEmail.html || '',
                cc: fullEmail.cc || '',
                bcc: fullEmail.bcc || '',
                attachments: fullEmail.attachments || email.attachments || [],
                hasAttachments: fullEmail.hasAttachments !== undefined ? fullEmail.hasAttachments : (fullEmail.attachments?.length > 0),
                attachmentCount: fullEmail.attachmentCount !== undefined ? fullEmail.attachmentCount : (fullEmail.attachments?.length || 0),
                seen: fullEmail.seen !== undefined ? fullEmail.seen : email.seen,
                isRead: fullEmail.seen !== undefined ? fullEmail.seen : email.isRead
              });
              return;
            }
          } catch (err) {
            console.error('Error fetching sent email details:', err);
            // Fall through to use basic email data
          }
        }
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
        // IMPORTANT: Use folder=SENT for sent emails, folder=INBOX for inbox emails
        const folder = isSentEmail ? 'SENT' : 'INBOX';
        
        // Try to fetch with thread first (60s timeout)
        // Auto-mark as read for INBOX emails (default behavior)
        const shouldMarkAsRead = folder === 'INBOX';
        let response;
        try {
          response = await fetchEmailByUid(originalUid, selectedAccountId, folder, true, shouldMarkAsRead);
        } catch (threadError) {
          // If thread request times out, try without thread (faster, 35s timeout)
          if (threadError.message?.includes('timeout') || threadError.message?.includes('timed out')) {
            console.warn('⚠️ Thread request timed out, fetching single email instead...');
            response = await fetchEmailByUid(originalUid, selectedAccountId, folder, false, shouldMarkAsRead);
          } else {
            throw threadError; // Re-throw if it's not a timeout error
          }
        }

        if (response.success && response.email) {
          // Log the API URL being called
          console.log('🌐 API Endpoint Called:', {
            url: `${API_CONFIG.BASE_URL}/api/v1/email-inbox/${originalUid}?emailAccountId=${selectedAccountId}&folder=${folder}&includeContent=true&includeThread=true`,
            method: 'GET',
            uid: originalUid,
            folder: folder,
            includeThread: true
          });
          
          // CRITICAL: Log seen status from API response
          // Backend now always returns seen at top level (response.email.seen)
          console.log('👁️ API Response - Seen Status:', {
            emailSeen: response.email.seen,
            emailIsRead: response.email.isRead,
            hasSeenProperty: 'seen' in response.email,
            fullEmailKeys: Object.keys(response.email),
            emailPreview: {
              uid: response.email.uid,
              subject: response.email.subject,
              seen: response.email.seen
            },
            note: 'Backend now consistently returns seen at top level'
          });
          
          // Debug: Log raw API response INCLUDING ATTACHMENTS
          console.log('🔍 Raw API Response:', {
            hasMessages: !!response.email.messages,
            messagesCount: response.email.messages?.length || 0,
            messages: response.email.messages?.map(m => {
              // Check ALL possible attachment fields
              const attachments = m.attachments || m.attachment || m.files || m.Attachments || [];
              
              return {
                uid: m.uid,
                subject: m.subject,
                hasBody: !!m.body,
                hasContent: !!m.content,
                hasHtml: !!m.html,
                bodyLength: m.body?.length || 0,
                contentLength: m.content?.length || 0,
                htmlLength: m.html?.length || 0,
                date: m.date,
                // ATTACHMENT DEBUGGING - Check all fields
                hasAttachments: m.hasAttachments,
                attachmentCount: m.attachmentCount,
                attachmentsField: m.attachments,
                attachmentField: m.attachment,
                filesField: m.files,
                AttachmentsField: m.Attachments,
                attachmentsArray: attachments,
                attachmentsLength: Array.isArray(attachments) ? attachments.length : 0,
                attachmentDetails: Array.isArray(attachments) ? attachments.map(a => ({
                  filename: a.filename || a.name || 'unnamed',
                  size: a.size,
                  contentType: a.contentType,
                  downloadUrl: a.downloadUrl,
                  index: a.index
                })) : [],
                allKeys: Object.keys(m),
                // Check if attachmentCount doesn't match array length
                mismatch: m.attachmentCount && Array.isArray(attachments) && m.attachmentCount !== attachments.length
              };
            }) || 'No messages array',
            singleEmail: !response.email.messages ? {
              uid: response.email.uid,
              hasBody: !!response.email.body,
              hasContent: !!response.email.content,
              hasHtml: !!response.email.html,
              allKeys: Object.keys(response.email)
            } : null
          });
          
          // Check if backend returned thread (messages array) or single email
          // Backend now ALWAYS returns messages array when includeThread=true (even for single messages)
          const hasThread = response.email.messages && Array.isArray(response.email.messages) && response.email.messages.length > 0;
          const fullEmail = hasThread ? response.email.messages[response.email.messages.length - 1] : response.email;
          const threadMessages = hasThread ? response.email.messages : null;
          
          // CRITICAL: Backend now always returns seen at top level (response.email.seen)
          // For threads, it reflects the most recent message's seen status
          const apiSeenStatus = response.email.seen !== undefined ? response.email.seen : undefined;
          console.log('👁️ Checking seen status from API:', {
            responseEmailSeen: response.email.seen,
            apiSeenStatus,
            hasThread,
            messageCount: threadMessages?.length || 0,
            // Log message seen statuses for debugging
            allMessageSeenStatuses: threadMessages?.map(m => ({ uid: m.uid, seen: m.seen })) || []
          });
          
          // Log thread info for debugging
          if (hasThread) {
            console.log('✅ Backend returned thread:', {
              messageCount: response.email.messageCount || threadMessages.length,
              messagesInArray: threadMessages.length,
              threadId: response.email.threadId,
              firstMessageUid: threadMessages[0]?.uid,
              lastMessageUid: threadMessages[threadMessages.length - 1]?.uid,
              firstMessageSeen: threadMessages[0]?.seen,
              lastMessageSeen: threadMessages[threadMessages.length - 1]?.seen
            });
          }
          
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
          
          // Transform thread messages if available
          let transformedThreadMessages = null;
          if (hasThread && threadMessages) {
            console.log('🧵 Processing thread messages:', threadMessages.length);
            transformedThreadMessages = threadMessages.map((msg, idx) => {
              const transformed = transformEmail(msg, idx);
              
              // Debug: Log raw message data INCLUDING ATTACHMENTS
              console.log(`📨 Thread message ${idx + 1}:`, {
                uid: msg.uid,
                subject: msg.subject,
                hasBody: !!msg.body,
                hasContent: !!msg.content,
                hasHtml: !!msg.html,
                bodyLength: msg.body?.length || 0,
                contentLength: msg.content?.length || 0,
                htmlLength: msg.html?.length || 0,
                // ATTACHMENT DEBUGGING
                hasAttachments: msg.hasAttachments,
                attachmentCount: msg.attachmentCount,
                attachmentsArray: msg.attachments,
                attachmentsLength: msg.attachments?.length || 0,
                attachmentsDetails: msg.attachments?.map(a => ({
                  filename: a.filename || a.name,
                  size: a.size,
                  contentType: a.contentType,
                  downloadUrl: a.downloadUrl
                })) || [],
                rawMsgKeys: Object.keys(msg)
              });
              
              // CRITICAL: Preserve body/content/html directly from API response
              // Priority: API response > transformed (which might be empty)
              const finalBody = msg.body || msg.content || msg.text || transformed.body || '';
              const finalContent = msg.content || msg.body || msg.text || transformed.content || '';
              const finalHtml = msg.html || msg.htmlBody || msg.htmlContent || transformed.html || '';
              
              // CRITICAL: Preserve attachments from API response (check multiple possible fields)
              // Check all possible attachment fields
              const apiAttachments = msg.attachments || msg.attachment || msg.files || msg.Attachments || [];
              const transformedAttachments = transformed.attachments || [];
              
              // Use API attachments if available, otherwise use transformed
              // But also merge if both exist (API might have more complete data)
              let finalAttachments = [];
              
              if (Array.isArray(apiAttachments) && apiAttachments.length > 0) {
                // Use API attachments (most reliable)
                finalAttachments = apiAttachments;
              } else if (Array.isArray(transformedAttachments) && transformedAttachments.length > 0) {
                // Fallback to transformed attachments
                finalAttachments = transformedAttachments;
              }
              
              // If attachmentCount says there are more attachments than we have, log warning
              const reportedCount = msg.attachmentCount !== undefined ? msg.attachmentCount : (msg.hasAttachments ? 1 : 0);
              if (reportedCount > finalAttachments.length) {
                console.warn(`⚠️ Message ${idx + 1} (uid: ${msg.uid}): attachmentCount=${reportedCount} but only ${finalAttachments.length} attachments in array!`, {
                  msgKeys: Object.keys(msg),
                  apiAttachments: apiAttachments,
                  transformedAttachments: transformedAttachments,
                  hasAttachments: msg.hasAttachments,
                  attachmentCount: msg.attachmentCount
                });
              }
              
              // Determine attachment count - use reported count if higher than array length
              const finalAttachmentCount = Math.max(
                finalAttachments.length,
                msg.attachmentCount !== undefined ? msg.attachmentCount : 0,
                transformed.attachmentCount || 0
              );
              
              const finalHasAttachments = finalAttachments.length > 0 || 
                                         msg.hasAttachments === true || 
                                         finalAttachmentCount > 0;
              
              console.log(`✅ Message ${idx + 1} attachments preserved:`, {
                uid: msg.uid,
                subject: msg.subject,
                apiAttachmentsCount: apiAttachments.length,
                transformedAttachmentsCount: transformedAttachments.length,
                finalAttachmentsCount: finalAttachments.length,
                reportedAttachmentCount: msg.attachmentCount,
                finalAttachmentCount,
                finalHasAttachments,
                attachmentFilenames: finalAttachments.map(a => ({
                  filename: a.filename || a.name || 'unnamed',
                  size: a.size,
                  contentType: a.contentType,
                  downloadUrl: a.downloadUrl
                })),
                rawMsgAttachmentKeys: msg.attachments ? Object.keys(msg.attachments[0] || {}) : 'no attachments'
              });
              
              return {
                ...transformed,
                // Preserve all original message properties
                uid: msg.uid || transformed.uid,
                from: msg.from || transformed.from,
                fromName: msg.fromName || transformed.fromName,
                to: msg.to || transformed.to,
                subject: msg.subject || transformed.subject,
                // CRITICAL: Use API response body/content/html directly
                body: finalBody,
                content: finalContent,
                html: finalHtml,
                date: msg.date || transformed.date,
                timestamp: transformed.timestamp,
                // CRITICAL: Preserve attachments from API - use API response first
                attachments: finalAttachments,
                hasAttachments: finalHasAttachments,
                attachmentCount: finalAttachmentCount,
                messageId: msg.messageId || msg.messageID || msg.message_id || transformed.messageId || null,
                inReplyTo: msg.inReplyTo || null,
                references: msg.references || null
              };
            });
            console.log('✅ Transformed thread messages:', transformedThreadMessages.map(m => ({
              uid: m.uid,
              subject: m.subject,
              bodyLength: m.body?.length || 0,
              htmlLength: m.html?.length || 0,
              hasContent: !!(m.body || m.html),
              // ATTACHMENT DEBUGGING
              hasAttachments: m.hasAttachments,
              attachmentCount: m.attachmentCount,
              attachmentsLength: m.attachments?.length || 0,
              attachmentFilenames: m.attachments?.map(a => a.filename || a.name || 'unnamed') || []
            })));
          }
          
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
            messageId: fullEmail.messageId || fullEmail.messageID || fullEmail.message_id || email.messageId || null,
            // Include thread messages if available (transformed)
            threadMessages: transformedThreadMessages,
            messages: transformedThreadMessages, // Also include as 'messages' for compatibility
            messageCount: transformedThreadMessages ? transformedThreadMessages.length : 1,
            // Update seen/isRead status from fetched email (use apiSeenStatus we determined above)
            seen: apiSeenStatus !== undefined ? apiSeenStatus : email.seen,
            isRead: apiSeenStatus !== undefined ? apiSeenStatus : email.isRead
          };
          
          // Update email in list to reflect read status after opening
          // Check if email was marked as read (apiSeenStatus === true)
          if (shouldMarkAsRead && apiSeenStatus === true) {
            console.log('✅ Marking email as read in list:', {
              uid: originalUid,
              subject: originalSubject,
              apiSeenStatus,
              responseEmailSeen: response.email.seen
            });
            updateEmailInList(originalUid, { seen: true, isRead: true });
          } else if (shouldMarkAsRead) {
            console.warn('⚠️ Email should be marked as read but apiSeenStatus is not true:', {
              uid: originalUid,
              apiSeenStatus,
              responseEmailSeen: response.email.seen,
              shouldMarkAsRead
            });
          }
          
          console.log('📧 Final email to display:', {
            hasThread: !!transformedThreadMessages,
            threadMessageCount: transformedThreadMessages?.length || 0,
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
        
        // Show user-friendly error message (but not for timeouts)
        const errorMessage = err.message || 'Failed to load email details';
        if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('timed out')) {
          // Silently handle timeout - don't show error message
          console.warn('Email detail request timed out, but continuing silently');
          setError(null);
        } else {
          setError(`⚠️ ${errorMessage}. Showing available content.`);
        }
        
        // Still display the email with whatever data we have from the list
        // This ensures the user can still see the email even if fetching full details fails
        setSelectedEmail(email);
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

  // Helper function to update email in list after opening
  const updateEmailInList = (emailUid, updates) => {
    console.log('🔄 Updating email in list:', { emailUid, updates });
    setEmails(prev => {
      const updated = prev.map(email => {
        // Check if this is a thread with messages
        if (email.isThread && email.messages && Array.isArray(email.messages)) {
          // Check if any message in the thread matches the UID
          const hasMatchingMessage = email.messages.some(msg => String(msg.uid) === String(emailUid));
          if (hasMatchingMessage) {
            console.log('✅ Found matching thread, updating:', {
              threadId: email.threadId,
              subject: email.subject,
              oldSeen: email.seen,
              oldIsRead: email.isRead,
              updates
            });
            // Update the thread's read status AND all messages in the thread
            const updatedMessages = email.messages.map(msg => 
              String(msg.uid) === String(emailUid) 
                ? { ...msg, ...updates }
                : msg
            );
            
            // CRITICAL: Update the thread itself with seen/isRead status
            // For threads, if any message is read, the thread should be marked as read
            // Also update latestMessage if it exists
            const updatedThread = {
              ...email,
              // Explicitly set seen and isRead properties (don't rely on spread alone)
              seen: updates.seen !== undefined ? updates.seen : email.seen,
              isRead: updates.isRead !== undefined ? updates.isRead : email.isRead,
              messages: updatedMessages,
              // Update latestMessage if it matches the UID
              latestMessage: email.latestMessage && String(email.latestMessage.uid) === String(emailUid)
                ? { ...email.latestMessage, ...updates }
                : email.latestMessage
            };
            
            console.log('✅ Thread updated:', {
              threadSeen: updatedThread.seen,
              threadIsRead: updatedThread.isRead,
              messageSeen: updatedMessages.find(m => String(m.uid) === String(emailUid))?.seen,
              beforeUpdate: {
                seen: email.seen,
                isRead: email.isRead
              },
              afterUpdate: {
                seen: updatedThread.seen,
                isRead: updatedThread.isRead
              }
            });
            
            return updatedThread;
          }
        }
        // Check if this is a single email matching the UID
        if (String(email.uid) === String(emailUid)) {
          console.log('✅ Found matching email, updating:', {
            uid: email.uid,
            subject: email.subject,
            oldSeen: email.seen,
            oldIsRead: email.isRead,
            updates
          });
          const updatedEmail = { ...email, ...updates };
          console.log('✅ Email updated:', {
            newSeen: updatedEmail.seen,
            newIsRead: updatedEmail.isRead
          });
          return updatedEmail;
        }
        return email;
      });
      console.log('📧 Updated emails list:', updated.slice(0, 3).map(e => ({
        uid: e.uid,
        subject: e.subject,
        seen: e.seen,
        isRead: e.isRead,
        isThread: e.isThread,
        messageCount: e.messageCount
      })));
      return updated;
    });
  };

  // Legacy markAsRead function (kept for backward compatibility)
  const markAsRead = (emailId) => {
    setEmails(prev => prev.map(email => 
      email.id === emailId ? { ...email, isRead: true, seen: true } : email
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
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        px: 2, 
        py: 1.5, 
        borderBottom: '1px solid #e0e0e0', 
        backgroundColor: 'white', 
        minHeight: 56,
        boxShadow: 'inset 0 -1px 0 0 rgba(100,121,143,0.122)'
      }}>
        {/* Menu Icon */}
        <IconButton 
          size="small" 
          sx={{ 
            mr: 1,
            color: '#5f6368',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
          }}
        >
          <FilterListIcon />
        </IconButton>
        
        {/* Right side actions - Gmail style */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5, 
          ml: 'auto',
          flexShrink: 0
        }}>
          {/* Account Switcher - Moved to right */}
          {emailAccounts.length > 0 && (
            <Box sx={{ mr: 2 }}>
              <AccountSwitcher
                accounts={emailAccounts}
                selectedAccountId={selectedAccountId}
                onAccountChange={handleAccountChange}
              />
            </Box>
          )}
          <Tooltip title="Refresh">
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
              sx={{
                color: '#5f6368',
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton 
              size="small"
              onClick={() => setAccountManagementOpen(true)}
              disabled={emailAccounts.length === 0}
              sx={{
                color: '#5f6368',
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
              fontSize: '0.875rem',
              py: 0.75,
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
              fontSize: '0.875rem',
              py: 0.75,
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
                  // EmailList handles its own retry for label-filtered emails
                  if (!selectedLabelId) {
                    if (selectedTab === 0) {
                      setCurrentPage(1);
                      setHasMore(true);
                      loadEmails(1, true);
                    } else {
                      setCurrentPage(1);
                      setHasMore(true);
                      loadSentEmails(1, true);
                    }
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
          {/* Gmail-style Compose Button */}
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
                px: 1.5,
                backgroundColor: '#c2e7ff',
                color: '#001d35',
                boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
                '&:hover': { 
                  backgroundColor: '#a8d8ff',
                  boxShadow: '0 1px 3px 0 rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15)'
                },
                '&.Mui-disabled': { 
                  backgroundColor: '#e0e0e0', 
                  color: '#9e9e9e',
                  boxShadow: 'none'
                }
              }}
            >
              Compose
            </Button>
          </Box>
          {/* Gmail-style Navigation */}
          <Box sx={{ flexGrow: 1, px: 0.5 }}>
            {tabs.map((tab, index) => (
              <Box
                key={index}
                onClick={() => handleTabChange(null, index)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  borderRadius: '0 24px 24px 0',
                  cursor: 'pointer',
                  backgroundColor: selectedTab === index ? '#fce8e6' : 'transparent',
                  color: selectedTab === index ? '#d93025' : '#202124',
                  '&:hover': { 
                    backgroundColor: selectedTab === index ? '#fce8e6' : '#f1f3f4' 
                  },
                  transition: 'background-color 0.15s'
                }}
              >
                <Box sx={{ 
                  mr: 2, 
                  display: 'flex', 
                  alignItems: 'center',
                  color: selectedTab === index ? '#d93025' : '#5f6368'
                }}>
                  {tab.icon}
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flexGrow: 1, 
                    fontWeight: selectedTab === index ? 600 : 400,
                    fontSize: '0.875rem'
                  }}
                >
                  {tab.label}
                </Typography>
                {tab.count > 0 && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: selectedTab === index ? '#d93025' : '#5f6368', 
                      fontWeight: 500, 
                      ml: 1,
                      fontSize: '0.75rem'
                    }}
                  >
                    {tab.count}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>

          {/* Labels Sidebar */}
          <LabelsSidebar
            emailAccountId={selectedAccountId}
            onLabelClick={handleLabelClick}
            selectedLabelId={selectedLabelId}
          />
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
              userEmail={emailAccounts.find(acc => acc._id === selectedAccountId)?.email || ''}
              emails={selectedLabelId ? [] : getFilteredEmails()} // Only pass emails when not filtering by label
              loading={selectedLabelId ? false : loading} // EmailList handles its own loading when filtering
              loadingMore={loadingMore}
              hasMore={hasMore}
              onLoadMore={selectedTab === 0 ? loadMoreEmails : loadMoreSentEmails}
              selectedEmail={selectedEmail}
              onEmailSelect={handleEmailSelect}
              onToggleStar={toggleStar}
              formatTimestamp={formatTimestamp}
              // ⭐ NEW PROPS for label filtering
              selectedLabelId={selectedLabelId}
              folder={selectedTab === 0 ? 'INBOX' : 'SENT'}
              emailAccountId={selectedAccountId}
              onClearLabelFilter={handleClearLabelFilter}
              // ⭐ NEW PROP for bulk actions
              onEmailsUpdate={(updateFn) => {
                // Update emails in parent component
                setEmails(prev => updateFn(prev));
              }}
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
          emailAccountId={selectedAccountId}
          folder={selectedTab === 0 ? 'INBOX' : 'SENT'}
          emailAccounts={emailAccounts}
        />
      </Dialog>
    </Box>
  );
};

export default Email;
