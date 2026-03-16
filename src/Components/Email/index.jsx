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
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  InputAdornment,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Send as SendIcon,
  Inbox as InboxIcon,
  Send as SentIcon,
  Drafts as DraftsIcon,
  DeleteOutline as TrashIcon,
  RestoreFromTrash as RestoreIcon,
  Search as SearchIcon,
  Close as CloseSearchIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

import CreateAccountDialog from './CreateAccountDialog';
import TestConnectionDialog from './TestConnectionDialog';
import ComposeDialog from './ComposeDialog';
import ReplyDialog from './ReplyDialog';
import EmailList from './EmailList';
import EmailViewer from './EmailViewer';
import AccountSwitcher from './AccountSwitcher';
import AccountManagementDialog from './AccountManagementDialog';
import SignatureManagerDialog from './SignatureManagerDialog';
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
  searchEmails,
  transformEmail, 
  sendEmail, 
  sendEmailWithAttachments, 
  replyToEmailWithFiles, 
  replyToEmail,
  markEmailAsRead,
  listDrafts,
  getDraft,
  saveDraft,
  updateDraft,
  sendDraft,
  deleteDraft as deleteDraftAPI,
  listTrash,
  moveToTrash,
  restoreFromTrash,
  permanentDeleteFromTrash
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
  const [signatureManagerAccount, setSignatureManagerAccount] = useState(null);
  
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
  const [composeDraftId, setComposeDraftId] = useState(null);
  const [initialDraftForCompose, setInitialDraftForCompose] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [saveDraftLoading, setSaveDraftLoading] = useState(false);

  // Drafts tab state
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState(null);

  // Trash tab state
  const [trash, setTrash] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashError, setTrashError] = useState(null);
  const [permanentDeleteConfirmUid, setPermanentDeleteConfirmUid] = useState(null);

  // Reply state
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [replyError, setReplyError] = useState(null);
  const [replyToEmail, setReplyToEmail] = useState(null);

  // Label filtering state
  const [selectedLabelId, setSelectedLabelId] = useState(null);

  // DB-first: source of list data ('db' | 'imap') for optional "From cache" / "Synced" UX
  const [listSource, setListSource] = useState(null);
  // When user clicks "Refresh" on the open email, show loading in viewer
  const [refreshingEmail, setRefreshingEmail] = useState(false);

  // Search state (GET /api/v1/email-inbox/search)
  const [searchActive, setSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchFolder, setSearchFolder] = useState('ALL'); // INBOX | SENT | ALL
  const [searchPagination, setSearchPagination] = useState(null); // { nextPageToken, hasNextPage, currentPage, source }
  const [searchPage, setSearchPage] = useState(1);
  const [searchPageToken, setSearchPageToken] = useState(null);
  const [searchSource, setSearchSource] = useState(null); // 'gmail-api' | 'db'

  // Tab configuration
  const tabs = [
    { label: 'Inbox', icon: <InboxIcon />, count: emails.filter(e => !e.isRead && e.folder === 'inbox').length },
    { label: 'Sent', icon: <SentIcon />, count: emails.filter(e => e.folder === 'sent').length },
    { label: 'Drafts', icon: <DraftsIcon />, count: drafts.length },
    { label: 'Trash', icon: <TrashIcon />, count: trash.length },
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
      if (selectedTab === 2) {
        loadDrafts();
      }
      if (selectedTab === 3) {
        loadTrash();
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

  // Poll inbox API every 8s while Inbox tab is open (backend syncs INBOX to DB every 5s; no refresh=true needed)
  useEffect(() => {
    if (selectedTab !== 0 || !selectedAccountId || selectedLabelId || searchActive) return;
    const POLL_INTERVAL_MS = 8000; // 8 seconds
    const intervalId = setInterval(() => {
      loadEmails(1, true, false, true); // page 1, reset list, no IMAP refresh, silent (no loading spinner)
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [selectedTab, selectedAccountId, selectedLabelId, searchActive]);

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

  const loadEmails = async (page = 1, reset = false, refresh = false, silent = false) => {
    if (!selectedAccountId) {
      setEmails([]);
      if (!silent) setLoading(false);
      return;
    }

    // Set loading state (full loading for first page, loadingMore for subsequent pages). Skip when silent (e.g. polling).
    if (!silent) {
      if (page === 1 || reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
    }
    setError(null);
    
    try {
      // Load 25 emails per page. refresh=true when user clicks "Sync from server" (IMAP); else DB-first (fast)
      const limit = 25;
      const response = await fetchInboxEmails(selectedAccountId, limit, page, refresh);





      // Try different response structures
      const fetchedEmails = response?.emails || 
                           response?.data?.emails || 
                           response?.data || 
                           [];

      console.log(`📬 Loaded inbox page ${page}: ${fetchedEmails.length} emails (limit: ${limit})`);
      setListSource(response?.source ?? null);
      
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
      if (!silent) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const loadSentEmails = async (page = 1, reset = false, refresh = false) => {
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
      // Load 25 emails per page. refresh=true when user clicks "Sync from server" (IMAP); else DB-first (fast)
      const response = await fetchSentEmails(selectedAccountId, 25, page, refresh);

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
      setListSource(response?.source ?? null);
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
        const expectedCount = 25; // Sent emails use 25 per page
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
  
  // Load more emails (next page) - used as fallback when pagination is not shown
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

  // Pagination: go to a specific page (25 emails per page)
  const handlePageChange = useCallback((page) => {
    if (!selectedAccountId || loading || page < 1) return;
    setCurrentPage(page);
    if (selectedTab === 0) {
      loadEmails(page, true);
    } else {
      loadSentEmails(page, true);
    }
  }, [selectedAccountId, selectedTab, loading]);

  // Search emails (GET /api/v1/email-inbox/search)
  const runSearch = useCallback(async (pageNum = 1, nextToken = null) => {
    const q = (typeof searchQuery === 'string' ? searchQuery : '').trim();
    if (!selectedAccountId) {
      setSearchError('Select an email account to search.');
      return;
    }
    if (!q) {
      setSearchError('Enter a search term.');
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await searchEmails({
        q,
        folder: searchFolder,
        limit: 25,
        page: pageNum,
        pageToken: nextToken || undefined,
        emailAccountId: selectedAccountId
      });
      if (!res.success) {
        setSearchError(res.message || 'Search failed.');
        setSearchResults([]);
        setSearchPagination(null);
        return;
      }
      const rawEmails = res.emails || [];
      const transformed = rawEmails.map((email, index) => {
        const t = transformEmail(email, index);
        return {
          ...t,
          folder: (email.folder || t.folder || 'inbox').toLowerCase()
        };
      });
      if (pageNum === 1 && !nextToken) {
        setSearchResults(transformed);
        setSearchPage(1);
        setSearchPageToken(null);
      } else {
        setSearchResults(prev => [...prev, ...transformed]);
      }
      const pag = res.pagination || {};
      setSearchPagination(pag);
      setSearchPage(pageNum);
      setSearchPageToken(pag.nextPageToken || null);
      setSearchSource(res.source || null);
      setSearchActive(true);
    } catch (err) {
      setSearchError(err.message || 'Search failed.');
      setSearchResults([]);
      setSearchPagination(null);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, searchFolder, selectedAccountId]);

  const clearSearch = useCallback(() => {
    setSearchActive(false);
    setSearchResults([]);
    setSearchError(null);
    setSearchPagination(null);
    setSearchPage(1);
    setSearchPageToken(null);
    setSearchSource(null);
    setSearchQuery('');
  }, []);

  const loadMoreSearchResults = useCallback(async () => {
    if (searchLoading || !searchPagination) return;
    const isGmail = searchSource === 'gmail-api';
    if (isGmail && searchPagination.nextPageToken) {
      await runSearch(1, searchPagination.nextPageToken);
    } else if (!isGmail && searchPagination.hasNextPage) {
      await runSearch(searchPage + 1, null);
    }
  }, [searchLoading, searchPagination, searchSource, searchPage, runSearch]);

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
    
    // Load content based on selected tab
    if (newValue === 0) {
      loadEmails(1, true);
    } else if (newValue === 1) {
      loadSentEmails(1, true);
    } else     if (newValue === 2) {
      loadDrafts();
    } else if (newValue === 3) {
      loadTrash();
    }
  };

  const loadDrafts = async () => {
    if (!selectedAccountId) {
      setDrafts([]);
      return;
    }
    setDraftsLoading(true);
    setDraftsError(null);
    try {
      const response = await listDrafts(selectedAccountId, 50);
      const list = response?.drafts || response?.data?.drafts || [];
      setDrafts(Array.isArray(list) ? list.map((d) => ({ ...d, id: d.id || d._id })) : []);
    } catch (err) {
      console.error('Error loading drafts:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load drafts';
      setDraftsError(msg);
      setDrafts([]);
    } finally {
      setDraftsLoading(false);
    }
  };

  const loadTrash = async () => {
    if (!selectedAccountId) {
      setTrash([]);
      return;
    }
    setTrashLoading(true);
    setTrashError(null);
    try {
      const response = await listTrash(selectedAccountId, 50);
      const list = response?.emails || response?.data?.emails || [];
      setTrash(Array.isArray(list) ? list.map((e, index) => {
        // Backend may use uid, _id, id, messageId, messageUid, emailId - normalize so we always have id/uid
        const raw = e.uid ?? e._id ?? e.id ?? e.UID ?? e.messageId ?? e.messageUid ?? e.emailId;
        const uid = raw != null ? String(raw) : undefined;
        if (uid == null && e && typeof e === 'object') {
          console.warn('Trash email missing uid/id - backend may use a different key. Keys received:', Object.keys(e), e);
        }
        return { ...e, id: uid, uid, folder: 'trash' };
      }) : []);
    } catch (err) {
      console.error('Error loading trash:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load trash';
      setTrashError(msg);
      setTrash([]);
    } finally {
      setTrashLoading(false);
    }
  };

  const handleOpenDraft = async (draft) => {
    if (!draft?.id || !selectedAccountId) return;
    setSendError(null);
    try {
      const response = await getDraft(draft.id, selectedAccountId);
      const raw = response?.draft || response?.data?.draft || response;
      const draftData = raw ? { ...raw, id: raw.id || raw._id } : null;
      setInitialDraftForCompose(draftData);
      setComposeDraftId(draftData?.id || draft.id);
      setComposeOpen(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to open draft';
      setSendError(msg);
    }
  };

  const handleSaveDraft = async (payload) => {
    setSaveDraftLoading(true);
    setSendError(null);
    try {
      const body = {
        ...payload,
        emailAccountId: selectedAccountId,
      };
      if (payload.draftId) {
        await updateDraft(payload.draftId, body, selectedAccountId);
      } else {
        const response = await saveDraft(body);
        const newId = response?.draftId || response?.info?.id || response?.data?.draftId;
        if (newId) setComposeDraftId(newId);
      }
      await loadDrafts();
    } catch (err) {
      setSendError(err.response?.data?.message || err.message || 'Failed to save draft');
    } finally {
      setSaveDraftLoading(false);
    }
  };

  const handleDeleteDraft = async (draftIdToDelete) => {
    if (!draftIdToDelete) return;
    try {
      await deleteDraftAPI(draftIdToDelete, selectedAccountId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftIdToDelete));
      if (composeDraftId === draftIdToDelete) {
        setComposeOpen(false);
        setComposeDraftId(null);
        setInitialDraftForCompose(null);
      }
    } catch (err) {
      console.error('Error deleting draft:', err);
      setSendError(err.response?.data?.message || err.message || 'Failed to delete draft');
    }
  };

  /** Called when user clicks Discard in compose on an existing draft; optional server delete then dialog closes via onClose. */
  const handleDiscardDraft = async (draftIdToDiscard) => {
    if (!draftIdToDiscard) return;
    try {
      await deleteDraftAPI(draftIdToDiscard, selectedAccountId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftIdToDiscard));
    } catch (err) {
      setSendError(err.response?.data?.message || err.message || 'Failed to delete draft');
    }
    setComposeOpen(false);
    setComposeDraftId(null);
    setInitialDraftForCompose(null);
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
          const response = await fetchEmailByUid(latestMessage.uid, selectedAccountId, folder, true, shouldMarkAsRead, false);
          
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
    const isTrashEmail = emailFolder === 'trash';
    
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
          
          // Always fetch in background with folder=SENT so we get the full thread (backend returns email.messages for SENT)
          if (hasValidUid && selectedAccountId) {
            fetchEmailByUid(originalUid, selectedAccountId, 'SENT', true, false) // Include thread; don't mark as read for SENT
              .then(response => {
                if (response.success && response.email) {
                  const res = response.email;
                  const threadMessages = res.messages && Array.isArray(res.messages) && res.messages.length > 0 ? res.messages : null;
                  const lastMsg = threadMessages ? threadMessages[threadMessages.length - 1] : res;
                  setSelectedEmail(prev => ({
                    ...prev,
                    content: (lastMsg?.content || lastMsg?.body || res.content) || prev.content,
                    body: (lastMsg?.content || lastMsg?.body || res.content) || prev.body,
                    html: lastMsg?.html || res.html || prev.html,
                    cc: res.cc || prev.cc,
                    bcc: res.bcc || prev.bcc,
                    seen: res.seen !== undefined ? res.seen : prev.seen,
                    isRead: res.seen !== undefined ? res.seen : prev.isRead,
                    // Full conversation thread (backend always returns for folder=SENT)
                    threadMessages: threadMessages || prev.threadMessages,
                    messages: threadMessages || prev.messages,
                    messageCount: res.messageCount ?? (threadMessages?.length ?? prev.messageCount),
                    participants: res.participants || prev.participants
                  }));
                }
              })
              .catch(err => console.error('Error fetching sent email details:', err));
          }
          return;
        }
        
        // If no content/preview, fetch full details with folder=SENT (backend returns full thread)
        if (hasValidUid && selectedAccountId) {
          try {
            const response = await fetchEmailByUid(originalUid, selectedAccountId, 'SENT', true, false); // Include thread; don't mark as read for SENT
            if (response.success && response.email) {
              const res = response.email;
              const threadMessages = res.messages && Array.isArray(res.messages) && res.messages.length > 0 ? res.messages : null;
              const fullEmail = threadMessages ? threadMessages[threadMessages.length - 1] : res;
              setSelectedEmail({
                ...email,
                id: originalId,
                uid: originalUid,
                subject: res.subject ?? originalSubject,
                from: originalFrom,
                fromName: email.fromName || email.from || 'You',
                to: fullEmail.to || res.to || email.to || '',
                timestamp: originalTimestamp,
                folder: 'sent',
                body: fullEmail.content || fullEmail.body || '',
                content: fullEmail.content || fullEmail.body || '',
                html: fullEmail.html || res.html || '',
                cc: fullEmail.cc || res.cc || '',
                bcc: fullEmail.bcc || res.bcc || '',
                attachments: fullEmail.attachments || res.attachments || email.attachments || [],
                hasAttachments: fullEmail.hasAttachments ?? (fullEmail.attachments?.length > 0) ?? email.hasAttachments,
                attachmentCount: fullEmail.attachmentCount ?? (fullEmail.attachments?.length || 0) ?? email.attachmentCount,
                seen: res.seen !== undefined ? res.seen : email.seen,
                isRead: res.seen !== undefined ? res.seen : email.isRead,
                // Full conversation thread (backend always returns for folder=SENT)
                threadMessages: threadMessages,
                messages: threadMessages,
                messageCount: res.messageCount ?? (threadMessages?.length ?? 1),
                participants: res.participants
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
    
    // For INBOX: always use the detail API (folder=INBOX&includeContent=true&includeThread=true).
    // First open is without refresh for speed; use "Load content" / "Refresh" with refresh=true when body is missing.
    if (hasContentFromList && isSentEmail) {
      console.log('✅ Using content from list response (Sent) - this is the correct email content', {
        uid: originalUid,
        subject: originalSubject,
        contentLength: (email.content || email.body || '').length,
        contentPreview: (email.content || email.body || '').substring(0, 50)
      });
      
      const selectedEmailData = {
        ...email,
        id: originalId,
        uid: originalUid,
        subject: originalSubject,
        from: originalFrom,
        fromName: email.fromName || email.from,
        timestamp: originalTimestamp,
        body: email.content || email.body || email.text || '',
        content: email.content || email.body || email.text || '',
        attachments: email.attachments || [],
        hasAttachments: email.hasAttachments !== undefined ? email.hasAttachments : (email.attachments?.length > 0),
        attachmentCount: email.attachmentCount !== undefined ? email.attachmentCount : (email.attachments?.length || 0)
      };
      
      setSelectedEmail(selectedEmailData);
      return;
    }
    
    // Fetch full email: for INBOX always; for others when we don't have list content
    if (hasValidUid && selectedAccountId) {
      try {
        // fetchEmailByUid will convert UID to string if needed
        // Use folder=TRASH for trash, SENT for sent, INBOX for inbox
        const folder = isTrashEmail ? 'TRASH' : (isSentEmail ? 'SENT' : 'INBOX');
        
        // Try to fetch with thread first (60s timeout)
        // Auto-mark as read only for INBOX
        const shouldMarkAsRead = folder === 'INBOX';
        const openEmailApiUrl = `${API_CONFIG.BASE_URL}/api/v1/email-inbox/${originalUid}?folder=${folder}&includeContent=true&includeThread=true&markAsRead=${shouldMarkAsRead}&emailAccountId=${selectedAccountId}`;
        if (isTrashEmail) {
          console.log('📧 Open email from Trash – API:', openEmailApiUrl);
        }
        let response;
        try {
          response = await fetchEmailByUid(originalUid, selectedAccountId, folder, true, shouldMarkAsRead, false);
        } catch (threadError) {
          // If thread request times out, try without thread (faster, 35s timeout)
          if (threadError.message?.includes('timeout') || threadError.message?.includes('timed out')) {
            console.warn('⚠️ Thread request timed out, fetching single email instead...');
            response = await fetchEmailByUid(originalUid, selectedAccountId, folder, false, shouldMarkAsRead, false);
          } else {
            throw threadError; // Re-throw if it's not a timeout error
          }
        }

        if (response.success && response.email) {
          // Log the API URL (first open: no refresh for speed; use Refresh/Load content for refresh=true)
          console.log('🌐 API Endpoint Called:', {
            url: `${API_CONFIG.BASE_URL}/api/v1/email-inbox/${originalUid}?folder=${folder}&includeContent=true&includeThread=true&markAsRead=${shouldMarkAsRead}&emailAccountId=${selectedAccountId}`,
            method: 'GET',
            uid: originalUid,
            folder: folder,
            includeThread: true,
            refresh: false
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
            isRead: apiSeenStatus !== undefined ? apiSeenStatus : email.isRead,
            folder: folder.toLowerCase()
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
        const emailFolder = email.folder || 'inbox';
        const folderParam = emailFolder === 'trash' ? 'TRASH' : (emailFolder === 'sent' ? 'SENT' : 'INBOX');
        console.log('Email has no valid UID, displaying basic info only:', { subject: originalSubject });
        if (emailFolder === 'trash') {
          console.log('📧 Open email from Trash – API not called (uid missing). Endpoint: GET /api/v1/email-inbox/[uid] with folder=TRASH&includeContent=true&includeThread=true&emailAccountId=... Fix: ensure trash list API returns uid for each email.');
        }
        setSelectedEmail(email);
      } else {
        console.warn('Cannot fetch full email - missing uid or accountId:', { uid: originalUid, accountId: selectedAccountId });
      }
    }
  };

  // Refresh the currently open email/thread from server (sync from IMAP). Uses refresh=true. For SENT, API returns full thread in email.messages.
  const handleRefreshEmail = async () => {
    if (!selectedEmail?.uid || !selectedAccountId) return;
    setRefreshingEmail(true);
    const folder = selectedEmail?.folder ? String(selectedEmail.folder).toUpperCase() : (selectedTab === 0 ? 'INBOX' : 'SENT');
    try {
      const response = await fetchEmailByUid(
        selectedEmail.uid,
        selectedAccountId,
        folder,
        true,
        false,
        true
      );
      if (response?.success && response?.email) {
        const res = response.email;
        const threadMessages = res.messages && Array.isArray(res.messages) && res.messages.length > 0 ? res.messages : null;
        const fullEmail = threadMessages ? threadMessages[threadMessages.length - 1] : res;
        setSelectedEmail(prev => ({
          ...prev,
          body: fullEmail.content || fullEmail.body || prev?.body,
          content: fullEmail.content || fullEmail.body || prev?.content,
          html: fullEmail.html || prev?.html,
          cc: fullEmail.cc ?? prev?.cc,
          threadMessages: threadMessages || prev?.threadMessages,
          messages: threadMessages || prev?.messages,
          messageCount: res.messageCount ?? threadMessages?.length ?? prev?.messageCount,
          participants: res.participants || prev?.participants,
          attachments: fullEmail.attachments ?? prev?.attachments,
          hasAttachments: fullEmail.hasAttachments ?? prev?.hasAttachments,
          attachmentCount: fullEmail.attachmentCount ?? prev?.attachmentCount,
          source: res.source ?? prev?.source
        }));
      }
    } catch (err) {
      console.error('Error refreshing email:', err);
    } finally {
      setRefreshingEmail(false);
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

  /** Move email from Inbox or Sent to Trash (soft delete). Called from viewer when folder is INBOX/SENT. */
  const handleMoveToTrash = async (email) => {
    if (!email?.uid && email?.id) return;
    const uid = email.uid ?? email.id;
    const folder = email.folder ? String(email.folder).toUpperCase() : (selectedTab === 0 ? 'INBOX' : 'SENT');
    if (folder === 'TRASH') return; // Use Restore / Delete forever for trash
    try {
      await moveToTrash(uid, folder, selectedAccountId);
      setEmails(prev => prev.filter(e => String(e.uid || e.id) !== String(uid)));
      if (selectedEmail && String(selectedEmail.uid || selectedEmail.id) === String(uid)) {
        setSelectedEmail(null);
      }
    } catch (err) {
      setSendError(err.response?.data?.message || err.message || 'Failed to move to trash');
    }
  };

  /** Restore email from Trash to Inbox. */
  const handleRestoreFromTrash = async (email) => {
    const uid = email?.uid ?? email?.id;
    if (!uid) return;
    try {
      await restoreFromTrash(uid, selectedAccountId);
      setTrash(prev => prev.filter(e => String(e.uid || e.id) !== String(uid)));
      if (selectedEmail && String(selectedEmail.uid || selectedEmail.id) === String(uid)) {
        setSelectedEmail(null);
      }
    } catch (err) {
      setSendError(err.response?.data?.message || err.message || 'Failed to restore');
    }
  };

  /** Permanently delete from Trash (cannot be undone). Call after confirmation. */
  const handlePermanentDeleteFromTrash = async (uid) => {
    if (!uid) return;
    try {
      await permanentDeleteFromTrash(uid, selectedAccountId);
      setTrash(prev => prev.filter(e => String(e.uid || e.id) !== String(uid)));
      if (selectedEmail && String(selectedEmail.uid || selectedEmail.id) === String(uid)) {
        setSelectedEmail(null);
      }
      setPermanentDeleteConfirmUid(null);
    } catch (err) {
      setSendError(err.response?.data?.message || err.message || 'Failed to delete permanently');
    }
  };

  const handleSendEmail = async (emailData) => {
    setSendLoading(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      if (composeDraftId) {
        await sendDraft(composeDraftId, selectedAccountId);
        setComposeDraftId(null);
        setInitialDraftForCompose(null);
        setDrafts((prev) => prev.filter((d) => d.id !== composeDraftId));
      } else {
        await sendEmailWithAttachments({
          ...emailData,
          emailAccountId: selectedAccountId
        });
      }
      setSendSuccess(true);
      if (selectedAccountId) {
        setTimeout(() => {
          loadSentEmails();
          loadDrafts();
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
    if (selectedTab === 2) return []; // Drafts tab uses its own list
    if (selectedTab === 3) return []; // Trash tab uses its own list
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

        {/* Search bar - Gmail style */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, maxWidth: 560, mr: 2 }}>
          <TextField
            size="small"
            placeholder="Search mail (e.g. from:user@example.com subject:invoice)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch(1, null);
            }}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f1f3f4',
                borderRadius: '24px',
                fontSize: '0.875rem',
                '& fieldset': { border: 'none' },
                '&:hover': { backgroundColor: '#e8eaed' }
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#5f6368', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.5 }}>
                    <CloseSearchIcon sx={{ fontSize: 18, color: '#5f6368' }} />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Scope</InputLabel>
            <Select
              value={searchFolder}
              label="Scope"
              onChange={(e) => setSearchFolder(e.target.value)}
              sx={{ borderRadius: '8px', backgroundColor: '#fff' }}
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="INBOX">Inbox</MenuItem>
              <MenuItem value="SENT">Sent</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="small"
            onClick={() => runSearch(1, null)}
            disabled={!selectedAccountId || searchLoading || !searchQuery.trim()}
            sx={{ textTransform: 'none', borderRadius: '8px', px: 2 }}
          >
            {searchLoading ? 'Searching…' : 'Search'}
          </Button>
          {searchActive && (
            <Button size="small" onClick={clearSearch} sx={{ textTransform: 'none', color: '#5f6368' }}>
              Clear
            </Button>
          )}
        </Box>
        
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
          <Tooltip title="Sync from server">
            <IconButton 
              size="small" 
              onClick={() => {
                setCurrentPage(1);
                setHasMore(true);
                if (selectedTab === 0) {
                  loadEmails(1, true, true);
                } else {
                  loadSentEmails(1, true, true);
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
          {listSource && (
            <Typography variant="caption" sx={{ color: '#5f6368', ml: 0.5 }}>
              {listSource === 'db' ? 'From cache' : 'Synced'}
            </Typography>
          )}
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
              onClick={() => {
                setComposeDraftId(null);
                setInitialDraftForCompose(null);
                setComposeOpen(true);
              }}
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
            {selectedTab === 2 ? (
              /* Drafts tab */
              <>
                {draftsError && (
                  <Alert severity="error" sx={{ m: 2 }} onClose={() => setDraftsError(null)}>
                    {draftsError}
                  </Alert>
                )}
                {draftsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : drafts.length === 0 ? (
                  <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                    <DraftsIcon sx={{ fontSize: 48, color: '#dadce0', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                      No drafts
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Drafts you save will show up here.
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {drafts.map((draft) => (
                      <ListItem
                        key={draft.id}
                        onClick={() => handleOpenDraft(draft)}
                        sx={{
                          borderBottom: '1px solid #e8eaed',
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#f8f9fa' },
                          py: 1.5,
                          px: 2,
                        }}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDraft(draft.id);
                            }}
                            sx={{ color: '#5f6368' }}
                            aria-label="Delete draft"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={draft.subject || '(No subject)'}
                          secondary={
                            <Box component="span" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {draft.snippet || draft.to || ''}
                            </Box>
                          }
                          primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9375rem' }}
                          secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.8125rem' }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
                          {draft.date ? formatTimestamp(draft.date) : ''}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            ) : selectedTab === 3 ? (
              /* Trash tab */
              <>
                {trashError && (
                  <Alert severity="error" sx={{ m: 2 }} onClose={() => setTrashError(null)}>
                    {trashError}
                  </Alert>
                )}
                {trashLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : trash.length === 0 ? (
                  <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                    <TrashIcon sx={{ fontSize: 48, color: '#dadce0', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                      No emails in trash
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Emails you delete will show up here.
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {trash.map((trashEmail, idx) => (
                      <ListItem
                        key={trashEmail.uid ?? `trash-${idx}`}
                        onClick={() => handleEmailSelect(trashEmail)}
                        sx={{
                          borderBottom: '1px solid #e8eaed',
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#f8f9fa' },
                          py: 1.5,
                          px: 2,
                        }}
                        secondaryAction={
                          <Box component="span" sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Restore to Inbox">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreFromTrash(trashEmail);
                                }}
                                sx={{ color: '#5f6368' }}
                                aria-label="Restore"
                              >
                                <RestoreIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete forever">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPermanentDeleteConfirmUid(trashEmail.uid);
                                }}
                                sx={{ color: '#5f6368', '&:hover': { color: '#d93025' } }}
                                aria-label="Delete forever"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={trashEmail.subject || '(No subject)'}
                          secondary={
                            <Box component="span" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {trashEmail.contentPreview || trashEmail.from || ''}
                            </Box>
                          }
                          primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9375rem' }}
                          secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.8125rem' }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
                          {trashEmail.date ? formatTimestamp(trashEmail.date) : ''}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            ) : (
              <>
                {searchActive && (searchResults.length > 0 || searchLoading) && (
                  <Alert
                    severity="info"
                    sx={{ m: 2, mb: 1 }}
                    action={
                      <Button color="inherit" size="small" onClick={clearSearch}>
                        Clear search
                      </Button>
                    }
                  >
                    Search results for &quot;{searchQuery}&quot; in {searchFolder === 'ALL' ? 'All mail' : searchFolder === 'INBOX' ? 'Inbox' : 'Sent'}
                    {!searchLoading && searchResults.length > 0 && ` (${searchResults.length} ${searchResults.length === 1 ? 'email' : 'emails'})`}
                  </Alert>
                )}
                {searchActive && searchError && (
                  <Alert severity="error" sx={{ m: 2 }} onClose={() => setSearchError(null)}>
                    {searchError}
                  </Alert>
                )}
                {searchActive && !searchError && searchResults.length === 0 && !searchLoading && (
                  <Alert severity="info" sx={{ m: 2 }}>
                    No emails match your search. Try different keywords or scope (e.g. from:email subject:word).
                  </Alert>
                )}
                <EmailList
                  userEmail={emailAccounts.find(acc => acc._id === selectedAccountId)?.email || ''}
                  emails={searchActive ? searchResults : (selectedLabelId ? [] : getFilteredEmails())}
                  loading={searchActive ? searchLoading : (selectedLabelId ? false : loading)}
                  loadingMore={searchActive ? false : loadingMore}
                  hasMore={searchActive ? !!(searchPagination?.nextPageToken || searchPagination?.hasNextPage) : hasMore}
                  onLoadMore={searchActive ? loadMoreSearchResults : (selectedTab === 0 ? loadMoreEmails : loadMoreSentEmails)}
                  selectedEmail={selectedEmail}
                  onEmailSelect={handleEmailSelect}
                  onToggleStar={toggleStar}
                  formatTimestamp={formatTimestamp}
                  usePagination={!selectedLabelId && !searchActive}
                  currentPage={searchActive ? searchPage : currentPage}
                  onPageChange={searchActive ? undefined : handlePageChange}
                  selectedLabelId={searchActive ? null : selectedLabelId}
                  folder={searchActive ? 'ALL' : (selectedTab === 0 ? 'INBOX' : 'SENT')}
                  emailAccountId={selectedAccountId}
                  onClearLabelFilter={handleClearLabelFilter}
                  onEmailsUpdate={(updateFn) => {
                    if (searchActive) setSearchResults(prev => updateFn(prev));
                    else setEmails(prev => updateFn(prev));
                  }}
                />
              </>
            )}
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
        onManageSignatures={(account) => {
          setSignatureManagerAccount(account);
          setAccountManagementOpen(false);
        }}
        loading={accountsLoading}
      />

      <SignatureManagerDialog
        open={!!signatureManagerAccount}
        onClose={() => setSignatureManagerAccount(null)}
        emailAccountId={signatureManagerAccount?._id || null}
        accountName={signatureManagerAccount?.displayName || signatureManagerAccount?.email || ''}
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

      {/* Permanent delete from Trash confirmation */}
      <Dialog open={!!permanentDeleteConfirmUid} onClose={() => setPermanentDeleteConfirmUid(null)}>
        <DialogTitle>Delete forever?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete this email. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermanentDeleteConfirmUid(null)} color="inherit">
            Cancel
          </Button>
          <Button onClick={() => permanentDeleteConfirmUid && handlePermanentDeleteFromTrash(permanentDeleteConfirmUid)} color="error" variant="contained">
            Delete forever
          </Button>
        </DialogActions>
      </Dialog>

      <ComposeDialog
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setComposeDraftId(null);
          setInitialDraftForCompose(null);
        }}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
        onDiscardDraft={handleDiscardDraft}
        loading={sendLoading}
        saveDraftLoading={saveDraftLoading}
        success={sendSuccess}
        error={sendError}
        emailAccountId={selectedAccountId}
        draftId={composeDraftId}
        initialDraft={initialDraftForCompose}
        autoSaveIntervalMs={30000}
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
          onDelete={handleMoveToTrash}
          onRestore={handleRestoreFromTrash}
          onPermanentDelete={(email) => setPermanentDeleteConfirmUid(email?.uid ?? email?.id)}
          onClose={() => setSelectedEmail(null)}
          onReply={handleReply}
          onRefresh={handleRefreshEmail}
          refreshingEmail={refreshingEmail}
          emailAccountId={selectedAccountId}
          folder={selectedEmail?.folder ? String(selectedEmail.folder).toUpperCase() : (selectedTab === 0 ? 'INBOX' : selectedTab === 1 ? 'SENT' : 'INBOX')}
          emailAccounts={emailAccounts}
        />
      </Dialog>
    </Box>
  );
};

export default Email;
