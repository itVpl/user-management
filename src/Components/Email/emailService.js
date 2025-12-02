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

  console.log('Creating email account with data:', accountData);
  
  const response = await axios.post(
    `${API_BASE_URL}/email-accounts/create`,
    accountData,
    { headers: getAuthHeaders() }
  );

  console.log('Create Account API Response:', response.data);
  console.log('Full Response:', JSON.stringify(response.data, null, 2));
  
  return response.data;
};

// Test email connection
export const testEmailConnection = async (accountId) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access this resource');
  }

  console.log('Testing connection for Account ID:', accountId);
  const testUrl = `${API_BASE_URL}/email-accounts/${accountId}/test`;
  console.log('Test URL:', testUrl);

  const response = await axios.post(
    testUrl,
    {},
    { headers: getAuthHeaders() }
  );

  console.log('Test Connection API Response:', response.data);
  
  return response.data;
};

// Fetch inbox emails
export const fetchInboxEmails = async (accountId, limit = 50) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to access emails');
  }

  console.log('Fetching inbox emails for Account ID:', accountId);
  const inboxUrl = `${API_BASE_URL}/email-inbox/inbox?limit=${limit}&emailAccountId=${accountId}`;
  console.log('Inbox URL:', inboxUrl);

  const response = await axios.get(
    inboxUrl,
    { headers: getAuthHeaders() }
  );

  console.log('Inbox API Response:', response.data);
  console.log('Full Inbox Response:', JSON.stringify(response.data, null, 2));
  
  return response.data;
};

// Transform API email to app format
export const transformEmail = (email, index) => ({
  id: email._id || email.id || index,
  from: email.from || email.sender || 'unknown@example.com',
  fromName: email.fromName || email.senderName || email.from || 'Unknown Sender',
  to: email.to || email.recipient || 'you@example.com',
  subject: email.subject || 'No Subject',
  body: email.body || email.text || email.content || '',
  timestamp: email.timestamp || email.date || email.createdAt || new Date(),
  isRead: email.isRead || email.read || false,
  isStarred: email.isStarred || email.starred || false,
  folder: email.folder || 'inbox',
  priority: email.priority || 'normal',
  attachments: email.attachments || []
});

// Send email
export const sendEmail = async (emailData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Please login to send emails');
  }

  console.log('Sending email:', emailData);

  const response = await axios.post(
    `${API_BASE_URL}/email-inbox/send`,
    emailData,
    { headers: getAuthHeaders() }
  );

  console.log('Send Email API Response:', response.data);
  
  return response.data;
};
