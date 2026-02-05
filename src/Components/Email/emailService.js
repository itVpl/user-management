import axios from 'axios';
import API_CONFIG from '../../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api/v1`;

// Get authentication token
const getAuthToken = () => {
  return sessionStorage.getItem("token") || localStorage.getItem("token") || 
         sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
};

// Get auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Create email account
export const createEmailAccount = async (accountData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access this resource');
  }

  const response = await axios.post(
    `${API_BASE_URL}/email-accounts/create`,
    accountData,
    { headers: getAuthHeaders() }
  );

  console.log('Full Response:', JSON.stringify(response.data, null, 2));
  
  return response.data;
};

// Get all email accounts
export const getAllEmailAccounts = async () => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access this resource');
  }

  const response = await axios.get(
    `${API_BASE_URL}/email-accounts/all`,
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// Get default email account
export const getDefaultEmailAccount = async () => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access this resource');
  }

  const response = await axios.get(
    `${API_BASE_URL}/email-accounts/default`,
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// Set default email account
export const setDefaultEmailAccount = async (accountId) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access this resource');
  }

  const response = await axios.put(
    `${API_BASE_URL}/email-accounts/${accountId}/set-default`,
    {},
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// Update email account
export const updateEmailAccount = async (accountId, updateData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access this resource');
  }

  const response = await axios.put(
    `${API_BASE_URL}/email-accounts/${accountId}/update`,
    updateData,
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// Delete email account
export const deleteEmailAccount = async (accountId) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access this resource');
  }

  const response = await axios.delete(
    `${API_BASE_URL}/email-accounts/${accountId}/delete`,
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// Test email connection
export const testEmailConnection = async (accountId) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access this resource');
  }

  const testUrl = `${API_BASE_URL}/email-accounts/${accountId}/test`;

  const response = await axios.post(
    testUrl,
    {},
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// Fetch inbox emails
export const fetchInboxEmails = async (accountId, limit = 200, page = 1) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access emails');
  }

  // Build query parameters - include preview for better list view
  const params = new URLSearchParams({
    limit: limit.toString(),
    page: page.toString(),
    includePreview: 'true', // Get preview snippets
    includeContent: 'false', // Don't fetch full content for list view (faster)
    includeAttachmentContent: 'true' // Include attachment content for instant downloads
  });
  
  if (accountId) {
    params.append('emailAccountId', accountId);
  }

  const inboxUrl = `${API_BASE_URL}/email-inbox/inbox?${params.toString()}`;

  try {
    const response = await axios.get(
      inboxUrl,
      { 
        headers: getAuthHeaders(),
        timeout: 35000 // 35 seconds timeout (slightly longer than backend's 30s)
      }
    );

    console.log('Full Inbox Response:', JSON.stringify(response.data, null, 2));
    
    // Log attachment data for debugging
    const emails = response.data?.emails || response.data?.data || [];
    if (emails.length > 0) {
      console.log('Inbox emails attachment check:', emails.slice(0, 3).map(e => ({
        subject: e.subject,
        hasAttachments: e.hasAttachments,
        attachmentCount: e.attachmentCount,
        attachments: e.attachments
      })));
    }
    
    return response.data;
  } catch (error) {
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('Request timed out. The email server is taking too long to respond. Please try again.');
    }
    // Handle backend timeout errors
    if (error.response?.data?.message?.includes('timeout') || error.response?.data?.message?.includes('timed out')) {
      throw new Error(error.response.data.message || 'IMAP request timed out. Please try again.');
    }
    throw error;
  }
};

// Fetch sent emails
export const fetchSentEmails = async (accountId, limit = 30, page = 1) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access emails');
  }

  // Build query parameters according to API documentation
  const params = new URLSearchParams({
    limit: limit.toString(),
    includePreview: 'true',
    includeContent: 'false', // Don't fetch full content for list view (faster)
    includeAttachmentContent: 'true' // Include attachment content for instant downloads
  });
  
  if (accountId) {
    params.append('emailAccountId', accountId);
  }
  
  // Note: API doesn't support pagination with page parameter, but we can use limit
  // For pagination, we'll need to calculate skip = (page - 1) * limit
  // But since API doesn't support skip, we'll fetch all and paginate client-side
  // Or use limit to get more emails per request

  const sentUrl = `${API_BASE_URL}/email-inbox/sent?${params.toString()}`;

  try {
    const response = await axios.get(
      sentUrl,
      { 
        headers: getAuthHeaders(),
        timeout: 35000 // 35 seconds timeout (slightly longer than backend's 30s)
      }
    );

    console.log('Full Sent Response:', JSON.stringify(response.data, null, 2));
  
    return response.data;
  } catch (error) {
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('Request timed out. The email server is taking too long to respond. Please try again.');
    }
    // Handle backend timeout errors
    if (error.response?.data?.message?.includes('timeout') || error.response?.data?.message?.includes('timed out')) {
      throw new Error(error.response.data.message || 'IMAP request timed out. Please try again.');
    }
    throw error;
  }
};

// Fetch single email by UID
export const fetchEmailByUid = async (uid, accountId, folder = 'INBOX', includeThread = true) => {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Please login to access emails');
  }

  // Convert UID to string (handles both number and string UIDs)
  const uidString = String(uid);
  
  // Build query parameters - IMPORTANT: Use folder=SENT for sent emails
  const params = new URLSearchParams({
    folder: folder.toUpperCase(), // INBOX or SENT
    includeContent: 'true', // Get full content for detail view
    includeThread: includeThread ? 'true' : 'false' // Request full conversation thread (can be slow)
  });
  
  if (accountId) {
    params.append('emailAccountId', accountId);
  }
  
  const emailUrl = `${API_BASE_URL}/email-inbox/${uidString}?${params.toString()}`;

  try {
    // Thread requests take longer - increase timeout to 60 seconds
    const timeout = includeThread ? 60000 : 35000;
    
    console.log(`⏱️ Fetching email ${uidString} with ${includeThread ? 'thread' : 'single'} mode (timeout: ${timeout}ms)`);
    
    const response = await axios.get(
      emailUrl,
      { 
        headers: getAuthHeaders(),
        timeout: timeout
      }
    );

    return response.data;
  } catch (error) {
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const errorMsg = includeThread 
        ? 'Thread request timed out. Building conversation threads can take longer. Please try again or check your connection.'
        : 'Request timed out. The email server is taking too long to respond. Please try again.';
      throw new Error(errorMsg);
    }
    // Handle backend timeout errors
    if (error.response?.data?.message?.includes('timeout') || error.response?.data?.message?.includes('timed out')) {
      throw new Error(error.response.data.message || 'IMAP request timed out. Please try again.');
    }
    throw error;
  }
};

// Parse date string from API format: "DD/MM/YYYY, HH:MM:SS am/pm"
const parseEmailDate = (dateString) => {
  if (!dateString) {
    console.warn('parseEmailDate: No date string provided');
    return null;
  }
  
  // If it's already a Date object, validate and return it
  if (dateString instanceof Date) {
    if (isNaN(dateString.getTime())) {
      console.warn('parseEmailDate: Invalid Date object:', dateString);
      return null;
    }
    return dateString;
  }
  
  // If it's a number (timestamp), convert it
  if (typeof dateString === 'number') {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('parseEmailDate: Invalid timestamp:', dateString);
      return null;
    }
    return date;
  }
  
  // Parse format: "3/2/2026, 10:40:12 pm" or "DD/MM/YYYY, HH:MM:SS am/pm" (supports single/double digit day/month)
  try {
    // Updated regex to handle single or double digit day/month: (\d{1,2}) instead of (\d{2})
    const match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)/i);
    if (match) {
      const [, day, month, year, hour, minute, second, ampm] = match;
      let hour24 = parseInt(hour, 10);
      
      // Validate parsed values
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
        console.warn('parseEmailDate: Invalid date values:', { day: dayNum, month: monthNum, year: yearNum });
        // Try standard parsing as fallback
        const fallbackDate = new Date(dateString);
        if (!isNaN(fallbackDate.getTime())) {
          return fallbackDate;
        }
        return null;
      }
      
      // Convert to 24-hour format
      if (ampm.toLowerCase() === 'pm' && hour24 !== 12) {
        hour24 += 12;
      } else if (ampm.toLowerCase() === 'am' && hour24 === 12) {
        hour24 = 0;
      }
      
      // IMPORTANT: Format is DD/MM/YYYY (day/month/year), not MM/DD/YYYY
      // Create date (month is 0-indexed in JavaScript Date)
      // So dayNum is the day, monthNum is the month
      const parsedDate = new Date(yearNum, monthNum - 1, dayNum, hour24, parseInt(minute, 10), parseInt(second, 10));
      
      // Validate the created date
      if (isNaN(parsedDate.getTime())) {
        console.warn('parseEmailDate: Created invalid date from:', dateString);
        return null;
      }
      
      // Log for debugging (first few emails)
      console.log(`parseEmailDate: Parsed "${dateString}" as DD/MM/YYYY -> ${dayNum}/${monthNum}/${yearNum} = ${parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
      
      return parsedDate;
    }
    
    // Try parsing ISO format (e.g., "2025-02-03T12:35:26Z")
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    // Try parsing other common formats
    // Format: "Feb 2, 2025" or "Mar 2, 2025"
    const monthNameMatch = dateString.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (monthNameMatch) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNameMatch[1];
      const day = parseInt(monthNameMatch[2], 10);
      const year = parseInt(monthNameMatch[3], 10);
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
      
      if (monthIndex !== -1 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const parsedDate = new Date(year, monthIndex, day);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }
    }
    
    console.warn('parseEmailDate: Could not parse date string:', dateString);
    return null;
  } catch (e) {
    console.error('parseEmailDate: Error parsing date:', dateString, e);
    return null;
  }
};

// Transform API email to app format
export const transformEmail = (email, index) => {
  // Parse the date field from API - try multiple possible fields
  const emailDate = email.date || email.timestamp || email.createdAt || email.receivedAt;
  const parsedDate = parseEmailDate(emailDate);
  
  // If date parsing failed, log warning with full email data for debugging
  if (!parsedDate && emailDate) {
    console.warn('transformEmail: Failed to parse date for email:', {
      id: email._id || email.id,
      subject: email.subject,
      dateString: emailDate,
      dateType: typeof emailDate,
      rawEmail: {
        date: email.date,
        timestamp: email.timestamp,
        createdAt: email.createdAt,
        receivedAt: email.receivedAt
      }
    });
  }
  
  // Use parsed date or fallback to current date (but log it)
  const finalDate = parsedDate || new Date();
  
  // Log successful parsing for first few emails to verify format
  if (index < 3 && parsedDate) {
    console.log(`transformEmail: Successfully parsed date for email ${index + 1}:`, {
      original: emailDate,
      parsed: finalDate.toISOString(),
      formatted: finalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
  }
  
  // Handle UID - can be number, string, or empty string
  // Preserve the original UID value (number or string) for API calls
  const rawUid = email.uid;
  // Convert empty string to null, but keep numbers and non-empty strings as-is
  const validUid = (rawUid !== null && rawUid !== undefined && rawUid !== '') ? rawUid : null;
  
  // Create a unique ID for React keys and selection
  // Use uid if available (convert to string for consistency), otherwise create composite key
  let uniqueId;
  if (email._id) {
    uniqueId = String(email._id);
  } else if (email.id) {
    uniqueId = String(email.id);
  } else if (validUid !== null) {
    // Use UID as ID (convert to string for consistency)
    uniqueId = String(validUid);
  } else {
    // Create composite ID from subject, date, and index for uniqueness when UID is missing
    const subjectPart = (email.subject || 'nosubject').substring(0, 20).replace(/\s+/g, '_');
    const datePart = (email.date || email.timestamp || '').replace(/\s+/g, '_');
    uniqueId = `sent_${subjectPart}_${datePart}_${index}`;
  }
  
  return {
    id: uniqueId,
    uid: validUid, // Preserve original UID (number or string) for API calls, null if empty
    from: (() => {
      const rawFrom = email.from || email.sender || 'unknown@example.com';
      // Extract email from "Name" <email@domain.com> format
      const emailMatch = rawFrom.match(/<([^>]+)>/);
      if (emailMatch) {
        return emailMatch[1]; // Return just the email
      }
      // Remove quotes if present
      return rawFrom.replace(/^["']|["']$/g, '').trim();
    })(),
    fromName: (() => {
      // First try fromName/senderName fields
      if (email.fromName || email.senderName) {
        const rawName = email.fromName || email.senderName;
        return rawName.replace(/^["']|["']$/g, '').trim();
      }
      // Extract name from "Name" <email@domain.com> format in from field
      const rawFrom = email.from || email.sender || '';
      const nameMatch = rawFrom.match(/^["']?([^"']+)["']?\s*</);
      if (nameMatch) {
        return nameMatch[1].trim();
      }
      // Fallback: use from field (email) or default
      return rawFrom || 'Unknown Sender';
    })(),
    to: email.to || email.recipient || '',
    subject: email.subject || 'No Subject',
    body: email.body || email.text || email.content || email.contentPreview || '', // Map 'content' field from API to 'body'
    html: email.html || email.htmlBody || email.htmlContent || '',
    content: email.content || email.contentPreview || email.body || email.text || '', // Also preserve 'content' field
    contentPreview: email.contentPreview || '', // Preview snippet for sent emails
    timestamp: finalDate,
    date: email.date, // Preserve original date string
    isRead: email.isRead || email.read || email.seen || false,
    isStarred: email.isStarred || email.starred || false,
    folder: email.folder || 'inbox',
    priority: email.priority || 'normal',
    attachments: email.attachments || [],
    hasAttachments: email.hasAttachments || (email.attachments && email.attachments.length > 0),
    attachmentCount: email.attachmentCount || (email.attachments ? email.attachments.length : 0),
    messageId: email.messageId || email.messageID || email.message_id || null, // Preserve messageId for threading
    inReplyTo: email.inReplyTo || email.inReplyToHeader || null, // Preserve In-Reply-To header for threading
    references: email.references || email.referencesHeader || null // Preserve References header for threading
  };
};

// Send email (JSON with base64 attachments)
// Supports multiple recipients: array or comma-separated string
// API automatically parses and handles multiple recipients
// Example: { to: ["email1@example.com", "email2@example.com"] } or { to: "email1@example.com, email2@example.com" }
// Supports CC/BCC: comma-separated string or array
export const sendEmail = async (emailData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to send emails');
  }

  // Prepare payload with CC/BCC support
  const payload = {
    to: emailData.to,
    subject: emailData.subject,
    text: emailData.text || emailData.body || '',
    html: emailData.html,
    emailAccountId: emailData.emailAccountId,
    attachments: emailData.attachments || []
  };

  // Add CC if provided
  if (emailData.cc) {
    payload.cc = Array.isArray(emailData.cc) 
      ? emailData.cc.join(',') 
      : emailData.cc;
  }

  // Add BCC if provided
  if (emailData.bcc) {
    payload.bcc = Array.isArray(emailData.bcc) 
      ? emailData.bcc.join(',') 
      : emailData.bcc;
  }

  const response = await axios.post(
    `${API_BASE_URL}/email-inbox/send`,
    payload,
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// Send email with file uploads using FormData
// Supports multiple recipients: comma-separated string (e.g., "email1@example.com, email2@example.com")
// API automatically parses and handles multiple recipients
// Supports CC/BCC: comma-separated string or array
export const sendEmailWithAttachments = async (emailData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to send emails');
  }

  // Create FormData for multipart/form-data request
  const formData = new FormData();
  
  // Add text fields
  // 'to' can be a single email or comma-separated string for multiple recipients
  // API supports: "email1@example.com, email2@example.com" or array format
  formData.append('to', emailData.to);
  formData.append('subject', emailData.subject);
  formData.append('text', emailData.text || emailData.body || '');
  
  // Add CC field (optional)
  if (emailData.cc) {
    const ccValue = Array.isArray(emailData.cc) 
      ? emailData.cc.join(',') 
      : emailData.cc;
    formData.append('cc', ccValue);
  }
  
  // Add BCC field (optional)
  if (emailData.bcc) {
    const bccValue = Array.isArray(emailData.bcc) 
      ? emailData.bcc.join(',') 
      : emailData.bcc;
    formData.append('bcc', bccValue);
  }
  
  // Add optional fields
  if (emailData.html) {
    formData.append('html', emailData.html);
  }
  if (emailData.emailAccountId) {
    formData.append('emailAccountId', emailData.emailAccountId);
  }

  // Add file attachments (up to 10 files, 25MB each)
  if (emailData.attachments && emailData.attachments.length > 0) {
    emailData.attachments.forEach((attachment) => {
      // If attachment is a File object, append directly
      if (attachment instanceof File) {
        formData.append('attachments', attachment);
      } 
      // If attachment has a file property (from ComposeDialog state)
      else if (attachment.file instanceof File) {
        formData.append('attachments', attachment.file);
      }
    });
  }

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

  return response.data;
};

// Reply to email with file uploads using FormData
// Supports multiple recipients: comma-separated string (e.g., "email1@example.com, email2@example.com")
// API automatically parses and handles multiple recipients
// Supports CC/BCC: comma-separated string or array
export const replyToEmailWithFiles = async (replyData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to send emails');
  }

  // Create FormData for multipart/form-data request
  const formData = new FormData();
  
  // Add text fields
  // 'to' can be a single email or comma-separated string for multiple recipients
  formData.append('to', replyData.to);
  formData.append('subject', replyData.subject);
  formData.append('text', replyData.text || replyData.body || '');
  
  // Add CC field (optional)
  if (replyData.cc) {
    const ccValue = Array.isArray(replyData.cc) 
      ? replyData.cc.join(',') 
      : replyData.cc;
    formData.append('cc', ccValue);
  }
  
  // Add BCC field (optional)
  if (replyData.bcc) {
    const bccValue = Array.isArray(replyData.bcc) 
      ? replyData.bcc.join(',') 
      : replyData.bcc;
    formData.append('bcc', bccValue);
  }
  
  // Add optional fields
  if (replyData.html) {
    formData.append('html', replyData.html);
  }
  if (replyData.inReplyTo) {
    formData.append('inReplyTo', replyData.inReplyTo);
  }
  if (replyData.references) {
    formData.append('references', replyData.references);
  }
  if (replyData.emailAccountId) {
    formData.append('emailAccountId', replyData.emailAccountId);
  }

  // Add file attachments (up to 10 files, 25MB each)
  if (replyData.attachments && replyData.attachments.length > 0) {
    replyData.attachments.forEach((attachment) => {
      // If attachment is a File object, append directly
      if (attachment instanceof File) {
        formData.append('attachments', attachment);
      } 
      // If attachment has a file property (from ComposeDialog state)
      else if (attachment.file instanceof File) {
        formData.append('attachments', attachment.file);
      }
    });
  }

  const response = await axios.post(
    `${API_BASE_URL}/email-inbox/reply-files`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    }
  );

  return response.data;
};

// Reply to email with JSON (base64 attachments)
// Supports CC/BCC: comma-separated string or array
export const replyToEmail = async (replyData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to send emails');
  }

  // Prepare payload with CC/BCC support
  const payload = {
    to: replyData.to,
    subject: replyData.subject,
    text: replyData.text || replyData.body,
    html: replyData.html,
    inReplyTo: replyData.inReplyTo,
    references: replyData.references,
    emailAccountId: replyData.emailAccountId,
    attachments: replyData.attachments || []
  };

  // Add CC if provided
  if (replyData.cc) {
    payload.cc = Array.isArray(replyData.cc) 
      ? replyData.cc.join(',') 
      : replyData.cc;
  }

  // Add BCC if provided
  if (replyData.bcc) {
    payload.bcc = Array.isArray(replyData.bcc) 
      ? replyData.bcc.join(',') 
      : replyData.bcc;
  }

  const response = await axios.post(
    `${API_BASE_URL}/email-inbox/reply`,
    payload,
    {
      headers: getAuthHeaders()
    }
  );

  return response.data;
};
