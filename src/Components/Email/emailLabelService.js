import axios from 'axios';
import API_CONFIG from '../../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api/v1/email-labels`;

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

/**
 * Email Label Service
 * Handles all label-related API operations
 */
export const labelService = {
  /**
   * Get all labels
   * @param {string} emailAccountId - Optional email account ID
   * @returns {Promise<Array>} Array of labels
   */
  async getAllLabels(emailAccountId = null) {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Please login to access labels');
    }

    const url = emailAccountId
      ? `${API_BASE_URL}?emailAccountId=${emailAccountId}`
      : API_BASE_URL;

    try {
      const response = await axios.get(url, {
        headers: getAuthHeaders()
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch labels');
      }
      
      return response.data.labels || [];
    } catch (error) {
      console.error('Error fetching labels:', error);
      throw error;
    }
  },

  /**
   * Create a new label
   * @param {Object} labelData - Label data { name, color, description, emailAccountId }
   * @returns {Promise<Object>} Created label
   */
  async createLabel(labelData) {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Please login to create labels');
    }

    try {
      const response = await axios.post(
        API_BASE_URL,
        labelData,
        { headers: getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create label');
      }
      
      return response.data.label;
    } catch (error) {
      console.error('Error creating label:', error);
      throw error;
    }
  },

  /**
   * Update an existing label
   * @param {string} labelId - Label ID
   * @param {Object} labelData - Updated label data { name?, color?, description? }
   * @returns {Promise<Object>} Updated label
   */
  async updateLabel(labelId, labelData) {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Please login to update labels');
    }

    try {
      const response = await axios.put(
        `${API_BASE_URL}/${labelId}`,
        labelData,
        { headers: getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update label');
      }
      
      return response.data.label;
    } catch (error) {
      console.error('Error updating label:', error);
      throw error;
    }
  },

  /**
   * Delete a label
   * @param {string} labelId - Label ID
   * @returns {Promise<Object>} Success response
   */
  async deleteLabel(labelId) {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Please login to delete labels');
    }

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/${labelId}`,
        { headers: getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete label');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error deleting label:', error);
      throw error;
    }
  },

  /**
   * Get labels for a specific email
   * @param {string} emailUid - Email UID
   * @param {string} folder - Folder (INBOX or SENT)
   * @param {string} emailAccountId - Email account ID
   * @returns {Promise<Array>} Array of labels for the email
   */
  async getEmailLabels(emailUid, folder, emailAccountId) {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Please login to access email labels');
    }

    try {
      const url = `${API_BASE_URL}/email/${emailUid}/labels?folder=${folder}&emailAccountId=${emailAccountId}`;
      const response = await axios.get(url, {
        headers: getAuthHeaders()
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch email labels');
      }
      
      return response.data.labels || [];
    } catch (error) {
      console.error('Error fetching email labels:', error);
      throw error;
    }
  },

  /**
   * Add labels to an email
   * @param {string} emailUid - Email UID
   * @param {string} folder - Folder (INBOX or SENT)
   * @param {Array<string>} labelIds - Array of label IDs to add
   * @param {string} emailAccountId - Email account ID
   * @returns {Promise<Array>} Updated labels for the email
   */
  async addLabelsToEmail(emailUid, folder, labelIds, emailAccountId) {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Please login to add labels');
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/email/add`,
        {
          emailUid,
          folder,
          labelIds,
          emailAccountId
        },
        { headers: getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to add labels');
      }
      
      return response.data.labels || [];
    } catch (error) {
      console.error('Error adding labels:', error);
      throw error;
    }
  },

  /**
   * Remove labels from an email
   * @param {string} emailUid - Email UID
   * @param {string} folder - Folder (INBOX or SENT)
   * @param {Array<string>} labelIds - Array of label IDs to remove
   * @param {string} emailAccountId - Email account ID
   * @returns {Promise<Array>} Updated labels for the email
   */
  async removeLabelsFromEmail(emailUid, folder, labelIds, emailAccountId) {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Please login to remove labels');
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/email/remove`,
        {
          emailUid,
          folder,
          labelIds,
          emailAccountId
        },
        { headers: getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to remove labels');
      }
      
      return response.data.labels || [];
    } catch (error) {
      console.error('Error removing labels:', error);
      throw error;
    }
  },

  /**
   * Get emails filtered by label ⭐ KEY FUNCTION
   * @param {string} labelId - Label ID
   * @param {string} folder - Folder (INBOX or SENT) - optional
   * @param {string} emailAccountId - Email account ID
   * @param {boolean} includeDetails - Include full email details (default: true)
   * @returns {Promise<Object>} Response with emails array
   */
  async getEmailsByLabel(labelId, folder, emailAccountId, includeDetails = true) {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Please login to access emails');
    }

    try {
      const params = new URLSearchParams({
        includeDetails: includeDetails.toString()
      });
      
      if (emailAccountId) {
        params.append('emailAccountId', emailAccountId);
      }
      
      if (folder) {
        params.append('folder', folder.toUpperCase());
      }

      const url = `${API_BASE_URL}/${labelId}/emails?${params.toString()}`;
      
      const response = await axios.get(url, {
        headers: getAuthHeaders(),
        timeout: 35000 // 35 seconds timeout
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch emails by label');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching emails by label:', error);
      
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
  },

  /**
   * Bulk add labels to multiple emails
   * @param {Array<string>} emailUids - Array of email UIDs
   * @param {string} folder - Folder (INBOX or SENT)
   * @param {Array<string>} labelIds - Array of label IDs to add
   * @param {string} emailAccountId - Email account ID
   * @returns {Promise<Object>} Success response
   */
  async bulkAddLabels(emailUids, folder, labelIds, emailAccountId) {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Please login to bulk add labels');
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/email/bulk-add`,
        {
          emailUids,
          folder,
          labelIds,
          emailAccountId
        },
        { headers: getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to bulk add labels');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error bulk adding labels:', error);
      throw error;
    }
  }
};

export default labelService;
