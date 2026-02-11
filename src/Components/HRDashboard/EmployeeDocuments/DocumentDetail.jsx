import React, { useState } from 'react';
import { X, Edit, Trash2, Download, Loader, Briefcase, FileText, DollarSign, Receipt, Mail } from 'lucide-react';

const DocumentDetail = ({ document, onClose, onUpdate, onDelete, onGeneratePDF, onSendPDF }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper function to format dates safely
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Not specified';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        // If invalid date, return the original value
        return dateValue;
      }
      return date.toLocaleDateString();
    } catch (e) {
      return dateValue || 'Not specified';
    }
  };

  // Helper function to format date with time
  const formatDateTime = (dateValue) => {
    if (!dateValue) return 'Not specified';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return dateValue;
      }
      return date.toLocaleString();
    } catch (e) {
      return dateValue || 'Not specified';
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      setLoading(true);
      try {
        await onDelete(document.documentId);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      await onGeneratePDF(document.documentId, document.documentType, document.employeeName);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPDF = async () => {
    if (!onSendPDF) return;
    setLoading(true);
    try {
      await onSendPDF(document.documentId);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = () => {
    switch (document.documentType) {
      case 'offer_letter':
        return <Briefcase className="w-6 h-6 text-blue-600" />;
      case 'letter_of_intent':
        return <FileText className="w-6 h-6 text-green-600" />;
      case 'salary_slip':
        return <DollarSign className="w-6 h-6 text-yellow-600" />;
      case 'fnf':
        return <Receipt className="w-6 h-6 text-red-600" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const getDocumentTypeLabel = () => {
    switch (document.documentType) {
      case 'offer_letter':
        return 'Offer Letter';
      case 'letter_of_intent':
        return 'Letter of Intent';
      case 'salary_slip':
        return 'Salary Slip';
      case 'fnf':
        return 'Full and Final Settlement';
      default:
        return document.documentType;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      finalized: { bg: 'bg-green-100', text: 'text-green-700', label: 'Finalized' },
      archived: { bg: 'bg-red-100', text: 'text-red-700', label: 'Archived' },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getDocumentIcon()}
            <div>
              <h3 className="text-xl font-bold text-gray-900">{getDocumentTypeLabel()}</h3>
              <p className="text-sm text-gray-500">Document ID: {document.documentId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGeneratePDF}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              title="Download PDF"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              PDF
            </button>
            {onSendPDF && (
              <button
                onClick={handleSendPDF}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                title="Send PDF to employee"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send PDF
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Employee ID</label>
              <p className="text-lg font-semibold text-gray-900">{document.employeeId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Employee Name</label>
              <p className="text-lg font-semibold text-gray-900">{document.employeeName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              {getStatusBadge(document.status)}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Created Date</label>
              <p className="text-gray-900">{formatDateTime(document.createdAt)}</p>
            </div>
          </div>

          {/* Document Type Specific Details */}
          {document.documentType === 'offer_letter' && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Offer Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Position</label>
                    <p className="text-gray-900">{document.position}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                    <p className="text-gray-900">{document.department}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Joining Date</label>
                    <p className="text-gray-900">{formatDate(document.joiningDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Salary</label>
                    <p className="text-gray-900">
                      {document.salary?.amount ? (
                        <>
                          {document.salary?.currency || 'USD'} {document.salary.amount.toLocaleString()} {document.salary?.frequency ? `/ ${document.salary.frequency}` : ''}
                        </>
                      ) : (
                        'Not specified'
                      )}
                    </p>
                  </div>
                </div>
                {document.benefits && document.benefits.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Benefits</label>
                    <div className="flex flex-wrap gap-2">
                      {document.benefits.map((benefit, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {document.terms && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Terms & Conditions</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{document.terms}</p>
                  </div>
                )}
                {document.additionalNotes && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Additional Notes</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{document.additionalNotes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {document.documentType === 'letter_of_intent' && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">LOI Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Position</label>
                    <p className="text-gray-900">{document.position}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                    <p className="text-gray-900">{document.department}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Expected Joining Date</label>
                    <p className="text-gray-900">{formatDate(document.expectedJoiningDate)}</p>
                  </div>
                </div>
                {document.terms && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Terms & Conditions</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{document.terms}</p>
                  </div>
                )}
                {document.additionalNotes && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Additional Notes</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{document.additionalNotes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {document.documentType === 'salary_slip' && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Salary Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Month</label>
                    <p className="text-gray-900">{document.month}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Working Days</label>
                    <p className="text-gray-900">{document.workingDays}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Present Days</label>
                    <p className="text-gray-900">{document.presentDays}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Leave Days</label>
                    <p className="text-gray-900">{document.leaveDays || 0}</p>
                  </div>
                </div>
                {document.salaryDetails && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-3">Earnings</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Basic Salary</span>
                          <span className="font-medium">{document.salaryDetails.basicSalary?.toLocaleString()}</span>
                        </div>
                        {document.salaryDetails.allowances?.housing && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Housing Allowance</span>
                            <span className="font-medium">{document.salaryDetails.allowances.housing?.toLocaleString()}</span>
                          </div>
                        )}
                        {document.salaryDetails.allowances?.transport && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Transport Allowance</span>
                            <span className="font-medium">{document.salaryDetails.allowances.transport?.toLocaleString()}</span>
                          </div>
                        )}
                        {document.salaryDetails.allowances?.medical && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Medical Allowance</span>
                            <span className="font-medium">{document.salaryDetails.allowances.medical?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-3">Deductions</h5>
                      <div className="space-y-2">
                        {document.salaryDetails.deductions?.tax && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tax</span>
                            <span className="font-medium text-red-600">-{document.salaryDetails.deductions.tax?.toLocaleString()}</span>
                          </div>
                        )}
                        {document.salaryDetails.deductions?.insurance && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Insurance</span>
                            <span className="font-medium text-red-600">-{document.salaryDetails.deductions.insurance?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900">Net Salary</span>
                          <span className="font-bold text-lg text-green-600">{document.salaryDetails.netSalary?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {document.documentType === 'fnf' && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Settlement Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Last Working Date</label>
                    <p className="text-gray-900">{formatDate(document.lastWorkingDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Settlement Date</label>
                    <p className="text-gray-900">{formatDate(document.settlementDate)}</p>
                  </div>
                </div>
                {document.settlementDetails && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-3">Credits</h5>
                      <div className="space-y-2">
                        {document.settlementDetails.pendingSalary && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pending Salary</span>
                            <span className="font-medium">{document.settlementDetails.pendingSalary?.toLocaleString()}</span>
                          </div>
                        )}
                        {document.settlementDetails.leaveEncashment && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Leave Encashment</span>
                            <span className="font-medium">{document.settlementDetails.leaveEncashment?.toLocaleString()}</span>
                          </div>
                        )}
                        {document.settlementDetails.bonus && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bonus</span>
                            <span className="font-medium">{document.settlementDetails.bonus?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-3">Deductions</h5>
                      <div className="space-y-2">
                        {document.settlementDetails.deductions?.outstanding && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Outstanding</span>
                            <span className="font-medium text-red-600">-{document.settlementDetails.deductions.outstanding?.toLocaleString()}</span>
                          </div>
                        )}
                        {document.settlementDetails.deductions?.noticePeriod && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Notice Period</span>
                            <span className="font-medium text-red-600">-{document.settlementDetails.deductions.noticePeriod?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900">Total Amount</span>
                          <span className="font-bold text-lg text-green-600">{document.settlementDetails.totalAmount?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {document.remarks && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Remarks</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{document.remarks}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Signature */}
          {document.signature && (
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-500 mb-2">Signature</label>
              <img
                src={document.signature.signatureUrl}
                alt="Signature"
                className="max-h-32 border border-gray-200 rounded"
              />
            </div>
          )}

          {/* Created By */}
          {document.createdBy && (
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-500 mb-1">Created By</label>
              <p className="text-gray-900">{document.createdBy.employeeName} ({document.createdBy.empId})</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetail;
