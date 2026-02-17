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
  const [showSignatureUploadModal, setShowSignatureUploadModal] = useState(false);
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
      draft: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-100',
        label: 'Draft',
      },
      finalized: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-100',
        label: 'Finalized',
      },
      archived: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-200',
        label: 'Archived',
      },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <span
        className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium border ${config.bg} ${config.text} ${config.border}`}
      >
        {config.label}
      </span>
    );
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const getPageNumbers = () => {
    const { totalPages, currentPage } = pagination;
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const halfVisible = Math.floor(maxVisible / 2);

    if (currentPage <= halfVisible + 1) {
      for (let i = 1; i <= maxVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    } else if (currentPage >= totalPages - halfVisible) {
      pages.push(1);
      for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      for (let i = currentPage - halfVisible + 1; i <= currentPage + halfVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Employee Documents</h1>
        <p className="text-gray-600 text-sm md:text-base">
          Manage HR documents including offer letters, LOIs, salary slips, and FNF documents
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 mb-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('documents')}
              className={`relative flex items-center gap-2 px-1 py-4 text-xl font-medium transition-colors ${
                activeTab === 'documents' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText
                className={`w-4 h-4 ${
                  activeTab === 'documents' ? 'text-blue-600' : 'text-gray-500'
                }`}
              />
              <span>Documents</span>
              {activeTab === 'documents' && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('signatures')}
              className={`relative flex items-center gap-2 px-1 py-4 text-xl font-medium transition-colors ${
                activeTab === 'signatures' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload
                className={`w-4 h-4 ${
                  activeTab === 'signatures' ? 'text-blue-600' : 'text-gray-500'
                }`}
              />
              <span>Signatures</span>
              {activeTab === 'signatures' && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          </div>

          {activeTab === 'documents' ? (
            <button
              onClick={() => {
                setShowDocumentTypeModal(true);
              }}
              className="px-5 py-2.5 my-2 inline-flex items-center gap-2 rounded-full text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Plus className="w-6 h-6" />
              <span>Create Document</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setShowSignatureUploadModal(true);
              }}
              className="px-5 py-2.5 my-2 inline-flex items-center gap-2 rounded-full text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Plus className="w-6 h-6" />
              <span>Upload Signature</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'documents' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
            <div className="relative w-full mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search documents..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <select
                value={filters.documentType}
                onChange={(e) => {
                  setFilters({ ...filters, documentType: e.target.value });
                  setPagination((prev) => ({ ...prev, currentPage: 1 }));
                }}
                className="w-full md:w-auto md:flex-1 px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="offer_letter">Offer Letter</option>
                <option value="letter_of_intent">Letter of Intent</option>
                <option value="salary_slip">Salary Slip</option>
                <option value="fnf">FNF</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setPagination((prev) => ({ ...prev, currentPage: 1 }));
                }}
                className="w-full md:w-auto md:flex-1 px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="finalized">Finalized</option>
                <option value="archived">Archived</option>
              </select>

              <input
                type="text"
                placeholder="Employee ID"
                value={filters.employeeId}
                onChange={(e) => {
                  setFilters({ ...filters, employeeId: e.target.value });
                  setPagination((prev) => ({ ...prev, currentPage: 1 }));
                }}
                className="w-full md:w-auto md:flex-1 px-4 py-3 border border-gray-200 text-lg rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto p-4">
              <table className="min-w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-10 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y first:border-l border-gray-200 rounded-l-lg text-left">
                      Type
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200 text-left">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200 text-center">
                      Status
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200 text-center">
                      Created
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y last:border-r border-gray-200 rounded-r-lg text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-4 py-12 text-center border-y first:border-l last:border-r border-gray-200 first:rounded-l-lg last:rounded-r-lg"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <Loader className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                          <p className="text-gray-600">Loading documents...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDocuments.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-4 py-12 text-center border-y first:border-l last:border-r border-gray-200 first:rounded-l-lg last:rounded-r-lg"
                      >
                        <FileText className="w-10 h-10 mb-3 text-gray-400 mx-auto" />
                        <p className="text-gray-500 text-lg">No documents found</p>
                        <p className="text-gray-400 text-sm">Try adjusting filters or create a new document.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <tr key={doc.documentId} className="bg-white hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 border-y first:border-l border-gray-200 first:rounded-l-lg align-middle">
                          <div className="flex items-center gap-2">
                            {getDocumentTypeIcon(doc.documentType)}
                            <span className="text-base font-medium text-gray-900">
                              {getDocumentTypeLabel(doc.documentType)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 border-y border-gray-200 align-middle">
                          <div className="flex flex-col items-start">
                            <div className="text-base font-medium text-gray-900">{doc.employeeName}</div>
                            <div className="text-sm text-gray-700">{doc.employeeId}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 border-y border-gray-200 align-middle text-center">
                          {getStatusBadge(doc.status)}
                        </td>
                        <td className="px-4 py-4 border-y border-gray-200 text-base text-gray-900 font-medium align-middle text-center">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 border-y last:border-r border-gray-200 last:rounded-r-lg align-middle text-center">
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => handleViewDocument(doc.documentId)}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer"
                              title="View"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() =>
                                handleGeneratePDF(doc.documentId, doc.documentType, doc.employeeName)
                              }
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-green-200 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors cursor-pointer"
                              title="Download PDF"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleSendPDF(doc.documentId)}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors cursor-pointer"
                              title="Send PDF to employee"
                            >
                              <Mail className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.documentId)}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-4 flex justify-between items-center px-4 border border-gray-200 p-2 rounded-xl bg-white">
              <div className="text-sm text-gray-600">
                Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalDocuments} documents)
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {getPageNumbers().map((page, idx, arr) => {
                    const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsisBefore && <span className="px-2 text-gray-400">...</span>}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                            pagination.currentPage === page
                              ? 'border border-gray-900 text-gray-900 bg-white'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'signatures' && (
        <SignatureManagement
          showUploadModal={showSignatureUploadModal}
          setShowUploadModal={setShowSignatureUploadModal}
        />
      )}

      {/* Document Type Selection Modal */}
      {showDocumentTypeModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
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
