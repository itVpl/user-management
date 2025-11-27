import React from 'react';
import { Truck, User, MapPin, Phone, Mail, Globe, Calendar, DollarSign, FileText, CheckCircle, XCircle, Building } from 'lucide-react';

const CompanyDetails = ({ company, onClose, onEdit }) => {
  if (!company) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden flex flex-col transform transition-all duration-300 scale-100">
        {/* Custom scrollbar styling */}
        <style jsx>{`
          .modal-content {
            scroll-behavior: smooth;
          }
          .modal-content::-webkit-scrollbar {
            width: 6px;
          }
          .modal-content::-webkit-scrollbar-track {
            background: transparent;
          }
          .modal-content::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.2);
            border-radius: 3px;
            transition: background 0.2s;
          }
          .modal-content:hover::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.4);
          }
          .modal-content::-webkit-scrollbar-thumb:hover {
            background: rgba(156, 163, 175, 0.6);
          }
        `}</style>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Building className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{company.companyName}</h2>
                <p className="text-blue-100">{company.companyCode}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="modal-content overflow-y-auto flex-1 p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              company.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {company.isActive ? 'Active' : 'Inactive'}
            </span>
            {company.isDefault && (
              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700">
                Default Company
              </span>
            )}
          </div>

          {/* Basic Information */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-blue-600" size={20} />
              <h3 className="text-lg font-bold text-gray-800">Basic Information</h3>
            </div>
            <div className="bg-white rounded-xl p-4 border border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Company Name</p>
                  <p className="font-medium text-gray-800">{company.companyName}</p>
                </div>
                {company.companyAlias && (
                  <div>
                    <p className="text-sm text-gray-600">Company Alias</p>
                    <p className="font-medium text-gray-800">{company.companyAlias}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Mailing Name</p>
                  <p className="font-medium text-gray-800">{company.mailingName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Company Code</p>
                  <p className="font-medium text-gray-800">{company.companyCode}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="text-green-600" size={20} />
              <h3 className="text-lg font-bold text-gray-800">Address</h3>
            </div>
            <div className="bg-white rounded-xl p-4 border border-green-200">
              <div className="space-y-2">
                <p className="text-gray-800">{company.address?.addressLine1}</p>
                {company.address?.addressLine2 && (
                  <p className="text-gray-800">{company.address.addressLine2}</p>
                )}
                <p className="text-gray-800">
                  {company.address?.city}, {company.address?.state} - {company.address?.pincode}
                </p>
                <p className="text-gray-800">{company.address?.country}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="text-purple-600" size={20} />
              <h3 className="text-lg font-bold text-gray-800">Contact Information</h3>
            </div>
            <div className="bg-white rounded-xl p-4 border border-purple-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-800">{company.contact?.phone}</p>
                </div>
                {company.contact?.mobile && (
                  <div>
                    <p className="text-sm text-gray-600">Mobile</p>
                    <p className="font-medium text-gray-800">{company.contact.mobile}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-800">{company.contact?.email}</p>
                </div>
                {company.contact?.website && (
                  <div>
                    <p className="text-sm text-gray-600">Website</p>
                    <a
                      href={company.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {company.contact.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Configuration */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-yellow-600" size={20} />
              <h3 className="text-lg font-bold text-gray-800">Financial Configuration</h3>
            </div>
            <div className="bg-white rounded-xl p-4 border border-yellow-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Financial Year</p>
                  <p className="font-medium text-gray-800">
                    {formatDate(company.financialYear?.from)} to {formatDate(company.financialYear?.to)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Books Beginning From</p>
                  <p className="font-medium text-gray-800">{formatDate(company.booksBeginningFrom)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Base Currency</p>
                  <p className="font-medium text-gray-800">{company.baseCurrency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Language</p>
                  <p className="font-medium text-gray-800">{company.language}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Details */}
          {(company.taxDetails?.gstin || company.taxDetails?.pan || company.taxDetails?.tan || company.taxDetails?.cin) && (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="text-orange-600" size={20} />
                <h3 className="text-lg font-bold text-gray-800">Tax Details</h3>
              </div>
              <div className="bg-white rounded-xl p-4 border border-orange-200">
                <div className="grid grid-cols-2 gap-4">
                  {company.taxDetails?.gstin && (
                    <div>
                      <p className="text-sm text-gray-600">GSTIN</p>
                      <p className="font-medium text-gray-800">{company.taxDetails.gstin}</p>
                    </div>
                  )}
                  {company.taxDetails?.pan && (
                    <div>
                      <p className="text-sm text-gray-600">PAN</p>
                      <p className="font-medium text-gray-800">{company.taxDetails.pan}</p>
                    </div>
                  )}
                  {company.taxDetails?.tan && (
                    <div>
                      <p className="text-sm text-gray-600">TAN</p>
                      <p className="font-medium text-gray-800">{company.taxDetails.tan}</p>
                    </div>
                  )}
                  {company.taxDetails?.cin && (
                    <div>
                      <p className="text-sm text-gray-600">CIN</p>
                      <p className="font-medium text-gray-800">{company.taxDetails.cin}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="text-teal-600" size={20} />
              <h3 className="text-lg font-bold text-gray-800">Features</h3>
            </div>
            <div className="bg-white rounded-xl p-4 border border-teal-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  {company.enableGST ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    <XCircle size={20} className="text-red-600" />
                  )}
                  <span className="text-gray-800 font-medium">GST</span>
                </div>
                <div className="flex items-center gap-2">
                  {company.enableTDS ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    <XCircle size={20} className="text-red-600" />
                  )}
                  <span className="text-gray-800 font-medium">TDS</span>
                </div>
                <div className="flex items-center gap-2">
                  {company.enableTCS ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    <XCircle size={20} className="text-red-600" />
                  )}
                  <span className="text-gray-800 font-medium">TCS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-gray-600" size={20} />
              <h3 className="text-lg font-bold text-gray-800">Additional Information</h3>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="font-medium text-gray-800">{formatDate(company.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-medium text-gray-800">{formatDate(company.updatedAt)}</p>
                </div>
                {company.createdBy && (
                  <div>
                    <p className="text-sm text-gray-600">Created By</p>
                    <p className="font-medium text-gray-800">
                      {company.createdBy.name || company.createdBy.email || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg"
          >
            Edit Company
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetails;
