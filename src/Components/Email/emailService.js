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
export const fetchInboxEmails = async (accountId, limit = 50, page = 1) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access emails');
  }

  const inboxUrl = `${API_BASE_URL}/email-inbox/inbox?limit=${limit}&page=${page}&emailAccountId=${accountId}`;

  const response = await axios.get(
    inboxUrl,
    { headers: getAuthHeaders() }
  );

  console.log('Full Inbox Response:', JSON.stringify(response.data, null, 2));
  
  return response.data;
};

// Fetch sent emails
export const fetchSentEmails = async (accountId, limit = 50, page = 1) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access emails');
  }

  const sentUrl = `${API_BASE_URL}/email-inbox/sent?limit=${limit}&page=${page}&emailAccountId=${accountId}`;

  const response = await axios.get(
    sentUrl,
    { headers: getAuthHeaders() }
  );

  console.log('Full Sent Response:', JSON.stringify(response.data, null, 2));
  
  return response.data;
};

// Fetch single email by UID
export const fetchEmailByUid = async (uid, accountId) => {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Please login to access emails');
  }

  // Convert UID to string (handles both number and string UIDs)
  const uidString = String(uid);
  
  const emailUrl = `${API_BASE_URL}/email-inbox/${uidString}?emailAccountId=${accountId}`;

  const response = await axios.get(
    emailUrl,
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// Parse date string from API format: "DD/MM/YYYY, HH:MM:SS am/pm"
const parseEmailDate = (dateString) => {
  if (!dateString) return new Date();
  
  // If it's already a Date object, return it
  if (dateString instanceof Date) return dateString;
  
  // If it's a number (timestamp), convert it
  if (typeof dateString === 'number') return new Date(dateString);
  
  // Parse format: "19/12/2025, 12:35:26 am"
  try {
    const match = dateString.match(/(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)/i);
    if (match) {
      const [, day, month, year, hour, minute, second, ampm] = match;
      let hour24 = parseInt(hour, 10);
      
      // Convert to 24-hour format
      if (ampm.toLowerCase() === 'pm' && hour24 !== 12) {
        hour24 += 12;
      } else if (ampm.toLowerCase() === 'am' && hour24 === 12) {
        hour24 = 0;
      }
      
      // Create date (month is 0-indexed in JavaScript Date)
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), hour24, parseInt(minute, 10), parseInt(second, 10));
    }
    
    // Fallback to standard Date parsing
    return new Date(dateString);
  } catch (e) {
    console.error('Error parsing date:', dateString, e);
    return new Date();
  }
};

// Transform API email to app format
export const transformEmail = (email, index) => {
  // Parse the date field from API
  const emailDate = email.date || email.timestamp || email.createdAt;
  const parsedDate = parseEmailDate(emailDate);
  
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
    from: email.from || email.sender || 'unknown@example.com',
    fromName: email.fromName || email.senderName || email.from || 'Unknown Sender',
    to: email.to || email.recipient || 'you@example.com',
    subject: email.subject || 'No Subject',
    body: email.body || email.text || email.content || '', // Map 'content' field from API to 'body'
    html: email.html || email.htmlBody || email.htmlContent || '',
    content: email.content || email.body || email.text || '', // Also preserve 'content' field
    timestamp: parsedDate,
    date: email.date, // Preserve original date string
    isRead: email.isRead || email.read || email.seen || false,
    isStarred: email.isStarred || email.starred || false,
    folder: email.folder || 'inbox',
    priority: email.priority || 'normal',
    attachments: email.attachments || [],
    hasAttachments: email.hasAttachments || (email.attachments && email.attachments.length > 0),
    attachmentCount: email.attachmentCount || (email.attachments ? email.attachments.length : 0),
    messageId: email.messageId || email.messageID || email.message_id || null // Preserve messageId for threading
  };
};

// Send email (JSON with base64 attachments)
// Supports multiple recipients: array or comma-separated string
// API automatically parses and handles multiple recipients
// Example: { to: ["email1@example.com", "email2@example.com"] } or { to: "email1@example.com, email2@example.com" }
export const sendEmail = async (emailData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to send emails');
  }

  const response = await axios.post(
    `${API_BASE_URL}/email-inbox/send`,
    emailData,
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// Send email with file uploads using FormData
// Supports multiple recipients: comma-separated string (e.g., "email1@example.com, email2@example.com")
// API automatically parses and handles multiple recipients
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
  
  // Add optional fields
  if (emailData.html) {
    formData.append('html', emailData.html);
  }
  if (emailData.emailAccountId) {
    formData.append('emailAccountId', emailData.emailAccountId);
  }

  // Add file attachments
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

  // Add file attachments
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
export const replyToEmail = async (replyData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to send emails');
  }

  const response = await axios.post(
    `${API_BASE_URL}/email-inbox/reply`,
    {
      to: replyData.to,
      subject: replyData.subject,
      text: replyData.text || replyData.body,
      html: replyData.html,
      inReplyTo: replyData.inReplyTo,
      references: replyData.references,
      emailAccountId: replyData.emailAccountId,
      attachments: replyData.attachments || []
    },
    {
      headers: getAuthHeaders()
    }
  );

  return response.data;
};
