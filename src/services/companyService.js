import apiService from './apiService.js';

// Company Service - handles all company-related API calls
class CompanyService {
  constructor() {
    this.baseEndpoint = '/api/v1/tally/company';
  }

  // Create a new company
  async createCompany(companyData) {
    return apiService.post(`${this.baseEndpoint}/create`, companyData);
  }

  // Get all companies with filters
  async getAllCompanies(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const queryString = params.toString();
    const endpoint = queryString ? `${this.baseEndpoint}/all?${queryString}` : `${this.baseEndpoint}/all`;
    
    return apiService.get(endpoint);
  }

  // Get company by ID
  async getCompanyById(companyId) {
    return apiService.get(`${this.baseEndpoint}/${companyId}`);
  }

  // Update company
  async updateCompany(companyId, updateData) {
    return apiService.put(`${this.baseEndpoint}/${companyId}/update`, updateData);
  }

  // Delete/Deactivate company
  async deleteCompany(companyId) {
    return apiService.delete(`${this.baseEndpoint}/${companyId}/delete`);
  }

  // Activate company
  async activateCompany(companyId) {
    return apiService.put(`${this.baseEndpoint}/${companyId}/activate`);
  }

  // Set default company
  async setDefaultCompany(companyId) {
    return apiService.put(`${this.baseEndpoint}/${companyId}/set-default`);
  }

  // Get default company
  async getDefaultCompany() {
    return apiService.get(`${this.baseEndpoint}/default/get`);
  }

  // Switch company
  async switchCompany(companyId) {
    const response = await apiService.post(`${this.baseEndpoint}/${companyId}/switch`);
    
    // Store in localStorage for session management
    if (response.success && response.company) {
      localStorage.setItem('currentCompanyId', companyId);
      localStorage.setItem('currentCompany', JSON.stringify(response.company));
    }
    
    return response;
  }

  // Get current company from localStorage
  getCurrentCompany() {
    const companyData = localStorage.getItem('currentCompany');
    return companyData ? JSON.parse(companyData) : null;
  }

  // Clear current company
  clearCurrentCompany() {
    localStorage.removeItem('currentCompanyId');
    localStorage.removeItem('currentCompany');
  }
}

// Create and export singleton instance
const companyService = new CompanyService();
export default companyService;
