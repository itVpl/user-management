import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, 
  FileText, 
  Search, 
  Download, 
  Edit, 
  Trash2, 
  Eye
} from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function DocsUpload() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'my'
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    document: null,
    documentName: '',
    description: '',
    tags: '',
    allowedDepartments: [],
    allowedEmployees: []
  });
  const [uploading, setUploading] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    documentName: '',
    description: '',
    tags: '',
    allowedDepartments: [],
    allowedEmployees: []
  });
  const [updating, setUpdating] = useState(false);

  const itemsPerPage = 20;

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const endpoint = viewMode === 'my' 
        ? `${API_CONFIG.BASE_URL}/api/v1/common-documents/my-documents`
        : `${API_CONFIG.BASE_URL}/api/v1/common-documents`;

      const response = await axios.get(
        `${endpoint}?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setDocuments(response.data.data || []);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalItems(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      alertify.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentPage, searchTerm, viewMode]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewMode]);

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alertify.error('File size must be less than 50MB');
        return;
      }
      setUploadForm({ ...uploadForm, document: file });
    }
  };

  // Handle upload submission
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadForm.document) {
      alertify.error('Please select a file to upload');
      return;
    }
    if (!uploadForm.documentName.trim()) {
      alertify.error('Please enter document name');
      return;
    }

    try {
      setUploading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const formData = new FormData();
      
      formData.append('document', uploadForm.document);
      formData.append('documentName', uploadForm.documentName);
      formData.append('description', uploadForm.description || '');
      formData.append('tags', uploadForm.tags || '');

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/common-documents/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        alertify.success('Document uploaded successfully');
        setShowUploadModal(false);
        resetUploadForm();
        fetchDocuments();
      } else {
        alertify.error(response.data.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alertify.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // Reset upload form
  const resetUploadForm = () => {
    setUploadForm({
      document: null,
      documentName: '',
      description: '',
      tags: '',
      allowedDepartments: [],
      allowedEmployees: []
    });
  };

  // Handle view document
  const handleViewDocument = async (documentId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/common-documents/${documentId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSelectedDocument(response.data.data);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
      alertify.error('Failed to load document details');
    }
  };

  // Handle edit document
  const handleEditDocument = (document) => {
    setSelectedDocument(document);
    setEditForm({
      documentName: document.documentName || '',
      description: document.description || '',
      tags: Array.isArray(document.tags) ? document.tags.join(', ') : document.tags || '',
      allowedDepartments: document.allowedDepartments || [],
      allowedEmployees: document.allowedEmployees || []
    });
    setShowEditModal(true);
  };

  // Handle update document
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setUpdating(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const updateData = {
        documentName: editForm.documentName,
        description: editForm.description,
        tags: editForm.tags,
        allowedDepartments: editForm.allowedDepartments,
        allowedEmployees: editForm.allowedEmployees
      };

      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/common-documents/${selectedDocument._id}`,
        updateData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alertify.success('Document updated successfully');
        setShowEditModal(false);
        setSelectedDocument(null);
        fetchDocuments();
      } else {
        alertify.error(response.data.message || 'Failed to update document');
      }
    } catch (error) {
      console.error('Error updating document:', error);
      alertify.error(error.response?.data?.message || 'Failed to update document');
    } finally {
      setUpdating(false);
    }
  };

  // Handle delete document
  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.delete(
        `${API_CONFIG.BASE_URL}/api/v1/common-documents/${documentId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alertify.success('Document deleted successfully');
        fetchDocuments();
      } else {
        alertify.error(response.data.message || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alertify.error(error.response?.data?.message || 'Failed to delete document');
    }
  };

  // Handle download
  const handleDownload = async (document) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Increment download count
      await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/common-documents/${document._id}/download`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Download file
      const fileUrl = document.file?.url || document.file;
      const url = fileUrl.startsWith('http') 
        ? fileUrl 
        : `${API_CONFIG.BASE_URL}/${fileUrl.replace(/^\//, '')}`;
      
      window.open(url, '_blank');
      fetchDocuments(); // Refresh to update download count
    } catch (error) {
      console.error('Error downloading document:', error);
      alertify.error('Failed to download document');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Document Management</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload size={20} />
          Upload Document
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('all')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Documents
            </button>
            <button
              onClick={() => setViewMode('my')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'my'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              My Documents
            </button>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No documents found</p>
            <p className="text-gray-400 text-sm mt-2">Upload your first document to get started</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Downloads</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-blue-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{doc.documentName}</div>
                            {doc.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">{doc.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.uploadedBy?.employeeName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(doc.file?.fileSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.downloadCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDocument(doc._id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            className="text-green-600 hover:text-green-900"
                            title="Download"
                          >
                            <Download size={18} />
                          </button>
                          {viewMode === 'my' && (
                            <>
                              <button
                                onClick={() => handleEditDocument(doc)}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(doc._id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} documents
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-xl font-bold">Upload Document</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv,.zip,.rar"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {uploadForm.document && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: <span className="font-medium">{uploadForm.document.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadForm.documentName}
                  onChange={(e) => setUploadForm({ ...uploadForm, documentName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  placeholder="e.g., proposal, q4, 2024"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedDocument && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-xl font-bold">Document Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedDocument(null);
                }}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Document Name</label>
                  <p className="text-gray-900 font-semibold">{selectedDocument.documentName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">File Size</label>
                  <p className="text-gray-900">{formatFileSize(selectedDocument.file?.fileSize)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Uploaded By</label>
                  <p className="text-gray-900">{selectedDocument.uploadedBy?.employeeName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Downloads</label>
                  <p className="text-gray-900">{selectedDocument.downloadCount || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Uploaded At</label>
                  <p className="text-gray-900">{formatDate(selectedDocument.uploadedAt)}</p>
                </div>
                {selectedDocument.file?.mimeType && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">File Type</label>
                    <p className="text-gray-900">{selectedDocument.file.mimeType}</p>
                  </div>
                )}
              </div>
              {selectedDocument.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900 mt-1">{selectedDocument.description}</p>
                </div>
              )}
              {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Array.isArray(selectedDocument.tags) ? (
                      selectedDocument.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                        {selectedDocument.tags}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => handleDownload(selectedDocument)}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download size={18} />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedDocument && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Document</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedDocument(null);
                }}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.documentName}
                  onChange={(e) => setEditForm({ ...editForm, documentName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  placeholder="e.g., proposal, q4, 2024"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedDocument(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

