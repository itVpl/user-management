import API_CONFIG from '../config/api.js';

class EmployeeDocumentsService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  // Get auth token
  getAuthToken() {
    return sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  }

  // Get auth headers
  getAuthHeaders(contentType = 'application/json') {
    const token = this.getAuthToken();
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    
    // Only add Content-Type if not FormData
    if (contentType !== 'multipart/form-data') {
      headers['Content-Type'] = contentType;
    }
    
    return headers;
  }

  // ============ Signature Management ============

  /**
   * Upload a signature
   * @param {File} file - Signature image file
   * @param {string} signatureName - Name/identifier for the signature
   * @param {string} signatureType - Type of signature (e.g., "hr_manager", "ceo")
   */
  async uploadSignature(file, signatureName = '', signatureType = '') {
    try {
      const formData = new FormData();
      formData.append('signature', file);
      if (signatureName) formData.append('signatureName', signatureName);
      if (signatureType) formData.append('signatureType', signatureType);

      const url = `${this.baseURL}/api/v1/employee-documents/signatures/upload`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders('multipart/form-data'),
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading signature:', error);
      throw error;
    }
  }

  /**
   * Get all signatures
   */
  async getSignatures() {
    try {
      const url = `${this.baseURL}/api/v1/employee-documents/signatures`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch signatures: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching signatures:', error);
      throw error;
    }
  }

  /**
   * Delete a signature
   * @param {string} signatureId - Signature ID
   */
  async deleteSignature(signatureId) {
    try {
      const url = `${this.baseURL}/api/v1/employee-documents/signatures/${signatureId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Delete failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting signature:', error);
      throw error;
    }
  }

  // ============ Document Management ============

  /**
   * Create an offer letter
   * @param {Object} data - Offer letter data
   */
  async createOfferLetter(data) {
    try {
      const url = `${this.baseURL}/api/v1/employee-documents/offer-letter/create`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create offer letter: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating offer letter:', error);
      throw error;
    }
  }

  /**
   * Create a letter of intent
   * @param {Object} data - LOI data
   */
  async createLetterOfIntent(data) {
    try {
      const url = `${this.baseURL}/api/v1/employee-documents/letter-of-intent/create`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create letter of intent: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating letter of intent:', error);
      throw error;
    }
  }

  /**
   * Create a salary slip
   * @param {Object} data - Salary slip data
   */
  async createSalarySlip(data) {
    try {
      const url = `${this.baseURL}/api/v1/employee-documents/salary-slip/create`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create salary slip: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating salary slip:', error);
      throw error;
    }
  }

  /**
   * Create an FNF document
   * @param {Object} data - FNF data
   */
  async createFNF(data) {
    try {
      const url = `${this.baseURL}/api/v1/employee-documents/fnf/create`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create FNF document: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating FNF document:', error);
      throw error;
    }
  }

  /**
   * Get all documents with optional filters
   * @param {Object} filters - Filter options (documentType, employeeId, status, page, limit)
   */
  async getDocuments(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.documentType) queryParams.append('documentType', filters.documentType);
      if (filters.employeeId) queryParams.append('employeeId', filters.employeeId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);

      const queryString = queryParams.toString();
      const url = `${this.baseURL}/api/v1/employee-documents${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }

  /**
   * Get a document by ID
   * @param {string} documentId - Document ID
   */
  async getDocumentById(documentId) {
    try {
      const url = `${this.baseURL}/api/v1/employee-documents/${documentId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }

  /**
   * Update a document
   * @param {string} documentId - Document ID
   * @param {Object} data - Updated document data
   */
  async updateDocument(documentId, data) {
    try {
      const url = `${this.baseURL}/api/v1/employee-documents/${documentId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update document: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   * @param {string} documentId - Document ID
   */
  async deleteDocument(documentId) {
    try {
      const url = `${this.baseURL}/api/v1/employee-documents/${documentId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete document: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  // ============ PDF Generation ============

  /**
   * Generate PDF for a document
   * @param {string} documentId - Document ID
   * @returns {Blob} PDF blob
   */
  async generatePDF(documentId) {
    try {
      const url = `${this.baseURL}/api/v1/employee-documents/${documentId}/generate-pdf`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.text().catch(() => '');
        throw new Error(`Failed to generate PDF: ${response.status} - ${errorData}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Preview PDF (get preview URL)
   * @param {string} documentId - Document ID
   */
  async previewPDF(documentId) {
    try {
      const url = `${this.baseURL}/api/v1/employee-documents/${documentId}/preview-pdf`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to get PDF preview: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting PDF preview:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const employeeDocumentsService = new EmployeeDocumentsService();
export default employeeDocumentsService;
