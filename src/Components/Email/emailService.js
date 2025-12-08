import axios from 'axios';

const API_BASE_URL = 'https://vpl-liveproject-1.onrender.com/api/v1';

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

  const emailUrl = `${API_BASE_URL}/email-inbox/${uid}?emailAccountId=${accountId}`;

  const response = await axios.get(
    emailUrl,
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// Transform API email to app format
export const transformEmail = (email, index) => ({
  id: email._id || email.id || index,
  uid: email.uid || email._id || email.id || index, // Preserve uid from API - this is critical for fetching full email
  from: email.from || email.sender || 'unknown@example.com',
  fromName: email.fromName || email.senderName || email.from || 'Unknown Sender',
  to: email.to || email.recipient || 'you@example.com',
  subject: email.subject || 'No Subject',
  body: email.body || email.text || email.content || '',
  html: email.html || email.htmlBody || email.htmlContent || '',
  timestamp: email.timestamp || email.date || email.createdAt || new Date(),
  isRead: email.isRead || email.read || false,
  isStarred: email.isStarred || email.starred || false,
  folder: email.folder || 'inbox',
  priority: email.priority || 'normal',
  attachments: email.attachments || [],
  hasAttachments: email.hasAttachments || (email.attachments && email.attachments.length > 0),
  attachmentCount: email.attachmentCount || (email.attachments ? email.attachments.length : 0),
  messageId: email.messageId || email.messageID || email.message_id || null // Preserve messageId for threading
});

// Send email
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
export const sendEmailWithAttachments = async (emailData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to send emails');
  }

  // Create FormData for multipart/form-data request
  const formData = new FormData();
  
  // Add text fields
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
export const replyToEmailWithFiles = async (replyData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to send emails');
  }

  // Create FormData for multipart/form-data request
  const formData = new FormData();
  
  // Add text fields
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
