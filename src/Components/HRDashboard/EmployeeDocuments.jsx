import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Loader,
  FileCheck,
  Briefcase,
  DollarSign,
  Receipt,
  UserCheck,
  Mail,
} from 'lucide-react';
import employeeDocumentsService from '../../services/employeeDocumentsService';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import SignatureManagement from './EmployeeDocuments/SignatureManagement';
import DocumentForm from './EmployeeDocuments/DocumentForm';
import DocumentDetail from './EmployeeDocuments/DocumentDetail';

const EmployeeDocuments = () => {
  const [activeTab, setActiveTab] = useState('documents'); // 'documents', 'signatures', 'create'
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDocumentTypeModal, setShowDocumentTypeModal] = useState(false);
  const [documentType, setDocumentType] = useState('offer_letter'); // 'offer_letter', 'letter_of_intent', 'salary_slip', 'fnf'
  
  // Filters
  const [filters, setFilters] = useState({
    documentType: '',
    employeeId: '',
    status: '',
    search: '',
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalDocuments: 0,
    limit: 10,
  });

  // Fetch documents
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
      };
      
      if (filters.documentType) params.documentType = filters.documentType;
      if (filters.employeeId) params.employeeId = filters.employeeId;
      if (filters.status) params.status = filters.status;

      const response = await employeeDocumentsService.getDocuments(params);
      
      if (response.success) {
        // Normalize document IDs - handle both _id and documentId
        const normalizedDocuments = (response.data.documents || []).map(doc => ({
          ...doc,
          documentId: doc.documentId || doc._id || doc.id,
        }));
        setDocuments(normalizedDocuments);
        setFilteredDocuments(normalizedDocuments);
        setPagination({
          ...pagination,
          totalPages: response.data.pagination?.totalPages || 1,
          totalDocuments: response.data.pagination?.totalDocuments || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      alertify.error(error.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    }
  }, [activeTab, pagination.currentPage, filters.documentType, filters.employeeId, filters.status]);

  // Apply search filter
  useEffect(() => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const filtered = documents.filter(doc =>
        doc.employeeName?.toLowerCase().includes(searchLower) ||
        doc.employeeId?.toLowerCase().includes(searchLower) ||
        doc.documentType?.toLowerCase().includes(searchLower)
      );
      setFilteredDocuments(filtered);
    } else {
      setFilteredDocuments(documents);
    }
  }, [filters.search, documents]);

  // Handle document creation
  const handleDocumentCreated = () => {
    setShowCreateModal(false);
    fetchDocuments();
    alertify.success('Document created successfully');
  };

  // Handle document update
  const handleDocumentUpdated = () => {
    setShowDetailModal(false);
    fetchDocuments();
    alertify.success('Document updated successfully');
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId) => {
    if (!documentId) {
      alertify.error('Document ID is missing');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await employeeDocumentsService.deleteDocument(documentId);
      if (response.success) {
        alertify.success('Document deleted successfully');
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alertify.error(error.message || 'Failed to delete document');
    }
  };

  // Send PDF to employee by email
  const handleSendPDF = async (documentId) => {
    if (!documentId) {
      alertify.error('Document ID is missing');
      return;
    }
    try {
      setLoading(true);
      const result = await employeeDocumentsService.sendPDF(documentId);
      if (result.success) {
        alertify.success(`PDF sent to ${result.data?.sentTo || 'employee'}`);
      } else {
        alertify.error(result.message || 'Failed to send PDF');
      }
    } catch (error) {
      console.error('Error sending PDF:', error);
      alertify.error(error.message || 'Failed to send PDF');
    } finally {
      setLoading(false);
    }
  };

  // Handle PDF generation
  const handleGeneratePDF = async (documentId, documentType, employeeName) => {
    if (!documentId) {
      alertify.error('Document ID is missing');
      return;
    }
    try {
      setLoading(true);
      const blob = await employeeDocumentsService.generatePDF(documentId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentType}_${employeeName || documentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alertify.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alertify.error(error.message || 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  // View document details
  const handleViewDocument = async (documentId) => {
    if (!documentId) {
      alertify.error('Document ID is missing');
      return;
    }
    try {
      setLoading(true);
      const response = await employeeDocumentsService.getDocumentById(documentId);
      if (response.success) {
        // Normalize document ID
        const normalizedDoc = {
          ...response.data,
          documentId: response.data.documentId || response.data._id || response.data.id,
        };
        setSelectedDocument(normalizedDoc);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      alertify.error(error.message || 'Failed to fetch document details');
    } finally {
      setLoading(false);
    }
  };

  // Get document type icon
  const getDocumentTypeIcon = (type) => {
    switch (type) {
      case 'offer_letter':
        return <Briefcase className="w-5 h-5" />;
      case 'letter_of_intent':
        return <FileCheck className="w-5 h-5" />;
      case 'salary_slip':
        return <DollarSign className="w-5 h-5" />;
      case 'fnf':
        return <Receipt className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  // Get document type label
  const getDocumentTypeLabel = (type) => {
    switch (type) {
      case 'offer_letter':
        return 'Offer Letter';
      case 'letter_of_intent':
        return 'Letter of Intent';
      case 'salary_slip':
        return 'Salary Slip';
      case 'fnf':
        return 'FNF';
      default:
        return type;
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      finalized: { bg: 'bg-green-100', text: 'text-green-700', label: 'Finalized' },
      archived: { bg: 'bg-red-100', text: 'text-red-700', label: 'Archived' },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Documents</h1>
        <p className="text-gray-600">Manage HR documents including offer letters, LOIs, salary slips, and FNF documents</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'documents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </div>
          </button>
          <button
            onClick={() => setActiveTab('signatures')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'signatures'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Signatures
            </div>
          </button>
          <button
            onClick={() => {
              setShowDocumentTypeModal(true);
            }}
            className="ml-auto px-6 py-3 font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg m-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Document
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Document Type Filter */}
              <select
                value={filters.documentType}
                onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="offer_letter">Offer Letter</option>
                <option value="letter_of_intent">Letter of Intent</option>
                <option value="salary_slip">Salary Slip</option>
                <option value="fnf">FNF</option>
              </select>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="finalized">Finalized</option>
                <option value="archived">Archived</option>
              </select>

              {/* Employee ID Filter */}
              <input
                type="text"
                placeholder="Employee ID"
                value={filters.employeeId}
                onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Documents Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mb-4 text-gray-400" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm">Create a new document to get started</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.documentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getDocumentTypeIcon(doc.documentType)}
                            <span className="text-sm font-medium text-gray-900">
                              {getDocumentTypeLabel(doc.documentType)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{doc.employeeName}</div>
                            <div className="text-sm text-gray-500">{doc.employeeId}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(doc.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDocument(doc.documentId)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleGeneratePDF(doc.documentId, doc.documentType, doc.employeeName)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSendPDF(doc.documentId)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                              title="Send PDF to employee"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.documentId)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalDocuments} total)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                      disabled={pagination.currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'signatures' && (
        <SignatureManagement />
      )}

      {/* Document Type Selection Modal */}
      {showDocumentTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Plus className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Select Document Type</h3>
              </div>
              <button
                onClick={() => setShowDocumentTypeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Type Options */}
            <div className="p-6">
              <p className="text-gray-600 mb-6">Choose the type of document you want to create:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Offer Letter */}
                <button
                  onClick={() => {
                    setDocumentType('offer_letter');
                    setShowDocumentTypeModal(false);
                    setShowCreateModal(true);
                  }}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Offer Letter</h4>
                      <p className="text-sm text-gray-600">Create a job offer letter for new employees</p>
                    </div>
                  </div>
                </button>

                {/* Letter of Intent */}
                <button
                  onClick={() => {
                    setDocumentType('letter_of_intent');
                    setShowDocumentTypeModal(false);
                    setShowCreateModal(true);
                  }}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <FileCheck className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Letter of Intent</h4>
                      <p className="text-sm text-gray-600">Create a letter of intent for potential hires</p>
                    </div>
                  </div>
                </button>

                {/* Salary Slip */}
                <button
                  onClick={() => {
                    setDocumentType('salary_slip');
                    setShowDocumentTypeModal(false);
                    setShowCreateModal(true);
                  }}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                      <DollarSign className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Salary Slip</h4>
                      <p className="text-sm text-gray-600">Generate monthly salary slips for employees</p>
                    </div>
                  </div>
                </button>

                {/* FNF */}
                <button
                  onClick={() => {
                    setDocumentType('fnf');
                    setShowDocumentTypeModal(false);
                    setShowCreateModal(true);
                  }}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                      <Receipt className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">FNF Document</h4>
                      <p className="text-sm text-gray-600">Create Full and Final settlement documents</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex items-center justify-end">
              <button
                onClick={() => setShowDocumentTypeModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Document Modal */}
      {showCreateModal && (
        <DocumentForm
          documentType={documentType}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleDocumentCreated}
        />
      )}

      {/* Document Detail Modal */}
      {showDetailModal && selectedDocument && (
        <DocumentDetail
          document={selectedDocument}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDocument(null);
          }}
          onUpdate={handleDocumentUpdated}
          onDelete={handleDeleteDocument}
          onGeneratePDF={handleGeneratePDF}
          onSendPDF={handleSendPDF}
        />
      )}
    </div>
  );
};

export default EmployeeDocuments;
